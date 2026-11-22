"""Project Natural Earth + historical-basemaps data into one 'world pixel' space for the 2D map engine.

World space: x = (lon - LON0) * K * S,  y = (LAT1 - lat) * S   (equirectangular scaled at LAT_REF).
Output (anim/public/maps/<region>/):
  base.json        land / lakes / rivers as projected rings & lines (drawn once into base.png)
  borders_<year>.json  polities: id, name, svg path d, label point, area
Usage: python3 tools/mapdata.py
"""
import json, math, re
from pathlib import Path
from shapely.geometry import shape, box, mapping
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "anim" / "data"
REGION = {"name": "eurasia_w", "lon0": 18.0, "lon1": 75.0, "lat0": 36.0, "lat1": 70.0, "lat_ref": 55.0, "S": 60.0}
K = math.cos(math.radians(REGION["lat_ref"]))
OUT = ROOT / "anim" / "public" / "maps" / REGION["name"]
CLIP = box(REGION["lon0"] - 2, REGION["lat0"] - 2, REGION["lon1"] + 2, REGION["lat1"] + 2)
ICE = {"Volga", "Oka", "Don", "Kama", "Volkhov", "Msta", "Sheksna", "Klyazma", "Tvertsa", "Pronya", "Dnieper", "Western Dvina", "Ural", "Daugava"}


def P(lon, lat):
    return (round((lon - REGION["lon0"]) * K * REGION["S"], 1), round((REGION["lat1"] - lat) * REGION["S"], 1))


def polys(geom):
    if geom.is_empty:
        return []
    if geom.geom_type == "Polygon":
        return [geom]
    if geom.geom_type in ("MultiPolygon", "GeometryCollection"):
        return [g for g in geom.geoms if g.geom_type == "Polygon"]
    return []


def lines(geom):
    if geom.is_empty:
        return []
    if geom.geom_type == "LineString":
        return [geom]
    if geom.geom_type in ("MultiLineString", "GeometryCollection"):
        return [g for g in geom.geoms if g.geom_type == "LineString"]
    return []


def ring_d(coords):
    pts = [P(x, y) for x, y in coords]
    return "M" + "L".join(f"{x} {y}" for x, y in pts) + "Z"


def poly_d(p):
    return "".join(ring_d(r.coords) for r in [p.exterior, *p.interiors])


def chaikin(coords, n=2):
    pts = list(coords)[:-1]
    for _ in range(n):
        out = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            out += [(0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]), (0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1])]
        pts = out
    return pts + [pts[0]]


def smooth(geom):
    """round off the blocky historical borders (coasts are restored by the land clip afterwards)"""
    from shapely.geometry import Polygon
    ps = [Polygon(chaikin(p.exterior.coords), [chaikin(r.coords) for r in p.interiors]) for p in polys(geom) if len(p.exterior.coords) > 3]
    return unary_union([p.buffer(0) for p in ps]) if ps else geom


def load(name):
    return json.loads((DATA / f"{name}.geojson").read_text())["features"]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    W, H = P(REGION["lon1"], REGION["lat0"])
    # ---- base geometry
    land = unary_union([shape(f["geometry"]) for f in load("ne_50m_land")]).intersection(CLIP).simplify(0.01)
    lakes = [shape(f["geometry"]) for f in load("ne_50m_lakes")]
    lakes = [p for g in lakes for p in polys(g.intersection(CLIP).simplify(0.01))]
    rivers = []
    for f in load("ne_10m_rivers_lake_centerlines") + load("ne_10m_rivers_europe"):
        pr = f["properties"]; nm = pr.get("name") or ""
        if nm not in ICE and (pr.get("scalerank") or 99) > 7:
            continue
        for l in lines(shape(f["geometry"]).intersection(CLIP).simplify(0.01)):
            rivers.append({"name": nm, "pts": [P(x, y) for x, y in l.coords]})
    base = {"region": REGION, "W": W, "H": H,
            "land": [[[P(x, y) for x, y in r.coords] for r in [p.exterior, *p.interiors]] for p in polys(land)],
            "lakes": [[P(x, y) for x, y in p.exterior.coords] for p in lakes],
            "rivers": rivers}
    (OUT / "base.json").write_text(json.dumps(base, separators=(",", ":")))
    # ---- historical borders (clipped to land so coasts match the base map)
    for year in (1200, 1279, 1300):
        out = []
        for i, f in enumerate(load(f"hist_{year}")):
            nm = f["properties"].get("NAME")
            if not nm or f["geometry"] is None:
                continue
            g = smooth(shape(f["geometry"]).buffer(0).intersection(CLIP).simplify(0.03)).intersection(land.buffer(0.02)).simplify(0.01)
            ps = [p for p in polys(g) if p.area > 0.02]
            if not ps:
                continue
            u = unary_union(ps)
            lp = u.representative_point() if u.geom_type == "Polygon" else max(ps, key=lambda p: p.area).representative_point()
            out.append({"id": re.sub(r"[^a-z0-9]+", "_", nm.lower()).strip("_"), "name": nm,
                        "d": "".join(poly_d(p) for p in ps), "label": P(lp.x, lp.y), "area": round(u.area, 2)})
        (OUT / f"borders_{year}.json").write_text(json.dumps(out, separators=(",", ":")))
        print(year, len(out), "polities:", ", ".join(sorted(o["name"] for o in out if o["area"] > 3))[:400])
    print("world", W, H)


if __name__ == "__main__":
    main()

"""Project Natural Earth + historical-basemaps into one world-pixel space for the 2D map engine.

World space (shared by every layer):  x = (lon - LON0) * K * S,  y = (LAT1 - lat) * S
Outputs in anim/public/maps/:
  wide.json / rus.json     base geometry for render_base.js (land, lakes, rivers) + the layer's world rect
  borders_1237.json        polities for 1237 (composited from the 1200 map: Mongol conquests merged, labels fixed)
  borders_1279.json        polities for 1279
Usage: python3 tools/mapdata.py
"""
import json, math
from pathlib import Path
from shapely.geometry import shape, box, Polygon
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "anim" / "data"
OUT = ROOT / "anim" / "public" / "maps"
PROJ = {"lon0": -12.0, "lat1": 78.0, "lat_ref": 50.0, "S": 40.0}
K = math.cos(math.radians(PROJ["lat_ref"]))
LAYERS = {
    "wide": {"bbox": (-12, 0, 150, 78), "land": "ne_50m_land", "lakes": "ne_50m_lakes", "rank": 4, "simp": 0.04},
    "rus": {"bbox": (16, 42, 64, 68), "land": "ne_50m_land", "lakes": "ne_50m_lakes", "rank": 8, "simp": 0.008},
}
ICE = {"Volga", "Oka", "Don", "Kama", "Volkhov", "Msta", "Sheksna", "Klyazma", "Tvertsa", "Pronya", "Dnieper", "Western Dvina", "Daugava", "Ural"}

MONGOL = {"Mongol Empire", "Kara Khitai Khaganate", "Xixia", "Liao", "Ghaznavid Emirate", "Khwarazmian dynasty"}
P1237 = {
    "Song Empire": ("song", "Song China"), "Tibet": ("tibet", "Tibet"), "Sultanate of Delhi": ("delhi", "Delhi Sultanate"),
    "Buwayhid Emirates": ("persia", "Persia"), "Fatimid Caliphate": ("ayyubids", "Ayyubids"), "Byzantine Empire": ("byzantium", "Byzantium"),
    "Holy Roman Empire": ("hre", "Holy Roman Empire"), "Hungary": ("hungary", "Hungary"), "Poland": ("poland", "Poland"),
    "Kingdom of France": ("france", "France"), "Angevin Empire": ("england", "England"), "Bulgar Khanate": ("bulgaria", "Bulgaria"),
    "Cuman Khanates": ("cumans", "Cumans"), "Volga Bulgars": ("volga_bulgaria", "Volga Bulgaria"), "Georgia": ("georgia", "Georgia"),
    "Principality of Novgorod": ("novgorod", "Novgorod"), "Principality of Vladimir-Suzdal": ("vladimir", "Vladimir"),
    "Other Rus Principalities": ("ryazan", "Ryazan & others"), "Principality of Kyiv": ("kyiv", "Kyiv"),
    "Principality of Galicia-Volhynia": ("galicia", "Galicia"), "Sweden": ("sweden", "Sweden"),
}


def P(lon, lat):
    return (round((lon - PROJ["lon0"]) * K * PROJ["S"], 1), round((PROJ["lat1"] - lat) * PROJ["S"], 1))


def polys(g):
    if g.is_empty: return []
    if g.geom_type == "Polygon": return [g]
    return [x for x in getattr(g, "geoms", []) if x.geom_type == "Polygon"]


def lines(g):
    if g.is_empty: return []
    if g.geom_type == "LineString": return [g]
    return [x for x in getattr(g, "geoms", []) if x.geom_type == "LineString"]


def load(name):
    return json.loads((DATA / f"{name}.geojson").read_text())["features"]


def chaikin(coords, n=2):
    pts = list(coords)[:-1]
    for _ in range(n):
        out = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            out += [(0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]), (0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1])]
        pts = out
    return pts + [pts[0]]


def smooth(g):
    ps = [Polygon(chaikin(p.exterior.coords), [chaikin(r.coords) for r in p.interiors]) for p in polys(g) if len(p.exterior.coords) > 3]
    return unary_union([p.buffer(0) for p in ps]) if ps else g


def path_d(g):
    d = ""
    for p in polys(g):
        for r in [p.exterior, *p.interiors]:
            d += "M" + "L".join(f"{x} {y}" for x, y in (P(*c) for c in r.coords)) + "Z"
    return d


def base_layer(name, cfg):
    x0, y0, x1, y1 = cfg["bbox"]; clip = box(x0 - 1, y0 - 1, x1 + 1, y1 + 1)
    land = unary_union([shape(f["geometry"]) for f in load(cfg["land"])]).intersection(clip).simplify(cfg["simp"])
    lakes = [p for f in load(cfg["lakes"]) for p in polys(shape(f["geometry"]).intersection(clip).simplify(cfg["simp"]))]
    rivers = []
    srcs = load("ne_10m_rivers_lake_centerlines") + (load("ne_10m_rivers_europe") if name == "rus" else [])
    for f in srcs:
        pr = f["properties"]; nm = pr.get("name") or ""
        if not (nm in ICE and name == "rus") and (pr.get("scalerank") or 99) > cfg["rank"]: continue
        for l in lines(shape(f["geometry"]).intersection(clip).simplify(cfg["simp"])):
            rivers.append({"name": nm, "ice": nm in ICE, "pts": [P(*c) for c in l.coords]})
    rect = [*P(x0, y1), *P(x1, y0)]
    data = {"rect": rect, "land": [[[P(*c) for c in r.coords] for r in [p.exterior, *p.interiors]] for p in polys(land)],
            "lakes": [[P(*c) for c in p.exterior.coords] for p in lakes], "rivers": rivers}
    (OUT / f"{name}.json").write_text(json.dumps(data, separators=(",", ":")))
    return land


def borders(year, land, mapping, merge=None):
    groups = {}
    for f in load(f"hist_{year}"):
        nm = f["properties"].get("NAME"); g = f["geometry"]
        if not nm or g is None: continue
        if merge and nm in merge: key, label = merge["__id"], merge["__label"]
        elif nm in mapping: key, label = mapping[nm]
        else: continue
        groups.setdefault(key, {"label": label, "geoms": []})["geoms"].append(shape(g).buffer(0))
    out = []
    for key, v in groups.items():
        g = smooth(unary_union(v["geoms"]).simplify(0.06)).intersection(land.buffer(0.03)).simplify(0.015)
        ps = [p for p in polys(g) if p.area > 0.03]
        if not ps: continue
        u = unary_union(ps); big = max(ps, key=lambda p: p.area); lp = big.representative_point()
        out.append({"id": key, "name": v["label"], "d": path_d(u), "label": P(lp.x, lp.y), "area": round(u.area, 1)})
    (OUT / f"borders_{year if year != 1200 else 1237}.json").write_text(json.dumps(out, separators=(",", ":")))
    print(year, len(out), sorted((o["id"], o["area"]) for o in out))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    land = None
    for name, cfg in LAYERS.items():
        l = base_layer(name, cfg); land = land or l
        print(name, "rect", json.loads((OUT / f"{name}.json").read_text())["rect"])
    mongol = {n: None for n in MONGOL}; mongol.update({"__id": "mongol", "__label": "Mongol Empire"})
    borders(1200, land, P1237, mongol)
    borders(1279, land, {"Khanate of the Golden Horde": ("golden_horde", "Golden Horde"), "Novgorod": ("novgorod", "Novgorod"),
                         "Ryazan": ("rus_vassals", "Rus' (vassals)"), "Great Khanate": ("yuan", "Great Khanate"),
                         "Chagatai Khanate": ("chagatai", "Chagatai Khanate"), "Ilkhanate": ("ilkhanate", "Ilkhanate")})
    print("proj", PROJ, "K", K)


if __name__ == "__main__":
    main()

"""Map data for the Anglo-Zanzibar War short (1896), same world projection as tools/mapdata.py.
Layers: world (low-res), eafrica (East Africa), zanz (Zanzibar town close-up, 10 m coastline).
Polities (approximate 1896 colonial borders, which were drawn in 1886-1890 and match today's states):
  British Empire (major possessions), German East Africa (TZ mainland + RW + BI), British East Africa (KE + UG), Zanzibar (Unguja + Pemba).
Usage: python3 tools/map_zanzibar.py
"""
import json, sys
from pathlib import Path
from shapely.geometry import shape, box
from shapely.ops import unary_union
sys.path.insert(0, str(Path(__file__).parent))
from mapdata import P, polys, lines, load, path_d, OUT, ICE

LAYERS = {
    "z_world": {"bbox": (-130, -45, 160, 78), "land": "ne_50m_land", "lakes": "ne_50m_lakes", "rank": 3, "simp": 0.05},
    "z_eafrica": {"bbox": (24, -16, 56, 8), "land": "ne_50m_land", "lakes": "ne_50m_lakes", "rank": 6, "simp": 0.01},
    "z_town": {"bbox": (38.9, -6.7, 40.1, -4.6), "land": "ne_10m_land", "lakes": None, "rank": 0, "simp": 0.0005},
}
EMPIRE = ["CAN", "AUS", "NZL", "IND", "PAK", "BGD", "MMR", "LKA", "MYS", "ZAF", "EGY", "GHA", "SLE", "GMB", "NGA", "KEN", "UGA", "BWA", "ZWE",
          "ZMB", "MWI", "GUY", "BLZ", "JAM", "BHS", "TTO", "GBR", "IRL", "CYP", "MLT", "SOM", "YEM", "LSO", "SWZ", "BRN", "SGP"]


def base(name, cfg):
    x0, y0, x1, y1 = cfg["bbox"]; clip = box(x0 - 0.5, y0 - 0.5, x1 + 0.5, y1 + 0.5)
    land = unary_union([shape(f["geometry"]).buffer(0) for f in load(cfg["land"]) if shape(f["geometry"]).intersects(clip)]).intersection(clip)
    if cfg["simp"]: land = land.simplify(cfg["simp"])
    lakes = [p for f in load(cfg["lakes"]) for p in polys(shape(f["geometry"]).intersection(clip))] if cfg["lakes"] else []
    rivers = []
    if cfg["rank"]:
        for f in load("ne_10m_rivers_lake_centerlines"):
            if (f["properties"].get("scalerank") or 99) > cfg["rank"]: continue
            for l in lines(shape(f["geometry"]).intersection(clip).simplify(cfg["simp"])):
                rivers.append({"name": f["properties"].get("name") or "", "ice": False, "pts": [P(*c) for c in l.coords]})
    rect = [*P(x0, y1), *P(x1, y0)]
    (OUT / f"{name}.json").write_text(json.dumps({"rect": rect, "land": [[[P(*c) for c in r.coords] for r in [p.exterior, *p.interiors]] for p in polys(land)],
                                                  "lakes": [[P(*c) for c in p.exterior.coords] for p in lakes], "rivers": rivers}, separators=(",", ":")))
    print(name, "rect", [round(v) for v in rect])


def main():
    for n, c in LAYERS.items(): base(n, c)
    adm = {f["properties"]["ADM0_A3"]: shape(f["geometry"]).buffer(0) for f in load("ne_50m_admin_0_countries")}
    fine = unary_union([shape(f["geometry"]).buffer(0) for f in load("ne_10m_land") if shape(f["geometry"]).intersects(box(38.5, -7, 40.5, -4.5))])
    zanz = fine.intersection(box(38.9, -6.6, 40.1, -4.7))
    tz_mainland = adm["TZA"].difference(box(38.9, -7.5, 40.5, -4.5))
    out = []
    def add(id_, name, g, label_at=None, simp=0.02):
        g = g.simplify(simp) if simp else g
        lp = label_at or (lambda p: (p.x, p.y))(max(polys(g), key=lambda p: p.area).representative_point())
        out.append({"id": id_, "name": name, "d": path_d(g), "label": list(P(*lp)), "area": round(g.area, 2)})
    add("empire", "British Empire", unary_union([adm[a] for a in EMPIRE if a in adm]), simp=0.05)
    add("gea", "German East Africa", unary_union([tz_mainland, adm["RWA"], adm["BDI"]]), label_at=(34.5, -6.5))
    add("bea", "British East Africa", unary_union([adm["KEN"], adm["UGA"]]), label_at=(37.5, 0.5))
    add("zanzibar", "Zanzibar", zanz, label_at=(39.35, -6.05), simp=0.0008)
    (OUT / "borders_1896.json").write_text(json.dumps(out, separators=(",", ":")))
    pts = {"London": (-0.13, 51.5), "ZanzibarTown": (39.19, -6.163), "Berlin": (13.4, 52.52), "DarEsSalaam": (39.28, -6.82), "Mombasa": (39.67, -4.04)}
    (OUT / "zanzibar_points.json").write_text(json.dumps({k: P(*v) for k, v in pts.items()}))
    print("borders", [(o["id"], o["area"]) for o in out])


if __name__ == "__main__":
    main()

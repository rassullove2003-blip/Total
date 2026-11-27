"""Map data for Caesar's civil war (49-48 BC), same world projection as tools/mapdata.py.
Roman world in 49 BC = historical-basemaps 'Roman Empire' of 1 AD minus what was added later (Egypt, the Danube lands,
Mauretania/Numidia). Split into provinces with modern borders as proxies so each can change colour (Caesar red / Pompey blue).
Usage: python3 tools/map_rome.py
"""
import json, sys, math
from pathlib import Path
from shapely.geometry import shape, box, Polygon
from shapely.ops import unary_union
sys.path.insert(0, str(Path(__file__).parent))
from mapdata import P, polys, lines, load, path_d, smooth, OUT

BBOX = (-11, 16, 40, 64)

def base():
    x0, y0, x1, y1 = BBOX; clip = box(x0 - 0.5, y0 - 0.5, x1 + 0.5, y1 + 0.5)
    land = unary_union([shape(f["geometry"]).buffer(0) for f in load("ne_50m_land") if shape(f["geometry"]).intersects(clip)]).intersection(clip).simplify(0.006)
    lakes = [p for f in load("ne_50m_lakes") for p in polys(shape(f["geometry"]).intersection(clip))]
    rivers = []
    for f in load("ne_10m_rivers_lake_centerlines"):
        if (f["properties"].get("scalerank") or 99) > 6: continue
        for l in lines(shape(f["geometry"]).intersection(clip).simplify(0.006)):
            rivers.append({"name": f["properties"].get("name") or "", "ice": False, "pts": [P(*c) for c in l.coords]})
    (OUT / "r_med.json").write_text(json.dumps({"rect": [*P(x0, y1), *P(x1, y0)], "land": [[[P(*c) for c in r.coords] for r in [p.exterior, *p.interiors]] for p in polys(land)],
                                              "lakes": [[P(*c) for c in p.exterior.coords] for p in lakes], "rivers": rivers}, separators=(",", ":")))
    return land

def main():
    land = base()
    adm = {f["properties"]["ADM0_A3"]: shape(f["geometry"]).buffer(0) for f in load("ne_50m_admin_0_countries")}
    A = lambda *codes: unary_union([adm[c] for c in codes if c in adm])
    rome = unary_union([shape(f["geometry"]).buffer(0) for f in load("hist_bc1") if f["properties"].get("NAME") == "Roman Empire"])
    rome = rome.difference(A("EGY")).difference(box(9.5, 45.7, 31, 51)).difference(box(19.5, 42.4, 31, 45.8)).difference(box(-11, 26, 8.3, 38)).difference(box(-11, 26, 12, 33.5))
    rome = rome.intersection(land.buffer(0.02))
    ita = A("ITA", "SMR", "VAT")
    north = Polygon([(5, 48), (15, 48), (15, 44.16), (12.42, 44.16), (10.28, 43.68), (5, 43.68)])  # Rubicon (Adriatic) to the Arno (Tyrrhenian)
    west_rhine = Polygon([(2, 53.5), (4.5, 52.0), (6.1, 51.85), (6.9, 51.0), (7.6, 50.35), (8.3, 49.9), (8.2, 49.0), (7.6, 47.6), (2, 46)])
    dalmatia = Polygon([(13.4, 46.0), (14.6, 45.9), (15.6, 45.5), (16.6, 44.6), (17.8, 43.9), (19.3, 43.0), (19.9, 42.4), (19.6, 41.8), (12.5, 41.8), (12.5, 46.0)])
    nile = unary_union([shape(f["geometry"]) for f in load("ne_10m_rivers_lake_centerlines") if (f["properties"].get("name") or "").startswith("Nile")]).intersection(box(28, 22, 34, 31.7))
    keep_rome = lambda g: g  # provinces below follow modern borders as proxies (no straight cut lines)
    regions = {
        "gaul": ("Gaul", A("FRA", "BEL", "LUX", "CHE").union(A("NLD", "DEU").intersection(west_rhine)).difference(box(7.5, 30, 20, 43.2))),
        "cisalpine": ("Cisalpine Gaul", ita.intersection(north)),
        "illyricum": ("Illyricum", A("HRV", "SVN", "BIH", "MNE").intersection(dalmatia)),
        "italy": ("Italy", ita.difference(north).union(A("FRA").intersection(box(8, 41, 10, 43.2)))),
        "spain": ("Hispania", A("ESP", "PRT")),
        "africa": ("Africa", A("TUN").intersection(box(7, 34.6, 12, 38))),
        "greece": ("Greece", A("GRC", "ALB", "MKD")),
        "east": ("The East", A("TUR", "SYR", "LBN", "ISR", "PSE", "CYP").union(A("LBY").intersection(Polygon([(19.8, 30.2), (25.2, 31.3), (25.2, 33.5), (19.8, 33.5)]))).difference(box(35, 30, 50, 37.6).difference(box(35, 30, 38.6, 37.6)))),
    }
    out = []
    for rid, (name, proxy) in regions.items():
        g = proxy.buffer(0.0).intersection(land.buffer(0.02))
        g = unary_union([p for p in polys(g) if p.area > 0.01]).simplify(0.01)
        big = max(polys(g), key=lambda p: p.area); lp = big.representative_point()
        out.append({"id": rid, "name": name, "d": path_d(g), "label": list(P(lp.x, lp.y)), "area": round(g.area, 1)})
    eg = A("EGY").intersection(nile.buffer(0.45).union(Polygon([(29.3, 31.3), (32.4, 31.3), (31.6, 30.0), (31.0, 29.9)]).buffer(0.5))).intersection(land.buffer(0.02)).simplify(0.01)
    out.append({"id": "egypt", "name": "Egypt", "d": path_d(eg), "label": list(P(31.0, 27.0)), "area": round(eg.area, 1)})
    (OUT / "borders_49bc.json").write_text(json.dumps(out, separators=(",", ":")))
    print([(o["id"], o["area"]) for o in out])
    C = {"Rome": (12.49, 41.9), "Ravenna": (12.2, 44.42), "Ariminum": (12.57, 44.06), "Rubicon": (12.42, 44.16), "Corfinium": (13.84, 42.12), "Brundisium": (17.94, 40.63),
         "Massilia": (5.37, 43.3), "Ilerda": (0.62, 41.62), "Dyrrhachium": (19.45, 41.32), "Pharsalus": (22.38, 39.29), "Larissa": (22.42, 39.64), "Amphipolis": (23.85, 40.82),
         "Mytilene": (26.55, 39.1), "Pelusium": (32.55, 31.04), "Alexandria": (29.92, 31.2), "Paphos": (32.42, 34.77), "Oricum": (19.47, 40.37), "Apollonia": (19.55, 40.72)}
    W = {k: list(P(*v)) for k, v in C.items()}
    def path(*names_or_pts, bend=0.0, n=14):
        pts = [C[x] if isinstance(x, str) else x for x in names_or_pts]; out_ = []
        for (a, b) in zip(pts, pts[1:]):
            (x0, y0), (x1, y1) = P(*a), P(*b); mx, my = (x0 + x1) / 2 + (y1 - y0) * bend, (y0 + y1) / 2 - (x1 - x0) * bend
            for i in range(n): t = i / n; out_.append([round((1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1, 1), round((1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1, 1)])
        out_.append(list(P(*pts[-1]))); return out_
    routes = {
        "caesar_italy": path("Ravenna", "Ariminum", (13.5, 43.5), "Corfinium", (15.6, 41.4), "Brundisium", bend=0.03),
        "caesar_spain": path("Brundisium", "Rome", (10.6, 43.6), (7.6, 43.8), "Massilia", (2.9, 43.1), "Ilerda", bend=0.05),
        "caesar_back": path("Ilerda", (3.0, 43.3), (8.0, 44.0), (12.0, 43.4), "Brundisium", bend=-0.04),
        "caesar_sea": path("Brundisium", "Oricum", bend=0.1),
        "caesar_greece": path("Oricum", "Dyrrhachium", (21.0, 40.2), "Pharsalus", bend=0.05),
        "pompey_flee": path("Rome", (14.8, 41.4), "Brundisium", bend=-0.03),
        "pompey_sea": path("Brundisium", "Dyrrhachium", bend=-0.12),
        "pompey_greece": path("Dyrrhachium", (20.8, 40.0), "Pharsalus", bend=-0.04),
        "pompey_egypt": path("Pharsalus", "Larissa", "Amphipolis", "Mytilene", (30.0, 36.3), "Paphos", "Pelusium", bend=0.08),
    }
    (OUT / "rome_points.json").write_text(json.dumps({"cities": W, "routes": routes}, separators=(",", ":")))
    print("routes", {k: len(v) for k, v in routes.items()})

if __name__ == "__main__":
    main()

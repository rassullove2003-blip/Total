"""Routes and points for the Batu story in world pixels (same projection as tools/mapdata.py)."""
import json, math, heapq, sys
sys.path.insert(0, "tools")
from mapdata import P, load
feats = load("ne_10m_rivers_lake_centerlines") + load("ne_10m_rivers_europe")
def lines(name):
    out = []
    for f in feats:
        if (f["properties"].get("name") or "") == name:
            g = f["geometry"]; out += [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]
    return out
def river(name, a, b):
    adj = {}
    for ln in lines(name):
        for p, q in zip(ln, ln[1:]):
            p, q = tuple(p), tuple(q); d = math.dist(p, q)
            adj.setdefault(p, []).append((q, d)); adj.setdefault(q, []).append((p, d))
    near = lambda t: min(adj, key=lambda v: math.dist(v, t))
    s, t = near(a), near(b); dist = {s: 0}; prev = {}; pq = [(0, s)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == t: break
        if d > dist[u]: continue
        for v, w in adj[u]:
            if d + w < dist.get(v, 1e9): dist[v] = d + w; prev[v] = u; heapq.heappush(pq, (d + w, v))
    path = [t]
    while path[-1] != s: path.append(prev[path[-1]])
    return [list(p) for p in reversed(path)]
C = {"steppe": (46.0, 52.0), "Ryazan": (39.7, 54.6), "Kolomna": (38.75, 55.1), "Moscow": (37.6, 55.75), "Vladimir": (40.4, 56.13),
     "Tver": (35.9, 56.86), "Torzhok": (34.96, 57.04), "Ignach": (33.5, 57.75), "Novgorod": (31.27, 58.52), "Kozelsk": (35.8, 54.03),
     "Paris": (2.35, 48.85), "Berlin": (13.4, 52.52), "Karakorum": (102.8, 47.2), "Volga": (49.1, 55.8)}
legs = [[C["steppe"], (43.5, 53.2), (41.3, 54.1), C["Ryazan"]], river("Oka", C["Ryazan"], C["Kolomna"]),
        [C["Kolomna"], (38.2, 55.4), C["Moscow"]], river("Klyazma", (37.9, 55.95), C["Vladimir"]),
        [C["Vladimir"], (39.0, 56.6), (37.6, 56.8), C["Tver"]], river("Tvertsa", C["Tver"], C["Torzhok"]),
        [C["Torzhok"], (34.3, 57.4), C["Ignach"]]]
pts = []
for leg in legs:
    for q in leg:
        if not pts or math.dist(pts[-1], q) > 0.02: pts.append(tuple(q))
W = [P(*q) for q in pts]; L = [0]
for a, b in zip(W, W[1:]): L.append(L[-1] + math.dist(a, b))
at = {n: round(L[min(range(len(pts)), key=lambda i: math.dist(pts[i], C[n]))] / L[-1], 4) for n in ("Ryazan", "Kolomna", "Moscow", "Vladimir", "Tver", "Torzhok", "Ignach")}
def arc(a, b, bend=0.15, n=40):
    (x0, y0), (x1, y1) = P(*a), P(*b); mx, my = (x0 + x1) / 2, (y0 + y1) / 2; dx, dy = x1 - x0, y1 - y0
    cx, cy = mx + dy * bend, my - dx * bend
    return [[round((1-t)**2*x0 + 2*(1-t)*t*cx + t*t*x1, 1), round((1-t)**2*y0 + 2*(1-t)*t*cy + t*t*y1, 1)] for t in (i / n for i in range(n + 1))]
out = {"route": {"pts": [[round(x, 1), round(y, 1)] for x, y in W], "len": round(L[-1], 1), "at": at},
       "retreat": arc(C["Ignach"], C["Kozelsk"], -0.25),
       "napoleon": arc(C["Paris"], C["Moscow"], 0.12), "hitler": arc(C["Berlin"], C["Moscow"], 0.1),
       "west": arc(C["Karakorum"], C["Volga"], 0.12),
       "cities": {n: P(*C[n]) for n in ("Ryazan", "Kolomna", "Moscow", "Vladimir", "Tver", "Torzhok", "Novgorod", "Karakorum")}}
json.dump(out, open("anim/public/maps/batu_routes.json", "w"))
print(len(W), "route pts", at)

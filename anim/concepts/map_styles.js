// Style concept: one map frame (Rus, winter 1237-38) drawn in 3 styles, with Batu + a Rus prince.
// Run via concepts/render_map_styles.js (injects Natural Earth geojson as window.GEO).
const W = 540, H = 960;
const B = { lon0: 31, lon1: 50, lat0: 47, lat1: 64.5 };
const k = Math.cos((56 * Math.PI) / 180);
const sx = W / ((B.lon1 - B.lon0) * k), sy = H / (B.lat1 - B.lat0), s = Math.min(sx, sy);
const P = (lon, lat) => [(lon - B.lon0) * k * s + (W - (B.lon1 - B.lon0) * k * s) / 2, (B.lat1 - lat) * s];

function rings(geom) {
  if (!geom) return [];
  if (geom.type === "Polygon") return geom.coordinates;
  if (geom.type === "MultiPolygon") return geom.coordinates.flat();
  if (geom.type === "LineString") return [geom.coordinates];
  if (geom.type === "MultiLineString") return geom.coordinates;
  return [];
}
function trace(c, ring) { ring.forEach(([lo, la], i) => { const [x, y] = P(lo, la); i ? c.lineTo(x, y) : c.moveTo(x, y); }); }

const CITIES = [["Ryazan", 39.7, 54.6], ["Kolomna", 38.75, 55.1], ["Moscow", 37.6, 55.75], ["Vladimir", 40.4, 56.13], ["Torzhok", 34.96, 57.04], ["Novgorod", 31.27, 58.52]];
const ROUTE = [[47, 51.5], [43, 53.4], [39.7, 54.6], [38.75, 55.1], [37.6, 55.75], [40.4, 56.13], [37.5, 56.7], [34.96, 57.04], [33.0, 57.9]];
const ICE = ["Volga", "Oka", "Don", "Kama", "Volkhov", "Dnieper", "Western Dvina", "Daugava", "Msta", "Sheksna"];

const STYLES = {
  A: { name: "A · Parchment", sea: "#9fb8b4", land: "#e6d3a8", landEdge: "#8a6a3e", grain: "#b89a66", river: "#7fa6b8", ice: "#f4fbff", iceEdge: "#5d8fb0",
       city: "#7a2e22", route: "#a3261d", text: "#3b2a18", vignette: "rgba(60,35,10,.55)", font: "Georgia, DejaVu Serif, serif" },
  B: { name: "B · Clean flat", sea: "#3f7fb8", land: "#e9eef2", landEdge: "#9fb0bf", grain: null, river: "#5aa0d8", ice: "#ffffff", iceEdge: "#2c74c2",
       city: "#22304a", route: "#e2453c", text: "#22304a", vignette: "rgba(20,30,60,.25)", font: "DejaVu Sans, sans-serif" },
  C: { name: "C · Ink & gold", sea: "#14202e", land: "#2a3346", landEdge: "#d9b36a", grain: "#323c52", river: "#46607e", ice: "#e7f3ff", iceEdge: "#9cc6f0",
       city: "#e8c27a", route: "#d64235", text: "#f1dfb6", vignette: "rgba(0,0,0,.6)", font: "Georgia, DejaVu Serif, serif" },
};

function drawMap(c, st, GEO) {
  c.fillStyle = st.sea; c.fillRect(0, 0, W, H);
  // land
  c.beginPath(); for (const f of GEO.land.features) for (const r of rings(f.geometry)) { trace(c, r); c.closePath(); }
  c.fillStyle = st.land; c.fill("evenodd"); c.lineWidth = 2.5; c.strokeStyle = st.landEdge; c.stroke();
  if (st.grain) { // paper / ink grain
    c.save(); c.clip("evenodd");
    for (let i = 0; i < 2200; i++) { const x = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * W, y = (Math.sin(i * 78.233) * 12345.678 % 1 + 1) % 1 * H;
      c.fillStyle = st.grain; c.globalAlpha = 0.18; c.fillRect(x, y, 2 + (i % 3), 1 + (i % 2)); }
    c.restore(); c.globalAlpha = 1;
  }
  // lakes
  c.beginPath(); for (const f of GEO.lakes.features) for (const r of rings(f.geometry)) { trace(c, r); c.closePath(); }
  c.fillStyle = st.sea; c.fill();
  // rivers: normal, then frozen highways on top
  for (const f of GEO.rivers.features) {
    const name = f.properties.name || "", frozen = ICE.some((n) => name.includes(n));
    for (const r of rings(f.geometry)) {
      if (frozen) {
        c.beginPath(); trace(c, r); c.lineCap = c.lineJoin = "round";
        c.strokeStyle = st.iceEdge; c.lineWidth = 9; c.stroke();
        c.strokeStyle = st.ice; c.lineWidth = 5; c.stroke();
      } else { c.beginPath(); trace(c, r); c.strokeStyle = st.river; c.lineWidth = 2; c.stroke(); }
    }
  }
  // army route: dashed arrow
  if (!window.NO_ROUTE) {
  c.save(); c.setLineDash([16, 10]); c.lineWidth = 7; c.strokeStyle = st.route; c.lineCap = "round";
  c.beginPath(); ROUTE.forEach(([lo, la], i) => { const [x, y] = P(lo, la); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.restore();
  const [ax, ay] = P(...ROUTE[ROUTE.length - 1]), [bx, by] = P(...ROUTE[ROUTE.length - 2]), a = Math.atan2(ay - by, ax - bx);
  c.fillStyle = st.route; c.beginPath(); c.moveTo(ax + 22 * Math.cos(a), ay + 22 * Math.sin(a));
  c.lineTo(ax + 16 * Math.cos(a + 2.4), ay + 16 * Math.sin(a + 2.4)); c.lineTo(ax + 16 * Math.cos(a - 2.4), ay + 16 * Math.sin(a - 2.4)); c.fill();
  }
  // cities
  c.font = `bold 21px ${st.font}`; c.textBaseline = "middle";
  for (const [n, lo, la] of CITIES) {
    const [x, y] = P(lo, la);
    c.fillStyle = st.city; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); c.lineWidth = 3; c.strokeStyle = st.land; c.stroke();
    c.fillStyle = st.text; c.lineWidth = 5; c.strokeStyle = st.land; c.strokeText(n, x + 12, y - 2); c.fillText(n, x + 12, y - 2);
  }
  // snow speckles
  c.fillStyle = "rgba(255,255,255,.85)";
  for (let i = 0; i < 140; i++) { c.beginPath(); c.arc((i * 97) % W, (i * 211) % H, 1.5 + (i % 3), 0, 7); c.fill(); }
  // vignette
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, st.vignette); c.fillStyle = g; c.fillRect(0, 0, W, H);
}

// ---------------- characters ----------------
const INK = "#1b1a24";
const e = (c, x, y, rx, ry, f, lw = 0, col = INK) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); if (f) { c.fillStyle = f; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = col; c.stroke(); } };
const sh = (c, d, f, lw = 4, col = INK) => { c.beginPath(); d(); c.fillStyle = f; c.fill(); if (lw) { c.lineWidth = lw; c.strokeStyle = col; c.lineJoin = "round"; c.stroke(); } };
const ln = (c, p, lw, col = INK) => { c.beginPath(); p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.lineWidth = lw; c.lineCap = "round"; c.strokeStyle = col; c.stroke(); };

// A: chibi — big round head, tiny body, iconic hat
function chibi(c, x, y, who, sc = 1) {
  c.save(); c.translate(x, y); c.scale(sc, sc);
  const batu = who === "batu";
  sh(c, () => { c.moveTo(-34, 0); c.quadraticCurveTo(-40, -70, 0, -74); c.quadraticCurveTo(40, -70, 34, 0); c.closePath(); }, batu ? "#3d6b8f" : "#8c2b2b");
  if (batu) ln(c, [[-30, -40], [30, -40]], 6, "#d9a441"); else sh(c, () => c.rect(-6, -70, 12, 68), "#d9a441", 3);
  e(c, 0, -112, 44, 42, batu ? "#e3b98f" : "#f1cfaa", 4);
  if (batu) { // fur-trimmed pointed hat
    sh(c, () => { c.moveTo(-40, -126); c.quadraticCurveTo(0, -205, 40, -126); c.closePath(); }, "#b8342b");
    sh(c, () => c.roundRect(-48, -138, 96, 22, 11), "#6b4a2e");
    e(c, 0, -180, 6, 6, "#d9a441", 3);
    ln(c, [[-14, -96], [-26, -80]], 4); ln(c, [[14, -96], [26, -80]], 4); // moustache
  } else { // pointed Rus helmet
    sh(c, () => { c.moveTo(-42, -122); c.quadraticCurveTo(-30, -170, 0, -192); c.quadraticCurveTo(30, -170, 42, -122); c.closePath(); }, "#9aa3ad");
    ln(c, [[0, -192], [0, -204]], 5); sh(c, () => c.rect(-4, -124, 8, 30), "#9aa3ad", 3); // nasal
    sh(c, () => { c.moveTo(-26, -88); c.quadraticCurveTo(0, -40, 26, -88); c.quadraticCurveTo(0, -78, -26, -88); }, "#8a5a32", 3); // beard
  }
  e(c, -15, -110, 5, 6, INK); e(c, 15, -110, 5, 6, INK);
  ln(c, [[-24, batu ? -126 : -122], [-8, batu ? -120 : -124]], 5); ln(c, [[24, batu ? -126 : -122], [8, batu ? -120 : -124]], 5);
  c.restore();
}

// B: pawn — no limbs, cone body + ball head, identity from hats/colours (easy to animate: hop, tilt, squash)
function pawn(c, x, y, who, sc = 1) {
  c.save(); c.translate(x, y); c.scale(sc, sc);
  const batu = who === "batu";
  sh(c, () => c.ellipse(0, 0, 40, 12, 0, 0, 7), batu ? "#20456b" : "#6e1f22", 4);
  sh(c, () => { c.moveTo(-38, -4); c.lineTo(-16, -92); c.lineTo(16, -92); c.lineTo(38, -4); c.closePath(); }, batu ? "#2f6aa3" : "#a8312f");
  ln(c, [[-28, -36], [28, -36]], 5, batu ? "#e1b54f" : "#e1b54f");
  e(c, 0, -122, 34, 34, batu ? "#e8be94" : "#f3d3ae", 4);
  if (batu) { sh(c, () => { c.moveTo(-32, -134); c.lineTo(0, -192); c.lineTo(32, -134); c.closePath(); }, "#c33a2e"); sh(c, () => c.roundRect(-38, -146, 76, 18, 9), "#f2efe6"); }
  else { sh(c, () => { c.moveTo(-34, -130); c.quadraticCurveTo(0, -200, 34, -130); c.closePath(); }, "#c9cfd6"); sh(c, () => { c.moveTo(-20, -104); c.quadraticCurveTo(0, -70, 20, -104); c.closePath(); }, "#8a5a32", 3); }
  ln(c, [[-12, -122], [-12, -116]], 6); ln(c, [[12, -122], [12, -116]], 6);
  c.restore();
}

// C: paper cut-out silhouette — angular flat shapes, coloured clothes, dark face profile line
function cutout(c, x, y, who, sc = 1) {
  c.save(); c.translate(x, y); c.scale(sc, sc);
  const batu = who === "batu", ink = "#0d0c12";
  c.shadowColor = "rgba(0,0,0,.5)"; c.shadowOffsetX = 5; c.shadowOffsetY = 6; c.shadowBlur = 0;
  sh(c, () => { c.moveTo(-36, 0); c.lineTo(-30, -84); c.lineTo(30, -84); c.lineTo(40, 0); c.closePath(); }, batu ? "#2b5f8a" : "#962a2a", 0);
  c.shadowColor = "transparent";
  sh(c, () => { c.moveTo(-30, -60); c.lineTo(30, -60); c.lineTo(28, -50); c.lineTo(-28, -50); c.closePath(); }, "#e2b450", 0);
  sh(c, () => { c.moveTo(-22, -84); c.lineTo(-24, -128); c.lineTo(20, -134); c.lineTo(30, -112); c.lineTo(22, -102); c.lineTo(24, -84); c.closePath(); }, batu ? "#d9ab7e" : "#efcba6", 0);
  ln(c, [[8, -116], [18, -116]], 4, ink); // eye
  if (batu) { sh(c, () => { c.moveTo(-30, -126); c.lineTo(-4, -186); c.lineTo(28, -128); c.closePath(); }, "#c0372c", 0); sh(c, () => c.rect(-34, -134, 66, 14), "#5b4128", 0); ln(c, [[18, -98], [30, -86]], 4, ink); }
  else { sh(c, () => { c.moveTo(-28, -126); c.lineTo(0, -184); c.lineTo(26, -126); c.closePath(); }, "#a9b1ba", 0); sh(c, () => { c.moveTo(-2, -100); c.lineTo(26, -98); c.lineTo(10, -66); c.closePath(); }, "#7a4a28", 0); }
  c.restore();
}

window.renderAll = (GEO) => {
  const out = [];
  for (const [key, char] of [["A", chibi], ["B", pawn], ["C", cutout]]) {
    const st = STYLES[key];
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c = cv.getContext("2d");
    drawMap(c, st, GEO);
    const [rx, ry] = P(39.7, 54.6), [nx, ny] = P(33.6, 57.6);
    char(c, rx + 90, ry + 120, "batu", 0.9);
    char(c, nx - 10, ny - 30, "prince", 0.75);
    // caption band
    c.fillStyle = "rgba(0,0,0,.0)";
    c.font = `bold 40px ${st.font}`; c.textAlign = "center";
    c.lineWidth = 8; c.strokeStyle = key === "C" ? "#000" : "#fff"; c.fillStyle = key === "C" ? "#f1dfb6" : "#1b1a24";
    c.strokeText("WINTER, 1237", W / 2, 70); c.fillText("WINTER, 1237", W / 2, 70);
    c.font = `bold 26px ${st.font}`; c.lineWidth = 6;
    c.strokeText(st.name, W / 2, H - 40); c.fillText(st.name, W / 2, H - 40);
    out.push(cv.toDataURL("image/png"));
  }
  return out;
};

// production: map only, rendered at `scale` x (540x960 design units)
window.renderMap = (GEO, key, scale) => {
  const cv = document.createElement("canvas"); cv.width = W * scale; cv.height = H * scale;
  const c = cv.getContext("2d"); c.scale(scale, scale);
  drawMap(c, STYLES[key], GEO);
  return cv.toDataURL("image/png");
};
window.project = (lon, lat) => P(lon, lat);

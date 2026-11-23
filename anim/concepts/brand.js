// Channel branding for "The Other Half" (all of history): globe avatar + world-map banner.
// usage: node concepts/brand.js   -> ../brand/avatar_800.png, ../brand/banner_2560x1440.jpg
const fs = require("fs");
const { chromium } = require("playwright");
const land = JSON.parse(fs.readFileSync("data/ne_50m_land.geojson")).features.map((f) => f.geometry);

const draw = (LAND, kind) => {
  const rnd = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const rings = (g) => (g.type === "Polygon" ? g.coordinates : g.type === "MultiPolygon" ? g.coordinates.flat() : []);
  const D = Math.PI / 180;
  const paperLand = (c, W, H, path) => {
    path(); c.fillStyle = "#d9c69a"; c.fill("evenodd");
    c.save(); path(); c.clip("evenodd");
    for (let i = 0; i < W * H / 900; i++) { c.fillStyle = rnd(i) > 0.5 ? "rgba(120,95,55,.12)" : "rgba(255,248,225,.12)"; c.fillRect(rnd(i * 3) * W, rnd(i * 7) * H, 2, 1); }
    for (let i = 0; i < W * H / 9000; i++) { const x = rnd(i * 11) * W, y = rnd(i * 13) * H, r = 20 + rnd(i) * 90, g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rnd(i * 5) > 0.5 ? "rgba(150,120,70,.16)" : "rgba(245,230,190,.16)"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
    path(); c.strokeStyle = "rgba(110,85,45,.4)"; c.lineWidth = 8; c.stroke(); c.restore();
    path(); c.strokeStyle = "#5c4627"; c.lineWidth = 2; c.stroke();
  };
  const sea = (c, W, H) => { c.fillStyle = "#5f8e93"; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 160; i++) { const x = rnd(i) * W, y = rnd(i + 50) * H, r = 60 + rnd(i + 9) * 220, g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rnd(i + 3) > 0.5 ? "rgba(130,175,172,.2)" : "rgba(60,100,110,.2)"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H); } };
  const cv = document.createElement("canvas");
  if (kind === "avatar") {
    const W = 800, H = 800, R = 340, lon0 = 35 * D, lat0 = 22 * D;
    cv.width = W; cv.height = H; const c = cv.getContext("2d");
    c.fillStyle = "#1c1812"; c.fillRect(0, 0, W, H);
    // orthographic projection
    const proj = (lon, lat) => { const l = lon * D - lon0, p = lat * D, cosc = Math.sin(lat0) * Math.sin(p) + Math.cos(lat0) * Math.cos(p) * Math.cos(l);
      return [W / 2 + R * Math.cos(p) * Math.sin(l), H / 2 - R * (Math.cos(lat0) * Math.sin(p) - Math.sin(lat0) * Math.cos(p) * Math.cos(l)), cosc]; };
    c.save(); c.beginPath(); c.arc(W / 2, H / 2, R, 0, 7); c.clip();
    sea(c, W, H);
    const path = () => { c.beginPath(); for (const g of LAND) for (const r of rings(g)) { let started = false;
      for (const [lo, la] of r) { const [x, y, v] = proj(lo, la); if (v < 0) { started = false; continue; } if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y); } c.closePath(); } };
    paperLand(c, W, H, path);
    // graticule
    c.strokeStyle = "rgba(40,30,20,.22)"; c.lineWidth = 1.5;
    for (let lo = -180; lo < 180; lo += 30) { c.beginPath(); let s = false; for (let la = -90; la <= 90; la += 3) { const [x, y, v] = proj(lo, la); if (v < 0) { s = false; continue; } s ? c.lineTo(x, y) : c.moveTo(x, y); s = true; } c.stroke(); }
    for (let la = -60; la <= 60; la += 30) { c.beginPath(); let s = false; for (let lo = -180; lo <= 180; lo += 3) { const [x, y, v] = proj(lo, la); if (v < 0) { s = false; continue; } s ? c.lineTo(x, y) : c.moveTo(x, y); s = true; } c.stroke(); }
    // sphere shading
    const sh = c.createRadialGradient(W / 2 + 120, H / 2 - 120, 40, W / 2, H / 2, R); sh.addColorStop(0, "rgba(255,250,235,.18)"); sh.addColorStop(0.7, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(10,8,5,.45)");
    c.fillStyle = sh; c.fillRect(0, 0, W, H);
    // the familiar half: faded
    const img = c.getImageData(0, 0, W / 2, H);
    for (let i = 0; i < img.data.length; i += 4) { const d = img.data, y = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; d[i] = y * 0.62 + 12; d[i + 1] = y * 0.6 + 8; d[i + 2] = y * 0.55; }
    c.putImageData(img, 0, 0);
    c.restore();
    // gold seam + ring
    const gl = c.createLinearGradient(0, 0, 0, H); gl.addColorStop(0, "#f7d27a"); gl.addColorStop(0.5, "#e0a940"); gl.addColorStop(1, "#f7d27a");
    c.shadowColor = "rgba(255,210,120,.7)"; c.shadowBlur = 24; c.fillStyle = gl; c.fillRect(W / 2 - 4, H / 2 - R, 8, 2 * R); c.shadowBlur = 0;
    c.beginPath(); c.arc(W / 2, H / 2, R + 10, 0, 7); c.lineWidth = 16; c.strokeStyle = "#e9bf5f"; c.stroke();
    c.beginPath(); c.arc(W / 2, H / 2, R + 22, 0, 7); c.lineWidth = 4; c.strokeStyle = "rgba(233,191,95,.5)"; c.stroke();
    return cv.toDataURL("image/png");
  }
  // banner: equirectangular world
  const W = 2560, H = 1440; cv.width = W; cv.height = H; const c = cv.getContext("2d");
  const lonA = -180, lonB = 180, latA = 82, latB = -60, P = (lo, la) => [(lo - lonA) / (lonB - lonA) * W, (latA - la) / (latA - latB) * H];
  sea(c, W, H);
  const path = () => { c.beginPath(); for (const g of LAND) for (const r of rings(g)) { const pts = r.map(([lo, la]) => P(lo, la)); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); } };
  paperLand(c, W, H, path);
  c.strokeStyle = "rgba(40,30,20,.15)"; c.lineWidth = 2;
  for (let lo = -150; lo <= 180; lo += 30) { const [x] = P(lo, 0); c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let la = -60; la <= 60; la += 30) { const [, y] = P(0, la); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  const img = c.getImageData(0, 0, W / 2, H);
  for (let i = 0; i < img.data.length; i += 4) { const d = img.data, y = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; d[i] = y * 0.62 + 12; d[i + 1] = y * 0.6 + 8; d[i + 2] = y * 0.55; }
  c.putImageData(img, 0, 0);
  const v = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(10,12,18,.55)"); c.fillStyle = v; c.fillRect(0, 0, W, H);
  const gl = c.createLinearGradient(0, 0, 0, H); gl.addColorStop(0, "#f7d27a"); gl.addColorStop(0.5, "#e0a940"); gl.addColorStop(1, "#f7d27a");
  c.shadowColor = "rgba(255,210,120,.7)"; c.shadowBlur = 26; c.fillStyle = gl; c.fillRect(W / 2 - 3, 0, 6, H); c.shadowBlur = 0;
  // title in the safe area
  c.textAlign = "center"; c.textBaseline = "middle";
  c.font = "bold 128px Georgia, 'DejaVu Serif', serif"; c.lineWidth = 9; c.strokeStyle = "rgba(40,25,10,.8)"; c.shadowColor = "rgba(0,0,0,.7)"; c.shadowBlur = 30;
  c.strokeText("THE OTHER HALF", W / 2, 690); c.shadowBlur = 0; c.fillStyle = "#f7efdc"; c.fillText("THE OTHER HALF", W / 2, 690);
  console.log("title width", c.measureText("THE OTHER HALF").width);
  c.font = "bold 40px 'DejaVu Sans', sans-serif"; c.lineWidth = 7; c.strokeStyle = "rgba(0,0,0,.75)";
  c.strokeText("The side of history nobody told you", W / 2, 800); c.fillStyle = "#ffe3a8"; c.fillText("The side of history nobody told you", W / 2, 800);
  return cv.toDataURL("image/jpeg", 0.92);
};

(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  p.on("pageerror", (e) => console.log("ERR", e.message));
  await p.setContent("<html><body></body></html>");
  for (const [kind, out] of [["avatar", "../brand/avatar_800.png"], ["banner", "../brand/banner_2560x1440.jpg"]]) {
    const u = await p.evaluate(`(${draw.toString()})(${JSON.stringify(land)}, "${kind}")`);
    fs.writeFileSync(out, Buffer.from(u.split(",")[1], "base64")); console.log(out);
  }
  await b.close();
})();

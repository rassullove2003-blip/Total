// usage: node concepts/render_base.js <layer: wide|rus> <scale>
// Paints the static map base (sea, land with paper grain + coastal shading, lakes, rivers) into public/maps/<region>/base.png.
const fs = require("fs");
const { chromium } = require("playwright");
const [layer = "wide", scale = "1.5"] = process.argv.slice(2);
const dir = "public/maps";
const base = JSON.parse(fs.readFileSync(`${dir}/${layer}.json`));
const [rx0, ry0, rx1, ry1] = base.rect; base.W = rx1 - rx0; base.H = ry1 - ry0; base.ox = rx0; base.oy = ry0;

const draw = (B, sc) => {
  const W = Math.ceil(B.W * sc), H = Math.ceil(B.H * sc);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d"); c.scale(sc, sc); c.translate(-B.ox, -B.oy);
  const rnd = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const px = (v) => v / sc; // widths given in output pixels (same look at any layer scale)
  const ring = (pts) => pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  const landPath = () => { c.beginPath(); for (const p of B.land) for (const r of p) { ring(r); c.closePath(); } };
  // sea: muted teal + soft blotches + fine noise
  c.fillStyle = "#5f8e93"; c.fillRect(B.ox, B.oy, B.W, B.H);
  const cellsOf = (cs, fn) => { for (let gy = Math.floor(B.oy / cs) - 1; gy <= Math.ceil((B.oy + B.H) / cs) + 1; gy++) for (let gx = Math.floor(B.ox / cs) - 1; gx <= Math.ceil((B.ox + B.W) / cs) + 1; gx++) fn(gx * 7919 + gy * 104729, gx * cs, gy * cs); };
  cellsOf(240, (i, cx0, cy0) => { const gx = cx0 + rnd(i) * 240, gy = cy0 + rnd(i + 99) * 240, g = c.createRadialGradient(gx, gy, 0, gx, gy, 40 + rnd(i + 7) * 160);
    g.addColorStop(0, `rgba(${rnd(i + 3) > 0.5 ? "120,165,165" : "70,110,118"},0.18)`); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(gx - 220, gy - 220, 440, 440); });
  // coastal water ripple lines
  landPath(); c.save(); c.lineJoin = "round";
  for (const [w, a] of [[39, 0.05], [24, 0.07], [12, 0.1]]) { c.strokeStyle = `rgba(205,225,220,${a})`; c.lineWidth = px(w); c.stroke(); }
  c.restore();
  // land: warm beige, inner shading toward the coast, paper grain, mottled blotches
  landPath(); c.fillStyle = "#d9c69a"; c.fill("evenodd");
  c.save(); landPath(); c.clip("evenodd");
  cellsOf(100, (i, cx0, cy0) => { const x = cx0 + rnd(i * 3) * 100, y = cy0 + rnd(i * 5) * 100, r = 30 + rnd(i * 7) * 140, g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rnd(i) > 0.5 ? "150,120,70" : "240,225,185"},0.13)`); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); });
  for (let i = 0; i < 26000 * (B.W * B.H * sc * sc / 2.25) / 4e6; i++) { c.fillStyle = rnd(i) > 0.5 ? "rgba(120,95,55,0.10)" : "rgba(255,248,225,0.10)"; c.fillRect(B.ox + rnd(i * 11) * B.W, B.oy + rnd(i * 13) * B.H, px(1.5 + rnd(i * 17) * 3), px(1.5)); }
  landPath(); c.strokeStyle = "rgba(110,85,45,0.35)"; c.lineWidth = px(15); c.stroke(); // darker rim inside the coast
  c.restore();
  landPath(); c.strokeStyle = "#6e5733"; c.lineWidth = px(2.4); c.stroke();
  // lakes
  c.beginPath(); for (const r of B.lakes) { ring(r); c.closePath(); } c.fillStyle = "#6f9ea0"; c.fill(); c.strokeStyle = "#5a7d78"; c.lineWidth = px(1.5); c.stroke();
  // rivers: thin, tapered look by drawing twice
  c.lineCap = c.lineJoin = "round";
  for (const rv of B.rivers) { c.beginPath(); ring(rv.pts); c.strokeStyle = "#6f9ea0"; c.lineWidth = px(rv.name ? 3.3 : 2.1); c.stroke(); }
  return cv.toDataURL("image/png");
};

(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  p.on("pageerror", (e) => console.log("ERR", e.message));
  await p.setContent("<html><body></body></html>");
  const u = await p.evaluate(`(${draw.toString()})(${JSON.stringify(base)}, ${Number(scale)})`);
  fs.writeFileSync(`${dir}/${layer}.png`, Buffer.from(u.split(",")[1], "base64"));
  await b.close();
  console.log("base", `${dir}/${layer}.png`);
})();

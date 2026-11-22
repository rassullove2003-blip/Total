// usage: node concepts/render_base.js <region> <scale>
// Paints the static map base (sea, land with paper grain + coastal shading, lakes, rivers) into public/maps/<region>/base.png.
const fs = require("fs");
const { chromium } = require("playwright");
const [region = "eurasia_w", scale = "2"] = process.argv.slice(2);
const dir = `public/maps/${region}`;
const base = JSON.parse(fs.readFileSync(`${dir}/base.json`));

const draw = (B, sc) => {
  const W = Math.ceil(B.W * sc), H = Math.ceil(B.H * sc);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d"); c.scale(sc, sc);
  const rnd = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const ring = (pts) => pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  const landPath = () => { c.beginPath(); for (const p of B.land) for (const r of p) { ring(r); c.closePath(); } };
  // sea: muted teal + soft blotches + fine noise
  c.fillStyle = "#5f8e93"; c.fillRect(0, 0, B.W, B.H);
  for (let i = 0; i < 260; i++) { const g = c.createRadialGradient(rnd(i) * B.W, rnd(i + 99) * B.H, 0, rnd(i) * B.W, rnd(i + 99) * B.H, 40 + rnd(i + 7) * 160);
    g.addColorStop(0, `rgba(${rnd(i + 3) > 0.5 ? "120,165,165" : "70,110,118"},0.18)`); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(0, 0, B.W, B.H); }
  // coastal water ripple lines
  landPath(); c.save(); c.lineJoin = "round";
  for (const [w, a] of [[26, 0.05], [16, 0.07], [8, 0.1]]) { c.strokeStyle = `rgba(205,225,220,${a})`; c.lineWidth = w; c.stroke(); }
  c.restore();
  // land: warm beige, inner shading toward the coast, paper grain, mottled blotches
  landPath(); c.fillStyle = "#d9c69a"; c.fill("evenodd");
  c.save(); landPath(); c.clip("evenodd");
  for (let i = 0; i < 420; i++) { const x = rnd(i * 3) * B.W, y = rnd(i * 5) * B.H, r = 30 + rnd(i * 7) * 140, g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rnd(i) > 0.5 ? "150,120,70" : "240,225,185"},0.13)`); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
  for (let i = 0; i < 26000; i++) { c.fillStyle = rnd(i) > 0.5 ? "rgba(120,95,55,0.10)" : "rgba(255,248,225,0.10)"; c.fillRect(rnd(i * 11) * B.W, rnd(i * 13) * B.H, 1 + rnd(i * 17) * 2, 1); }
  landPath(); c.strokeStyle = "rgba(110,85,45,0.35)"; c.lineWidth = 10; c.stroke(); // darker rim inside the coast
  c.restore();
  landPath(); c.strokeStyle = "#6e5733"; c.lineWidth = 1.6; c.stroke();
  // lakes
  c.beginPath(); for (const r of B.lakes) { ring(r); c.closePath(); } c.fillStyle = "#6f9ea0"; c.fill(); c.strokeStyle = "#5a7d78"; c.lineWidth = 1; c.stroke();
  // rivers: thin, tapered look by drawing twice
  c.lineCap = c.lineJoin = "round";
  for (const rv of B.rivers) { c.beginPath(); ring(rv.pts); c.strokeStyle = "#6f9ea0"; c.lineWidth = rv.name ? 2.2 : 1.4; c.stroke(); }
  return cv.toDataURL("image/png");
};

(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  p.on("pageerror", (e) => console.log("ERR", e.message));
  await p.setContent("<html><body></body></html>");
  const u = await p.evaluate(`(${draw.toString()})(${JSON.stringify(base)}, ${Number(scale)})`);
  fs.writeFileSync(`${dir}/base.png`, Buffer.from(u.split(",")[1], "base64"));
  await b.close();
  console.log("base", `${dir}/base.png`);
})();

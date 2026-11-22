// usage: node concepts/render_map.js <style A|B|C> <scale> <out.png>
// Draws the map from map_styles.js with Natural Earth data (filtered rivers: big ones + named "ice" rivers).
const fs = require("fs");
const { chromium } = require("playwright");
const [style = "A", scale = "4", out = "public/maptest/map.png"] = process.argv.slice(2);
const ICE = ["Volga", "Oka", "Don", "Kama", "Volkhov", "Msta", "Sheksna", "Klyazma", "Tvertsa", "Pronya"];
const load = (f) => JSON.parse(fs.readFileSync(`data/${f}.geojson`));
const inBox = (f) => (JSON.stringify(f.geometry).match(/-?\d+\.\d+,-?\d+\.\d+/g) || []).some((s) => { const [a, b] = s.split(",").map(Number); return a > 25 && a < 56 && b > 44 && b < 67; });
const keep = (f, maxRank) => ICE.includes(f.properties.name) || (f.properties.scalerank ?? 99) <= maxRank;
(async () => {
  const rivers = [...load("ne_10m_rivers_lake_centerlines").features.filter((f) => keep(f, 8)), ...load("ne_10m_rivers_europe").features.filter((f) => keep(f, 0))].filter(inBox);
  const GEO = { land: load("ne_50m_land"), lakes: load("ne_50m_lakes"), rivers: { features: rivers } };
  const b = await chromium.launch(); const p = await b.newPage();
  p.on("pageerror", (e) => console.log("ERR", e.message));
  await p.setContent("<html><body></body></html>");
  await p.evaluate(() => { window.NO_ROUTE = true; window.NO_LABELS = true; });
  await p.addScriptTag({ path: "concepts/map_styles.js" });
  const u = await p.evaluate(([g, st, sc]) => window.renderMap(g, st, sc), [GEO, style, Number(scale)]);
  fs.writeFileSync(out, Buffer.from(u.split(",")[1], "base64"));
  await b.close();
  console.log("map", out, rivers.length, "rivers");
})();

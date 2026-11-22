import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [from, to, scale = "1", conc = "2"] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "BridgeShort", browserExecutable, chromiumOptions });
const t = Date.now();
await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: `out/speed_${scale}.mp4`, frameRange: [Number(from), Number(to)],
  scale: Number(scale), concurrency: Number(conc), browserExecutable, chromiumOptions, timeoutInMilliseconds: 600000, logLevel: "error" });
const n = Number(to) - Number(from) + 1, s = (Date.now() - t) / 1000;
console.log(`frames ${n} in ${s.toFixed(0)}s = ${(n / s).toFixed(2)} fps, scale ${scale}, concurrency ${conc}`);

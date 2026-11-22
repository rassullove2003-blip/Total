// Our host character: "Bulb" the scientist (concept B4). Drawn with Canvas2D onto a 600x1000 design card
// (same card contract as the bridge template: soles at y = 975, card = 2.16 m tall), shaded in 3D by cardShade().
export const INK = "#1d2340";
export type Expr = "neutral" | "shock" | "grin" | "squint" | "smug";
export type BulbOpts = {
  expr?: Expr; skin?: string; coat?: "lab" | string; screw?: string; glasses?: boolean;
  hair?: "filament" | "curl" | "none"; glow?: number; // 0..1 filament glow
  look?: number; arms?: "down" | "up" | "point" | "shrug"; blink?: number; mouthOpen?: number;
};
type C = CanvasRenderingContext2D;
type P = [number, number];

const ell = (c: C, x: number, y: number, rx: number, ry: number, f: string | null, lw = 0, r = 0) => {
  c.beginPath(); c.ellipse(x, y, rx, ry, r, 0, Math.PI * 2);
  if (f) { c.fillStyle = f; c.fill(); }
  if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); }
};
const line = (c: C, p: P[], lw: number, col = INK) => {
  c.beginPath(); p.forEach((q, i) => (i ? c.lineTo(...q) : c.moveTo(...q)));
  c.lineWidth = lw; c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = col; c.stroke();
};
const curve = (c: C, a: P, k: P, b: P, lw: number, col = INK) => {
  c.beginPath(); c.moveTo(...a); c.quadraticCurveTo(...k, ...b); c.lineWidth = lw; c.lineCap = "round"; c.strokeStyle = col; c.stroke();
};
const shape = (c: C, d: () => void, f: string, lw = 7) => {
  c.beginPath(); d(); c.fillStyle = f; c.fill(); c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = "round"; c.stroke();
};

/** concept space: x 0..300, ground at y = 428; mapped onto the 600x1000 card (soles at 975) */
export const S = 2.1;
export function drawBulb(c: C, o: BulbOpts = {}) {
  const skin = o.skin ?? "#ffe6cf", expr = o.expr ?? "neutral", arms = o.arms ?? "down";
  c.save();
  c.transform(S, 0, 0, S, 300 - 150 * S, 975 - 428 * S);
  // ---- legs + shoes
  line(c, [[135, 350], [131, 420]], 9); line(c, [[165, 350], [169, 420]], 9);
  shape(c, () => { c.moveTo(106, 428); c.lineTo(135, 428); c.lineTo(132, 415); c.quadraticCurveTo(110, 413, 106, 428); }, "#2a2f4a", 5);
  shape(c, () => { c.moveTo(194, 428); c.lineTo(165, 428); c.lineTo(168, 415); c.quadraticCurveTo(190, 413, 194, 428); }, "#2a2f4a", 5);
  // ---- coat
  const y0 = 252;
  if ((o.coat ?? "lab") === "lab") {
    shape(c, () => { c.moveTo(150, y0); c.lineTo(210, 366); c.lineTo(90, 366); c.closePath(); }, "#f4f3ee");
    line(c, [[150, y0 + 8], [150, 362]], 4);
    shape(c, () => c.roundRect(164, 312, 22, 18, 3), "#f4f3ee", 3); // pocket
    line(c, [[170, 308], [170, 318]], 4, "#3b6fd8"); // pen
  } else {
    shape(c, () => { c.moveTo(150, y0); c.lineTo(205, 362); c.lineTo(95, 362); c.closePath(); }, o.coat!);
  }
  // ---- arms
  const L: P = arms === "up" ? [84, 200] : arms === "shrug" ? [80, 268] : [96, 330];
  const R: P = arms === "up" ? [216, 200] : arms === "point" ? [238, 232] : arms === "shrug" ? [220, 268] : [204, 330];
  line(c, [[128, y0 + 30], arms === "shrug" ? [100, 300] : L, L], 8);
  line(c, [[172, y0 + 30], arms === "shrug" ? [200, 300] : R, R], 8);
  ell(c, L[0], L[1] + (arms === "up" ? -7 : 5), 10, 10, skin, 4);
  if (arms === "point") { ell(c, R[0] + 4, R[1], 10, 9, skin, 4); line(c, [[R[0] + 10, R[1] - 2], [R[0] + 26, R[1] - 6]], 7); }
  else ell(c, R[0], R[1] + (arms === "up" ? -7 : 5), 10, 10, skin, 4);
  // ---- screw-base neck
  const screw = o.screw ?? "#c9a35a";
  shape(c, () => c.roundRect(122, 212, 56, 34, 6), screw, 6);
  for (const y of [222, 232]) line(c, [[124, y], [176, y + 3]], 4);
  shape(c, () => { c.moveTo(136, 246); c.lineTo(164, 246); c.lineTo(156, 256); c.lineTo(144, 256); c.closePath(); }, INK, 3);
  // ---- glass head
  shape(c, () => { c.moveTo(150, 40); c.bezierCurveTo(232, 40, 236, 150, 190, 190); c.quadraticCurveTo(178, 206, 176, 214); c.lineTo(124, 214); c.quadraticCurveTo(122, 206, 110, 190); c.bezierCurveTo(64, 150, 68, 40, 150, 40); }, skin);
  c.save(); c.globalAlpha = 0.55; curve(c, [96, 110], [100, 66], [132, 54], 9, "#ffffff"); c.restore();
  // ---- filament hair (+ glow)
  const glow = o.glow ?? 0;
  if ((o.hair ?? "filament") === "filament") {
    if (glow > 0) { c.save(); c.globalAlpha = 0.35 * glow; ell(c, 150, 24, 40, 32, "#ffe066"); c.globalAlpha = 0.6 * glow; ell(c, 150, 24, 22, 18, "#fff3b0"); c.restore(); }
    const col = glow > 0.5 ? "#ffb400" : INK;
    line(c, [[138, 44], [138, 22], [146, 10], [154, 22], [162, 10], [162, 44]], 6, col);
  } else if (o.hair === "curl") { curve(c, [150, 42], [130, 10], [160, 14], 7); curve(c, [160, 14], [180, 20], [166, 34], 7); }
  // ---- eyes
  const look = o.look ?? 0, blink = o.blink ?? 0;
  for (const s of [-1, 1]) {
    const x = 150 + s * 30, y = 128;
    if (expr === "grin" || blink > 0.6) { curve(c, [x - 14, y + 4], [x, y - (expr === "grin" ? 12 : -2)], [x + 14, y + 4], 6); continue; }
    const ry = expr === "shock" ? 22 : expr === "squint" ? 9 : 17;
    ell(c, x, y, 15, ry, "#ffffff", 5);
    ell(c, x + look, y + (expr === "shock" ? 0 : 4), expr === "shock" ? 5 : 6, expr === "shock" ? 5 : 6, INK);
    if (expr === "smug") shape(c, () => { c.ellipse(x, y, 15, 17, 0, Math.PI, Math.PI * 2); c.closePath(); }, skin, 5);
  }
  if (o.glasses ?? true) { for (const s of [-1, 1]) ell(c, 150 + s * 30, 128, 22, 22, null, 5); line(c, [[143, 124], [157, 124]], 5); }
  // ---- brows
  for (const s of [-1, 1]) {
    const x = 150 + s * 30, l = expr === "shock" ? -14 : expr === "squint" ? 6 : 0;
    const t = expr === "neutral" ? 3 * s : expr === "squint" ? -5 * s : expr === "smug" ? (s < 0 ? -6 : 4) : 0;
    line(c, [[x - 12, 96 + l + t], [x + 12, 96 + l - t]], 6);
  }
  // ---- nose + mouth
  curve(c, [150, 138], [164, 160], [146, 166], 5);
  const mo = o.mouthOpen ?? (expr === "shock" ? 1 : 0);
  if (expr === "grin") {
    shape(c, () => { c.moveTo(128, 180); c.quadraticCurveTo(150, 212, 172, 180); c.closePath(); }, "#7a2232", 6);
    shape(c, () => { c.moveTo(132, 181); c.lineTo(168, 181); c.lineTo(166, 189); c.lineTo(134, 189); c.closePath(); }, "#ffffff", 3);
  } else if (mo > 0.15) shape(c, () => c.ellipse(150, 188, 8 + 4 * mo, 6 + 9 * mo, 0, 0, Math.PI * 2), "#7a2232", 6);
  else if (expr === "smug") curve(c, [136, 186], [156, 192], [168, 178], 6);
  else if (expr === "squint") line(c, [[138, 186], [162, 186]], 6);
  else curve(c, [135, 184], [150, 192], [165, 184], 6);
  c.restore();
}

/** canvas for one card pose */
export function bulbCanvas(o: BulbOpts = {}, scale = 1) {
  const cv = document.createElement("canvas");
  cv.width = 600 * scale; cv.height = 1000 * scale;
  const g = cv.getContext("2d")!;
  g.scale(scale, scale);
  drawBulb(g, o);
  return cv;
}

// 2D map engine (DOM/SVG, no WebGL). World space = projected pixels from tools/mapdata.py.
// Camera keys -> CSS transform of one world layer that holds the painted base (base.jpg) and vector territories.
import React from "react";
import { Img, staticFile } from "remotion";

export const REGION = { lon0: 18, lat1: 70, k: Math.cos((55 * Math.PI) / 180), S: 60 };
export const P = (lon: number, lat: number): [number, number] => [(lon - REGION.lon0) * REGION.k * REGION.S, (REGION.lat1 - lat) * REGION.S];
export const FW = 1080, FH = 1920;

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const ss = (t: number) => { const x = clamp01(t); return x * x * x * (x * (x * 6 - 15) + 10); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mixHex = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return "#" + A.map((v, i) => Math.round(lerp(v, B[i], clamp01(t))).toString(16).padStart(2, "0")).join("");
};

// ---------------- camera ----------------
export type CamKey = { f: number; lon: number; lat: number; view: number }; // view = world px visible across the frame width
export const cameraAt = (keys: CamKey[], f: number) => {
  let a = keys[0], b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (f >= keys[i].f && f <= keys[i + 1].f) { a = keys[i]; b = keys[i + 1]; break; }
  if (f <= keys[0].f) b = a = keys[0];
  if (f >= keys[keys.length - 1].f) a = b = keys[keys.length - 1];
  const t = a === b ? 0 : ss((f - a.f) / (b.f - a.f));
  const [ax, ay] = P(a.lon, a.lat), [bx, by] = P(b.lon, b.lat);
  const view = Math.exp(lerp(Math.log(a.view), Math.log(b.view), t));
  // slow creep so holds never freeze (reference: every hold pushes in slightly)
  const creep = 1 - 0.00035 * (f - a.f);
  return { cx: lerp(ax, bx, t), cy: lerp(ay, by, t), scale: (FW / view) / Math.max(0.85, creep) };
};
export const worldStyle = (c: { cx: number; cy: number; scale: number }): React.CSSProperties => ({
  position: "absolute", left: 0, top: 0, transformOrigin: "0 0",
  transform: `translate(${FW / 2 - c.cx * c.scale}px, ${FH / 2 - c.cy * c.scale}px) scale(${c.scale})`,
});
export const toScreen = (c: { cx: number; cy: number; scale: number }, x: number, y: number) => [FW / 2 + (x - c.cx) * c.scale, FH / 2 + (y - c.cy) * c.scale];

// ---------------- territories ----------------
export type Polity = { id: string; name: string; d: string; label: [number, number]; area: number };
export type TerrStyle = { fill: string; opacity: number; flash?: number; pop?: number; dx?: number; label?: string; labelSize?: number; labelOpacity?: number; highlight?: number; strokeOpacity?: number; labelAt?: [number, number] };
export const BaseMap: React.FC<{ region: string; W: number; H: number }> = ({ region, W, H }) => (
  <Img src={staticFile(`maps/${region}/base.jpg`)} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />
);

export const Territories: React.FC<{ polities: Polity[]; styleOf: (p: Polity) => TerrStyle | null; scale: number }> = ({ polities, styleOf, scale }) => {
  const shown = polities.map((p) => ({ p, s: styleOf(p) })).filter((x) => x.s && x.s.opacity > 0.001) as { p: Polity; s: TerrStyle }[];
  const bw = 2.6 / Math.max(0.6, scale * 0.9); // border ~3 px on screen at any zoom
  return (
    <svg width={4000} height={4000} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <defs>
        <filter id="tex" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves={2} seed={3} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.22 0" result="a" />
          <feComposite in="a" in2="SourceGraphic" operator="in" result="g" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="g" /></feMerge>
        </filter>
        <filter id="glow"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      {shown.map(({ p, s }) => {
        const fill = s.flash ? mixHex(s.fill, "#f6efe0", s.flash) : s.fill;
        const pop = s.pop ?? 0, [lx, ly] = p.label;
        return (
          <g key={p.id} opacity={s.opacity} transform={`translate(${(s.dx ?? 0) + lx * -pop * 0.04} ${ly * -pop * 0.04}) scale(${1 + pop * 0.04})`}>
            {s.highlight ? <path d={p.d} fill="#fff8d0" opacity={0.35 * s.highlight} filter="url(#glow)" /> : null}
            <path d={p.d} fill={fill} filter="url(#tex)" />
            <path d={p.d} fill="none" stroke="#14110f" strokeWidth={bw} strokeLinejoin="round" opacity={s.strokeOpacity ?? 1} />
            <path d={p.d} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth={bw * 3} strokeLinejoin="round" opacity={s.strokeOpacity ?? 1} />
          </g>
        );
      })}
      {shown.filter(({ s }) => s.label && (s.labelOpacity ?? 1) > 0.01).map(({ p, s }) => (
        <text key={p.id + "_l"} x={(s.labelAt ? P(...s.labelAt) : p.label)[0]} y={(s.labelAt ? P(...s.labelAt) : p.label)[1]} textAnchor="middle" fontFamily="Georgia, DejaVu Serif, serif" fontWeight={700}
          fontSize={(s.labelSize ?? 22) / scale} fill="#f7efdc" opacity={s.labelOpacity ?? 1} stroke="rgba(30,20,10,.55)" strokeWidth={4 / scale} paintOrder="stroke">{s.label}</text>
      ))}
    </svg>
  );
};

// ---------------- overlays ----------------
type Word = { w: string; s: number; e: number };
/** small phrase captions (2-4 words), like the reference: quiet helper, lower middle */
export const phrases = (words: Word[]) => {
  const out: { text: string; s: number; e: number }[] = [];
  let cur: Word[] = [];
  const push = () => { if (cur.length) out.push({ text: cur.map((w) => w.w).join(" ").replace(/\s+-/g, "-"), s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; };
  for (const w of words) { cur.push(w); if (/[.,!?]$/.test(w.w) || cur.length >= 3) push(); }
  push();
  return out;
};
export const Caption: React.FC<{ t: number; words: Word[] }> = ({ t, words }) => {
  const ph = phrases(words), i = ph.findIndex((p, j) => t >= p.s - 0.05 && t < (ph[j + 1]?.s ?? p.e + 0.5));
  if (i < 0) return null;
  const a = clamp01((t - ph[i].s + 0.05) / 0.12);
  return (
    <div style={{ position: "absolute", top: 1150, width: FW, textAlign: "center", fontFamily: "DejaVu Sans, sans-serif", fontWeight: 700, fontSize: 46,
      color: "#fff", opacity: a, textShadow: "0 3px 8px rgba(0,0,0,.75), 0 0 2px rgba(0,0,0,.9)" }}>{ph[i].text.replace(/[.,]$/, "")}</div>
  );
};
export const YearCard: React.FC<{ f: number; from: number; to: number; text: string }> = ({ f, from, to, text }) => {
  if (f < from || f > to) return null;
  const a = clamp01((f - from) / 8) * (1 - clamp01((f - to + 10) / 10)), y = lerp(0, -60, ss((f - to + 14) / 14));
  return (
    <div style={{ position: "absolute", top: 760 + y, width: FW, textAlign: "center", fontFamily: "Georgia, DejaVu Serif, serif", fontSize: 190, color: "#f7efdc",
      opacity: a, textShadow: "0 6px 18px rgba(0,0,0,.55)", transform: `scale(${0.92 + 0.08 * ss((f - from) / 10)})` }}>{text}</div>
  );
};
/** motion blur for screen-space movers: CSS blur along x scaled by speed */
export const flyIn = (f: number, at: number, dur = 9, dist = 700) => {
  const t = clamp01((f - at) / dur), e = 1 - Math.pow(1 - t, 3), over = Math.sin(clamp01((f - at - dur) / 8) * Math.PI) * 0.035 * (1 - clamp01((f - at - dur - 8) / 4));
  const speed = t < 1 ? 3 * Math.pow(1 - t, 2) * dist / dur : 0;
  return { x: (1 - e) * dist - over * dist * 0.3, blur: Math.min(14, speed * 0.12), visible: f >= at };
};

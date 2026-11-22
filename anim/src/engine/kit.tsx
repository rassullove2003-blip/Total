// 2D map engine v2 (DOM/SVG). World pixels come from tools/mapdata.py (PROJ lon0=-12, lat1=78, lat_ref=50, S=40).
import React from "react";
import { Img, staticFile } from "remotion";

export const PROJ = { lon0: -12, lat1: 78, k: Math.cos((50 * Math.PI) / 180), S: 40 };
export const P = (lon: number, lat: number): [number, number] => [(lon - PROJ.lon0) * PROJ.k * PROJ.S, (PROJ.lat1 - lat) * PROJ.S];
export const FW = 1080, FH = 1920;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const ss = (t: number) => { const x = clamp01(t); return x * x * x * (x * (x * 6 - 15) + 10); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ramp = (f: number, a: number, d: number) => clamp01((f - a) / d);
export const mixHex = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return "#" + A.map((v, i) => Math.round(lerp(v, B[i], clamp01(t))).toString(16).padStart(2, "0")).join("");
};
export type Pt = number[];

// ---------------- camera ----------------
export type CamKey = { f: number; x: number; y: number; view: number; roll?: number };
export type Cam = { cx: number; cy: number; scale: number; roll: number };
export const camKey = (f: number, lon: number, lat: number, view: number, roll = 0): CamKey => { const [x, y] = P(lon, lat); return { f, x, y, view, roll }; };
export const cameraAt = (keys: CamKey[], f: number): Cam => {
  let a = keys[0], b = keys[0];
  if (f >= keys[keys.length - 1].f) a = b = keys[keys.length - 1];
  else for (let i = 0; i < keys.length - 1; i++) if (f >= keys[i].f && f < keys[i + 1].f) { a = keys[i]; b = keys[i + 1]; break; }
  const t = a === b ? 0 : ss((f - a.f) / (b.f - a.f));
  const view = Math.exp(lerp(Math.log(a.view), Math.log(b.view), t));
  const hold = a === b ? f - a.f : 0, creep = 1 + 0.0004 * Math.min(hold, 300);
  return { cx: lerp(a.x, b.x, t), cy: lerp(a.y, b.y, t), scale: (FW / view) * creep, roll: lerp(a.roll ?? 0, b.roll ?? 0, t) };
};
export const worldStyle = (c: Cam): React.CSSProperties => ({
  position: "absolute", left: 0, top: 0, transformOrigin: "0 0",
  transform: `translate(${FW / 2}px, ${FH / 2}px) rotate(${c.roll}deg) scale(${c.scale}) translate(${-c.cx}px, ${-c.cy}px)`,
});
export const toScreen = (c: Cam, x: number, y: number): [number, number] => {
  const r = (c.roll * Math.PI) / 180, dx = (x - c.cx) * c.scale, dy = (y - c.cy) * c.scale;
  return [FW / 2 + dx * Math.cos(r) - dy * Math.sin(r), FH / 2 + dx * Math.sin(r) + dy * Math.cos(r)];
};

// ---------------- base ----------------
export const BaseLayers: React.FC<{ layers: { src: string; rect: number[]; feather?: boolean }[] }> = ({ layers }) => (
  <>{layers.map((l) => <Img key={l.src} src={staticFile(l.src)} style={{ position: "absolute", left: l.rect[0], top: l.rect[1], width: l.rect[2] - l.rect[0], height: l.rect[3] - l.rect[1],
    ...(l.feather ? { WebkitMaskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent), linear-gradient(to bottom, transparent, #000 8%, #000 92%, transparent)", WebkitMaskComposite: "source-in", maskComposite: "intersect" } : {}) }} />)}</>
);

// ---------------- territories ----------------
export type Polity = { id: string; name: string; d: string; label: Pt; area: number };
export type TerrStyle = { fill: string; opacity: number; flash?: number; pop?: number; dx?: number; label?: string; labelSize?: number; labelOpacity?: number;
  glow?: number; stroke?: number; labelAt?: [number, number]; reveal?: { x: number; y: number; r: number } };
export const Territories: React.FC<{ polities: Polity[]; styleOf: (p: Polity) => TerrStyle | null; scale: number; uid: string }> = ({ polities, styleOf, scale, uid }) => {
  const shown = polities.map((p) => ({ p, s: styleOf(p) })).filter((x) => x.s && x.s.opacity > 0.001) as { p: Polity; s: TerrStyle }[];
  const bw = 3 / scale;
  return (
    <svg width={10} height={10} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <defs>
        <filter id={`tex${uid}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={2} seed={5} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.25 0" result="a" />
          <feComposite in="a" in2="SourceGraphic" operator="in" result="g" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="g" /></feMerge>
        </filter>
        <filter id={`glow${uid}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation={10 / scale} /></filter>
        {shown.filter(({ s }) => s.reveal).map(({ p, s }) => <clipPath key={p.id} id={`rv${uid}${p.id}`}><circle cx={s.reveal!.x} cy={s.reveal!.y} r={s.reveal!.r} /></clipPath>)}
      </defs>
      {shown.map(({ p, s }) => {
        const fill = s.flash ? mixHex(s.fill, "#f6efe0", s.flash) : s.fill, pop = s.pop ?? 0, [lx, ly] = p.label;
        return (
          <g key={p.id} opacity={s.opacity} clipPath={s.reveal ? `url(#rv${uid}${p.id})` : undefined}
            transform={`translate(${(s.dx ?? 0) / scale - lx * pop * 0.05} ${-ly * pop * 0.05}) scale(${1 + pop * 0.05})`}>
            {s.glow ? <path d={p.d} fill="none" stroke="#fff6c8" strokeWidth={14 / scale} opacity={0.8 * s.glow} filter={`url(#glow${uid})`} /> : null}
            <path d={p.d} fill={fill} filter={`url(#tex${uid})`} />
            <path d={p.d} fill="none" stroke="#14110f" strokeWidth={bw} strokeLinejoin="round" opacity={s.stroke ?? 1} />
          </g>
        );
      })}
      {shown.filter(({ s }) => s.label && (s.labelOpacity ?? 1) > 0.01).map(({ p, s }) => {
        const [x, y] = s.labelAt ? P(...s.labelAt) : p.label;
        return <text key={p.id + "_l"} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontFamily="Georgia, DejaVu Serif, serif" fontWeight={700}
          fontSize={(s.labelSize ?? 30) / scale} fill="#f7efdc" opacity={(s.labelOpacity ?? 1) * s.opacity} stroke="rgba(30,20,10,.6)" strokeWidth={5 / scale} paintOrder="stroke">{s.label}</text>;
      })}
    </svg>
  );
};

// ---------------- lines in world space ----------------
export const pathOf = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("");
export const lengthOf = (pts: Pt[]) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
export const pointAlong = (pts: Pt[], p: number) => {
  const L = lengthOf(pts), want = clamp01(p) * L; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], d = Math.hypot(bx - ax, by - ay);
    if (acc + d >= want) { const t = (want - acc) / Math.max(d, 1e-6); return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, a: Math.atan2(by - ay, bx - ax) }; }
    acc += d;
  }
  const n = pts.length - 1; return { x: pts[n][0], y: pts[n][1], a: Math.atan2(pts[n][1] - pts[n - 1][1], pts[n][0] - pts[n - 1][0]) };
};
/** army arrow drawn on along a path, with a dark under-stroke and an arrowhead (screen-constant widths) */
export const Arrow: React.FC<{ pts: Pt[]; p: number; scale: number; color?: string; width?: number; dashed?: boolean; opacity?: number; head?: boolean }> = ({ pts, p, scale, color = "#b3271c", width = 12, dashed, opacity = 1, head = true }) => {
  if (p <= 0) return null;
  const L = lengthOf(pts), h = pointAlong(pts, p), w = width / scale;
  return (
    <g opacity={opacity}>
      <path d={pathOf(pts)} fill="none" stroke="#3b0e0a" strokeOpacity={0.4} strokeWidth={w * 1.7} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${L * p} ${L * 2}`} />
      <path d={pathOf(pts)} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? `${w * 2} ${w * 1.4}` : `${L * p} ${L * 2}`}
        style={dashed ? { clipPath: "none" } : undefined} />
      {head && p < 0.999 + 1 ? <path transform={`translate(${h.x} ${h.y}) rotate(${(h.a * 180) / Math.PI}) scale(${1 / scale})`} d="M 30 0 L -12 -22 L -3 0 L -12 22 Z"
        fill={color} stroke="#3b0e0a" strokeWidth={4} strokeLinejoin="round" /> : null}
    </g>
  );
};
/** rivers that glow as ice, sweeping on; `thaw` blends them to mud brown */
export const IceRivers: React.FC<{ rivers: { name: string; ice: boolean; pts: Pt[] }[]; p: number; thaw: number; scale: number; f: number; names: string[]; box: number[] }> = ({ rivers, p, thaw, scale, f, names, box }) => {
  if (p <= 0) return null;
  const inBox = (q: Pt) => q[0] >= box[0] && q[0] <= box[2] && q[1] >= box[1] && q[1] <= box[3];
  const ice: { pts: Pt[] }[] = [];
  const sm = (a: Pt[]) => a.map((q, i) => i === 0 || i === a.length - 1 ? q : [(a[i - 1][0] + 2 * q[0] + a[i + 1][0]) / 4, (a[i - 1][1] + 2 * q[1] + a[i + 1][1]) / 4]);
  for (const r0 of rivers) if (names.includes(r0.name)) { const r = { pts: sm(sm(sm(r0.pts))) }; let cur: Pt[] = []; for (const q of r.pts) { if (inBox(q)) cur.push(q); else { if (cur.length > 1) ice.push({ pts: cur }); cur = []; } } if (cur.length > 1) ice.push({ pts: cur }); }
  const col = mixHex("#f2fbff", "#7a5a32", thaw), edge = mixHex("#7fc4ef", "#4b3418", thaw);
  return (
    <g>
      <defs><filter id="iceglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={6 / scale} /></filter></defs>
      {ice.map((r, i) => {
        const L = lengthOf(r.pts), sweep = clamp01(p * 1.6 - (i % 5) * 0.12);
        const dash = `${L * sweep} ${L * 2}`, flick = 0.85 + 0.15 * Math.sin(f / 6 + i);
        return (
          <g key={i}>
            <path d={pathOf(r.pts)} fill="none" stroke={edge} strokeWidth={14 / scale} strokeOpacity={0.4 * flick * (1 - thaw * 0.6)} strokeDasharray={dash} strokeLinecap="round" filter="url(#iceglow)" />
            <path d={pathOf(r.pts)} fill="none" stroke={edge} strokeWidth={9 / scale} strokeDasharray={dash} strokeLinecap="round" strokeLinejoin="round" />
            <path d={pathOf(r.pts)} fill="none" stroke={col} strokeWidth={5 / scale} strokeDasharray={dash} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
};

// ---------------- icons (world-anchored, screen-constant size) ----------------
export const Flame: React.FC<{ x: number; y: number; age: number; f: number; scale: number; size?: number }> = ({ x, y, age, f, scale, size = 1 }) => {
  const s = (ss(age / 8) * (1 + 0.1 * Math.sin(f / 2.1 + x)) * size) / scale;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle r={46} fill="#ff7a1a" opacity={0.2 + 0.3 * Math.max(0, 1 - age / 30)} />
      <path d="M0 -50 C 18 -26 26 -10 16 8 C 10 18 -10 18 -16 8 C -26 -10 -13 -24 0 -50 Z" fill="#f2552c" stroke="#5a1d0e" strokeWidth={4} />
      <path d="M0 -26 C 9 -13 11 -4 6 5 C 3 10 -4 10 -6 5 C -10 -4 -6 -13 0 -26 Z" fill="#ffd25a" />
      {[0, 1, 2].map((k) => { const t = ((f / 14 + k / 3) % 1); return <circle key={k} cx={Math.sin(k * 2 + f / 9) * 10} cy={-56 - t * 70} r={9 + t * 14} fill="#4a4038" opacity={0.35 * (1 - t)} />; })}
    </g>
  );
};
export const City: React.FC<{ x: number; y: number; name: string; scale: number; opacity?: number; side?: "r" | "l" | "b"; size?: number }> = ({ x, y, name, scale, opacity = 1, side = "r", size = 34 }) => (
  <g opacity={opacity} transform={`translate(${x} ${y}) scale(${1 / scale})`}>
    <rect x={-11} y={-11} width={22} height={22} rx={3} fill="#7a2e22" stroke="#efe2c0" strokeWidth={5} transform="rotate(45)" />
    <text x={side === "l" ? -22 : side === "b" ? 0 : 22} y={side === "b" ? 44 : 2} textAnchor={side === "l" ? "end" : side === "b" ? "middle" : "start"} dominantBaseline="middle"
      fontFamily="Georgia, DejaVu Serif, serif" fontWeight={700} fontSize={size} fill="#2e2112" stroke="#efe2c0" strokeWidth={9} paintOrder="stroke">{name}</text>
  </g>
);
export const Trees: React.FC<{ pts: Pt[]; scale: number; f: number; at: number }> = ({ pts, scale, f, at }) => (
  <g>{pts.map(([x, y], i) => { const a = ss((f - at - i * 1.2) / 8); if (a <= 0) return null; const s = (a * (0.8 + (i % 3) * 0.15)) / scale; return (
    <g key={i} transform={`translate(${x} ${y}) scale(${s})`}><path d="M0 -48 L 20 -6 L 8 -6 L 24 22 L -24 22 L -8 -6 L -20 -6 Z" fill="#3f6b3a" stroke="#1d2a17" strokeWidth={4} strokeLinejoin="round" />
      <rect x={-4} y={22} width={8} height={10} fill="#5a3b20" /></g>); })}</g>
);
export const Swamps: React.FC<{ pts: Pt[]; scale: number; f: number; at: number }> = ({ pts, scale, f, at }) => (
  <g>{pts.map(([x, y], i) => { const a = ss((f - at - i * 2) / 8); if (a <= 0) return null; return (
    <g key={i} transform={`translate(${x} ${y}) scale(${a / scale})`}><ellipse rx={46} ry={16} fill="#6c6a3a" stroke="#2c2a14" strokeWidth={4} />
      {[-22, 0, 20].map((dx, k) => <path key={k} d={`M ${dx} -4 q -4 -26 -10 -34 M ${dx} -4 q 4 -24 10 -30`} stroke="#3e5a2a" strokeWidth={5} fill="none" strokeLinecap="round" />)}</g>); })}</g>
);
export const Snowflake: React.FC<{ x: number; y: number; s: number; rot?: number; color?: string }> = ({ x, y, s, rot = 0, color = "#eaf7ff" }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    {[0, 60, 120].map((a) => <g key={a} transform={`rotate(${a})`}><path d="M0 -40 V40 M0 -26 l-10 -10 M0 -26 l10 -10 M0 26 l-10 10 M0 26 l10 10" stroke="#24405a" strokeWidth={10} strokeLinecap="round" fill="none" />
      <path d="M0 -40 V40 M0 -26 l-10 -10 M0 -26 l10 -10 M0 26 l-10 10 M0 26 l10 10" stroke={color} strokeWidth={5} strokeLinecap="round" fill="none" /></g>)}
  </g>
);

// ---------------- characters ----------------
export type Rig = { w: number; h: number; eyes?: { cx: number; cy: number; rx: number; ry: number; lid: string }[]; mouth?: { cx: number; cy: number; w: number; lip: string; skin: string }; neck?: number[] };
export type Pose = { x: number; y: number; h: number; talk?: number; blink?: number; shock?: number; flip?: boolean; rot?: number; opacity?: number; blur?: number; bob?: number; tint?: string };
/** cut-out character: feet at (x, y) in screen px, h = on-screen height. Mouth from talk (0..1), shock = jaw-drop */
export const Actor: React.FC<{ src: string; rig: Rig; pose: Pose; f: number }> = ({ src, rig, pose, f }) => {
  const s = pose.h / rig.h, w = rig.w * s, open = Math.max(pose.talk ?? 0, (pose.shock ?? 0) * 1.6), m = rig.mouth;
  const head = rig.neck ? (1.2 * Math.sin(f / 23) + (pose.talk ?? 0) * 1.6 * Math.sin(f / 4)) : 0;
  const face = (
    <svg width={rig.w} height={rig.h} style={{ position: "absolute", inset: 0 }}>
      {(pose.blink ?? 0) > 0 && rig.eyes?.map((e, i) => {
        const top = e.cy - e.ry - 6, hh = (2 * e.ry + 12) * (pose.blink ?? 0);
        return <g key={i}><clipPath id={`e${i}${src}`}><ellipse cx={e.cx} cy={e.cy} rx={e.rx + 4} ry={e.ry + 6} /></clipPath>
          <g clipPath={`url(#e${i}${src})`}><rect x={e.cx - e.rx - 6} y={top} width={2 * e.rx + 12} height={hh} fill={e.lid} />
            <path d={`M ${e.cx - e.rx - 4} ${top + hh} Q ${e.cx} ${top + hh + 6} ${e.cx + e.rx + 4} ${top + hh}`} stroke="#3a1d12" strokeWidth={4} fill="none" /></g></g>;
      })}
      {m && open > 0.08 && (() => {
        const ry = 3 + 18 * Math.min(open, 1.6), rx = (m.w / 2) * (0.72 + 0.12 * Math.min(open, 1)), cy = m.cy + ry * 0.5;
        return <g><ellipse cx={m.cx} cy={cy} rx={rx + 3} ry={ry + 3} fill={m.skin} opacity={0.9} />
          <ellipse cx={m.cx} cy={cy} rx={rx} ry={ry} fill="#3b100b" />
          <clipPath id={`m${src}`}><ellipse cx={m.cx} cy={cy} rx={rx} ry={ry} /></clipPath>
          <g clipPath={`url(#m${src})`}><rect x={m.cx - rx} y={cy - ry} width={2 * rx} height={Math.min(9, ry * 0.45)} fill="#f1e7dc" />
            <ellipse cx={m.cx} cy={cy + ry * 0.85} rx={rx * 0.62} ry={ry * 0.5} fill="#b9463f" /></g>
          <path d={`M ${m.cx - rx} ${cy + 1} Q ${m.cx} ${cy + ry * 1.2} ${m.cx + rx} ${cy + 1}`} stroke={m.lip} strokeWidth={5} fill="none" strokeLinecap="round" /></g>;
      })()}
    </svg>
  );
  const breathe = 1 + 0.01 * Math.sin(f / 13 + pose.x);
  const neckPct = rig.neck ? ((rig.neck[1] - 10) / rig.h) * 100 : 0;
  return (
    <div style={{ position: "absolute", left: pose.x - w / 2, top: pose.y - pose.h - (pose.bob ?? 0), width: w, height: pose.h, opacity: pose.opacity ?? 1,
      filter: (pose.blur ?? 0) > 0.3 ? `blur(${pose.blur}px)` : undefined, transformOrigin: "50% 100%",
      transform: `rotate(${pose.rot ?? 0}deg) scaleX(${pose.flip ? -1 : 1}) scaleY(${breathe})` }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: rig.w, height: rig.h, transform: `scale(${s})`, transformOrigin: "0 0" }}>
        <div style={{ position: "absolute", left: "8%", right: "8%", bottom: -18, height: 40, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(30,20,10,.45), rgba(30,20,10,0))" }} />
        <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: rig.w, height: rig.h, filter: pose.tint }} />
        {rig.neck ? (
          <div style={{ position: "absolute", inset: 0, transform: `rotate(${head}deg)`, transformOrigin: `${rig.neck[0]}px ${rig.neck[1]}px`, clipPath: `polygon(0 0, 100% 0, 100% ${neckPct}%, 0 ${neckPct}%)` }}>
            <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: rig.w, height: rig.h, filter: pose.tint }} />
            {face}
          </div>
        ) : null}
      </div>
    </div>
  );
};
export const blinkAt = (f: number, seed = 0) => { const period = 70 + (seed % 3) * 17, d = (f + seed * 23) % period; return d < 6 ? [0.5, 1, 1, 0.6, 0.25, 0][d] : 0; };
export const mouthAt = (env: number[], f: number) => {
  if (f < 0 || f >= env.length) return 0;
  const v = (env[f] + (env[f - 1] ?? 0) * 0.6 + (env[f + 1] ?? 0) * 0.6) / 2.2;
  return clamp01((v - 0.08) * 1.5);
};

// ---------------- timeline bar ----------------
export type DateKey = { f: number; date: number; span: number }; // date in fractional years; span = years visible across the bar
export const TimelineBar: React.FC<{ keys: DateKey[]; f: number; marks: { date: number; label: string; span?: [number, number] }[]; opacity?: number }> = ({ keys, f, marks: allMarks, opacity = 1 }) => {
  let a = keys[0], b = keys[0];
  if (f >= keys[keys.length - 1].f) a = b = keys[keys.length - 1];
  else for (let i = 0; i < keys.length - 1; i++) if (f >= keys[i].f && f < keys[i + 1].f) { a = keys[i]; b = keys[i + 1]; break; }
  const t = a === b ? 0 : ss((f - a.f) / (b.f - a.f));
  const date = lerp(a.date, b.date, t), span = Math.exp(lerp(Math.log(a.span), Math.log(b.span), t));
  const X = (d: number) => FW / 2 + ((d - date) / span) * (FW - 80);
  const marks = allMarks.filter((m) => !m.span || (span >= m.span[0] && span <= m.span[1]));
  const step = span > 600 ? 100 : span > 150 ? 50 : span > 30 ? 10 : span > 2.5 ? 1 : 1 / 12;
  const ticks: number[] = []; for (let d = Math.ceil((date - span) / step) * step; d < date + span; d += step) ticks.push(Math.round(d * 1e4) / 1e4);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const lab = (d: number) => (step < 1 ? MONTHS[Math.round((d - Math.floor(d)) * 12) % 12] : String(Math.round(d)));
  const now = step < 1 ? `${MONTHS[Math.floor((date - Math.floor(date)) * 12) % 12]} ${Math.floor(date)}` : String(Math.floor(date));
  return (
    <div style={{ position: "absolute", left: 0, top: FH - 250, width: FW, height: 250, opacity }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(20,16,10,0), rgba(20,16,10,.72) 40%)" }} />
      <svg width={FW} height={250} style={{ position: "absolute", inset: 0 }}>
        <line x1={0} x2={FW} y1={150} y2={150} stroke="#e9dcc0" strokeWidth={4} opacity={0.8} />
        {ticks.map((d) => { const x = X(d), major = step < 1 ? Math.abs(d - Math.round(d)) < 1e-3 : Math.abs(d / (step * 5) - Math.round(d / (step * 5))) < 1e-3;
          return <g key={d} opacity={clamp01(1 - Math.abs(x - FW / 2) / (FW / 2))}><line x1={x} x2={x} y1={major ? 132 : 140} y2={150} stroke="#e9dcc0" strokeWidth={major ? 4 : 2} />
            {step >= 1 || span < 1.6 ? <text x={x} y={192} textAnchor="middle" fontFamily="Georgia, DejaVu Serif, serif" fontSize={major ? 30 : 24} fill="#e9dcc0">{lab(d)}</text> : null}</g>; })}
        {marks.map((m) => { const x = X(m.date); if (x < -50 || x > FW + 50) return null; const nearest = marks.reduce((b, q) => (Math.abs(q.date - date) < Math.abs(b.date - date) ? q : b), marks[0]); const near = nearest === m ? clamp01(1 - Math.abs(m.date - date) / (span * 0.15)) : 0;
          return <g key={m.label + m.date}><circle cx={x} cy={150} r={9 + near * 4} fill="#d64235" stroke="#f3e4c4" strokeWidth={3} />
            <text x={x} y={118} textAnchor="middle" fontFamily="DejaVu Sans, sans-serif" fontWeight={700} fontSize={26} fill="#ffdca8" opacity={near > 0.35 ? near : 0}>{m.label}</text></g>; })}
        <path d={`M ${FW / 2 - 16} 76 L ${FW / 2 + 16} 76 L ${FW / 2} 98 Z`} fill="#f7c24a" />
        <text x={FW / 2} y={62} textAnchor="middle" fontFamily="Georgia, DejaVu Serif, serif" fontWeight={700} fontSize={44} fill="#f7efdc" stroke="rgba(0,0,0,.5)" strokeWidth={6} paintOrder="stroke">{now}</text>
      </svg>
    </div>
  );
};

// ---------------- captions & cards ----------------
type Word = { w: string; s: number; e: number };
export const phrases = (words: Word[]) => {
  const out: { text: string; s: number; e: number }[] = []; let cur: Word[] = [];
  const push = () => { if (cur.length) out.push({ text: cur.map((w) => w.w).join(" ").replace(/\s+-/g, "-"), s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; };
  for (const w of words) { cur.push(w); if (/[.,:!?]$/.test(w.w) || cur.length >= 3) push(); }
  push(); return out;
};
export const Caption: React.FC<{ t: number; words: Word[]; top?: number }> = ({ t, words, top = 1520 }) => {
  const ph = phrases(words), i = ph.findIndex((p, j) => t >= p.s - 0.05 && t < (ph[j + 1]?.s ?? p.e + 0.5));
  if (i < 0) return null;
  return <div style={{ position: "absolute", top, width: FW, textAlign: "center", fontFamily: "DejaVu Sans, sans-serif", fontWeight: 700, fontSize: 48, color: "#fff",
    opacity: clamp01((t - ph[i].s + 0.05) / 0.12), textShadow: "0 3px 8px rgba(0,0,0,.8), 0 0 3px rgba(0,0,0,.9)" }}>{ph[i].text.replace(/[.,:]$/, "")}</div>;
};
export const BigText: React.FC<{ f: number; from: number; to: number; text: string; top?: number; size?: number; color?: string }> = ({ f, from, to, text, top = 520, size = 150, color = "#f7efdc" }) => {
  if (f < from || f > to) return null;
  const a = ramp(f, from, 6) * (1 - ramp(f, to - 8, 8)), pop = 0.85 + 0.15 * ss((f - from) / 8) + 0.04 * Math.sin(ramp(f, from, 10) * Math.PI);
  return <div style={{ position: "absolute", top, width: FW, textAlign: "center", fontFamily: "Georgia, DejaVu Serif, serif", fontWeight: 700, fontSize: size, color,
    opacity: a, transform: `scale(${pop})`, textShadow: "0 6px 20px rgba(0,0,0,.6)", WebkitTextStroke: "3px rgba(40,25,10,.6)" }}>{text}</div>;
};
export const Rewind: React.FC<{ f: number; from: number; to: number }> = ({ f, from, to }) => {
  if (f < from || f > to) return null;
  const a = ramp(f, from, 4) * (1 - ramp(f, to - 4, 4)), x = ((f - from) * 18) % 60;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(10,12,20,.75) 100%)", opacity: a }} />
      <svg width={FW} height={FH} style={{ position: "absolute", inset: 0, opacity: a }}>
        {[0, 1, 2].map((k) => <path key={k} transform={`translate(${FW / 2 + 60 - k * 70 - x * 0.3} ${FH / 2 - 40})`} d="M 0 -50 L -60 0 L 0 50 Z" fill="#fff" stroke="#000" strokeOpacity={0.3} strokeWidth={4} opacity={0.9} />)}
      </svg>
    </>
  );
};

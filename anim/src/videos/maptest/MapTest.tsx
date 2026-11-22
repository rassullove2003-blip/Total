// 2D cut-out test: painted Batu on the parchment map, lip-sync (envelope + letter-based mouth shapes), blinks,
// breathing, head bob, route drawn along the real frozen rivers with burning cities, falling snow with depth,
// word captions. Pure DOM/SVG: no WebGL, fast to render.
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import rig from "../../../public/maptest/batu_rig.json";
import voice from "../../../public/maptest/voice.json";
import route from "../../../public/maptest/route.json";

export const MAPTEST_FRAMES = 300;
const VOICE_AT = 12;
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
type Word = { w: string; s: number; e: number };
const WORDS = voice.words as Word[];
const wordStart = (prefix: string) => { const w = WORDS.find((x) => x.w.toLowerCase().startsWith(prefix)); return w ? VOICE_AT + w.s * 30 : 9999; };

// ---------- lip sync ----------
const env = (f: number) => {
  const i = f - VOICE_AT, e = voice.env as number[];
  if (i < 0 || i >= e.length) return 0;
  const v = (e[i] + (e[i - 1] ?? 0) * 0.6 + (e[i + 1] ?? 0) * 0.6) / 2.2;
  return clamp01((v - 0.08) * 1.5);
};
/** mouth shape from the letter being spoken: wide (a e i), round (o u w), closed (m b p) */
const shapeAt = (f: number): "wide" | "round" | "closed" | "rest" => {
  const t = (f - VOICE_AT) / 30, w = WORDS.find((x) => t >= x.s && t < x.e);
  if (!w) return "rest";
  const letters = w.w.toLowerCase().replace(/[^a-z]/g, "");
  if (!letters) return "rest";
  const ch = letters[Math.min(letters.length - 1, Math.floor(((t - w.s) / Math.max(0.05, w.e - w.s)) * letters.length))];
  if ("mbp".includes(ch)) return "closed";
  if ("ouw".includes(ch)) return "round";
  return "wide";
};
const BLINKS = [40, 118, 196, 262];
const blinkAt = (f: number) => { for (const b of BLINKS) { const d = f - b; if (d >= 0 && d < 6) return [0.5, 1, 1, 0.6, 0.25, 0][d]; } return 0; };

const Snow: React.FC<{ f: number; near: boolean }> = ({ f, near }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, filter: near ? "blur(2.5px)" : undefined }}>
    {Array.from({ length: near ? 14 : 45 }, (_, i) => {
      const sp = (near ? 3.2 : 1.1) + ((i * 37) % 10) / 8, x0 = (i * 151 + (near ? 77 : 0)) % 1080, y = ((i * 263 + f * sp * 3) % 2000) - 40;
      const x = x0 + Math.sin((f + i * 20) / (near ? 18 : 30)) * (near ? 30 : 12), r = near ? 7 + (i % 4) * 2 : 1.6 + (i % 3);
      return <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={near ? 0.55 : 0.7} />;
    })}
  </svg>
);

const Face: React.FC<{ f: number }> = ({ f }) => {
  const o = env(f), b = blinkAt(f), m = rig.mouth, sh = shapeAt(f);
  const open = sh === "closed" ? 0.05 : o * (sh === "round" ? 1.05 : sh === "wide" ? 0.85 : 0.6);
  const ry = 3 + 18 * open, rx = (m.w / 2) * (sh === "round" ? 0.55 + 0.1 * open : sh === "wide" ? 0.8 + 0.15 * open : 0.7);
  const cy = m.cy + ry * 0.5;
  return (
    <svg width={rig.w} height={rig.h} style={{ position: "absolute", inset: 0 }}>
      <defs>
        {rig.eyes.map((e, i) => <clipPath key={i} id={`eye${i}`}><ellipse cx={e.cx} cy={e.cy} rx={e.rx + 4} ry={e.ry + 6} /></clipPath>)}
        <clipPath id="mouthIn"><ellipse cx={m.cx} cy={cy} rx={rx} ry={ry} /></clipPath>
        <radialGradient id="mouthG" cx="50%" cy="35%" r="70%"><stop offset="0%" stopColor="#2a0b08" /><stop offset="100%" stopColor="#5a1d15" /></radialGradient>
      </defs>
      {b > 0 && rig.eyes.map((e, i) => {
        const top = e.cy - e.ry - 6, h = (2 * e.ry + 12) * b;
        return (
          <g key={i} clipPath={`url(#eye${i})`}>
            <rect x={e.cx - e.rx - 6} y={top} width={2 * e.rx + 12} height={h} fill={e.lid} />
            <path d={`M ${e.cx - e.rx - 4} ${top + h} Q ${e.cx} ${top + h + 6} ${e.cx + e.rx + 4} ${top + h}`} stroke="#3a1d12" strokeWidth={4} fill="none" />
          </g>
        );
      })}
      {open > 0.08 && (
        <g>
          <ellipse cx={m.cx} cy={cy} rx={rx + 3} ry={ry + 3} fill={m.skin} opacity={0.9} />
          <ellipse cx={m.cx} cy={cy} rx={rx} ry={ry} fill="url(#mouthG)" />
          <g clipPath="url(#mouthIn)">
            <rect x={m.cx - rx} y={cy - ry} width={2 * rx} height={Math.min(9, ry * 0.45)} fill="#f1e7dc" />
            <ellipse cx={m.cx} cy={cy + ry * 0.85} rx={rx * 0.62} ry={ry * 0.5} fill="#b9463f" />
          </g>
          <path d={`M ${m.cx - rx} ${cy + 1} Q ${m.cx} ${cy + ry * 1.2} ${m.cx + rx} ${cy + 1}`} stroke={m.lip} strokeWidth={5} fill="none" strokeLinecap="round" />
          <path d={`M ${m.cx - rx} ${cy - 1} Q ${m.cx} ${cy - ry * 1.05} ${m.cx + rx} ${cy - 1}`} stroke="#9c4a2e" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.8} />
        </g>
      )}
    </svg>
  );
};

const Batu: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f - 4, fps, config: { damping: 11, stiffness: 120 } });
  const pf = wordStart("purpose");
  const pop = spring({ frame: f - pf + 4, fps, config: { damping: 8, stiffness: 200 } }) * (1 - ease((f - pf - 10) / 20));
  const breathe = 1 + 0.008 * Math.sin(f / 14);
  const talk = env(f);
  const headRot = 1.6 * Math.sin(f / 23) + talk * 1.4 * Math.sin(f / 4);
  const sway = 0.6 * Math.sin(f / 31);
  const s = 0.58, cx = 300;
  const footY = 1920 + 20 - 20 + (1 - enter) * 900; // ground line under the boots (scaled from the bottom of the card)
  return (
    <>
      <div style={{ position: "absolute", left: cx - 170, top: footY - 34, width: 340, height: 56, borderRadius: "50%",
        background: "radial-gradient(closest-side, rgba(40,25,10,.5), rgba(40,25,10,0))" }} />
      <div style={{ position: "absolute", left: cx - rig.w / 2, top: 1920 - rig.h + 20 + (1 - enter) * 900,
        width: rig.w, height: rig.h, transform: `rotate(${sway}deg) scale(${s * (1 + 0.04 * pop)}, ${s * breathe * (1 + 0.04 * pop)})`, transformOrigin: "50% 100%" }}>
        <Img src={staticFile("maptest/batu.png")} style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", inset: 0, transform: `rotate(${headRot}deg)`, transformOrigin: `${rig.neck[0]}px ${rig.neck[1]}px`,
          clipPath: `polygon(0 0, 100% 0, 100% ${((rig.neck[1] - 10) / rig.h) * 100}%, 0 ${((rig.neck[1] - 10) / rig.h) * 100}%)` }}>
          <Img src={staticFile("maptest/batu.png")} style={{ position: "absolute", inset: 0 }} />
          <Face f={f} />
        </div>
      </div>
    </>
  );
};

const R = route as unknown as { pts: number[][]; len: number; cityAt: Record<string, number>; cities: { n: string; xy: number[]; below: boolean }[] };
const K = 2; // design 540x960 -> 1080x1920
const pointAt = (p: number) => {
  let acc = 0; const want = p * R.len;
  for (let i = 1; i < R.pts.length; i++) {
    const [ax, ay] = R.pts[i - 1], [bx, by] = R.pts[i], d = Math.hypot(bx - ax, by - ay);
    if (acc + d >= want) { const t = (want - acc) / Math.max(d, 1e-6); return { x: (ax + (bx - ax) * t) * K, y: (ay + (by - ay) * t) * K, a: Math.atan2(by - ay, bx - ax) }; }
    acc += d;
  }
  const [x, y] = R.pts[R.pts.length - 1]; return { x: x * K, y: y * K, a: 0 };
};
const SACKED = ["Ryazan", "Kolomna", "Moscow", "Vladimir", "Tver", "Torzhok"];
const R0 = 60, R1 = 280; // frames over which the route is drawn
const progressAt = (f: number) => ease(interpolate(f, [R0, R1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
const reachedAt = (p: number) => { for (let f = R0; f <= R1; f++) if (progressAt(f) >= p) return f; return R1; };
const CITY = SACKED.map((n) => { const q = pointAt(R.cityAt[n]); return { n, x: q.x, y: q.y, at: reachedAt(R.cityAt[n]) }; });

const Flame: React.FC<{ x: number; y: number; age: number; f: number }> = ({ x, y, age, f }) => {
  const s = ease(age / 8) * (1 + 0.08 * Math.sin(f / 2.3 + x));
  return (
    <g transform={`translate(${x} ${y - 6}) scale(${s})`}>
      <circle r={34} fill="#ff7a1a" opacity={0.25 * Math.max(0, 1 - age / 40) + 0.1} />
      <path d="M0 -38 C 14 -20 20 -8 12 6 C 8 14 -8 14 -12 6 C -20 -8 -10 -18 0 -38 Z" fill="#f2552c" stroke="#5a1d0e" strokeWidth={3} />
      <path d="M0 -20 C 7 -10 9 -3 5 4 C 2 8 -3 8 -5 4 C -8 -3 -5 -10 0 -20 Z" fill="#ffd25a" />
    </g>
  );
};

const Route: React.FC<{ f: number }> = ({ f }) => {
  const d = R.pts.map(([x, y], i) => `${i ? "L" : "M"} ${x * K} ${y * K}`).join(" ");
  const p = progressAt(f), L = R.len * K, head = pointAt(p);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <path d={d} fill="none" stroke="#4a120d" strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${L * p} ${L + 10}`} opacity={0.35} />
      <path d={d} fill="none" stroke="#b3271c" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${L * p} ${L + 10}`} />
      {CITY.filter((c) => f >= c.at).map((c) => <Flame key={c.n} x={c.x} y={c.y} age={f - c.at} f={f} />)}
      {R.cities.map((c) => {
        const x = c.xy[0] * K, y0 = c.xy[1] * K, y = c.below ? y0 + 44 : y0;
        return (
          <g key={c.n}>
            <circle cx={x} cy={y0} r={15} fill="#7a2e22" stroke="#e6d3a8" strokeWidth={6} />
            <text x={x + 24} y={y + 14} fontFamily="Georgia, DejaVu Serif, serif" fontWeight={700} fontSize={42} fill="#3b2a18" stroke="#ecdcb4" strokeWidth={10} paintOrder="stroke">{c.n}</text>
          </g>
        );
      })}
      {p > 0.002 && p < 0.999 && (
        <g transform={`translate(${head.x} ${head.y}) rotate(${(head.a * 180) / Math.PI})`}>
          <path d="M 26 0 L -10 -18 L -2 0 L -10 18 Z" fill="#b3271c" stroke="#4a120d" strokeWidth={4} strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
};

const Caption: React.FC<{ f: number }> = ({ f }) => {
  const t = (f - VOICE_AT) / 30;
  const i = WORDS.findIndex((w, j) => t >= w.s - 0.05 && t < (WORDS[j + 1]?.s ?? w.e + 0.4));
  if (i < 0) return null;
  const w = WORDS[i].w.replace(/[.,]/g, "").toUpperCase(), age = t - WORDS[i].s;
  const sc = 0.85 + 0.15 * ease(age / 0.08);
  const hot = ["WINTER", "PURPOSE", "DEATH"].includes(w);
  return (
    <div style={{ position: "absolute", top: 330, width: 1080, textAlign: "center", fontFamily: "DejaVu Sans, sans-serif", fontWeight: 900,
      fontSize: 96, color: hot ? "#ffd54a" : "#fff", WebkitTextStroke: "11px #1b1a24", paintOrder: "stroke fill", transform: `scale(${sc})` }}>{w}</div>
  );
};

export const MapTest: React.FC = () => {
  const f = useCurrentFrame();
  const z = 1 + 0.16 * ease(f / 300);
  const wf = wordStart("winter");
  const stamp = spring({ frame: f - wf, fps: 30, config: { damping: 9, stiffness: 160 } });
  return (
    <AbsoluteFill style={{ background: "#2b2016", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: "38% 42%" }}>
        <Img src={staticFile("maptest/map.png")} style={{ width: 1080, height: 1920 }} />
        <Route f={f} />
      </AbsoluteFill>
      <Snow f={f} near={false} />
      {f >= wf && (
        <div style={{ position: "absolute", top: 140, width: 1080, textAlign: "center", transform: `scale(${stamp}) rotate(${-4 * stamp}deg)`,
          fontFamily: "Georgia, DejaVu Serif, serif", fontWeight: 900, fontSize: 96, color: "#f3e2bf", WebkitTextStroke: "8px #3b2a18", paintOrder: "stroke fill" }}>WINTER, 1237</div>
      )}
      <Batu f={f} />
      <Snow f={f} near />
      <Caption f={f} />
      <Sequence from={VOICE_AT}><Audio src={staticFile("maptest/voice.wav")} /></Sequence>
    </AbsoluteFill>
  );
};

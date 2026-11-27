// "Caesar crosses the Rubicon" — civil war 49–48 BC, Caesar RED vs Pompey BLUE.
// Stages: MAP (Mediterranean, tokens + arrows), RIVER (the crossing), VS (split screen), FIELD (Pharsalus, top-down battle), END (fork).
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import {
  Actor, Arrow, BaseLayers, BigText, Boom, Caption, City, Polity, Rig, Stamp, Territories, TerrStyle, TimelineBar, CamKey,
  blinkAt, cameraAt, clamp01, lerp, mixHex, ramp, ss, toScreen, worldStyle, FW, FH, Pt, P, pointAlong, pathOf, lengthOf,
} from "../../engine/kit";
import b49 from "../../../public/maps/borders_49bc.json";
import rp from "../../../public/maps/rome_points.json";
import voice from "../../../public/rubicon/voice.json";
import rigs from "../../../public/chars/rigs.json";

const VO = 12;
export const RUBICON_FRAMES = VO + Math.ceil((voice as { dur: number }).dur * 30) + 75;
type Word = { w: string; s: number; e: number };
const WORDS = (voice as { words: Word[] }).words;
const RIG = rigs as unknown as Record<string, Rig>;
const POL0 = b49 as unknown as Polity[];
const byId = (id: string) => POL0.find((p) => p.id === id)!;
const POL = [...POL0, ...["italy", "spain", "greece", "east"].map((id) => ({ ...byId(id), id: id + "_r" }))]; // red copies revealed by a growing circle
const C = (rp as unknown as { cities: Record<string, Pt> }).cities;
const R = (rp as unknown as { routes: Record<string, Pt[]> }).routes;
const MED_RECT = [25.7, 560.0, 1337.0, 2480.0];
const AUDIO = "rubicon/mix.wav";

export const RED = "#c3372a", RED_D = "#5e140d", BLUE = "#2f5fbf", BLUE_D = "#132c63", GOLD = "#f2c14e";

// word cues (frames incl. VO offset)
const F = {
  bc49: 22, crossed: 88, river: 109, declared: 128, rome: 150, name: 181, caesar: 218, gaul: 263, senate: 294, order: 314, give: 329, enemy: 369,
  kept: 402, single: 442, legion: 448, crossed2: 466, rubicon: 479, die: 502, cast: 514, romeP: 537, panicked: 542, pompey: 566, great: 577, champion: 604,
  abandoned: 620, sailed: 651, greece: 665, ship: 706, italy: 719, couldnt: 741, west: 789, spain: 814, destroyed: 829, then: 891, back: 903, dyr: 950,
  beat: 978, hungry: 1009, retreated: 1025, deep: 1042, pharsalus: 1076, august: 1096, n22: 1142, against: 1172, n40: 1192, cavalry: 1277, seven: 1250,
  horsemen: 1305, swept: 1316, flank: 1349, over: 1378, wait: 1394, how: 1414, win: 1437, yousee: 1443, hidden: 1478, fourth: 1487, veterans: 1504,
  leapt: 1555, thrust: 1571, riders: 1603, panicked2: 1639, whole: 1677, collapsed: 1692, fled: 1729, egypt: 1738, moment: 1762, stabbed: 1801,
  man: 1828, served: 1846, head: 1886, presented: 1896, gift: 1933, wept: 1964, so: 1985, traitor: 2019, saved: 2057, senate2: 2092,
};

type Stage = "map" | "river" | "vs" | "field" | "end";
const STAGES: [number, Stage][] = [[0, "map"], [398, "river"], [533, "map"], [561, "vs"], [621, "map"], [1071, "field"], [1713, "map"], [1981, "end"]];
const stageAt = (f: number): Stage => { let s: Stage = "map"; for (const [a, st] of STAGES) if (f >= a) s = st; return s; };
const cutFlash = (f: number) => { let d = 99; for (const [a] of STAGES.slice(1)) d = Math.min(d, Math.abs(f - a)); return d < 3 ? 1 - d / 3 : 0; };

const rnd = (i: number) => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const chaikin = (pts: Pt[], n = 3): Pt[] => { let a = pts; for (let k = 0; k < n; k++) { const b: Pt[] = [a[0]]; for (let i = 0; i < a.length - 1; i++) { const [x0, y0] = a[i], [x1, y1] = a[i + 1]; b.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]); } b.push(a[a.length - 1]); a = b; } return a; };
const bump = (f: number, at: number, d = 14) => (f < at || f > at + d ? 0 : Math.sin(((f - at) / d) * Math.PI));
const serif = "Georgia, DejaVu Serif, serif", sans = "DejaVu Sans, sans-serif";

// ------------------------------------------------------------------ small pieces
const Legionary: React.FC<{ x: number; y: number; h: number; side: "red" | "blue"; sub?: number; op?: number; flip?: boolean; tint?: string }> = ({ x, y, h, side, sub = 0, op = 1, flip, tint }) => {
  const r = RIG[`legion_${side}`], w = (r.w * h) / r.h;
  return <div style={{ position: "absolute", left: x - w / 2, top: y - h, width: w, height: h * (1 - sub), overflow: "hidden", opacity: op }}>
    <Img src={staticFile(`chars/legion_${side}.png`)} style={{ width: w, height: h, transform: flip ? "scaleX(-1)" : undefined, filter: tint }} /></div>;
};
/** army token on the map: a legionary standing on a coloured disc, with the commander's name */
const Token: React.FC<{ x: number; y: number; side: "red" | "blue"; label?: string; op?: number; bob?: number; rot?: number; h?: number }> = ({ x, y, side, label, op = 1, bob = 0, rot = 0, h = 150 }) => {
  if (op <= 0.01) return null;
  const col = side === "red" ? RED : BLUE, dk = side === "red" ? RED_D : BLUE_D;
  return <div style={{ position: "absolute", left: 0, top: 0, opacity: op }}>
    <svg width={FW} height={FH} style={{ position: "absolute", inset: 0 }}>
      <ellipse cx={x} cy={y} rx={h * 0.36} ry={h * 0.13} fill={col} stroke={dk} strokeWidth={5} opacity={0.95} />
    </svg>
    <div style={{ position: "absolute", left: 0, top: 0, transform: `rotate(${rot}deg)`, transformOrigin: `${x}px ${y}px` }}>
      <Legionary x={x} y={y + 4 - bob} h={h} side={side} />
    </div>
    {label && <div style={{ position: "absolute", left: x - 120, width: 240, top: y + 16, textAlign: "center", fontFamily: sans, fontWeight: 800, fontSize: 26, letterSpacing: 2,
      color: "#fff", textShadow: `0 0 6px ${dk}, 0 2px 4px #000` }}>{label}</div>}
  </div>;
};
const Plate: React.FC<{ x: number; y: number; text: React.ReactNode; color: string; op: number; size?: number; align?: "l" | "c" | "r"; sub?: string; rot?: number }> = ({ x, y, text, color, op, size = 44, align = "c", sub, rot = 0 }) => {
  if (op <= 0.01) return null;
  const tx = align === "c" ? "-50%" : align === "r" ? "-100%" : "0";
  return <div style={{ position: "absolute", left: x, top: y, transform: `translate(${tx}, 0) rotate(${rot}deg) scale(${0.9 + 0.1 * op})`, opacity: op, padding: "10px 26px 12px",
    background: color, border: "4px solid rgba(255,240,210,.85)", borderRadius: 8, boxShadow: "0 8px 20px rgba(0,0,0,.45)", fontFamily: serif, fontWeight: 700, fontSize: size,
    color: "#fff7e6", whiteSpace: "nowrap", textAlign: "center", textShadow: "0 2px 4px rgba(0,0,0,.5)" }}>{text}
    {sub && <div style={{ fontSize: size * 0.5, fontWeight: 400, fontStyle: "italic", marginTop: 2 }}>{sub}</div>}</div>;
};
const Galley: React.FC<{ x: number; y: number; a: number; s?: number; color?: string }> = ({ x, y, a, s = 1, color = BLUE }) => (
  <g transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI}) scale(${s})`}>
    <path d="M -34 0 Q -30 12 0 12 Q 30 12 38 -2 L 30 -2 Q 0 4 -34 0 Z" fill="#5a3b20" stroke="#2a1a0c" strokeWidth={3} />
    {[-22, -12, -2, 8, 18].map((ox) => <line key={ox} x1={ox} y1={10} x2={ox - 6} y2={22} stroke="#2a1a0c" strokeWidth={2.5} />)}
    <line x1={0} y1={2} x2={0} y2={-34} stroke="#2a1a0c" strokeWidth={3} />
    <path d="M -14 -32 L 14 -32 L 12 -8 L -12 -8 Z" fill={color} stroke="#14203a" strokeWidth={2.5} />
  </g>
);
const Die: React.FC<{ x: number; y: number; rot: number; face: number; s?: number }> = ({ x, y, rot, face, s = 1 }) => {
  const pips: Record<number, number[][]> = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-52} y={-52} width={104} height={104} rx={18} fill="#f4ead4" stroke="#3a2a16" strokeWidth={6} />
    <rect x={-44} y={-44} width={88} height={30} rx={12} fill="#fff" opacity={0.5} />
    {pips[face].map(([px, py], i) => <circle key={i} cx={px * 26} cy={py * 26} r={10} fill={face === 1 ? "#b3271c" : "#2a1d0e"} />)}
  </g>;
};

// ------------------------------------------------------------------ RIVER stage: the legion wades across the Rubicon toward us
const RIVER_Y0 = 960, RIVER_Y1 = 1110;
const RiverScene: React.FC<{ f: number }> = ({ f }) => {
  const march = (row: number) => ss(ramp(f, F.crossed2 - 6 + row * 5, 70));
  const men: { x: number; y: number; h: number; sub: number; key: string }[] = [];
  for (let row = 0; row < 4; row++) for (let k = 0; k < 6 - (row === 0 ? 1 : 0); k++) {
    const y0 = 640 + row * 70, x0 = 170 + k * 140 + (row % 2) * 70 + (row === 0 ? 50 : 0), m = march(row);
    const y = y0 + m * 560, h = 100 + (y - 640) * 0.5, x = 540 + (x0 - 540) * (1 + (y - y0) * 0.0011);
    const sub = y > RIVER_Y0 + 20 && y < RIVER_Y1 + 30 ? 0.3 * Math.sin(clamp01((y - RIVER_Y0 - 20) / (RIVER_Y1 + 10 - RIVER_Y0)) * Math.PI) : 0;
    men.push({ x, y: y + Math.abs(Math.sin(f / 3 + k + row)) * (m > 0 && m < 1 ? 6 : 0), h, sub, key: `${row}_${k}` });
  }
  men.sort((a, b) => a.y - b.y);
  const caesarOp = 1 - ramp(f, F.crossed2 + 8, 8), caesarX = 250 - 420 * ss(ramp(f, F.crossed2 - 8, 16));
  return (
    <AbsoluteFill>
      <svg width={FW} height={FH} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="rsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e8c98f" /><stop offset="1" stopColor="#f3e2b8" /></linearGradient>
          <linearGradient id="rwater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4f8a96" /><stop offset="1" stopColor="#2f6676" /></linearGradient>
        </defs>
        <rect width={FW} height={520} fill="url(#rsky)" />
        <path d="M 0 470 C 160 380 300 420 420 390 C 560 350 700 420 820 380 C 930 350 1010 390 1080 370 L 1080 560 L 0 560 Z" fill="#9aa27a" opacity={0.8} />
        <path d="M 0 520 C 200 470 380 500 560 470 C 760 440 900 500 1080 470 L 1080 600 L 0 600 Z" fill="#8c9466" />
        <rect y={560} width={FW} height={RIVER_Y0 - 560 + 20} fill="#c9b783" />
        {Array.from({ length: 60 }, (_, i) => <path key={i} d={`M ${rnd(i) * FW} ${600 + rnd(i + 9) * 340} l 6 -14 l 6 14`} stroke="#8a7a4c" strokeWidth={3} fill="none" opacity={0.5} />)}
        <path d={`M 0 ${RIVER_Y0} C 300 ${RIVER_Y0 - 30} 700 ${RIVER_Y0 + 25} 1080 ${RIVER_Y0 - 10} L 1080 ${RIVER_Y1 + 10} C 700 ${RIVER_Y1 + 40} 300 ${RIVER_Y1 - 20} 0 ${RIVER_Y1} Z`} fill="url(#rwater)" stroke="#3a2a16" strokeWidth={4} />
        {Array.from({ length: 22 }, (_, i) => { const y = RIVER_Y0 + 20 + (i % 6) * 22, x = ((i * 211 + f * (2 + (i % 3))) % 1300) - 110;
          return <path key={i} d={`M ${x} ${y} q 25 -8 50 0 q 25 8 50 0`} stroke="#cfeaf0" strokeOpacity={0.5} strokeWidth={4} fill="none" />; })}
        <rect y={RIVER_Y1} width={FW} height={FH - RIVER_Y1} fill="#d6c493" />
        <path d={`M 0 ${RIVER_Y1} C 300 ${RIVER_Y1 - 20} 700 ${RIVER_Y1 + 40} 1080 ${RIVER_Y1 + 10} L 1080 ${RIVER_Y1 + 40} L 0 ${RIVER_Y1 + 40} Z`} fill="#b9a675" />
        {/* signpost */}
        <g transform="translate(940 1230)"><rect x={-6} y={-150} width={12} height={160} fill="#5a3b20" /><rect x={-110} y={-190} width={220} height={66} rx={6} fill="#8a6234" stroke="#3a2412" strokeWidth={5} />
          <text x={0} y={-146} textAnchor="middle" fontFamily={serif} fontWeight={700} fontSize={38} fill="#f6ead0">RUBICON</text></g>
      </svg>
      <Plate x={40} y={420} text="GAUL" sub="Caesar's province" color={RED} op={ramp(f, F.kept, 8) * (1 - ramp(f, F.crossed2, 10))} size={40} align="l" />
      <Plate x={FW - 40} y={1290} text="ITALY" sub="no army may enter" color={BLUE} op={ramp(f, F.kept + 6, 8) * (1 - ramp(f, F.die, 10))} size={40} align="r" />
      {men.map((m) => { const inW = m.sub > 0.02; return <React.Fragment key={m.key}>
        <Legionary x={m.x} y={inW ? m.y - m.h * m.sub * 0.0 : m.y} h={m.h} side="red" sub={m.sub} />
        {inW && <svg width={FW} height={FH} style={{ position: "absolute", inset: 0 }}><ellipse cx={m.x} cy={m.y - m.h * m.sub} rx={m.h * 0.22} ry={m.h * 0.04} fill="none" stroke="#e6f6f8" strokeWidth={4} opacity={0.8} />
          <ellipse cx={m.x + 10 * Math.sin(f / 2 + m.x)} cy={m.y - m.h * m.sub - 6} rx={m.h * 0.12} ry={m.h * 0.025} fill="#e6f6f8" opacity={0.6} /></svg>}
      </React.Fragment>; })}
      {caesarOp > 0 && <Actor src="chars/caesar.png" rig={RIG.caesar} f={f} pose={{ x: caesarX, y: 1450, h: 700, blink: blinkAt(f, 4), opacity: caesarOp, bob: caesarX < 249 ? Math.abs(Math.sin(f / 2.5)) * 12 : 0 }} />}
      <Plate x={540} y={250} text="ONE LEGION" sub="Legio XIII · about 5,000 men" color={RED} op={ramp(f, F.single, 8) * (1 - ramp(f, F.die - 4, 8))} size={56} />
      {/* the die is cast */}
      {f >= F.die - 4 && [0, 1].map((i) => {
        const t = ramp(f, F.die - 4 + i * 3, 14), land = F.die + 10 + i * 3, b = f - land;
        const y = b < 0 ? -150 + 1330 * t * t : 1180 - Math.abs(Math.sin(b * 0.42)) * 90 * Math.exp(-b * 0.2);
        const face = b < 0 ? 1 + Math.floor(rnd(f + i * 7) * 6) : [6, 4][i];
        return <svg key={i} width={FW} height={FH} style={{ position: "absolute", inset: 0 }}><Die x={430 + i * 230 + (b < 0 ? (1 - t) * 120 * (i ? 1 : -1) : 0)} y={y} rot={b < 0 ? t * 540 * (i ? -1 : 1) : (i ? -14 : 9)} face={face} s={1.2} /></svg>;
      })}
      <BigText f={f} from={F.die} to={533} text="ALEA IACTA EST" top={300} size={100} color={GOLD} />
      <BigText f={f} from={F.die + 6} to={533} text="“the die is cast”" top={430} size={54} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ VS stage: red | blue split
const VsScene: React.FC<{ f: number }> = ({ f }) => {
  const k = ss(ramp(f, 561, 12)), shake = f < 575 ? Math.sin(f * 2.3) * 6 * (1 - ramp(f, 566, 9)) : 0;
  return (
    <AbsoluteFill style={{ transform: `translateX(${shake}px)` }}>
      <AbsoluteFill style={{ background: `linear-gradient(160deg, #e0503c, ${RED} 45%, ${RED_D})`, clipPath: "polygon(0 0, 600px 0, 480px 1920px, 0 1920px)", transform: `translateX(${-(1 - k) * 700}px)` }} />
      <AbsoluteFill style={{ background: `linear-gradient(200deg, #5a86df, ${BLUE} 45%, ${BLUE_D})`, clipPath: "polygon(600px 0, 1080px 0, 1080px 1920px, 480px 1920px)", transform: `translateX(${(1 - k) * 700}px)` }} />
      <AbsoluteFill style={{ background: "repeating-linear-gradient(115deg, rgba(255,255,255,.05) 0 30px, rgba(0,0,0,.04) 30px 60px)" }} />
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${-(1 - k) * 700}px)` }}>
        {[0, 1, 2].map((i) => <Legionary key={i} x={80 + i * 150} y={1130 - (i % 2) * 30} h={430} side="red" op={0.55} tint="brightness(.55) saturate(.8)" />)}
        <Actor src="chars/caesar.png" rig={RIG.caesar} f={f} pose={{ x: 260, y: 1450, h: 880, blink: blinkAt(f, 1) }} />
      </div>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${(1 - k) * 700}px)` }}>
        {[0, 1, 2].map((i) => <Legionary key={i} x={700 + i * 150} y={1130 - (i % 2) * 30} h={430} side="blue" op={0.55} tint="brightness(.55) saturate(.8)" />)}
        <Actor src="chars/pompey.png" rig={RIG.pompey} f={f} pose={{ x: 815, y: 1450, h: 880, blink: blinkAt(f, 3) }} />
      </div>
      <div style={{ position: "absolute", left: 40, top: 200, fontFamily: serif, fontWeight: 700, fontSize: 92, color: "#fff4e0", textShadow: "0 6px 16px rgba(0,0,0,.5)", opacity: k }}>CAESAR</div>
      <div style={{ position: "absolute", right: 40, top: 200, textAlign: "right", fontFamily: serif, fontWeight: 700, fontSize: 92, color: "#fff4e0", textShadow: "0 6px 16px rgba(0,0,0,.5)", opacity: ramp(f, F.pompey, 8) }}>POMPEY
        <div style={{ fontSize: 44, opacity: ramp(f, F.great, 8) }}>“the Great”</div>
        <div style={{ fontSize: 36, fontStyle: "italic", fontWeight: 400, marginTop: 8, opacity: ramp(f, F.champion - 10, 8) }}>the Senate's champion</div></div>
      <div style={{ position: "absolute", left: 40, top: 310, fontFamily: serif, fontSize: 36, fontStyle: "italic", color: "#fff4e0", opacity: k }}>the rebel general</div>
      <div style={{ position: "absolute", left: 0, width: FW, top: 640, textAlign: "center", fontFamily: serif, fontWeight: 700, fontSize: 170, color: GOLD,
        transform: `scale(${0.6 + 0.4 * ss(ramp(f, F.pompey, 8)) + 0.08 * bump(f, F.pompey + 4, 10)})`, textShadow: "0 8px 24px rgba(0,0,0,.6)", WebkitTextStroke: "4px #3a2412", opacity: ramp(f, F.pompey, 5) }}>VS</div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ FIELD stage: Pharsalus from above
type Unit = { side: "r" | "b"; cav?: boolean; x: number; y: number; w: number; h: number; rows: number; cols: number; appear: number; seed: number; line?: number; k?: number; march?: number };
const RED_INF: Unit[] = [0, 1, 2].flatMap((line) => [0, 1, 2, 3, 4].map((k) => ({ side: "r" as const, x: 250 + k * 120, y: 945 + line * 70, w: 100, h: 38, rows: 3, cols: 12, appear: F.pharsalus + 2 + line * 10 + k * 3, seed: line * 10 + k, line, k, march: 1 })));
const BLUE_INF: Unit[] = [0, 1, 2].flatMap((line) => [0, 1, 2, 3, 4, 5].map((k) => ({ side: "b" as const, x: 230 + k * 104, y: 700 - line * 72, w: 92, h: 54, rows: 5, cols: 11, appear: F.pharsalus + 14 + line * 9 + k * 3, seed: 100 + line * 10 + k, line, k, march: -1 })));
const BLUE_CAV: Unit[] = [[870, 520], [960, 520], [870, 590], [960, 590], [870, 660], [960, 660], [915, 730]].map(([x, y], i) => ({ side: "b" as const, cav: true, x, y, w: 66, h: 40, rows: 3, cols: 7, appear: F.seven - 8 + i * 4, seed: 200 + i }));
const RED_CAV: Unit = { side: "r", cav: true, x: 905, y: 945, w: 66, h: 40, rows: 2, cols: 7, appear: 1234, seed: 300 };
const FOURTH: Unit[] = [0, 1, 2, 3, 4, 5].map((i) => ({ side: "r" as const, x: 800 + (i % 3) * 72 + Math.floor(i / 3) * 20, y: 1150 + Math.floor(i / 3) * 44, w: 60, h: 32, rows: 2, cols: 8, appear: F.hidden + i * 3, seed: 400 + i }));

const UnitBlock: React.FC<{ u: Unit; dx: number; dy: number; scatter: number; op: number; f: number; glow?: number; dir?: [number, number] }> = ({ u, dx, dy, scatter, op, f, glow = 0, dir = [0, -1] }) => {
  if (op <= 0.01) return null;
  const col = u.side === "r" ? RED : BLUE, dk = u.side === "r" ? RED_D : BLUE_D, marchIn = u.march ?? 0;
  const pop = marchIn ? ramp(f, u.appear, 2) : ss(ramp(f, u.appear, 8)), mv = marchIn ? 1 - ss(ramp(f, u.appear, 42)) : 0;
  const x = u.x + dx, y = u.y + dy + marchIn * 520 * mv, n = u.rows * u.cols, sc = marchIn ? 1 : 1.25 - 0.25 * pop;
  return (
    <g transform={`translate(${x} ${y}) scale(${sc})`} opacity={op * pop}>
      {glow > 0 && <rect x={-u.w / 2 - 10} y={-u.h / 2 - 10} width={u.w + 20} height={u.h + 20} rx={10} fill="none" stroke={GOLD} strokeWidth={5} opacity={glow} />}
      {scatter < 0.3 && <rect x={-u.w / 2} y={-u.h / 2} width={u.w} height={u.h} rx={5} fill={col} opacity={0.3 * (1 - scatter / 0.3)} stroke={dk} strokeWidth={2.5} />}
      {Array.from({ length: n }, (_, j) => {
        const gx = -u.w / 2 + ((j % u.cols) + 0.5) * (u.w / u.cols), gy = -u.h / 2 + (Math.floor(j / u.cols) + 0.5) * (u.h / u.rows);
        const r1 = rnd(u.seed * 97 + j), r2 = rnd(u.seed * 31 + j * 7), jit = scatter > 0 ? Math.sin(f * 0.9 + j) * 2 : Math.sin(f / 9 + j) * 0.5;
        const px = gx + scatter * ((r1 - 0.5) * u.w * 1.4 + dir[0] * (0.4 + r2) * 220) + jit, py = gy + scatter * ((r2 - 0.5) * u.h * 1.5 + dir[1] * (0.4 + r1) * 220);
        return u.cav ? <ellipse key={j} cx={px} cy={py} rx={2.6} ry={4.6} fill={col} stroke={dk} strokeWidth={1.2} opacity={1 - scatter * r1 * 0.7} />
          : <rect key={j} x={px - 2.6} y={py - 2.6} width={5.2} height={5.2} rx={1} fill={col} stroke={dk} strokeWidth={1.1} opacity={1 - scatter * r1 * 0.7} />;
      })}
      {scatter < 0.5 && <g opacity={1 - scatter * 2}><line x1={-u.w / 2 + 8} y1={-u.h / 2} x2={-u.w / 2 + 8} y2={-u.h / 2 - 26} stroke="#3a2412" strokeWidth={3} />
        <rect x={-u.w / 2 + 9} y={-u.h / 2 - 26} width={20} height={14} fill={col} stroke={dk} strokeWidth={2} /><circle cx={-u.w / 2 + 19} cy={-u.h / 2 - 19} r={3} fill={GOLD} /></g>}
    </g>
  );
};

const fieldCam = (f: number) => {
  const keys = [{ f: 1071, x: 540, y: 900, z: 1.06 }, { f: 1140, x: 540, y: 900, z: 1 }, { f: 1250, x: 560, y: 880, z: 1 }, { f: 1300, x: 640, y: 900, z: 1.1 },
    { f: 1360, x: 720, y: 960, z: 1.25 }, { f: 1443, x: 760, y: 990, z: 1.28 }, { f: 1500, x: 860, y: 1070, z: 1.62 }, { f: 1600, x: 850, y: 1030, z: 1.55 }, { f: 1640, x: 800, y: 950, z: 1.3 }, { f: 1675, x: 560, y: 880, z: 1 }];
  let a = keys[0], b = keys[0];
  if (f >= keys[keys.length - 1].f) a = b = keys[keys.length - 1]; else for (let i = 0; i < keys.length - 1; i++) if (f >= keys[i].f && f < keys[i + 1].f) { a = keys[i]; b = keys[i + 1]; break; }
  const t = a === b ? 0 : ss((f - a.f) / (b.f - a.f));
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
};
const fmt = (n: number) => Math.round(n).toLocaleString("en");

const FieldScene: React.FC<{ f: number }> = ({ f }) => {
  const cam = fieldCam(f);
  const s1 = ss(ramp(f, F.horsemen, 44)), s2 = ss(ramp(f, F.flank, 45)), hit = ss(ramp(f, F.thrust, 18)), rout = ss(ramp(f, F.panicked2 - 12, 80));
  const charge = ss(ramp(f, F.leapt, 20)), wheel = ss(ramp(f, F.whole - 16, 40)), adv = ss(ramp(f, F.whole - 14, 44));
  const freeze = ramp(f, F.wait - 2, 5) * (1 - ramp(f, F.yousee - 4, 8)), over = f >= F.over - 14 && f < F.wait ? 1 : 0;
  const plates = 1 - ramp(f, F.horsemen - 6, 10);
  const blueRout = (u: Unit) => { const st = F.whole - 4 + (5 - (u.k ?? 0)) * 3 + (u.line ?? 0) * 2; return ss(ramp(f, st, 42)); };
  return (
    <AbsoluteFill style={{ filter: freeze > 0 ? `grayscale(${freeze}) brightness(${1 - 0.25 * freeze})` : undefined }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: "0 0", transform: `translate(540px, 960px) scale(${cam.z}) translate(${-cam.x}px, ${-cam.y}px)` }}>
        <svg width={FW} height={FH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <defs>
            <filter id="grass" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={3} seed={3} />
              <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.36  0 0 0 0 0.18  0 0 0 0.45 0" /></filter>
          </defs>
          <rect x={-400} y={-400} width={FW + 800} height={FH + 800} fill="#b3ad74" />
          <rect x={-400} y={-400} width={FW + 800} height={FH + 800} filter="url(#grass)" />
          {Array.from({ length: 140 }, (_, i) => <path key={i} d={`M ${-300 + rnd(i) * 1700} ${-200 + rnd(i + 5) * 2300} l 5 -12 l 5 12 m -14 0 l 4 -8`} stroke="#7d7a43" strokeWidth={2.5} fill="none" opacity={0.55} />)}
          {/* hills + Pompey's camp */}
          <path d="M -400 330 C -100 240 100 300 300 250 C 520 190 700 280 900 230 C 1100 190 1300 260 1500 230 L 1500 -400 L -400 -400 Z" fill="#8f9458" />
          <path d="M -400 250 C 0 170 200 220 420 170 C 650 120 860 200 1500 140 L 1500 -400 L -400 -400 Z" fill="#7f854b" />
          <g transform="translate(560 160)"><rect x={-150} y={-60} width={300} height={110} fill="none" stroke="#5a3b20" strokeWidth={8} strokeDasharray="10 6" />
            {[-90, -30, 30, 90].map((x) => <path key={x} d={`M ${x - 18} 20 L ${x} -14 L ${x + 18} 20 Z`} fill="#efe4c8" stroke="#5a3b20" strokeWidth={3} />)}
            <line x1={0} y1={-60} x2={0} y2={-120} stroke="#3a2412" strokeWidth={4} /><rect x={0} y={-120} width={44} height={28} fill={f > F.collapsed + 4 ? mixHex(BLUE, RED, ramp(f, F.collapsed + 4, 10)) : BLUE} stroke="#14203a" strokeWidth={3} />
            <text x={0} y={80} textAnchor="middle" fontFamily={serif} fontWeight={700} fontSize={30} fill="#2e2112" stroke="#efe2c0" strokeWidth={7} paintOrder="stroke">Pompey's camp</text></g>
          {/* river Enipeus on Caesar's left */}
          <path d="M 120 -400 C 60 200 170 500 100 800 C 40 1100 150 1400 90 2400" stroke="#4a7f88" strokeWidth={84} fill="none" strokeLinecap="round" />
          <path d="M 120 -400 C 60 200 170 500 100 800 C 40 1100 150 1400 90 2400" stroke="#6f9ea0" strokeWidth={64} fill="none" />
          <text transform="translate(104 1240) rotate(-84)" textAnchor="middle" fontFamily={serif} fontStyle="italic" fontWeight={700} fontSize={30} fill="#e6f2ee">river Enipeus</text>
          {/* units */}
          {BLUE_INF.map((u) => { const r = blueRout(u); return <UnitBlock key={u.seed} u={u} f={f} dx={r * 40 * ((u.k ?? 0) - 2.5) * 0.3} dy={-r * 260} scatter={r} op={1 - ramp(f, F.whole + 12 + (5 - (u.k ?? 0)) * 3, 30)} />; })}
          {RED_INF.map((u) => <UnitBlock key={u.seed} u={u} f={f} dx={over && (u.k ?? 0) >= 3 ? Math.sin(f * 1.7 + (u.k ?? 0)) * 4 : 0} dy={-adv * 90 - ((u.line ?? 0) < 2 ? 1 : 0.5) * 185 * ss(ramp(f, 1284 + (u.k ?? 0) * 2, 34))} scatter={0} op={1} />)}
          {f >= 1312 && f < F.collapsed + 20 && Array.from({ length: 16 }, (_, i) => { const t = ((f * (0.8 + rnd(i) * 0.6) / 30 + rnd(i + 3)) % 1), x = 200 + i * 38 + Math.sin(i * 3.1) * 10, y = 748 - adv * 90 - t * 40;
            return <circle key={i} cx={x} cy={y} r={10 + t * 26} fill="#e8dcb8" opacity={0.42 * (1 - t) * ramp(f, 1312, 12) * (1 - ramp(f, F.collapsed, 20))} />; })}
          <UnitBlock u={RED_CAV} f={f} dx={70 * s1 + 30 * s2 - 40 * wheel} dy={210 * s1 + 30 * s2 - 330 * wheel} scatter={0} op={1 - 0.55 * s1 + 0.55 * wheel} />
          {BLUE_CAV.map((u, i) => <UnitBlock key={u.seed} u={u} f={f} dx={80 * s1 - 50 * s2 + 30 * rout + Math.sin(i) * 20 * rout} dy={300 * s1 + 130 * s2 - 40 * hit - 620 * rout} scatter={rout} op={1 - ramp(f, F.panicked2 + 40, 40)} dir={[0.15, -1]} />)}
          {FOURTH.map((u, i) => { const rev = ramp(f, u.appear, 8);
            return <UnitBlock key={u.seed} u={{ ...u, appear: u.appear }} f={f} dx={50 * charge + 60 * wheel} dy={-90 * charge - 400 * wheel} scatter={0} op={rev} glow={f < F.leapt + 20 ? (0.5 + 0.5 * Math.sin(f / 4 + i)) * rev : 0} />; })}
          {/* hint of the hidden line before the reveal */}
          {f >= F.yousee + 4 && f < F.hidden + 8 && <rect x={760} y={1120} width={240} height={110} rx={10} fill="none" stroke={GOLD} strokeWidth={5} strokeDasharray="14 10" opacity={0.5 + 0.5 * Math.sin(f / 3)} />}
          {/* spears thrust up at the riders */}
          {f >= F.thrust - 4 && f < F.riders + 20 && FOURTH.slice(0, 3).flatMap((u, i) => [0, 1, 2, 3].map((q) => {
            const x = u.x + 50 * charge - 24 + q * 16, y = u.y - 90 * charge - u.h / 2 + 4, L = 26 + 26 * Math.max(0, Math.sin(f * 0.8 + q * 1.7 + i));
            return <g key={`${i}${q}`}><line x1={x} y1={y} x2={x + L * 0.4} y2={y - L} stroke="#3a2412" strokeWidth={6} strokeLinecap="round" />
              <line x1={x} y1={y} x2={x + L * 0.4} y2={y - L} stroke="#f3ead6" strokeWidth={3} strokeLinecap="round" /></g>; }))}
          {/* arrows */}
          <g opacity={1 - ramp(f, F.yousee, 20)}><Arrow pts={chaikin([[960, 690], [1050, 850], [1040, 1010], [960, 1120], [850, 1180]])} p={s1 * 0.6 + s2 * 0.4} scale={1} color={BLUE} width={22} /></g>
          <g opacity={1 - ramp(f, F.panicked2, 20)}><Arrow pts={chaikin([[880, 1200], [915, 1110], [960, 1030]])} p={charge} scale={1} color={RED} width={22} /></g>
          <g opacity={1 - ramp(f, F.collapsed + 10, 14)}><Arrow pts={chaikin([[960, 1020], [1030, 880], [1000, 740], [900, 660]])} p={ss(ramp(f, F.whole - 16, 30))} scale={1} color={RED} width={22} />
            {[320, 500, 680].map((x) => <Arrow key={x} pts={[[x, 700], [x, 560]]} p={ss(ramp(f, F.whole - 10, 22))} scale={1} color={RED} width={18} />)}</g>
          {f >= F.thrust && f < F.thrust + 18 && <g transform={`translate(950 1070)`}><circle r={20 + (f - F.thrust) * 4} fill="#efe2c0" opacity={0.5 * (1 - (f - F.thrust) / 18)} /></g>}
        </svg>
        <Plate x={490} y={1205} text={<>CAESAR · {fmt(22000 * ss(ramp(f, F.n22, 22)))}</>} color={RED} op={ramp(f, F.n22 - 4, 8) * plates} size={42} />
        <Plate x={490} y={380} text={<>POMPEY · {fmt(40000 * ss(ramp(f, F.against, 22)))}{f > F.n40 ? "+" : ""}</>} color={BLUE} op={ramp(f, F.against - 4, 8) * plates} size={42} />
        <Plate x={930} y={420} text="7,000 horse" color={BLUE} op={ramp(f, F.cavalry - 10, 8) * plates} size={32} />
        <Plate x={905} y={985} text="1,000" color={RED} op={ramp(f, F.cavalry - 6, 8) * plates} size={28} />
        <Plate x={900} y={1250} text="HIDDEN 4th LINE" sub="veterans with spears" color="#8a5a12" op={ramp(f, F.fourth, 8) * (1 - ramp(f, F.panicked2, 12))} size={34} />
      </div>
      {over > 0 && <AbsoluteFill style={{ background: "radial-gradient(ellipse at 75% 60%, rgba(0,0,0,0) 30%, rgba(120,10,0,.45) 100%)", opacity: 0.6 + 0.4 * Math.sin(f / 3) }} />}
      <BigText f={f} from={F.pharsalus} to={F.n22 - 6} text="PHARSALUS" top={300} size={124} />
      <BigText f={f} from={F.august} to={F.n22 - 6} text="August, 48 BC" top={450} size={60} />
      <BigText f={f} from={F.seven + 4} to={F.horsemen} text="7× CAVALRY" top={760} size={92} color="#cfe0ff" />
      <BigText f={f} from={F.wait} to={F.yousee + 2} text="WAIT." top={480} size={170} />
      <BigText f={f} from={F.how - 4} to={F.yousee + 2} text="then how did Caesar win?" top={680} size={60} />
      <BigText f={f} from={F.collapsed - 2} to={1713} text="ROUTED" top={300} size={130} color="#ffd9c8" />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ main
export const Rubicon: React.FC = () => {
  const f = useCurrentFrame();
  const stage = stageAt(f);
  const K = (fr: number, x: number, y: number, view: number): CamKey => ({ f: fr, x, y, view });
  const cam = cameraAt([
    K(0, 630, 1389, 190), K(95, 630, 1392, 215), K(150, 632, 1418, 330), K(178, 600, 1400, 400),
    K(232, 520, 1395, 720), K(395, 540, 1398, 700),
    K(533, 660, 1475, 430), K(560, 665, 1475, 440), K(621, 690, 1492, 470), K(705, 712, 1492, 480), K(775, 700, 1492, 480),
    K(808, 520, 1460, 850), K(875, 540, 1460, 860), K(925, 640, 1470, 700), K(952, 822, 1505, 330), K(1060, 850, 1530, 350),
    K(1713, 900, 1600, 760), K(1768, 1085, 1952, 420), K(1880, 1085, 1960, 420), K(1960, 1085, 1960, 400),
    K(1981, 700, 1505, 1150), K(2200, 700, 1505, 1100),
  ], f);
  const S = (x: number, y: number) => toScreen(cam, x, y);

  // routes and progress
  const hook = chaikin([P(12.12, 44.45), C.Ariminum, P(13.05, 43.4), P(13.1, 42.6), C.Rome], 3);
  const pHook = 0.1 * ss(ramp(f, F.crossed - 2, 22)) + 0.9 * ss(ramp(f, F.declared, 34));
  const pItaly = 0.35 * ss(ramp(f, 535, 26)) + 0.65 * ss(ramp(f, 640, 95));
  const pSpain = ss(ramp(f, F.west - 6, F.destroyed - F.west + 6));
  const pBack = ss(ramp(f, F.then - 2, 30)), pSea = ss(ramp(f, F.then + 28, 18));
  const gr = R.caesar_greece, pDy = lengthOf(gr.slice(0, 15)) / lengthOf(gr);
  const pGreece = pDy * ss(ramp(f, F.then + 46, 14)) + (1 - pDy) * ss(ramp(f, F.retreated, 30));
  const pFlee = ss(ramp(f, F.abandoned, 30)), pSail = ss(ramp(f, F.sailed, 54)), pPg = ss(ramp(f, F.retreated + 5, 32)), pEg = ss(ramp(f, 1716, 46));

  // Caesar token (world)
  const at = (pts: Pt[], p: number) => pointAlong(pts, p);
  let cT = { x: 0, y: 0 }, cMove = false;
  if (f < F.name) { const q = at(hook, Math.min(pHook, 0.1)); cT = q; cMove = f > F.crossed - 2 && f < F.river + 6; }
  else if (f < 533) cT = { x: C.Ravenna[0], y: C.Ravenna[1] };
  else if (f < F.west - 6) { cT = at(R.caesar_italy, pItaly); cMove = pItaly > 0.01 && pItaly < 0.99; }
  else if (f < F.then - 2) { cT = at(R.caesar_spain, pSpain); cMove = pSpain < 0.99; }
  else if (f < F.then + 28) { cT = at(R.caesar_back, pBack); cMove = true; }
  else if (f < F.then + 46) { cT = at(R.caesar_sea, pSea); cMove = true; }
  else { cT = at(gr, pGreece); cMove = (f < F.dyr) || (f > F.retreated && f < F.retreated + 30); }
  const siege = f >= F.dyr - 10 && f < F.retreated ? 1 : 0, knock = ss(ramp(f, F.beat, 10));
  const endP = f >= F.retreated + 10 && f < 1071 ? ss(ramp(f, F.retreated + 10, 20)) : 0;
  const cX = cT.x + siege * (14 + 10 * knock) + endP * 6, cY = cT.y + siege * (20 + 10 * knock) + endP * 16;
  // Pompey token (world)
  let pT = { x: C.Rome[0], y: C.Rome[1] }, pMove = false;
  if (f >= F.abandoned && f < F.sailed) { pT = at(R.pompey_flee, pFlee); pMove = true; }
  else if (f >= F.sailed && f < F.retreated + 5) { pT = at(R.pompey_sea, pSail); pMove = pSail < 0.99; }
  else if (f >= F.retreated + 5 && f < 1713) { pT = at(R.pompey_greece, pPg); pMove = pPg < 0.99; }
  else if (f >= 1713) { pT = at(R.pompey_egypt, pEg); pMove = pEg < 0.99; }
  const atRome = f >= 533 && f < F.abandoned ? 1 : 0, pEnd = f >= F.retreated + 5 && f < 1071 ? pPg : 0;
  const pX = pT.x + siege * 6 + atRome * 16 - pEnd * 16, pY = pT.y - siege * 14 + atRome * 4 - pEnd * 18;

  // territories: red = Caesar, blue = Senate/Pompey
  const flipRev = (id: string): { x: number; y: number; r: number } | null => {
    if (id === "italy") { const p = at(R.caesar_italy, pItaly); return f >= 533 ? { x: p.x, y: p.y, r: 30 + 300 * ramp(f, 640, 110) } : null; }
    if (id === "spain") return f >= F.destroyed - 4 ? { x: C.Ilerda[0], y: C.Ilerda[1], r: 400 * ss(ramp(f, F.destroyed - 4, 26)) } : null;
    if (id === "greece" || id === "east") return f >= 1713 ? { x: C.Pharsalus[0], y: C.Pharsalus[1], r: 650 * ss(ramp(f, 1716, 50)) } : null;
    return null;
  };
  const wide = cam.scale < 1.8, hookLab = f < F.name;
  const style = (p: Polity): TerrStyle | null => {
    const base = p.id.replace("_r", ""), isR = p.id.endsWith("_r");
    if (isR) { const rv = flipRev(base); if (!rv || rv.r < 1) return null; const fl = base === "spain" ? bump(f, F.destroyed, 16) : base === "italy" ? 0 : bump(f, 1718, 20);
      return { fill: RED, opacity: 0.62, reveal: rv, flash: fl * 0.6, stroke: 0.6 }; }
    const lab = (t: string) => (wide || hookLab ? t : undefined);
    switch (p.id) {
      case "gaul": return { fill: RED, opacity: 0.62, flash: bump(f, F.gaul - 4, 18) * 0.7, glow: bump(f, F.gaul - 4, 24), label: wide ? "Gaul" : undefined, labelSize: 40 };
      case "cisalpine": return { fill: RED, opacity: 0.62, label: hookLab ? "Caesar's province" : undefined, labelSize: 30, labelAt: [10.7, 44.95] };
      case "illyricum": return { fill: RED, opacity: 0.62 };
      case "italy": return { fill: BLUE, opacity: 0.62, label: lab("Italy"), labelSize: hookLab ? 34 : 36, labelAt: hookLab ? [13.4, 43.0] : [14.6, 41.6] };
      case "spain": return { fill: BLUE, opacity: 0.62, label: lab("Spain"), labelSize: 40, labelAt: [-4.2, 39.6] };
      case "africa": return { fill: BLUE, opacity: 0.62, label: wide ? "Africa" : undefined, labelSize: 32 };
      case "greece": return { fill: BLUE, opacity: 0.62, label: lab("Greece"), labelSize: 36, labelAt: [22.2, 40.6] };
      case "east": return { fill: BLUE, opacity: 0.62, label: wide ? "The East" : undefined, labelSize: 36 };
      case "egypt": return { fill: "#c7a96a", opacity: 0.55, label: f > 1700 ? "Egypt" : undefined, labelSize: 38 };
    }
    return null;
  };

  // timeline
  const tl = [{ f: 0, date: -47.973, span: 3 }, { f: F.name, date: -47.99, span: 3 }, { f: 400, date: -47.975, span: 3 }, { f: 600, date: -47.93, span: 3 }, { f: 705, date: -47.79, span: 3 },
    { f: F.destroyed, date: -47.41, span: 3 }, { f: F.then, date: -47.2, span: 3 }, { f: F.dyr, date: -46.48, span: 3 }, { f: F.pharsalus, date: -46.39, span: 3 },
    { f: 1713, date: -46.39, span: 3 }, { f: F.stabbed, date: -46.26, span: 3 }];
  const marks = [{ date: -47.973, label: "Rubicon" }, { date: -47.79, label: "Pompey sails" }, { date: -47.41, label: "Spain" }, { date: -46.48, label: "Dyrrhachium" },
    { date: -46.39, label: "Pharsalus" }, { date: -46.26, label: "Pompey killed" }];

  const showMap = stage === "map" || stage === "end";
  const [rbX, rbY] = S(...(C.Rubicon as [number, number]));
  const rubiconPts = chaikin([P(11.55, 43.93), P(11.8, 43.99), P(12.0, 44.08), P(12.2, 44.1), P(12.42, 44.16)], 2);
  const ships = f >= F.sailed - 4 && f < F.couldnt ? [0, 1, 2, 3, 4, 5] : [];

  return (
    <AbsoluteFill style={{ background: "#5f8e93", overflow: "hidden" }}>
      {showMap && (<>
        <div style={worldStyle(cam)}>
          <BaseLayers layers={[{ src: "maps/r_med.jpg", rect: MED_RECT }]} />
          <Territories polities={POL} styleOf={style} scale={cam.scale} uid="r" />
          <svg width={10} height={10} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            <defs><filter id="rbglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={7 / cam.scale} /></filter></defs>
            {(f < F.name || (f >= 533 && f < 561)) && <g>
              <path d={pathOf(rubiconPts)} fill="none" stroke="#bff3ff" strokeWidth={22 / cam.scale} opacity={0.6 + 0.3 * Math.sin(f / 5)} filter="url(#rbglow)" strokeLinecap="round" />
              <path d={pathOf(rubiconPts)} fill="none" stroke="#e9fbff" strokeWidth={7 / cam.scale} strokeLinecap="round" />
              <text x={rubiconPts[0][0] - 4 / cam.scale} y={rubiconPts[0][1] - 18 / cam.scale} textAnchor="end" fontFamily={serif} fontWeight={700} fontStyle="italic" fontSize={34 / cam.scale}
                fill="#eafcff" stroke="#173a44" strokeWidth={8 / cam.scale} paintOrder="stroke" opacity={f < F.name ? ramp(f, 30, 10) : 1}>the Rubicon</text></g>}
            {f < F.name && <Arrow pts={hook} p={pHook} scale={cam.scale} color={RED} width={16} />}
            {f >= 533 && f < F.west + 40 && <Arrow pts={R.caesar_italy} p={pItaly} scale={cam.scale} color={RED} width={14} opacity={1 - ramp(f, F.west + 20, 20)} />}
            {f >= F.abandoned && f < F.west + 40 && <><Arrow pts={R.pompey_flee} p={pFlee} scale={cam.scale} color={BLUE} width={14} opacity={1 - ramp(f, F.west + 20, 20)} />
              <Arrow pts={R.pompey_sea} p={pSail} scale={cam.scale} color={BLUE} width={14} opacity={1 - ramp(f, F.west + 20, 20)} /></>}
            {f >= F.couldnt - 4 && f < F.west + 10 && (() => { const half = R.pompey_sea.slice(0, 8), e = half[half.length - 1], k = ramp(f, F.couldnt - 4, 12), o = 1 - ramp(f, F.west, 10);
              return <g opacity={o}><path d={pathOf(half)} fill="none" stroke={RED} strokeWidth={8 / cam.scale} strokeDasharray={`${16 / cam.scale} ${12 / cam.scale}`} opacity={k} />
                <g transform={`translate(${e[0]} ${e[1]}) scale(${(1 / cam.scale) * ss(ramp(f, F.couldnt + 8, 8))})`}><path d="M -30 -30 L 30 30 M 30 -30 L -30 30" stroke="#3a0d08" strokeWidth={20} strokeLinecap="round" /><path d="M -30 -30 L 30 30 M 30 -30 L -30 30" stroke={RED} strokeWidth={12} strokeLinecap="round" /></g></g>; })()}
            {f >= F.west - 6 && f < 1071 && <Arrow pts={R.caesar_spain} p={pSpain} scale={cam.scale} color={RED} width={14} opacity={1 - ramp(f, F.then + 20, 20)} />}
            {f >= F.then - 2 && f < 1071 && <><Arrow pts={R.caesar_back} p={pBack} scale={cam.scale} color={RED} width={14} opacity={1 - ramp(f, F.dyr - 10, 16)} />
              <Arrow pts={R.caesar_sea} p={pSea} scale={cam.scale} color={RED} width={14} /><Arrow pts={gr} p={pGreece} scale={cam.scale} color={RED} width={14} /></>}
            {f >= F.retreated && f < 1071 && <Arrow pts={R.pompey_greece} p={pPg} scale={cam.scale} color={BLUE} width={14} />}
            {f >= 1713 && f < 1981 && <Arrow pts={R.pompey_egypt} p={pEg} scale={cam.scale} color={BLUE} width={13} />}
            {/* cities */}
            <City x={C.Rome[0]} y={C.Rome[1]} name="Rome" scale={cam.scale} side="l" size={36} opacity={f < 1713 ? 1 : 1 - ramp(f, 1713, 1)} />
            {f >= F.name && f < 533 && <City x={C.Ravenna[0]} y={C.Ravenna[1]} name="Ravenna" scale={cam.scale} side="l" size={30} />}
            {f >= 533 && f < 1071 && <City x={C.Brundisium[0]} y={C.Brundisium[1]} name="Brundisium" scale={cam.scale} side="l" size={30} opacity={ramp(f, 600, 10) * (1 - ramp(f, F.dyr - 20, 10))} />}
            {f >= F.west && f < F.then + 30 && <City x={C.Ilerda[0]} y={C.Ilerda[1]} name="Ilerda" scale={cam.scale} side="b" size={32} />}
            {f >= F.then + 30 && f < 1071 && <City x={C.Dyrrhachium[0]} y={C.Dyrrhachium[1]} name="Dyrrhachium" scale={cam.scale} side="l" size={32} />}
            {((f >= F.retreated && f < 1071) || f >= 1713) && <City x={C.Pharsalus[0]} y={C.Pharsalus[1]} name="Pharsalus" scale={cam.scale} side="l" size={32} opacity={f >= 1713 ? 1 - ramp(f, 1740, 10) : 1} />}
            {f >= 1713 && <City x={C.Pelusium[0]} y={C.Pelusium[1]} name="Pelusium" scale={cam.scale} side="b" size={32} />}
          </svg>
        </div>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(15,20,25,.5) 100%)" }} />
        {/* Rome reacts */}
        {(() => { const [x, y] = S(C.Rome[0], C.Rome[1]); const war = f >= F.declared && f < F.name, panic = f >= 533 && f < 561;
          if (!war && !panic) return null; const t = ((f % 20) / 20);
          return <svg width={FW} height={FH} style={{ position: "absolute", inset: 0 }}>{[0, 0.5].map((o) => { const tt = (t + o) % 1; return <circle key={o} cx={x} cy={y} r={20 + tt * 90} fill="none" stroke={war ? RED : "#fff2c8"} strokeWidth={8} opacity={1 - tt} />; })}
            {panic && [0, 1, 2, 3].map((i) => <text key={i} x={x + Math.cos(i * 1.7) * 70 + Math.sin(f * 2 + i) * 4} y={y + Math.sin(i * 1.7) * 60} fontFamily={sans} fontWeight={900} fontSize={46} fill="#fff" stroke="#2a1a0c" strokeWidth={6} paintOrder="stroke">!</text>)}</svg>; })()}
        {/* galleys */}
        {ships.length > 0 && <svg width={FW} height={FH} style={{ position: "absolute", inset: 0 }}>{ships.map((i) => { const p = clamp01(pSail - 0.12 * (i + 1) + 0.12 * ramp(f, F.couldnt - 20, 20)); if (p <= 0.005 && f < F.sailed + 6) return null;
          const q = pointAlong(R.pompey_sea, p), [x, y] = S(q.x, q.y), side = (i % 2 ? 1 : -1) * (26 + i * 9);
          return <g key={i} opacity={ramp(f, F.sailed - 4 + i * 2, 6)}><Galley x={x - Math.sin(q.a) * side} y={y + Math.cos(q.a) * side + Math.sin(f / 6 + i) * 3} a={0} s={1.15} /></g>; })}
          {pSail < 0.995 && (() => { const [x, y] = S(pT.x, pT.y); return <g><Galley x={x} y={y + Math.sin(f / 6) * 3} a={0} s={1.9} />
            <text x={x} y={y + 52} textAnchor="middle" fontFamily={sans} fontWeight={800} fontSize={26} letterSpacing={2} fill="#fff" stroke={BLUE_D} strokeWidth={6} paintOrder="stroke">POMPEY</text></g>; })()}</svg>}
        {/* tokens */}
        {stage === "map" && (() => { const [x, y] = S(cX, cY); const op = f < 1713 ? 1 : 0; const rot = f >= F.beat && f < F.retreated ? 8 * knock : 0;
          return <Token x={x} y={y} side="red" label="CAESAR" op={op} bob={cMove ? Math.abs(Math.sin(f / 2.5)) * 10 : 0} rot={rot} h={f < F.name ? 170 : 140} />; })()}
        {stage === "map" && f >= 533 && (() => { const [x, y] = S(pX, pY); const op = f < F.stabbed ? ramp(f, 535, 8) : 1 - ramp(f, F.stabbed, 10);
          const sea = f >= F.sailed && f < F.couldnt && pSail < 0.995;
          return <Token x={x} y={y} side="blue" label="POMPEY" op={sea ? 0 : op} bob={pMove ? Math.abs(Math.sin(f / 2.5)) * 10 : 0} h={140} />; })()}
        {stage === "map" && f >= 533 && f < F.destroyed + 30 && (() => { const [x, y] = S(C.Ilerda[0] + 14, C.Ilerda[1] - 8); const k = ramp(f, F.destroyed, 14);
          return <><Token x={x} y={y} side="blue" op={(1 - k) * ramp(f, 535, 8)} rot={k * 70} h={120} />{f >= F.destroyed - 2 && <Boom x={x} y={y - 50} age={f - F.destroyed + 2} size={1.1} />}</>; })()}
        {stage === "map" && f >= F.beat - 3 && f < F.beat + 18 && (() => { const [x, y] = S(C.Dyrrhachium[0] + 6, C.Dyrrhachium[1] + 6); return <Boom x={x} y={y - 60} age={f - F.beat + 3} size={1.3} />; })()}
        {stage === "map" && f >= F.horsemen && false}
        {/* stamps and labels on the map */}
        <Stamp x={540} y={560} text="DEFEATED" f={f} at={F.beat + 2} until={F.retreated} color={BLUE} size={74} rot={-8} />
        {f >= F.hungry && f < F.pharsalus && <Plate x={540} y={1130} text="hungry, outnumbered" color={RED} op={ramp(f, F.hungry, 8) * (1 - ramp(f, 1060, 8))} size={36} />}
        {f >= F.couldnt && f < F.west + 6 && <Plate x={(S(...(R.pompey_sea[7] as [number, number]))[0])} y={S(...(R.pompey_sea[7] as [number, number]))[1] + 60} text="no ships" color={RED} op={ramp(f, F.couldnt + 8, 8) * (1 - ramp(f, F.west - 2, 8))} size={34} />}
        {f >= F.ship - 6 && f < F.couldnt && <Plate x={(S(...(R.pompey_sea[10] as [number, number]))[0])} y={S(...(R.pompey_sea[10] as [number, number]))[1] + 150} text="almost every ship in Italy" color={BLUE} op={ramp(f, F.ship - 6, 8) * (1 - ramp(f, F.couldnt - 6, 6))} size={30} />}

        {/* hook text */}
        <BigText f={f} from={0} to={70} text="49 BC" top={250} size={150} />
        <BigText f={f} from={F.declared} to={F.name} text="WAR ON ROME" top={280} size={112} color="#ffd6c8" />

        {/* Caesar + the Senate's order */}
        {f >= F.name - 4 && f < 400 && <Actor src="chars/caesar.png" rig={RIG.caesar} f={f} pose={{ x: lerp(-200, 250, ss(ramp(f, F.name - 4, 14))), y: 1450, h: 660, blink: blinkAt(f, 2) }} />}
        <Plate x={40} y={610} text="GAIUS JULIUS CAESAR" color={RED} op={ramp(f, F.caesar - 10, 8) * (1 - ramp(f, F.gaul - 10, 6))} size={40} align="l" />
        <Plate x={40} y={610} text="conquered Gaul" sub="58–50 BC" color={RED} op={ramp(f, F.gaul - 6, 8) * (1 - ramp(f, F.senate - 6, 8))} size={34} align="l" rot={-2} />
        {f >= F.senate - 6 && f < 400 && <Actor src="chars/senator.png" rig={RIG.senator} f={f} pose={{ x: lerp(1280, 830, ss(ramp(f, F.senate - 6, 14))), y: 1450, h: 640, blink: blinkAt(f, 5) }} />}
        {f >= F.order - 4 && f < 400 && <div style={{ position: "absolute", left: 120, top: 190, width: 840, padding: "30px 40px", background: "#fbf3df", border: "6px solid #2a1d0e", borderRadius: 10,
          transform: `rotate(-2deg) translateY(${(1 - ss(ramp(f, F.order - 4, 12))) * -600}px)`, fontFamily: serif, color: "#2a1d0e", boxShadow: "0 12px 26px rgba(0,0,0,.45)" }}>
          <div style={{ fontWeight: 700, fontSize: 40, letterSpacing: 3 }}>THE SENATE OF ROME</div>
          <div style={{ fontSize: 30, fontStyle: "italic" }}>to Gaius Julius Caesar · January, 49 BC</div>
          <div style={{ borderTop: "3px solid #2a1d0e", margin: "14px 0" }} />
          <div style={{ fontSize: 46, opacity: ramp(f, F.give - 2, 6) }}>Give up your army.</div>
          <div style={{ fontSize: 46, opacity: ramp(f, F.enemy - 14, 6) }}>Or be declared…</div></div>}
        <Stamp x={540} y={500} text="ENEMY OF THE STATE" f={f} at={F.enemy} until={400} size={60} rot={-9} />

        {/* Pompey reaches Egypt and dies */}
        {f >= F.moment - 4 && f < F.served + 30 && <Actor src="chars/pompey.png" rig={RIG.pompey} f={f} pose={{ x: 790, y: 1450, h: 640, blink: f >= F.stabbed ? 1 : blinkAt(f, 3),
          tint: f >= F.stabbed ? `grayscale(${ramp(f, F.stabbed, 12)}) brightness(${1 - 0.3 * ramp(f, F.stabbed, 12)})` : undefined, rot: -78 * ss(ramp(f, F.stabbed + 3, 14)),
          opacity: ramp(f, F.moment - 4, 8) * (1 - ramp(f, F.stabbed + 22, 16)) }} />}
        {f >= F.stabbed - 2 && f < F.stabbed + 14 && <svg width={FW} height={FH} style={{ position: "absolute", inset: 0 }}>
          <path d={`M ${560} ${880} L ${1040} ${1260}`} stroke="#fff" strokeWidth={22 * (1 - ramp(f, F.stabbed + 2, 10))} strokeLinecap="round" opacity={0.95} strokeDasharray={`${700 * ss(ramp(f, F.stabbed - 2, 4))} 999`} /></svg>}
        {f >= F.stabbed && f < F.stabbed + 16 && <AbsoluteFill style={{ background: "#b0120a", opacity: 0.45 * (1 - ramp(f, F.stabbed, 16)) }} />}
        <Plate x={540} y={420} text="Lucius Septimius" sub="once one of Pompey's own officers" color="#4a3a2a" op={ramp(f, F.man - 4, 8) * (1 - ramp(f, F.head - 8, 8))} size={44} />
        {f >= F.head - 6 && f < 1981 && <Actor src="chars/caesar.png" rig={RIG.caesar} f={f} pose={{ x: lerp(-200, 290, ss(ramp(f, F.head - 6, 14))) + 90 * ss(ramp(f, F.gift + 6, 20)), y: 1450 + 260 * ss(ramp(f, F.gift + 6, 20)), h: lerp(640, 1250, ss(ramp(f, F.gift + 6, 20))),
          blink: f >= F.wept - 6 ? 0.55 : blinkAt(f, 2) }} />}
        {f >= F.presented - 4 && f < 1981 && (() => { const k = ss(ramp(f, F.presented - 4, 22)), x = lerp(1180, 640, k), y = 1330;
          return <svg width={FW} height={FH} style={{ position: "absolute", inset: 0 }} opacity={1 - ramp(f, F.gift + 4, 10)}><g transform={`translate(${x} ${y})`}>
            <rect x={-80} y={-110} width={160} height={110} rx={6} fill="#6b4a2a" stroke="#2a1a0c" strokeWidth={5} /><rect x={-14} y={-110} width={28} height={110} fill={GOLD} />
            <path d="M 0 -110 C -40 -150 -60 -120 -30 -108 M 0 -110 C 40 -150 60 -120 30 -108" stroke={GOLD} strokeWidth={9} fill="none" />
            {f >= F.gift - 4 && <g transform={`rotate(-10) translate(70 -150)`} opacity={ramp(f, F.gift - 4, 6)}><rect x={-6} y={-24} width={120} height={46} rx={6} fill="#fbf3df" stroke="#2a1d0e" strokeWidth={3} />
              <text x={54} y={8} textAnchor="middle" fontFamily={serif} fontStyle="italic" fontWeight={700} fontSize={28} fill="#2a1d0e">a gift</text></g>}</g></svg>; })()}
        {f >= F.wept - 6 && f < 1981 && (() => { const k = ss(ramp(f, F.gift + 6, 20)), h = lerp(640, 1250, k), x0 = 290 + 90 * k, y0 = 1450 + 260 * k, s = h / RIG.caesar.h, w = RIG.caesar.w * s, ex = x0 - w / 2 + 268 * s, ey = y0 - h + 166 * s;
          return <svg width={FW} height={FH} style={{ position: "absolute", inset: 0 }}>{[0, 1, 2].map((i) => { const t = ((f - F.wept + 6 - i * 8) / 24); if (t < 0 || t > 1) return null;
            return <path key={i} transform={`translate(${ex} ${ey + t * t * 120}) scale(${1.5 + t * 0.4})`} d="M 0 -10 C 6 0 9 6 9 10 A 9 9 0 0 1 -9 10 C -9 6 -6 0 0 -10 Z" fill="#cfeeff" stroke="#2e6b8a" strokeWidth={2.5} opacity={1 - t * 0.5} />; })}</svg>; })()}
      </>)}

      {stage === "river" && <RiverScene f={f} />}
      {stage === "vs" && <VsScene f={f} />}
      {stage === "field" && <FieldScene f={f} />}

      {stage === "end" && (<>
        <AbsoluteFill style={{ background: `linear-gradient(105deg, rgba(30,60,140,.55) 0 49.5%, rgba(255,240,210,.9) 49.5% 50.5%, rgba(160,25,15,.55) 50.5%)`, opacity: ramp(f, F.so, 10) }} />
        <Actor src="chars/caesar.png" rig={RIG.caesar} f={f} pose={{ x: 540, y: 1460, h: 820, blink: blinkAt(f, 1) }} />
        <div style={{ position: "absolute", left: 20, width: 520, top: 260, textAlign: "center", fontFamily: serif, fontWeight: 700, fontSize: 76, color: "#dbe6ff",
          textShadow: "0 6px 20px rgba(0,0,0,.7)", opacity: ramp(f, F.traitor - 4, 6), transform: `scale(${0.8 + 0.2 * ss(ramp(f, F.traitor - 4, 8))})` }}>TRAITOR?</div>
        <div style={{ position: "absolute", left: 540, width: 520, top: 260, textAlign: "center", fontFamily: serif, fontWeight: 700, fontSize: 76, color: "#ffd9c8",
          textShadow: "0 6px 20px rgba(0,0,0,.7)", opacity: ramp(f, F.saved - 4, 6), transform: `scale(${0.8 + 0.2 * ss(ramp(f, F.saved - 4, 8))})` }}>SAVIOUR?</div>
      </>)}

      <AbsoluteFill style={{ background: "#000", opacity: cutFlash(f) * 0.9 }} />
      <TimelineBar keys={tl} f={f} marks={marks} yearLabel={(y) => (y <= 0 ? `${1 - y} BC` : `AD ${y}`)} showMonth opacity={stage === "end" ? 1 - ramp(f, 1981, 10) : 1} />
      <Caption t={(f - VO) / 30} words={WORDS} top={1480} />
      <Audio src={staticFile(AUDIO)} />
    </AbsoluteFill>
  );
};

// "The shortest war in history lasted 38 minutes" — Anglo-Zanzibar War, 27 Aug 1896.
// Two stages: MAP (world -> East Africa -> Zanzibar island) and HARBOUR (screen-space diorama: town, palace, ships).
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from "remotion";
import {
  Actor, Arrow, BaseLayers, BigText, Boom, Bubble, Caption, ClockFace, DateRuler, Palace, Polity, Rig, Stamp, Stopwatch, Territories, TerrStyle,
  blinkAt, camKey, cameraAt, clamp01, lerp, minutesOf, mouthAt, ramp, ss, toScreen, worldStyle, FW, FH, Pt, P, City,
} from "../../engine/kit";
import zw from "../../../public/maps/z_world.json";
import ze from "../../../public/maps/z_eafrica.json";
import zt from "../../../public/maps/z_town.json";
import b1896 from "../../../public/maps/borders_1896.json";
import pts from "../../../public/maps/zanzibar_points.json";
import voice from "../../../public/zanzibar/voice.json";
import rigs from "../../../public/chars/rigs.json";

const VO = 12;
export const ZANZIBAR_FRAMES = VO + Math.ceil((voice as { dur: number }).dur * 30) + 75;
const ENV = (voice as { env: number[] }).env;
type Word = { w: string; s: number; e: number };
const WORDS = (voice as { words: Word[] }).words;
const RIG = rigs as unknown as Record<string, Rig>;
const POL = b1896 as unknown as Polity[];
const PT = pts as unknown as Record<string, Pt>;
const rect = (j: unknown) => (j as { rect: number[] }).rect;

const F = { the: 12, m38: 53, losers: 96, pay: 115, shells: 128, zanzibar: 151, y1896: 166, rich: 205, africa: 252, squeezed: 275, german: 296, british: 312,
  aug: 352, sultan: 389, dies: 397, within: 435, khalid: 462, moves: 475, palace: 494, without: 514, approval: 529, london: 555,
  so: 597, navy: 605, warships: 630, five: 658, gathers: 690, men: 698, cannons: 754, yacht: 775, ultimatum: 807, nine: 857,
  reply: 881, quote: 920, fire1: 950, wait: 971, tiny: 1000, biggest: 1035, earth: 1058, yousee: 1075, years: 1086, grab: 1139, talked: 1210, thistime: 1244, bluff: 1279,
  oclock: 1300, n902: 1322, fire: 1351, n905: 1366, shoots: 1410, sinks: 1448, n940: 1469, flames: 1513, flag: 1538, warover: 1564,
  flees: 1597, consulate: 1621, escapes: 1645, boat: 1663, garden: 1690, soil: 1742, bill: 1768, forced: 1807, payshells: 1832, them: 1856, so2: 1874, bravest: 1889, worst: 1939, end: 1962 };

// which stage is on screen: [from, to) frames with HARBOUR
const HARBOUR: [number, number][] = [[0, F.zanzibar - 4], [F.so - 4, F.reply + 95], [F.oclock - 4, F.flees - 6], [F.bill - 4, ZANZIBAR_FRAMES + 1]];
const inHarbour = (f: number) => HARBOUR.some(([a, b]) => f >= a && f < b);
const stageFade = (f: number) => { // dip to black for 6 frames at each stage switch
  let d = 99; for (const [a, b] of HARBOUR) d = Math.min(d, Math.abs(f - a), Math.abs(f - b));
  return d < 4 ? 1 - d / 4 : 0;
};

const COL: Record<string, string> = { empire: "#d9707a", gea: "#7f8ea8", bea: "#d9707a", zanzibar: "#c9302c" };

// ------------------------------------------------------------------ HARBOUR stage
const SHIPS = [{ x: 700, y: 820, s: 0.14 }, { x: 1000, y: 835, s: 0.15 }, { x: 860, y: 930, s: 0.2 }, { x: 700, y: 1060, s: 0.26 }, { x: 960, y: 1180, s: 0.32 }];
const Harbour: React.FC<{ f: number }> = ({ f }) => {
  const burn = ramp(f, F.fire + 6, 160), flagH = 1 - ramp(f, F.flag, 14);
  const shipIn = (i: number) => (f < F.so ? 1 : ss(ramp(f, F.warships - 20 + i * 8, 24)));
  const firing = f >= F.fire && f < F.n940;
  const yachtSink = ramp(f, F.sinks - 4, 40);
  const soldiers = Math.round(lerp(0, 36, ramp(f, F.gathers, 30)));
  return (
    <AbsoluteFill>
      {/* sky + sea */}
      <AbsoluteFill style={{ background: `linear-gradient(${f >= F.fire ? "#e9b98a" : "#f3d9a6"} 0%, #b9d6dc 40%, #7fb0bd 41%, #4d8a9b 60%, #2a6273 100%)` }} />
      <svg width={FW} height={FH} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 30 }, (_, i) => { const y = 800 + (i % 10) * 90, x = ((i * 233 + f * (1.2 + (i % 3) * 0.4)) % 1300) - 110;
          return <path key={i} d={`M ${x} ${y} q 30 -10 60 0 q 30 10 60 0`} stroke="#d8eef2" strokeOpacity={0.45} strokeWidth={4} fill="none" />; })}
        {/* shore with town */}
        <path d="M 0 900 C 200 880 420 930 600 960 C 640 1100 560 1300 470 1500 L 0 1520 Z" fill="#d9c69a" stroke="#6e5733" strokeWidth={6} />
        <path d="M 0 1240 C 160 1225 330 1250 520 1300" stroke="#c4ad7c" strokeWidth={10} fill="none" />
        {[[10, 800, 110, 110], [100, 770, 90, 140], [450, 820, 100, 110], [530, 850, 70, 90]].map(([x, y, w, h], i) =>
          <rect key={i} x={x} y={y} width={w} height={h} fill={["#f3ead6", "#e9dcc0", "#f6efe0", "#efe3cc", "#f3ead6"][i]} stroke="#6e5733" strokeWidth={4} />)}
      </svg>
      <Palace x={290} y={990} s={1.25} burn={burn} flag={flagH} f={f} />
      {/* royal yacht Glasgow (the cruiser art, small, facing right, sepia) */}
      {f >= F.yacht - 6 && f < F.n940 + 40 && (
        <div style={{ position: "absolute", left: 470, top: 1010 + yachtSink * 80, width: 1436 * 0.2, height: 643 * 0.2, transform: `scaleX(-1) rotate(${yachtSink * 14}deg)`,
          opacity: ramp(f, F.yacht - 6, 8) * (1 - ramp(f, F.sinks + 40, 12)), filter: "sepia(0.6) saturate(0.8)", clipPath: `inset(0 0 ${yachtSink * 60}% 0)` }}>
          <Img src={staticFile("chars/cruiser.png")} style={{ width: "100%", height: "100%" }} />
        </div>)}
      {f >= F.yacht && f < F.sinks && <div style={{ position: "absolute", left: 450, top: 1150, fontFamily: "Georgia, DejaVu Serif, serif", fontWeight: 700, fontSize: 30, color: "#fff", textShadow: "0 2px 6px #000",
        opacity: ramp(f, F.yacht, 8) }}>royal yacht “Glasgow”</div>}
      {/* British warships */}
      {SHIPS.map((sh, i) => { const k = shipIn(i); if (k <= 0) return null; const bob = Math.sin(f / 12 + i) * 4;
        return <div key={i} style={{ position: "absolute", left: sh.x + (1 - k) * 700 - 1436 * sh.s / 2, top: sh.y - 643 * sh.s + bob, width: 1436 * sh.s, height: 643 * sh.s }}>
          <Img src={staticFile("chars/cruiser.png")} style={{ width: "100%", height: "100%" }} /></div>; })}
      {/* bombardment: muzzle flashes, shell arcs, booms on the palace */}
      {firing && SHIPS.map((sh, i) => { const per = 11 + i * 2, ph = (f - F.fire + i * 5) % per, sx = sh.x - 1436 * sh.s * 0.3, sy = sh.y - 643 * sh.s * 0.45;
        const t = ph / per, tx = 160 + (i * 61) % 260, ty = 640 + (i * 37) % 170, x = lerp(sx, tx, t), y = lerp(sy, ty, t) - Math.sin(t * Math.PI) * 140;
        return <React.Fragment key={i}><svg width={FW} height={FH} style={{ position: "absolute", inset: 0 }}>
          {ph < 3 && <circle cx={sx} cy={sy} r={26} fill="#ffe08a" opacity={0.9} />}
          <circle cx={x} cy={y} r={7} fill="#2a1d0e" /></svg>
          <Boom x={tx} y={ty} age={ph - per + 3} size={0.8} /></React.Fragment>; })}
      {f >= F.shoots && f < F.shoots + 12 && <Boom x={560} y={1030} age={f - F.shoots} size={0.6} />}
      {f >= F.sinks - 6 && f < F.sinks + 14 && <Boom x={560} y={1060} age={f - F.sinks + 6} size={1.1} />}
      {/* Khalid's 2,800 men + old cannons on the shore */}
      {f >= F.gathers - 2 && f < F.reply && <svg width={FW} height={FH} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: soldiers }, (_, i) => { const x = 40 + (i % 12) * 38, y = 1110 + Math.floor(i / 12) * 70;
          return <g key={i} transform={`translate(${x} ${y}) scale(1.6)`}><circle r={9} cy={-30} fill="#2a1d0e" /><rect x={-8} y={-22} width={16} height={26} rx={5} fill="#2a1d0e" /><line x1={8} y1={-26} x2={14} y2={-52} stroke="#2a1d0e" strokeWidth={3} /></g>; })}
        {f >= F.cannons && [[90, 1380], [330, 1400]].map(([x, y], i) => <g key={i} transform={`translate(${x} ${y}) scale(${1.8 * ss(ramp(f, F.cannons + i * 4, 8))})`}>
          <rect x={-10} y={-34} width={70} height={18} rx={8} fill="#3a3a3a" transform="rotate(-12)" /><circle cx={0} cy={0} r={18} fill="#6b4a2a" stroke="#2a1d0e" strokeWidth={4} /></g>)}
      </svg>}
      {f >= F.men && f < F.reply && <div style={{ position: "absolute", left: 600, top: 1300, fontFamily: "Georgia, DejaVu Serif, serif", fontWeight: 700, fontSize: 64, color: "#fff",
        textShadow: "0 3px 10px #000", opacity: ramp(f, F.men, 8) }}>{Math.round(lerp(0, 2800, ss(ramp(f, F.men, 20)))).toLocaleString("en")} men</div>}
    </AbsoluteFill>
  );
};

export const Zanzibar: React.FC = () => {
  const f = useCurrentFrame();
  const talk = mouthAt(ENV, f - VO);
  const harbour = inHarbour(f);

  // ------------------------------------------------------------------ MAP camera
  const zt0 = P(39.19, -6.163);
  const cam = cameraAt([
    camKey(F.zanzibar - 4, 25, 18, 2700), camKey(F.rich, 30, 8, 2400), camKey(F.squeezed, 36.5, -4.5, 640), camKey(F.british + 20, 37.5, -5, 600),
    camKey(F.aug, 39.32, -6.1, 44), camKey(F.london, 39.25, -6.13, 40),
    camKey(F.wait, 39.3, -6.1, 60), camKey(F.biggest, 30, 15, 2700), camKey(F.yousee, 30, 15, 2700),
    camKey(F.yousee + 20, 39.28, -6.12, 46), camKey(F.bluff + 20, 39.25, -6.14, 40),
    camKey(F.flees, 39.24, -6.2, 34), camKey(F.escapes, 39.3, -6.45, 70), camKey(F.soil, 39.3, -6.5, 90),
  ], f);
  const S = (lon: number, lat: number) => toScreen(cam, ...P(lon, lat));
  const style = (p: Polity): TerrStyle | null => {
    if (p.id === "empire") { const a = ramp(f, F.zanzibar + 6, 14) * (1 - ramp(f, F.squeezed, 20)) + (f >= F.wait ? ramp(f, F.tiny, 14) * (1 - ramp(f, F.yousee + 10, 10)) : 0);
      return { fill: COL.empire, opacity: 0.75 * clamp01(a), label: "British Empire", labelSize: 46, labelAt: [30, 31] }; }
    if (p.id === "gea") return { fill: COL.gea, opacity: 0.85 * ramp(f, F.german - 4, 10) * (1 - clamp01((cam.scale - 3) / 3)), label: "German East Africa", labelSize: 34, labelOpacity: cam.scale < 6 ? 1 : 0 };
    if (p.id === "bea") return { fill: COL.bea, opacity: 0.85 * ramp(f, F.british - 4, 10) * (1 - clamp01((cam.scale - 3) / 3)), label: "British East Africa", labelSize: 34, labelOpacity: cam.scale < 6 ? 1 : 0 };
    if (p.id === "zanzibar") { const g = Math.max(Math.sin(ramp(f, F.zanzibar + 20, 50) * Math.PI), f > F.tiny && f < F.yousee ? 0.5 + 0.5 * Math.sin(f / 4) : 0);
      return { fill: COL.zanzibar, opacity: ramp(f, F.zanzibar, 10), glow: g * 2, label: cam.scale > 6 ? undefined : "Zanzibar", labelSize: 36, labelAt: [42.5, -6.4], stroke: cam.scale > 6 ? 0.4 : 1 }; }
    return null;
  };
  const [tx, ty] = S(39.19, -6.163);
  const [dx, dy] = S(39.28, -6.82);

  // ------------------------------------------------------------------ date ruler
  const T = (y: number, mo: number, d: number, h = 12, mi = 0) => minutesOf(y, mo, d, h, mi);
  const ruler = [
    { f: 0, t: T(1896, 8, 27, 9, 20), span: 70 }, { f: F.zanzibar - 5, t: T(1896, 8, 27, 9, 20), span: 70 }, { f: F.zanzibar + 15, t: T(1896, 6, 1), span: 1700000 }, { f: F.aug - 10, t: T(1896, 8, 25, 11, 40), span: 5000 },
    { f: F.so, t: T(1896, 8, 26, 10), span: 5000 }, { f: F.ultimatum, t: T(1896, 8, 26, 18), span: 5000 }, { f: F.reply, t: T(1896, 8, 27, 8, 30), span: 200 },
    { f: F.yousee, t: T(1896, 8, 27, 8, 40), span: 200 }, { f: F.years + 10, t: T(1893, 3, 5), span: 3000000 }, { f: F.thistime + 10, t: T(1896, 8, 27, 8, 50), span: 120 },
    { f: F.oclock, t: T(1896, 8, 27, 9, 0), span: 70 }, { f: F.n902, t: T(1896, 8, 27, 9, 2), span: 70 }, { f: F.n905, t: T(1896, 8, 27, 9, 5), span: 70 },
    { f: F.n940, t: T(1896, 8, 27, 9, 40), span: 70 }, { f: F.consulate, t: T(1896, 8, 27, 11), span: 5000 }, { f: F.garden, t: T(1896, 10, 2), span: 90000 },
    { f: F.bill + 10, t: T(1896, 12, 1), span: 1700000 },
  ];
  const marks = [{ t: T(1893, 3, 5), label: "First try", span: [500000, 9e9] as [number, number] }, { t: T(1896, 8, 25, 11, 40), label: "Sultan dies", span: [1000, 20000] as [number, number] },
    { t: T(1896, 8, 27, 9, 2), label: "First shot", span: [0, 400] as [number, number] }, { t: T(1896, 8, 27, 9, 40), label: "Flag down", span: [0, 400] as [number, number] },
    { t: T(1896, 10, 2), label: "Escape", span: [20000, 200000] as [number, number] }];

  // war stopwatch: 0..38 minutes between first shot and flag down
  const warMin = f < F.zanzibar ? 38 * ss(ramp(f, F.the + 6, 50)) : lerp(0, 38, clamp01((f - F.fire) / (F.warover - F.fire)));

  return (
    <AbsoluteFill style={{ background: "#5f8e93", overflow: "hidden" }}>
      {!harbour && (<>
        <div style={worldStyle(cam)}>
          <BaseLayers layers={[{ src: "maps/z_world.jpg", rect: rect(zw) }, { src: "maps/z_eafrica.jpg", rect: rect(ze), feather: true }, { src: "maps/z_town.jpg", rect: rect(zt), feather: true }]} />
          <Territories polities={POL} styleOf={style} scale={cam.scale} uid="z" />
          <svg width={10} height={10} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            {cam.scale > 6 && <City x={zt0[0]} y={zt0[1]} name="Zanzibar Town" scale={cam.scale} side="l" size={38} />}
            {f >= F.consulate - 10 && f < F.bill && <City x={PT.DarEsSalaam[0]} y={PT.DarEsSalaam[1]} name="Dar es Salaam (German)" scale={cam.scale} side="l" size={34} opacity={ramp(f, F.escapes, 10)} />}
            <Arrow pts={[zt0, [zt0[0] + 0.6, zt0[1] + 6], [PT.DarEsSalaam[0] + 0.4, PT.DarEsSalaam[1] - 1.5], PT.DarEsSalaam]} p={ss(ramp(f, F.escapes, F.soil - F.escapes))} scale={cam.scale} color="#3d4f7a" width={10} />
          </svg>
        </div>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(15,20,25,.5) 100%)" }} />
        {/* old sultan fades (grey ghost), Khalid appears and walks to the palace */}
        {f >= F.sultan - 4 && f < F.within && <Actor src="chars/khalid.png" rig={RIG.khalid} f={f} pose={{ x: 300, y: 1420, h: 480, tint: "grayscale(1) brightness(1.1)",
          opacity: ramp(f, F.sultan - 4, 8) * (1 - ramp(f, F.dies + 6, 20)), blink: 1 }} />}
        {f >= F.sultan - 4 && f < F.within && <div style={{ position: "absolute", left: 100, width: 400, top: 1440, textAlign: "center", fontFamily: "Georgia, DejaVu Serif, serif", fontWeight: 700,
          fontSize: 38, color: "#eee", textShadow: "0 2px 6px #000", opacity: ramp(f, F.sultan, 8) * (1 - ramp(f, F.dies + 6, 20)) }}>Sultan Hamad †</div>}
        {f >= F.khalid - 8 && f < F.so && <Actor src="chars/khalid.png" rig={RIG.khalid} f={f} pose={{ x: lerp(260, tx - 40, ss(ramp(f, F.moves, 22))), y: lerp(1420, ty + 260, ss(ramp(f, F.moves, 22))),
          h: lerp(520, 300, ss(ramp(f, F.moves, 22))), talk: 0, blink: blinkAt(f, 3), bob: f > F.moves && f < F.moves + 22 ? Math.abs(Math.sin(f / 2.5)) * 14 : 0,
          opacity: ramp(f, F.khalid - 8, 8) }} />}
        {f >= F.without - 6 && f < F.so && <Actor src="chars/admiral.png" rig={RIG.admiral} f={f} pose={{ x: 820, y: 1430, h: 500, flip: true, talk: f > F.london ? talk * 0.3 : 0, blink: blinkAt(f, 5),
          rot: f > F.london && f < F.london + 30 ? Math.sin(f / 2) * 3 : 0, opacity: ramp(f, F.without - 6, 8) }} />}
        <Stamp x={540} y={760} text="NOT APPROVED" f={f} at={F.approval} until={F.so - 6} size={66} />
        {f >= F.consulate - 6 && f < F.boat && <Actor src="chars/khalid.png" rig={RIG.khalid} f={f} pose={{ x: lerp(tx, tx + 140, ss(ramp(f, F.flees, 16))), y: ty + 220, h: 260,
          bob: Math.abs(Math.sin(f / 2.2)) * 16, rot: 4, opacity: ramp(f, F.consulate - 6, 6) * (1 - ramp(f, F.boat - 8, 8)) }} />}
        {f >= F.consulate - 6 && f < F.boat + 10 && <div style={{ position: "absolute", left: tx + 120, top: ty - 70, fontSize: 30, fontFamily: "Georgia, DejaVu Serif, serif", fontWeight: 700,
          color: "#fff", textShadow: "0 2px 6px #000", opacity: ramp(f, F.consulate - 6, 8) }}><span style={{ display: "inline-block", width: 44, height: 30, marginRight: 10, verticalAlign: "middle",
          background: "linear-gradient(#111 33%, #fff 33% 66%, #c8261b 66%)", border: "2px solid #222" }} />German consulate</div>}
        {f >= F.tiny && f < F.yousee && <>
          <BigText f={f} from={F.tiny} to={F.yousee} text="TINY ISLAND" top={420} size={96} color="#ffd6c8" />
          <BigText f={f} from={F.biggest} to={F.yousee} text="vs THE BIGGEST NAVY" top={540} size={72} color="#f7efdc" /></>}
        {f >= F.years && f < F.oclock && <>
          <Actor src="chars/khalid.png" rig={RIG.khalid} f={f} pose={{ x: lerp(330, 250, ss(ramp(f, F.talked, 16))) + (f > F.thistime ? 70 * ss(ramp(f, F.thistime, 14)) : 0), y: 1430, h: 500,
            talk: 0, blink: blinkAt(f, 2), opacity: ramp(f, F.years, 8), rot: f > F.talked && f < F.thistime ? -4 : 0 }} />
          <Actor src="chars/admiral.png" rig={RIG.admiral} f={f} pose={{ x: 790, y: 1430, h: 480, flip: true, blink: blinkAt(f, 6), talk: f > F.grab && f < F.thistime ? Math.max(0, Math.sin(f / 3)) * 0.7 : 0,
            opacity: ramp(f, F.years, 8) * (1 - ramp(f, F.thistime, 10)) }} />
          <BigText f={f} from={F.years} to={F.thistime} text="1893" top={420} size={140} />
          <BigText f={f} from={F.bluff - 6} to={F.oclock} text="BLUFF?" top={440} size={130} color="#ffcf8a" /></>}
      </>)}

      {harbour && <Harbour f={f} />}
      {harbour && (<>
        {/* hook + war stopwatch */}
        {(f < F.zanzibar || (f >= F.fire - 10 && f < F.flees)) && <Stopwatch x={840} y={330} r={130} minutes={warMin} label={`${Math.round(warMin)} min`} opacity={f < F.zanzibar ? ramp(f, F.the, 6) : ramp(f, F.fire - 10, 8)} />}
        <BigText f={f} from={F.m38} to={F.losers} text="38 MINUTES" top={520} size={120} />
        {f >= F.pay - 6 && f < F.zanzibar && <div style={{ position: "absolute", left: 120, top: 1140, width: 520, padding: 28, background: "#fbf3df", border: "6px solid #2a1d0e", borderRadius: 10,
          transform: `rotate(-4deg) translateY(${(1 - ss(ramp(f, F.pay - 6, 10))) * 300}px)`, fontFamily: "Georgia, DejaVu Serif, serif", color: "#2a1d0e", boxShadow: "0 10px 24px rgba(0,0,0,.4)" }}>
          <div style={{ fontWeight: 700, fontSize: 44 }}>INVOICE</div><div style={{ fontSize: 34, marginTop: 10 }}>Shells fired at you ........ ✔</div></div>}
        <Stamp x={400} y={1240} text="YOU PAY" f={f} at={F.shells} until={F.zanzibar - 6} size={60} />
        {/* warships count */}
        {f >= F.five - 4 && f < F.gathers && <BigText f={f} from={F.five - 4} to={F.gathers} text="5 WARSHIPS" top={360} size={110} />}
        {/* ultimatum */}
        {f >= F.ultimatum - 6 && f < F.reply && <>
          <ClockFace x={830} y={360} r={150} h={9} m={0} opacity={ramp(f, F.ultimatum - 6, 8)} />
          <div style={{ position: "absolute", left: 70, top: 260, width: 560, padding: 30, background: "#fbf3df", border: "6px solid #2a1d0e", borderRadius: 10, transform: `rotate(-3deg) scale(${0.85 + 0.15 * ss(ramp(f, F.ultimatum - 6, 10))})`,
            fontFamily: "Georgia, DejaVu Serif, serif", color: "#2a1d0e", opacity: ramp(f, F.ultimatum - 6, 8), boxShadow: "0 10px 24px rgba(0,0,0,.4)" }}>
            <div style={{ fontWeight: 700, fontSize: 46 }}>ULTIMATUM</div><div style={{ fontSize: 36, marginTop: 10 }}>Haul down your flag and leave the palace by <b>9:00 a.m.</b></div>
            <div style={{ fontSize: 26, marginTop: 14, textAlign: "right" }}>— Rear-Admiral Rawson</div></div></>}
        {/* Khalid's reply */}
        {f >= F.reply - 4 && f < F.reply + 95 && <>
          <Actor src="chars/khalid.png" rig={RIG.khalid} f={f} pose={{ x: 300, y: 1450, h: 560, talk: f >= F.quote ? talk : 0, blink: blinkAt(f, 1), opacity: ramp(f, F.reply - 4, 8) }} />
          <Bubble x={380} y={560} w={620} text="We do not believe you would open fire on us." f={f} at={F.quote - 4} until={F.reply + 95} /></>}
        {/* bombardment clock */}
        {f >= F.oclock - 4 && f < F.fire + 20 && <ClockFace x={240} y={360} r={150} h={9} m={f < F.n902 ? 0 : 2} opacity={ramp(f, F.oclock - 4, 8) * (1 - ramp(f, F.fire + 10, 10))} />}
        <BigText f={f} from={F.fire - 2} to={F.fire + 26} text="FIRE!" top={520} size={170} color="#ffd25a" />
        <BigText f={f} from={F.warover - 4} to={F.flees} text="WAR OVER" top={560} size={130} />
        {/* the bill */}
        {f >= F.bill - 4 && f < F.so2 && <div style={{ position: "absolute", left: 140, top: 380, width: 800, padding: 40, background: "#fbf3df", border: "8px solid #2a1d0e", borderRadius: 12,
          transform: `rotate(-3deg) translateY(${(1 - ss(ramp(f, F.bill - 4, 12))) * 900}px)`, fontFamily: "Georgia, DejaVu Serif, serif", color: "#2a1d0e", boxShadow: "0 14px 30px rgba(0,0,0,.45)" }}>
          <div style={{ fontWeight: 700, fontSize: 60, letterSpacing: 4 }}>INVOICE</div>
          <div style={{ fontSize: 34, marginTop: 6 }}>To: Khalid's supporters, Zanzibar</div>
          <div style={{ borderTop: "3px solid #2a1d0e", margin: "18px 0" }} />
          <div style={{ fontSize: 40 }}>Shells fired at you ................ ✔</div>
          <div style={{ fontSize: 40 }}>Damages ................................ ✔</div>
          <div style={{ fontSize: 56, fontWeight: 700, marginTop: 18, textAlign: "right" }}>300,000 rupees</div></div>}
        <Stamp x={560} y={1100} text="PAY UP" f={f} at={F.payshells} until={F.so2 - 2} size={90} rot={-10} />
        {/* fork */}
        {f >= F.so2 && <>
          <Actor src="chars/khalid.png" rig={RIG.khalid} f={f} pose={{ x: 540, y: 1460, h: 620, blink: blinkAt(f, 2), talk: 0, opacity: ramp(f, F.so2, 8) }} />
          <div style={{ position: "absolute", left: 20, width: 520, top: 230, textAlign: "center", fontFamily: "Georgia, DejaVu Serif, serif", fontWeight: 700, fontSize: 80, color: "#ffcf8a",
            textShadow: "0 6px 20px rgba(0,0,0,.7)", opacity: ramp(f, F.bravest - 4, 6) }}>BRAVEST SULTAN?</div>
          <div style={{ position: "absolute", left: 540, width: 520, top: 230, textAlign: "center", fontFamily: "Georgia, DejaVu Serif, serif", fontWeight: 700, fontSize: 80, color: "#dff3ff",
            textShadow: "0 6px 20px rgba(0,0,0,.7)", opacity: ramp(f, F.worst - 4, 6) }}>WORST BLUFFER?</div></>}
      </>)}
      <BigText f={f} from={F.y1896} to={F.rich + 20} text="1896" top={520} size={180} />
      <AbsoluteFill style={{ background: "#000", opacity: stageFade(f) }} />
      <DateRuler keys={ruler} f={f} marks={marks} />
      <Caption t={(f - VO) / 30} words={WORDS} top={1480} />
      <Audio src={staticFile("zanzibar/mix.wav")} />
    </AbsoluteFill>
  );
};

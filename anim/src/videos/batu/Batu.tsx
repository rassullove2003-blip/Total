// "The Mongols invaded Russia in winter. On purpose." — full short on the 2D map engine v2.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import {
  Actor, Arrow, BaseLayers, BigText, Caption, City, Flame, IceRivers, P, Polity, Rewind, Rig, Snowflake, Swamps, Territories, TerrStyle, TimelineBar, Trees,
  blinkAt, camKey, cameraAt, clamp01, lerp, mixHex, mouthAt, pointAlong, ramp, ss, toScreen, worldStyle, FW, FH, Pt,
} from "../../engine/kit";
import wide from "../../../public/maps/wide.json";
import rus from "../../../public/maps/rus.json";
import b1237 from "../../../public/maps/borders_1237.json";
import routes from "../../../public/maps/batu_routes.json";
import voice from "../../../public/batu/voice.json";
import rigs from "../../../public/chars/rigs.json";

const VO = 12;
export const BATU_FRAMES = VO + Math.ceil((voice as { dur: number }).dur * 30) + 75;
const ENV = (voice as { env: number[] }).env;
type Word = { w: string; s: number; e: number };
const WORDS = (voice as { words: Word[] }).words;
const R = routes as unknown as { route: { pts: Pt[]; len: number; at: Record<string, number> }; retreat: Pt[]; napoleon: Pt[]; hitler: Pt[]; west: Pt[]; cities: Record<string, Pt> };
const POL = b1237 as unknown as Polity[];
const RIG = rigs as unknown as { batu: Rig; prince: Rig; rider: Rig };
const WIDE = (wide as { rect: number[] }).rect, RUS = (rus as { rect: number[] }).rect;
const RIVERS = (rus as unknown as { rivers: { name: string; ice: boolean; pts: Pt[] }[] }).rivers;

const COL: Record<string, string> = {
  mongol: "#b0532c", song: "#4f9468", tibet: "#9c947f", delhi: "#c9a24a", persia: "#8f73ad", ayyubids: "#c98b52", byzantium: "#7a4c8f",
  hre: "#7f8aa3", hungary: "#9a6e5e", poland: "#b07a7a", france: "#5e7fb0", england: "#a05050", bulgaria: "#6f8f6a", sweden: "#6a88a8", georgia: "#8a8a5a",
  cumans: "#a7915a", volga_bulgaria: "#86955a", novgorod: "#3d6db3", vladimir: "#b8372d", ryazan: "#2f8a68", kyiv: "#d08a2a", galicia: "#6b4f98",
};
const RUSP = ["novgorod", "vladimir", "ryazan", "kyiv", "galicia"];
const NAME: Record<string, string> = { mongol: "MONGOL EMPIRE", song: "Song", persia: "Persia", delhi: "Delhi", tibet: "Tibet", cumans: "Cumans", volga_bulgaria: "Volga Bulgaria",
  novgorod: "Novgorod", vladimir: "Vladimir", ryazan: "Ryazan", kyiv: "Kyiv", galicia: "Galicia", hre: "Holy Roman Empire", byzantium: "Byzantium", ayyubids: "Ayyubids" };

// beats (frames)
const F = { nap: 12, hit: 29, fear: 59, winter1: 75, seven: 101, mongols: 142, purpose: 197, year: 223, empire: 267, china: 323, caspian: 344,
  genghis: 381, batu: 423, west: 452, tens: 469, ahead: 524, rus: 545, notOne: 571, patch: 602, quarrel: 617, forests: 656, swamps: 674, noRoads: 692, summer: 716,
  drown: 746, butWinter: 774, freeze: 802, flat: 825, city: 886, dec: 895, ryazan: 925, jan: 964, kolomna: 977, moscow: 993, feb: 1016, vladimir: 1034,
  never: 1057, fell: 1105, wait: 1147, novgorod: 1178, youSee: 1217, ice: 1229, march: 1280, thaw: 1297, highways: 1327, swamp: 1363,
  hundred: 1386, novg2: 1419, batu2: 1442, back: 1458, tribute: 1477, sacked: 1547, so: 1577, genius: 1598, weather: 1641 };

// route progress over time: piecewise by city arrivals
const RA = R.route.at;
const routeP = (f: number) => {
  const K: [number, number][] = [[F.dec, 0], [F.ryazan, RA.Ryazan], [F.kolomna, RA.Kolomna], [F.moscow, RA.Moscow], [F.vladimir, RA.Vladimir], [F.march - 10, RA.Vladimir + 0.02],
    [F.march + 25, RA.Tver], [F.thaw, RA.Torzhok], [F.novg2, 1]];
  if (f <= K[0][0]) return 0;
  for (let i = 0; i < K.length - 1; i++) if (f < K[i + 1][0]) return lerp(K[i][1], K[i + 1][1], ss((f - K[i][0]) / (K[i + 1][0] - K[i][0])));
  return 1;
};
const W2 = (lon: number, lat: number) => P(lon, lat);

export const Batu: React.FC = () => {
  const f = useCurrentFrame();
  const tVO = (f - VO) / 30;
  const talk = mouthAt(ENV, f - VO);

  // ---------------- camera ----------------
  const head = pointAlong(R.route.pts, routeP(f));
  const cam = cameraAt([
    camKey(0, 22, 53, 1300), camKey(F.winter1, 25, 53, 1180), camKey(F.seven + 10, 30, 53, 1250),
    camKey(F.mongols + 10, 44, 52, 1100), camKey(F.purpose + 15, 46, 52, 1000),
    camKey(F.empire, 70, 46, 1740), camKey(F.caspian + 20, 70, 45, 1740),
    camKey(F.genghis + 10, 98, 47, 1100), camKey(F.west + 10, 92, 47.5, 1150), camKey(F.ahead - 10, 55, 51, 1250),
    camKey(F.rus + 10, 36.5, 55.2, 560), camKey(F.quarrel + 20, 36.5, 55.4, 520),
    camKey(F.butWinter, 37.5, 55.6, 440), camKey(F.city, 38, 55.9, 330),
    camKey(F.ryazan, 39.4, 54.9, 240), camKey(F.moscow + 10, 38.4, 55.5, 260),
    camKey(F.vladimir + 10, 39.4, 56, 270), camKey(F.fell + 25, 38.2, 56, 330),
    camKey(F.novgorod, 33.4, 57.7, 360), camKey(F.march + 30, 34.6, 57.3, 300), camKey(F.novg2 + 10, 32.6, 58.1, 300),
    camKey(F.tribute + 20, 33.5, 57.6, 420), camKey(F.so, 36, 56, 700), camKey(F.weather + 40, 36, 56, 760),
  ], f);
  const S = (lon: number, lat: number) => toScreen(cam, ...W2(lon, lat));
  const SW = (x: number, y: number) => toScreen(cam, x, y);

  // ---------------- territories ----------------
  const polShow = ramp(f, F.seven + 20, 14);
  const style = (p: Polity): TerrStyle | null => {
    const id = p.id, c = COL[id];
    if (!c || polShow <= 0) return null;
    const rusI = RUSP.indexOf(id);
    let opacity = polShow * (id === "mongol" || rusI >= 0 || id === "cumans" || id === "volga_bulgaria" ? 0.92 : 0.6);
    let fill = c, pop = 0, dx = 0, glow = 0, flash = 0, label: string | undefined = NAME[id], labelSize = 30, labelOpacity = 1;
    let reveal: TerrStyle["reveal"] | undefined; let labelAt: [number, number] | undefined;
    if (id === "mongol") {
      const [kx, ky] = R.cities.Karakorum, r = lerp(60, 2600, ss((f - F.empire) / (F.caspian - F.empire + 10)));
      if (f < F.empire) opacity = 0; else reveal = { x: kx, y: ky, r };
      labelSize = 54; glow = Math.sin(ramp(f, F.empire, 40) * Math.PI) * 0.8;
      label = "MONGOL EMPIRE"; labelAt = [78, 47];
    }
    if (rusI >= 0) {
      const ap = ramp(f, F.notOne + rusI * 5, 8);
      pop = f > F.patch ? Math.sin(ramp(f, F.patch + rusI * 4, 10) * Math.PI) : Math.sin(ap * Math.PI) * 0.6;
      dx = f > F.quarrel && f < F.quarrel + 30 ? Math.sin((f + rusI * 3) * 1.8) * 4 * (1 - (f - F.quarrel) / 30) : 0;
      labelSize = 30; labelOpacity = ramp(f, F.ahead, 10) * (1 - ramp(f, F.butWinter, 10) * 0.6);
      // conquered principalities darken toward the Mongol colour as the route passes them
      const taken: Record<string, number> = { ryazan: F.ryazan + 6, vladimir: F.vladimir + 6 };
      if (taken[id]) { const t = ramp(f, taken[id], 10); flash = 0.35 * Math.sin(ramp(f, taken[id], 6) * Math.PI); fill = mixHex(c, "#7b3b22", t * 0.55); }
      if (id === "novgorod") glow = Math.sin(ramp(f, F.wait, 40) * Math.PI) + (f > F.sacked ? 0.6 * Math.sin(ramp(f, F.sacked, 30) * Math.PI) : 0);
    }
    if (id === "cumans" || id === "volga_bulgaria") { const t = ramp(f, F.west + 30, 30); fill = mixHex(c, COL.mongol, t * 0.8); labelOpacity = 1 - t; }
    // in the Rus close-ups keep far-away states quiet
    if (cam.scale > 1.6 && rusI < 0 && id !== "cumans") labelOpacity *= 0.0;
    return { fill, opacity, pop, dx, glow, flash, label, labelSize, labelOpacity, reveal, labelAt };
  };

  // ---------------- grade ----------------
  const cold = Math.max(ramp(f, F.butWinter, 25) * (1 - ramp(f, F.thaw, 40)), (f < F.seven ? ramp(f, F.fear, 15) : 0) * (1 - ramp(f, F.seven, 10)));
  const warm = ramp(f, F.thaw, 40) * (1 - ramp(f, F.tribute, 30) * 0.6);
  const thaw = ramp(f, F.thaw, 60);

  // ---------------- timeline ----------------
  const dk = [
    { f: 0, date: 1812, span: 260 }, { f: F.hit, date: 1941, span: 260 }, { f: F.seven, date: 1941, span: 600 }, { f: F.mongols - 6, date: 1237, span: 120 },
    { f: F.year + 20, date: 1237, span: 60 }, { f: F.west + 40, date: 1237.5, span: 8 }, { f: F.dec, date: 1237.92, span: 1.1 },
    { f: F.ryazan, date: 1237.97, span: 0.9 }, { f: F.kolomna, date: 1238.03, span: 0.9 }, { f: F.vladimir, date: 1238.1, span: 0.9 },
    { f: F.march, date: 1238.18, span: 0.9 }, { f: F.novg2, date: 1238.22, span: 0.9 }, { f: F.tribute, date: 1238.3, span: 4 },
    { f: F.sacked, date: 1478, span: 400 }, { f: F.so + 20, date: 1478, span: 400 },
  ];
  const C: [number, number] = [0, 3], L: [number, number] = [100, 2000];
  const marks = [{ date: 1812, label: "Napoleon", span: L }, { date: 1941, label: "Hitler", span: L }, { date: 1237.97, label: "Ryazan", span: C }, { date: 1238.05, label: "Moscow", span: C },
    { date: 1238.1, label: "Vladimir", span: C }, { date: 1238.2, label: "Turn back", span: C }, { date: 1478, label: "Tribute ends", span: L }];

  // ---------------- characters ----------------
  const batuWorld: [number, number] = f < F.genghis ? W2(47.5, 52.2) : f < F.ahead ? (() => { const h = pointAlong(R.west, ss((f - F.batu) / (F.ahead - F.batu - 10))); return [h.x, h.y] as [number, number]; })()
    : f < F.batu2 - 20 ? W2(47.5, 52.2) : W2(33.6, 57.6);
  const batuVisible = (f >= F.mongols + 8 && f < F.empire - 6) || (f >= F.batu - 4 && f < F.ahead + 20) || (f >= F.batu2 - 6 && f < F.tribute) || f >= F.so;
  const batuAppear = f < F.empire ? F.mongols + 8 : f < F.ahead + 20 ? F.batu - 4 : f < F.tribute ? F.batu2 - 6 : F.so;
  const [bx, by] = f >= F.so ? [290, 1420] : f >= F.batu2 - 6 && f < F.tribute ? [820, 1380] : SW(...batuWorld);
  const batuPop = ss(ramp(f, batuAppear, 8)), batuGone = f < F.empire ? 1 - ramp(f, F.year - 8, 6) : f < F.ahead + 20 ? 1 - ramp(f, F.ahead + 12, 8) : f < F.tribute ? 1 - ramp(f, F.tribute - 8, 8) : 1;
  const batuTalk = (f > F.purpose - 4 && f < F.purpose + 18) || (f > F.batu2 && f < F.back + 14) ? talk : 0;
  const walking = f >= F.batu && f < F.ahead ? Math.abs(Math.sin(f / 3)) * 12 : 0;

  // princes: two quarrelling, then one per city falling
  const princeA = [290, 1430], princeB = [790, 1430];
  const quarrelOn = f >= F.quarrel - 4 && f < F.forests + 4;
  const fallers: { at: [number, number]; fall: number; label: string }[] = [
    { at: [39.7, 54.6], fall: F.fell + 2, label: "Ryazan" }, { at: [37.6, 55.75], fall: F.fell + 10, label: "Moscow" }, { at: [40.4, 56.13], fall: F.fell + 18, label: "Vladimir" }];
  const novPrince = S(31.27, 58.52);

  // riders: horsemen behind the moving head
  const riders = (pts: Pt[], p: number, n: number, flip: boolean, op: number) =>
    op <= 0 ? null : Array.from({ length: n }, (_, k) => {
      const q = pointAlong(pts, Math.max(0, p - 0.035 - k * 0.05)), [x, y] = SW(q.x, q.y);
      return <Actor key={k} src="chars/rider.png" rig={RIG.rider} f={f + k * 7} pose={{ x: x + (k % 2) * 24 - 12, y: y + (k % 2 ? 22 : -6), h: 96, flip, bob: Math.abs(Math.sin((f + k * 5) / 2.6)) * 10, opacity: op, rot: Math.sin((f + k * 9) / 2.6) * 3 }} />;
    });

  // ---------------- cities ----------------
  const cityList: [string, string, "r" | "l" | "b"][] = [["Ryazan", "Ryazan", "r"], ["Kolomna", "Kolomna", "r"], ["Moscow", "Moscow", "l"], ["Vladimir", "Vladimir", "r"], ["Tver", "Tver", "l"], ["Torzhok", "Torzhok", "l"], ["Novgorod", "Novgorod", "r"]];
  const burnAt: Record<string, number> = { Ryazan: F.ryazan, Kolomna: F.kolomna, Moscow: F.moscow, Vladimir: F.vladimir, Tver: F.march + 25, Torzhok: F.thaw };
  const showCities = ramp(f, F.city - 30, 10) * (1 - ramp(f, F.so + 10, 15));
  const kmP = ramp(f, F.hundred, 25) * (1 - ramp(f, F.tribute, 10));

  const westP = ss(ramp(f, F.batu, F.ahead - F.batu - 10));
  const napP = ss(ramp(f, F.nap, 40)), hitP = ss(ramp(f, F.hit, 40)), freeze = ramp(f, F.fear, 14), frontFade = 1 - ramp(f, F.seven + 6, 12);

  return (
    <AbsoluteFill style={{ background: "#5f8e93", overflow: "hidden" }}>
      <div style={worldStyle(cam)}>
        <BaseLayers layers={[{ src: "maps/wide.jpg", rect: WIDE }, { src: "maps/rus.jpg", rect: RUS, feather: true }]} />
        <Territories polities={POL} styleOf={style} scale={cam.scale} uid="t" />
        <svg width={10} height={10} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <IceRivers rivers={RIVERS} p={ramp(f, F.freeze - 6, 45) * (1 - ramp(f, F.tribute + 30, 20))} thaw={thaw} scale={cam.scale} f={f} names={["Oka", "Klyazma", "Tvertsa", "Volga", "Msta", "Pronya", "Moskva"]} box={[...P(31, 59.2), ...P(42.5, 53.8)]} />
          {/* 1812 / 1941 fronts freezing */}
          <Arrow pts={R.napoleon} p={napP} scale={cam.scale} color={mixHex("#2f5fb0", "#cfeeff", freeze)} opacity={frontFade} />
          <Arrow pts={R.hitler} p={hitP} scale={cam.scale} color={mixHex("#5a5a5a", "#cfeeff", freeze)} opacity={frontFade} />
          {/* Batu's march west */}
          <Arrow pts={R.west} p={westP} scale={cam.scale} color="#b3271c" opacity={1 - ramp(f, F.rus + 10, 15)} />
          {/* the winter campaign along the rivers */}
          <Arrow pts={R.route.pts} p={routeP(f)} scale={cam.scale} opacity={1 - ramp(f, F.so + 20, 20)} />
          <Arrow pts={R.retreat} p={ss(ramp(f, F.back - 4, 24))} scale={cam.scale} color="#6e1a12" opacity={1 - ramp(f, F.so + 20, 20)} />
          {Object.entries(burnAt).map(([n, a]) => f >= a && f < F.so + 30 ? <Flame key={n} x={R.cities[n][0]} y={R.cities[n][1] - 4} age={f - a} f={f} scale={cam.scale} size={1.1} /> : null)}
          {cityList.map(([n, l, side]) => <City key={n} x={R.cities[n][0]} y={R.cities[n][1]} name={l} scale={cam.scale} side={side} opacity={showCities * ss(ramp(f, F.city - 30 + cityList.findIndex((c) => c[0] === n) * 3, 8))} />)}
          {f >= F.genghis - 10 && f < F.rus && <City x={R.cities.Karakorum[0]} y={R.cities.Karakorum[1]} name="Karakorum" scale={cam.scale} size={40} opacity={ramp(f, F.genghis - 10, 8) * (1 - ramp(f, F.rus - 10, 8))} />}
          {kmP > 0 && (() => { const a = P(33.5, 57.75), b = R.cities.Novgorod; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); return (
            <g opacity={kmP}><path d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`} stroke="#fff" strokeWidth={5 / cam.scale} strokeDasharray={`${12 / cam.scale} ${10 / cam.scale}`} strokeDashoffset={-f / cam.scale} />
              <text x={(a[0] + b[0]) / 2 + 14 / cam.scale} y={(a[1] + b[1]) / 2} fontFamily="DejaVu Sans" fontWeight={800} fontSize={44 / cam.scale} fill="#fff" stroke="#000" strokeWidth={8 / cam.scale} paintOrder="stroke">~100 km</text>
              {f > F.back - 6 && <g transform={`translate(${a[0]} ${a[1]}) scale(${ss(ramp(f, F.back - 6, 8)) / cam.scale})`}><path d="M-30 -30 L30 30 M30 -30 L-30 30" stroke="#000" strokeWidth={22} strokeLinecap="round" /><path d="M-30 -30 L30 30 M30 -30 L-30 30" stroke="#e23b2e" strokeWidth={13} strokeLinecap="round" /></g>}
              {L ? null : null}</g>); })()}
          <Trees scale={cam.scale} f={f} at={F.forests} pts={f < F.butWinter + 20 ? [[35, 57.2], [36.4, 56.4], [38, 57.4], [39.4, 56.9], [41.5, 57.3], [34, 55.8], [42.6, 56.2], [37.2, 58.2], [40.5, 58.1]].map(([a, b]) => W2(a, b)) : []} />
          <Swamps scale={cam.scale} f={f} at={f < F.butWinter + 20 ? F.swamps : F.swamp - 10} pts={(f < F.butWinter + 20 ? [[38.2, 54.4], [41.2, 55.2], [35.6, 56.9]] : f > F.swamp - 12 ? [[34.3, 57.3], [33.9, 57.6], [35.2, 57.1]] : []).map(([a, b]) => W2(a, b))} />
        </svg>
      </div>

      {/* grade + weather */}
      <AbsoluteFill style={{ background: "#bcd6f0", mixBlendMode: "multiply", opacity: cold * 0.45 }} />
      <AbsoluteFill style={{ background: "#f6d9a8", mixBlendMode: "multiply", opacity: warm * 0.35 }} />
      <svg width={FW} height={FH} style={{ position: "absolute", inset: 0, opacity: Math.max(cold, f >= F.mongols && f < F.year ? 1 : 0) * (1 - thaw) }}>
        {Array.from({ length: 40 }, (_, i) => { const sp = 1.4 + (i % 7) / 5, x = ((i * 137) % FW) + Math.sin((f + i * 13) / 22) * 20, y = ((i * 211 + f * sp * 4) % 2000) - 40;
          return <circle key={i} cx={x} cy={y} r={2 + (i % 4) * 1.6} fill="#fff" opacity={0.8} />; })}
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(15,20,25,.5) 100%)" }} />

      {/* screen-space map props */}
      {f >= F.fear && f < F.seven + 6 && [R.napoleon, R.hitler].map((pts, i) => { const hp = pointAlong(pts, i ? hitP : napP), [x, y] = SW(hp.x, hp.y);
        return <svg key={i} width={FW} height={FH} style={{ position: "absolute", inset: 0 }}><Snowflake x={x} y={y - 40} s={ss(ramp(f, F.fear + i * 6, 10)) * 1.4} rot={f * 2} /></svg>; })}
      {f < F.seven + 6 && [["1812", R.napoleon], ["1941", R.hitler]].map(([lab, pts], i) => { const p0 = (pts as Pt[])[0], [x, y] = SW(p0[0], p0[1]);
        return <div key={i} style={{ position: "absolute", left: x + 10, top: y + (i ? -100 : 20), width: 180, textAlign: "center", fontFamily: "Georgia, DejaVu Serif, serif", fontWeight: 700, fontSize: 52,
          color: "#fff", textShadow: "0 3px 8px #000", opacity: ramp(f, i ? F.hit : F.nap, 8) * frontFade }}>{lab as string}</div>; })}

      {/* characters */}
      {quarrelOn && (<>
        <Actor src="chars/prince.png" rig={RIG.prince} f={f} pose={{ x: princeA[0], y: princeA[1], h: 380, talk: Math.max(0, Math.sin(f / 3)) * 0.8, shock: 0, blink: blinkAt(f, 1),
          rot: Math.sin(f / 2) * 2, opacity: ramp(f, F.quarrel - 4, 6) * (1 - ramp(f, F.forests - 4, 8)) }} />
        <Actor src="chars/prince.png" rig={RIG.prince} f={f + 9} pose={{ x: princeB[0], y: princeB[1], h: 380, flip: true, talk: Math.max(0, -Math.sin(f / 3)) * 0.8, blink: blinkAt(f, 2),
          rot: -Math.sin(f / 2) * 2, opacity: ramp(f, F.quarrel, 6) * (1 - ramp(f, F.forests - 4, 8)) }} />
      </>)}
      {f >= F.never && f < F.wait + 6 && fallers.map((p, i) => { const x = 210 + i * 330, y = 1400, t = ss(ramp(f, p.fall, 9));
        return <Actor key={i} src="chars/prince.png" rig={RIG.prince} f={f + i * 11} pose={{ x, y: y + t * (i === 1 ? 140 : 40), h: 300, blink: blinkAt(f, i), shock: t, flip: i === 2, rot: t * (i === 0 ? -85 : i === 2 ? 85 : 0), opacity: ramp(f, F.never + i * 4, 6) * (1 - ramp(f, F.wait - 4, 8)) }} />; })}
      {f >= F.never && f < F.wait + 6 && fallers.map((p, i) => <div key={"n" + i} style={{ position: "absolute", left: 210 + i * 330 - 120, width: 240, top: 1420, textAlign: "center",
        fontFamily: "Georgia, DejaVu Serif, serif", fontWeight: 700, fontSize: 34, color: "#f7efdc", textShadow: "0 2px 6px #000", opacity: ramp(f, F.never + i * 4, 6) * (1 - ramp(f, F.wait - 4, 8)) }}>{p.label}</div>)}
      {f >= F.wait && f < F.tribute + 70 && (
        <Actor src="chars/prince.png" rig={RIG.prince} f={f} pose={{ x: 250, y: 1420, h: 360, blink: blinkAt(f, 4), shock: f > F.novgorod && f < F.youSee ? 0.7 : 0,
          bob: f > F.sacked ? Math.abs(Math.sin(f / 4)) * 14 : 0, opacity: ramp(f, F.wait, 8) * (1 - ramp(f, F.tribute + 60, 10)) }} />)}
      {batuVisible && (
        <Actor src="chars/batu.png" rig={RIG.batu} f={f} pose={{ x: bx, y: by + (f >= F.so || (f >= F.batu2 - 6 && f < F.tribute) ? 0 : 40), h: f >= F.so ? 520 : f >= F.batu2 - 6 && f < F.tribute ? 380 : 300, talk: batuTalk, blink: blinkAt(f, 7), bob: walking,
          shock: f > F.back - 4 && f < F.back + 20 ? 0.5 : 0, flip: f >= F.batu && f < F.ahead, opacity: batuPop * batuGone, rot: f >= F.batu && f < F.ahead ? Math.sin(f / 3) * 3 : 0 }} />)}
      {riders(R.west, westP, 4, true, ramp(f, F.tens - 6, 8) * (1 - ramp(f, F.rus, 12)))}
      {riders(R.route.pts, routeP(f), 3, true, ramp(f, F.dec, 8) * (1 - ramp(f, F.novg2 + 30, 12)) * (f > F.swamp ? 1 - ramp(f, F.swamp, 20) * 0.5 : 1))}
      {f >= F.drown - 10 && f < F.butWinter + 6 && (() => { const [x, y] = S(38.2, 54.4), t = ss(ramp(f, F.drown, 20));
        return <div style={{ position: "absolute", left: x - 90, top: y - 100, width: 180, height: 140, overflow: "hidden", opacity: 1 - ramp(f, F.butWinter - 4, 8) }}>
          <div style={{ position: "absolute", left: 0, top: 10 + t * 60 }}><Actor src="chars/rider.png" rig={RIG.rider} f={f} pose={{ x: 90, y: 120, h: 120, flip: true, rot: t * 12 }} /></div>
          <div style={{ position: "absolute", left: 10, right: 10, bottom: 0, height: 44, borderRadius: "50%", background: "#5a4428", border: "4px solid #2c2014" }} /></div>; })()}

      {/* cards */}
      <Rewind f={f} from={F.seven - 2} to={F.mongols - 4} />
      <BigText f={f} from={F.year} to={F.empire + 4} text="1237" top={560} size={200} />
      <BigText f={f} from={F.noRoads} to={F.summer + 4} text="NO ROADS" top={420} size={110} color="#ffd9a0" />
      <BigText f={f} from={F.flat} to={F.city} text="ICE HIGHWAYS" top={420} size={104} color="#dff3ff" />
      <BigText f={f} from={F.sacked - 4} to={F.so} text="NEVER SACKED" top={420} size={104} color="#ffe39a" />
      {f >= F.genius - 4 && (<>
        <div style={{ position: "absolute", left: 10, width: 520, top: 800, textAlign: "center", fontFamily: "Georgia, DejaVu Serif, serif", fontWeight: 700, fontSize: 80, color: "#ffcf8a",
          textShadow: "0 6px 20px rgba(0,0,0,.6)", opacity: ramp(f, F.genius - 4, 6), transform: `scale(${0.85 + 0.15 * ss(ramp(f, F.genius - 4, 8))})` }}>GENIUS?</div>
        <svg width={FW} height={FH} style={{ position: "absolute", inset: 0, opacity: ramp(f, F.weather - 4, 6) }}>
          <Snowflake x={800} y={1220} s={2.6 * (0.85 + 0.15 * ss(ramp(f, F.weather - 4, 8)))} rot={f} />
        </svg>
        <div style={{ position: "absolute", left: 470, width: 120, top: 830, textAlign: "center", fontFamily: "Georgia, DejaVu Serif, serif", fontStyle: "italic", fontSize: 48, color: "#f7efdc", textShadow: "0 3px 8px #000", opacity: ramp(f, F.weather - 10, 6) }}>or</div>
        <div style={{ position: "absolute", left: 550, width: 520, top: 800, textAlign: "center", fontFamily: "Georgia, DejaVu Serif, serif", fontWeight: 700, fontSize: 80, color: "#dff3ff",
          textShadow: "0 6px 20px rgba(0,0,0,.6)", opacity: ramp(f, F.weather - 4, 6) }}>WEATHER?</div>
      </>)}

      <TimelineBar keys={dk} f={f} marks={marks} />
      <Caption t={tVO} words={WORDS} top={1480} />
      <Audio src={staticFile("batu/mix.wav")} />
    </AbsoluteFill>
  );
};

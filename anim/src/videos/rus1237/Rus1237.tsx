// Demo of the 2D map engine: Rus in 1237 -> Batu arrives -> Golden Horde. ~11 s narration.
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BaseMap, CamKey, Caption, FW, Polity, Territories, TerrStyle, YearCard, cameraAt, clamp01, flyIn, mixHex, ss, worldStyle } from "../../engine/map";
import base from "../../../public/maps/eurasia_w/base.json";
import b1200 from "../../../public/maps/eurasia_w/borders_1200.json";
import b1279 from "../../../public/maps/eurasia_w/borders_1279.json";
import voice from "../../../public/rus1237/voice.json";
import rig from "../../../public/maptest/batu_rig.json";

export const RUS1237_FRAMES = Math.ceil(((voice as { dur: number }).dur + 1.6) * 30);
const VO = 10; // voice starts at frame
type Word = { w: string; s: number; e: number };
const WORDS = (voice as { words: Word[] }).words;
const at = (prefix: string, nth = 0) => { const m = WORDS.filter((w) => w.w.toLowerCase().replace(/[^a-z]/g, "").startsWith(prefix)); return m[nth] ? VO + Math.round(m[nth].s * 30) : 9999; };

const uniq = (arr: Polity[]) => arr.map((p, i) => ({ ...p, id: `${p.id}_${i}` }));
const P1200 = uniq(b1200 as unknown as Polity[]), P1279 = uniq(b1279 as unknown as Polity[]);
const RUS: Record<string, { c: string; l: string }> = {
  principality_of_novgorod: { c: "#3d6db3", l: "Novgorod" },
  principality_of_vladimir_suzdal: { c: "#b8372d", l: "Vladimir" },
  other_rus_principalities: { c: "#2f8a68", l: "Ryazan & others" },
  principality_of_kyiv: { c: "#d08a2a", l: "Kyiv" },
  principality_of_galicia_volhynia: { c: "#6b4f98", l: "Galicia" },
};
const HORDE = "#c9962c";
const base_ = (id: string) => id.replace(/_\d+$/, "");

export const Rus1237: React.FC = () => {
  const f = useCurrentFrame();
  const fRussia = at("russia"), fPatch = at("patchwork"), fQuarrel = at("quarrel"), fBatu = at("batu"), fThree = at("three"), fHorde = at("horde");
  const cam: CamKey[] = [
    { f: 0, lon: 39, lat: 54.5, view: 1080 },
    { f: fRussia, lon: 36.5, lat: 55.5, view: 900 },
    { f: fBatu - 6, lon: 37.5, lat: 55, view: 860 },
    { f: fBatu + 14, lon: 40.5, lat: 53, view: 1000 },
    { f: fHorde - 10, lon: 41.5, lat: 53, view: 1080 },
    { f: fHorde + 40, lon: 43, lat: 53, view: 1120 },
  ];
  const c = cameraAt(cam, f);

  // ---- territory states over time
  const mergeT = clamp01((f - fHorde + 4) / 4), whiteHold = clamp01((f - fHorde) / 6), toHorde = clamp01((f - fHorde - 10) / 12);
  const style1200 = (p: Polity): TerrStyle | null => {
    const id = base_(p.id), r = RUS[id];
    if (r) {
      const order = Object.keys(RUS).indexOf(id), appear = clamp01((f - fRussia - order * 4) / 8);
      const pulse = Math.max(0, Math.sin(clamp01((f - fPatch - order * 5) / 10) * Math.PI)) * (f > fPatch ? 1 : 0);
      const shake = f > fQuarrel && f < fQuarrel + 24 ? Math.sin((f + order * 3) * 1.9) * 2.2 * (1 - (f - fQuarrel) / 24) : 0;
      const conquered = id !== "principality_of_novgorod";
      const flash = conquered ? Math.min(mergeT, 1 - toHorde) : 0;
      const fill = conquered && toHorde > 0 ? mixHex(r.c, mixHex(HORDE, "#e8d3a0", 0.35), toHorde) : r.c;
      return { fill, opacity: appear * (conquered ? 1 - clamp01((f - fHorde - 30) / 10) : 1), pop: pulse, dx: shake, flash: flash * (whiteHold > 0 ? 1 : mergeT),
        label: r.l, labelSize: 30, labelOpacity: appear * (1 - toHorde) };
    }
    if (id === "cuman_khanates" || id === "volga_bulgars") {
      const hordeIn = clamp01((f - fBatu - 8 - (id === "volga_bulgars" ? 8 : 0)) / 14);
      if (hordeIn <= 0) return id === "cuman_khanates" ? { fill: "#a7915a", opacity: 0.55 * clamp01((f - fRussia) / 10), label: "Cumans", labelSize: 26, labelOpacity: 0.8 } : null;
      return { fill: mixHex("#a7915a", HORDE, hordeIn), opacity: (0.55 + 0.45 * hordeIn) * (1 - clamp01((f - fHorde - 30) / 10)), highlight: Math.sin(hordeIn * Math.PI), strokeOpacity: id === "volga_bulgars" ? 1 - hordeIn : 1 };
    }
    return null;
  };
  const show1279 = clamp01((f - fHorde - 22) / 14);
  const style1279 = (p: Polity): TerrStyle | null => {
    const id = base_(p.id);
    if (show1279 <= 0) return null;
    if (id === "khanate_of_the_golden_horde") return { fill: HORDE, opacity: show1279, label: "GOLDEN HORDE", labelAt: [44, 51.2], labelSize: 46, labelOpacity: clamp01((f - fHorde - 30) / 10) };
    if (id === "ryazan") return { fill: mixHex(HORDE, "#e8d3a0", 0.35), opacity: show1279, label: "Rus' (vassals)", labelAt: [38.5, 55], labelSize: 30, labelOpacity: clamp01((f - fHorde - 34) / 10) };
    if (id === "novgorod") return { fill: "#3d6db3", opacity: show1279, label: "Novgorod", labelSize: 28 };
    return null;
  };

  // ---- Batu flies in on "Batu" and stands bottom-right
  const fly = flyIn(f, fBatu - 4, 9, 800), env = (voice as { env: number[] }).env;
  const talk = env[f - VO] ?? 0, s = 0.4;
  const counter = f >= fThree ? Math.min(1240, 1237 + Math.floor((f - fThree) / 6)) : null;

  return (
    <AbsoluteFill style={{ background: "#5f8e93", overflow: "hidden" }}>
      <div style={worldStyle(c)}>
        <BaseMap region="eurasia_w" W={(base as { W: number }).W} H={(base as { H: number }).H} />
        <Territories polities={P1200} styleOf={style1200} scale={c.scale} />
        <Territories polities={P1279} styleOf={style1279} scale={c.scale} />
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(20,25,30,.45) 100%)" }} />
      <YearCard f={f} from={2} to={Math.max(40, fRussia + 6)} text="1237" />
      {counter && (
        <div style={{ position: "absolute", top: 150, right: 70, fontFamily: "Georgia, DejaVu Serif, serif", fontSize: 96, color: "#f7efdc",
          textShadow: "0 4px 12px rgba(0,0,0,.6)", opacity: clamp01((f - fThree) / 6) * (1 - clamp01((f - fHorde - 30) / 10)) }}>{counter}</div>
      )}
      {fly.visible && (
        <div style={{ position: "absolute", left: FW - 400 + fly.x, top: 1920 - rig.h * s - 40, width: rig.w * s, height: rig.h * s, filter: fly.blur > 0.3 ? `blur(${fly.blur}px)` : undefined,
          transform: `rotate(${0.8 * Math.sin(f / 25)}deg) scaleY(${1 + 0.01 * Math.sin(f / 13) + talk * 0.01})`, transformOrigin: "50% 100%" }}>
          <Img src={staticFile("maptest/batu.png")} style={{ width: "100%", height: "100%" }} />
        </div>
      )}
      <Caption t={(f - VO) / 30} words={WORDS} />
      {/* small vignette flash on the merge, like the reference's paper-white beat */}
      <AbsoluteFill style={{ background: "#f6efe0", opacity: 0.18 * Math.sin(clamp01((f - fHorde) / 10) * Math.PI) }} />
      <Sequence from={VO}><Audio src={staticFile("rus1237/voice.wav")} /></Sequence>
      {ss(0) ? null : null}
    </AbsoluteFill>
  );
};

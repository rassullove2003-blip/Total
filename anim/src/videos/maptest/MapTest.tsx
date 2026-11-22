// 2D cut-out test: painted Batu on the parchment map, lip-sync from the voice envelope, blinks, breathing,
// head bob, route drawing along frozen rivers, falling snow, word captions. Pure DOM/SVG: no WebGL, fast to render.
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import rig from "../../../public/maptest/batu_rig.json";
import voice from "../../../public/maptest/voice.json";
import route from "../../../public/maptest/route.json";

export const MAPTEST_FRAMES = 300;
const VOICE_AT = 12; // frames
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

const env = (f: number) => {
  const i = f - VOICE_AT, e = voice.env as number[];
  if (i < 0 || i >= e.length) return 0;
  const v = (e[i] + (e[i - 1] ?? 0) * 0.6 + (e[i + 1] ?? 0) * 0.6) / 2.2; // smooth
  return Math.max(0, Math.min(1, (v - 0.08) * 1.5));
};
const BLINKS = [40, 118, 196, 262];
const blinkAt = (f: number) => {
  for (const b of BLINKS) { const d = f - b; if (d >= 0 && d < 6) return [0.5, 1, 1, 0.6, 0.25, 0][d]; }
  return 0;
};

const Snow: React.FC<{ f: number }> = ({ f }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    {Array.from({ length: 70 }, (_, i) => {
      const sp = 1.2 + ((i * 37) % 10) / 6, x0 = (i * 151) % 1080, y = ((i * 263 + f * sp * 3) % 2000) - 40;
      const x = x0 + Math.sin((f + i * 20) / 30) * 14, r = 2 + (i % 4);
      return <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.75} />;
    })}
  </svg>
);

const Face: React.FC<{ f: number }> = ({ f }) => {
  const o = env(f), b = blinkAt(f), m = rig.mouth;
  const ry = 3 + 17 * o, rx = m.w / 2 * (0.72 + 0.2 * o);
  return (
    <svg width={rig.w} height={rig.h} style={{ position: "absolute", inset: 0 }}>
      <defs>
        {rig.eyes.map((e, i) => <clipPath key={i} id={`eye${i}`}><ellipse cx={e.cx} cy={e.cy} rx={e.rx + 4} ry={e.ry + 6} /></clipPath>)}
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
      {o > 0.06 && (
        <g>
          <ellipse cx={m.cx} cy={m.cy + ry * 0.55} rx={rx} ry={ry} fill="#4a1712" stroke="#3a1a10" strokeWidth={3} />
          <clipPath id="mouthIn"><ellipse cx={m.cx} cy={m.cy + ry * 0.55} rx={rx} ry={ry} /></clipPath>
          <g clipPath="url(#mouthIn)">
            <rect x={m.cx - rx} y={m.cy + ry * 0.55 - ry} width={2 * rx} height={Math.min(8, ry * 0.5)} fill="#f4ece2" />
            <ellipse cx={m.cx} cy={m.cy + ry * 1.35} rx={rx * 0.6} ry={ry * 0.55} fill="#c2504a" />
          </g>
          <path d={`M ${m.cx - rx} ${m.cy + ry * 0.55} Q ${m.cx} ${m.cy + ry * 1.75} ${m.cx + rx} ${m.cy + ry * 0.55}`} stroke={m.lip} strokeWidth={5} fill="none" opacity={0.9} />
        </g>
      )}
    </svg>
  );
};

const Batu: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f - 4, fps, config: { damping: 11, stiffness: 120 } });
  const purpose = (voice.words as { w: string; s: number }[]).find((w) => w.w.toLowerCase().startsWith("purpose"));
  const pf = purpose ? VOICE_AT + purpose.s * 30 : 9999;
  const pop = spring({ frame: f - pf + 4, fps, config: { damping: 8, stiffness: 200 } }) * (1 - ease((f - pf - 10) / 20));
  const breathe = 1 + 0.008 * Math.sin(f / 14);
  const talk = env(f);
  const headRot = 1.6 * Math.sin(f / 23) + talk * 1.2 * Math.sin(f / 4);
  const s = 0.6;
  return (
    <div style={{ position: "absolute", left: 790 - rig.w / 2, top: 1920 - rig.h + 120 + (1 - enter) * 900,
      width: rig.w, height: rig.h, transform: `scale(${s * (1 + 0.04 * pop)}, ${s * breathe * (1 + 0.04 * pop)})`, transformOrigin: "50% 100%" }}>
      <Img src={staticFile("maptest/batu.png")} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", inset: 0, transform: `rotate(${headRot}deg)`, transformOrigin: `${rig.neck[0]}px ${rig.neck[1]}px`,
        clipPath: `polygon(0 0, 100% 0, 100% ${(rig.neck[1] - 10) / rig.h * 100}%, 0 ${(rig.neck[1] - 10) / rig.h * 100}%)` }}>
        <Img src={staticFile("maptest/batu.png")} style={{ position: "absolute", inset: 0 }} />
        <Face f={f} />
      </div>
    </div>
  );
};

const Route: React.FC<{ f: number }> = ({ f }) => {
  const k = 2; // design 540x960 -> 1080x1920
  const d = (route as number[][]).map(([x, y], i) => `${i ? "L" : "M"} ${x * k} ${y * k}`).join(" ");
  const p = ease(interpolate(f, [70, 250], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const len = 2600;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <path d={d} fill="none" stroke="#a3261d" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${len * p} ${len}`} opacity={0.9} />
      <path d={d} fill="none" stroke="#f3d7a0" strokeWidth={3} strokeDasharray="14 18" strokeDashoffset={-f * 2} style={{ mask: "none" }} opacity={p > 0 ? 0.8 * Math.min(1, p * 5) : 0} />
    </svg>
  );
};

const Caption: React.FC<{ f: number }> = ({ f }) => {
  const t = (f - VOICE_AT) / 30, W = voice.words as { w: string; s: number; e: number }[];
  const i = W.findIndex((w) => t >= w.s - 0.05 && t < (W[W.indexOf(w) + 1]?.s ?? w.e + 0.4));
  if (i < 0) return null;
  const w = W[i].w.replace(/[.,]/g, "").toUpperCase(), age = t - W[i].s;
  const sc = 0.85 + 0.15 * ease(age / 0.08);
  return (
    <div style={{ position: "absolute", top: 760, width: 1080, textAlign: "center", fontFamily: "DejaVu Sans, sans-serif", fontWeight: 900,
      fontSize: 92, color: "#fff", WebkitTextStroke: "10px #1b1a24", paintOrder: "stroke fill", transform: `scale(${sc})`, letterSpacing: 1 }}>{w}</div>
  );
};

export const MapTest: React.FC = () => {
  const f = useCurrentFrame();
  const z = 1 + 0.18 * ease(f / 300);
  const winter = (voice.words as { w: string; s: number }[]).find((w) => w.w.toLowerCase().startsWith("winter"));
  const wf = winter ? VOICE_AT + winter.s * 30 : 9999;
  const stamp = spring({ frame: f - wf, fps: 30, config: { damping: 9, stiffness: 160 } });
  return (
    <AbsoluteFill style={{ background: "#2b2016", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${z}) translate(${-30 * ease(f / 300)}px, ${-40 * ease(f / 300)}px)`, transformOrigin: "40% 45%" }}>
        <Img src={staticFile("maptest/map.png")} style={{ width: 1080, height: 1920 }} />
        <Route f={f} />
      </AbsoluteFill>
      <Snow f={f} />
      {f >= wf && (
        <div style={{ position: "absolute", top: 150, width: 1080, textAlign: "center", transform: `scale(${stamp}) rotate(${-4 * stamp}deg)`,
          fontFamily: "Georgia, DejaVu Serif, serif", fontWeight: 900, fontSize: 96, color: "#f3e2bf", WebkitTextStroke: "8px #3b2a18", paintOrder: "stroke fill" }}>WINTER, 1237</div>
      )}
      <Batu f={f} />
      <Caption f={f} />
      <Sequence from={VOICE_AT}><Audio src={staticFile("maptest/voice.wav")} /></Sequence>
    </AbsoluteFill>
  );
};

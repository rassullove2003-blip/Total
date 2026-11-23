// Channel branding for "The Other Half": avatar (800x800) and banner (2560x1440).
// Concept: the familiar western half of the map is faded; the "other half" (steppe, Silk Road, Asia) is in full colour.
import React from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { BaseLayers, P, Polity, Territories, TerrStyle } from "../../engine/kit";
import wide from "../../../public/maps/wide.json";
import b1237 from "../../../public/maps/borders_1237.json";

const POL = b1237 as unknown as Polity[];
const WIDE = (wide as { rect: number[] }).rect;
const COL: Record<string, string> = {
  mongol: "#b0532c", song: "#4f9468", tibet: "#9c947f", delhi: "#c9a24a", persia: "#8f73ad", ayyubids: "#c98b52", byzantium: "#7a4c8f",
  hre: "#7f8aa3", hungary: "#9a6e5e", poland: "#b07a7a", france: "#5e7fb0", england: "#a05050", bulgaria: "#6f8f6a", sweden: "#6a88a8", georgia: "#8a8a5a",
  cumans: "#a7915a", volga_bulgaria: "#86955a", novgorod: "#3d6db3", vladimir: "#b8372d", ryazan: "#2f8a68", kyiv: "#d08a2a", galicia: "#6b4f98",
};

const MapView: React.FC<{ lon: number; lat: number; scale: number; split: number; labels?: boolean }> = ({ lon, lat, scale, split, labels }) => {
  const { width: W, height: H } = useVideoConfig();
  const [cx, cy] = P(lon, lat);
  const style = (p: Polity): TerrStyle | null => (COL[p.id] ? { fill: COL[p.id], opacity: 0.92, label: labels && p.id === "mongol" ? "Mongol Empire" : undefined, labelSize: 34 } : null);
  const world = (
    <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${W / 2 - cx * scale}px, ${H / 2 - cy * scale}px) scale(${scale})` }}>
      <BaseLayers layers={[{ src: "maps/wide.jpg", rect: WIDE }]} />
      <Territories polities={POL} styleOf={style} scale={scale} uid="b" />
    </div>
  );
  return (
    <AbsoluteFill style={{ background: "#5f8e93" }}>
      {/* full colour (the other half) */}
      <AbsoluteFill>{world}</AbsoluteFill>
      {/* faded familiar half, clipped to the left of the split */}
      <AbsoluteFill style={{ clipPath: `inset(0 ${W - split}px 0 0)`, filter: "grayscale(1) sepia(0.35) brightness(0.62) contrast(0.9)" }}>{world}</AbsoluteFill>
      {/* golden seam */}
      <div style={{ position: "absolute", left: split - 3, top: 0, width: 6, height: H, background: "linear-gradient(#f7d27a, #e0a940, #f7d27a)", boxShadow: "0 0 24px 6px rgba(255,210,120,.55)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(10,12,18,.55) 100%)" }} />
    </AbsoluteFill>
  );
};

const Face: React.FC<{ grey?: boolean }> = ({ grey }) => (
  // Batu's head, cropped from the character art (head spans roughly y 40-560 of the 696x1496 cut-out)
  <Img src={staticFile("chars/batu.png")} style={{ position: "absolute", left: 400 - 696 * 0.62, top: -10, width: 696 * 1.24, height: 1496 * 1.24,
    filter: grey ? "grayscale(1) sepia(0.3) brightness(0.7)" : undefined }} />
);
export const Avatar: React.FC = () => (
  <AbsoluteFill>
    <MapView lon={58} lat={47} scale={0.5} split={400} />
    <AbsoluteFill style={{ background: "rgba(20,16,10,.35)" }} />
    <AbsoluteFill><Face /></AbsoluteFill>
    <AbsoluteFill style={{ clipPath: "inset(0 400px 0 0)" }}><Face grey /></AbsoluteFill>
    <div style={{ position: "absolute", left: 397, top: 0, width: 6, height: 800, background: "linear-gradient(#f7d27a, #e0a940, #f7d27a)", boxShadow: "0 0 20px 5px rgba(255,210,120,.5)" }} />
    {/* thin ring so it reads as a coin/seal inside YouTube's circle crop */}
    <AbsoluteFill style={{ borderRadius: "50%", boxShadow: "inset 0 0 0 14px rgba(247,210,122,.9), inset 0 0 0 22px rgba(20,16,10,.55)" }} />
  </AbsoluteFill>
);

export const Banner: React.FC = () => (
  <AbsoluteFill>
    <MapView lon={46} lat={45} scale={0.9} split={1030} />
    {/* title inside YouTube's safe area (centre 1546x423) */}
    <div style={{ position: "absolute", left: 0, width: 2560, top: 540, textAlign: "center", fontFamily: "Georgia, DejaVu Serif, serif", fontWeight: 700, fontSize: 168,
      color: "#f7efdc", letterSpacing: 10, textShadow: "0 8px 30px rgba(0,0,0,.75)", WebkitTextStroke: "4px rgba(40,25,10,.7)" }}>THE OTHER HALF</div>
    <div style={{ position: "absolute", left: 0, width: 2560, top: 760, textAlign: "center", fontFamily: "DejaVu Sans, sans-serif", fontWeight: 700, fontSize: 46,
      color: "#ffe3a8", textShadow: "0 4px 14px rgba(0,0,0,.85)" }}>Steppe empires · the Silk Road · Rus' · the half of history most channels skip</div>
  </AbsoluteFill>
);

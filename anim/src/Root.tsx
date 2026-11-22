import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { KolaTest, KOLA_TEST_FRAMES } from "./videos/kola/Kola";

export const Root: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="KolaTest" component={KolaTest} durationInFrames={KOLA_TEST_FRAMES} fps={30} width={1080} height={1920} />
  </>
);

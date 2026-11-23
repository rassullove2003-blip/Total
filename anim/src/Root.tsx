import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { KolaTest, KOLA_TEST_FRAMES } from "./videos/kola/Kola";
import { MapTest, MAPTEST_FRAMES } from "./videos/maptest/MapTest";
import { Rus1237, RUS1237_FRAMES } from "./videos/rus1237/Rus1237";
import { Batu, BATU_FRAMES } from "./videos/batu/Batu";
import { Avatar, Banner } from "./videos/brand/Brand";

export const Root: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="KolaTest" component={KolaTest} durationInFrames={KOLA_TEST_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="MapTest" component={MapTest} durationInFrames={MAPTEST_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Rus1237" component={Rus1237} durationInFrames={RUS1237_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Batu" component={Batu} durationInFrames={BATU_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Avatar" component={Avatar} durationInFrames={1} fps={30} width={800} height={800} />
    <Composition id="Banner" component={Banner} durationInFrames={1} fps={30} width={2560} height={1440} />
  </>
);

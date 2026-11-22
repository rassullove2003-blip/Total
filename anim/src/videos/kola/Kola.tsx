// "The Well to Hell" (Kola Superdeep Borehole) — test composition for the Arctic set and the Bulb host.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback } from "../bridge/ink";
import { LensBlur } from "../bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH } from "../bridge/grade";
import { KolaWorld } from "./scene";
import { BulbOpts } from "./bulb";

export const KOLA_TEST_FRAMES = 150;
const ss = (t: number) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const HOST = new THREE.Vector3(0, 0, 0);
const fwd = new THREE.Vector3();

/** test timeline: wide establishing glide in to a medium shot of the host; expression changes on beats */
const shot = (f: number) => {
  const t = ss(Math.min(1, f / 120));
  const pos = new THREE.Vector3(THREE.MathUtils.lerp(9, 3.2, t), THREE.MathUtils.lerp(3.2, 1.75, t), THREE.MathUtils.lerp(16, 5.2, t));
  const look = new THREE.Vector3(THREE.MathUtils.lerp(-2, 0.1, t), THREE.MathUtils.lerp(6, 1.55, t), THREE.MathUtils.lerp(-6, 0, t));
  const pose: BulbOpts = f < 60 ? { expr: "neutral", look: -4 } : f < 100 ? { expr: "smug", look: 3 } : { expr: "grin", arms: "point", glow: 1 };
  return { pos, look, fov: 40, pose, cInf: THREE.MathUtils.lerp(0, 12, t) };
};

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new KolaWorld(), []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      <primitive object={fx.ink} dispose={null} />
      <primitive object={fx.lens.pre} dispose={null} />
      <primitive object={fx.lens.main} dispose={null} />
      <primitive object={fx.bloom} dispose={null} />
      <primitive object={fx.tone} dispose={null} />
      <primitive object={fx.grade} dispose={null} />
    </EffectComposer>
  ), [fx]);
  const cam = camera as THREE.PerspectiveCamera;
  const s = shot(f);
  cam.position.copy(s.pos); cam.up.set(0, 1, 0); cam.lookAt(s.look);
  cam.fov = s.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  world.pose(s.pose);
  world.update(cam, scene, HOST);
  noInkFallback(world.root);
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, HOST.clone().add(new THREE.Vector3(0, 1.4, 0)).sub(cam.position).dot(fwd));
  fx.lens.cInf = s.cInf;
  return (<><primitive object={world.root} dispose={null} />{post}</>);
};

const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
export const KolaTest: React.FC = () => (
  <AbsoluteFill style={{ background: "#d6e6f4" }}>
    <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows
      gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }} camera={{ fov: 40, near: 0.2, far: 1500 }}>
      <Inner />
    </ThreeCanvas>
  </AbsoluteFill>
);

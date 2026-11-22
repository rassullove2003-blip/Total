// Arctic drill site (Kola, 1970s-80s): snow field, lattice derrick, corrugated shed, pipes, pines, far hills.
// Engine modules (ink, two-tone shading, card shading, grade) are shared with the bridge template.
import * as THREE from "three";
import { NOINK } from "../bridge/ink";
import { TONE, CHAR, twoTone, untone } from "../bridge/shade";
import { cardShade, blobMaterial, CARD_K } from "../bridge/cardshade";
import { bulbCanvas, BulbOpts } from "./bulb";

export const ARCTIC = {
  az: 35, el: 16,
  lit: [1.62, 1.48, 1.3] as const, shade: [0.42, 0.46, 0.66] as const, lift: [0.06, 0.08, 0.16] as const,
  lambert: 0.35, sideK: 0.86, term: 0.18, sat: 1.12,
  charTint: [1.0, 0.95, 0.92] as const, charShade: 0.86, charGrad: 0.08, bodyGrad: 0.22, sideTint: [0.9, 0.9, 0.98] as const,
  sky: ["#d6e6f4", "#b9d3ef", "#86b2e6", "#5f95dc", "#3f78cc"], skyE: [0, 4, 10, 20, 45],
  fog: "#d6e6f4", fogNear: 40, fogFar: 520,
};

const rnd = (s: number) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function paint(w: number, h: number, fn: (g: CanvasRenderingContext2D) => void, repeat = 1) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  fn(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  return t;
}
const snowTex = () => paint(1024, 1024, (g) => {
  g.fillStyle = "#eef3f9"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 900; i++) { // soft wind strokes, cool tints
    g.strokeStyle = ["#e2eaf5", "#f8fbff", "#dbe5f2", "#e8eef8"][i % 4]; g.lineWidth = 2 + rnd(i) * 6; g.lineCap = "round";
    const x = rnd(i * 3) * 1024, y = rnd(i * 7) * 1024, l = 30 + rnd(i * 11) * 120;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l * 0.5, y - 6, x + l, y + 2); g.stroke();
  }
}, 14);
const metalTex = (base: string, seam: string) => paint(512, 512, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 32) { g.fillStyle = seam; g.fillRect(x, 0, 4, 512); g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(x + 8, 0, 6, 512); }
  for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(90,60,40,${0.05 + rnd(i) * 0.1})`; g.beginPath(); g.ellipse(rnd(i * 5) * 512, rnd(i * 9) * 512, 4 + rnd(i) * 16, 3 + rnd(i * 2) * 10, 0, 0, 7); g.fill(); }
});
const starTex = () => paint(512, 512, (g) => {
  g.fillStyle = "#d8332e"; g.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 105 : 250, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(256 + r * Math.cos(a), 266 + r * Math.sin(a)); }
  g.closePath(); g.fill(); g.lineWidth = 18; g.strokeStyle = "#7a1a1c"; g.stroke();
});
const blobTex = () => paint(256, 128, (g) => {
  const gr = g.createRadialGradient(128, 64, 4, 128, 64, 120);
  gr.addColorStop(0, "rgb(120,128,170)"); gr.addColorStop(0.45, "rgb(190,196,226)"); gr.addColorStop(1, "rgb(255,255,255)");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, 128); g.save(); g.scale(1, 0.5); g.translate(0, 64); g.fillStyle = gr; g.fillRect(0, -64, 256, 256); g.restore();
});

const lam = (o: THREE.MeshLambertMaterialParameters, lift = 1) => twoTone(new THREE.MeshLambertMaterial(o), lift);

export class KolaWorld {
  root = new THREE.Group();
  sun = new THREE.DirectionalLight("#fff1dc", 2.6);
  hemi = new THREE.HemisphereLight("#dbeaff", "#8a90b8", 0.5);
  fog = new THREE.Fog("#d6e6f4", 40, 520);
  skyMat: THREE.ShaderMaterial;
  host: THREE.Mesh; hostMat: THREE.MeshLambertMaterial; hostKey = "";

  constructor() {
    const R = this.root;
    // ---- sky dome (no ink)
    const uni: Record<string, THREE.IUniform> = { e: { value: new THREE.Vector4() } };
    for (let i = 0; i < 5; i++) uni["c" + i] = { value: new THREE.Color() };
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: uni, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `uniform vec3 c0,c1,c2,c3,c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(vP.y,-1.0,1.0)); vec3 c = mix(c0,c1,smoothstep(0.0,e.x,el)); c = mix(c,c2,smoothstep(e.x,e.y,el));
        c = mix(c,c3,smoothstep(e.y,e.z,el)); c = mix(c,c4,smoothstep(e.z,e.w,el)); gl_FragColor = vec4(c,1.0); }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    sky.renderOrder = -1; sky.frustumCulled = false; sky.layers.set(NOINK); R.add(sky);
    ARCTIC.sky.forEach((h, i) => untone(h, uni["c" + i].value));
    const e = ARCTIC.skyE.map((d) => THREE.MathUtils.degToRad(d)); uni.e.value.set(e[1], e[2], e[3], e[4]);

    // ---- lights
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.bias = -0.0003; this.sun.shadow.normalBias = 0.03;
    R.add(this.sun, this.sun.target, this.hemi);

    // ---- materials (painted, two-tone)
    const M = {
      snow: lam({ map: snowTex() }),
      rig: lam({ color: "#c8332e" }, 0.3), rigW: lam({ color: "#efe9df" }, 0.3), iron: lam({ color: "#3d4352" }, 0.2),
      shed: lam({ map: metalTex("#6f8f8a", "#3b4c4c") }), roof: lam({ map: metalTex("#a2463a", "#5a2420") }),
      pipe: lam({ color: "#6c6f7a" }, 0.2), pine: lam({ color: "#2f5a49" }), pineSnow: lam({ color: "#f3f6fb" }), hill: lam({ color: "#e4ecf6" }),
      wood: lam({ color: "#8a6440" }), win: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.9) }),
    };
    const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) => {
      const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; R.add(o); return o;
    };

    // ---- ground: gentle snow drifts
    const gg = new THREE.PlaneGeometry(1200, 1200, 160, 160); gg.rotateX(-Math.PI / 2);
    const pa = gg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), z = pa.getZ(i), d = Math.hypot(x, z);
      pa.setY(i, Math.sin(x * 0.08) * Math.cos(z * 0.06) * 0.25 * Math.min(1, d / 15) + Math.max(0, d - 60) * 0.02 * (0.5 + 0.5 * Math.sin(x * 0.01 + z * 0.013)));
    }
    gg.computeVertexNormals();
    const ground = add(gg, M.snow, 0, 0, 0); ground.castShadow = false;

    // ---- derrick: tapered lattice tower, red/white bands
    const H = 32, base = 4.2, top = 1.1, RX = -6, RZ = -14;
    const legAt = (sx: number, sz: number, h: number) => { const k = h / H, w = base + (top - base) * k; return new THREE.Vector3(RX + sx * w, h, RZ + sz * w); };
    const beam = (a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material) => {
      const d = b.clone().sub(a), g = new THREE.CylinderGeometry(r, r, d.length(), 6); const o = new THREE.Mesh(g, m);
      o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); o.castShadow = o.receiveShadow = true; R.add(o);
    };
    const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const levels = 8;
    for (let l = 0; l < levels; l++) {
      const h0 = (l / levels) * H, h1 = ((l + 1) / levels) * H, m = l % 2 ? M.rigW : M.rig;
      corners.forEach(([sx, sz], i) => {
        const [nx, nz] = corners[(i + 1) % 4];
        beam(legAt(sx, sz, h0), legAt(sx, sz, h1), 0.16, m);
        beam(legAt(sx, sz, h1), legAt(nx, nz, h1), 0.08, m);
        beam(legAt(sx, sz, h0), legAt(nx, nz, h1), 0.06, M.iron);
      });
    }
    add(new THREE.BoxGeometry(3.2, 1.2, 3.2), M.rig, RX, H + 0.6, RZ); // crown block
    add(new THREE.BoxGeometry(11, 1.4, 11), M.shed, RX, 0.7, RZ);     // drill floor
    add(new THREE.CylinderGeometry(0.22, 0.22, H - 1, 10), M.pipe, RX, H / 2, RZ); // drill string
    const star = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: starTex(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
    star.position.set(RX, H - 3, RZ + top + 1.6); R.add(star);

    // ---- shed with lit windows
    const SX = 8, SZ = -18;
    add(new THREE.BoxGeometry(14, 6, 8), M.shed, SX, 3, SZ);
    const roof = new THREE.CylinderGeometry(4.6, 4.6, 14.4, 3, 1, false); roof.rotateZ(Math.PI / 2);
    add(roof, M.roof, SX, 6.6, SZ, 0, 0, 0).scale.set(1, 0.55, 1);
    for (const wx of [-4, 0, 4]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), M.win); w.position.set(SX + wx, 3.4, SZ + 4.02); R.add(w); }
    add(new THREE.BoxGeometry(1.8, 3.2, 0.2), M.wood, SX - 6, 1.6, SZ + 4.1);
    add(new THREE.CylinderGeometry(0.35, 0.35, 4, 10), M.pipe, SX + 5, 8, SZ - 1); // chimney

    // ---- pipe stack and fence
    for (let i = 0; i < 6; i++) { const p = new THREE.CylinderGeometry(0.3, 0.3, 9, 12); p.rotateZ(Math.PI / 2); add(p, M.pipe, -14 + (i % 3) * 0.05, 0.32 + Math.floor(i / 3) * 0.55, -4 + (i % 3) * 0.62 + (i >= 3 ? 0.3 : 0), 0.4); }
    for (let i = 0; i < 14; i++) add(new THREE.BoxGeometry(0.18, 1.3, 0.18), M.wood, -22 + i * 3.2, 0.65, 6 + Math.sin(i) * 0.4);

    // ---- pines and far hills
    const pineAt = (x: number, z: number, s: number) => {
      for (let k = 0; k < 3; k++) {
        add(new THREE.ConeGeometry(2.2 * s * (1 - k * 0.25), 3.2 * s, 9), M.pine, x, s * (2 + k * 1.9), z);
        add(new THREE.ConeGeometry(1.4 * s * (1 - k * 0.25), 1.2 * s, 9), M.pineSnow, x, s * (3.1 + k * 1.9), z);
      }
      add(new THREE.CylinderGeometry(0.25 * s, 0.3 * s, 1.4 * s, 6), M.wood, x, 0.7 * s, z);
    };
    for (let i = 0; i < 26; i++) { const a = rnd(i) * Math.PI * 2, d = 38 + rnd(i * 3) * 70; pineAt(Math.cos(a) * d - 10, Math.sin(a) * d - 40, 0.8 + rnd(i * 5) * 0.7); }
    for (let i = 0; i < 9; i++) { const a = -Math.PI * 0.95 + (i / 8) * Math.PI * 0.9, d = 330 + rnd(i) * 80; add(new THREE.ConeGeometry(70 + rnd(i * 2) * 60, 40 + rnd(i * 4) * 40, 7), M.hill, Math.cos(a) * d, 12, Math.sin(a) * d); }

    // ---- host card + contact blob
    this.hostMat = cardShade(new THREE.MeshLambertMaterial({ alphaTest: 0.5, side: THREE.DoubleSide }));
    const cardG = new THREE.PlaneGeometry(600 * 0.00216, 1000 * 0.00216); cardG.translate(0, (975 - 500) * 0.00216, 0);
    this.host = new THREE.Mesh(cardG, this.hostMat);
    this.host.receiveShadow = true; this.host.renderOrder = 1; this.host.layers.set(NOINK);
    this.host.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    R.add(this.host);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), blobMaterial(blobTex()));
    blob.rotation.x = -Math.PI / 2; blob.position.set(0, 0.03, 0); blob.layers.set(NOINK); blob.renderOrder = 0.5; R.add(blob);
  }

  pose(o: BulbOpts) {
    const key = JSON.stringify(o);
    if (key === this.hostKey) return;
    this.hostKey = key;
    this.hostMat.map?.dispose();
    const t = new THREE.CanvasTexture(bulbCanvas(o, 1.5)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    this.hostMat.map = t; this.hostMat.needsUpdate = true;
  }

  update(cam: THREE.PerspectiveCamera, scene: THREE.Scene, hostPos: THREE.Vector3) {
    const A = ARCTIC, az = THREE.MathUtils.degToRad(A.az), el = THREE.MathUtils.degToRad(A.el);
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    this.sun.position.copy(hostPos).addScaledVector(dir, 200); this.sun.target.position.copy(hostPos);
    const sc = this.sun.shadow.camera, Rr = 40; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    TONE.uLitCol.value.set(...A.lit); TONE.uShadeCol.value.set(...A.shade); TONE.uShadeLift.value.set(...A.lift);
    TONE.uLambert.value = A.lambert; TONE.uSideK.value = A.sideK; TONE.uTerm.value = A.term; TONE.uBounce.value.set(0, 0, 0); TONE.uSat.value = A.sat;
    CHAR.uCharTint.value.set(...A.charTint); CHAR.uCharShade.value = A.charShade; CHAR.uGrad.value = A.charGrad;
    CHAR.uBodyGrad.value = A.bodyGrad; CHAR.uSideTint.value.set(...A.sideTint);
    untone(A.fog, this.fog.color); this.fog.near = A.fogNear; this.fog.far = A.fogFar; scene.fog = this.fog; scene.background = null;
    cam.layers.enable(NOINK);
    // host: yaw-only billboard toward the camera
    this.host.position.copy(hostPos);
    this.host.rotation.set(0, Math.atan2(cam.position.x - hostPos.x, cam.position.z - hostPos.z), 0);
    (this.root.children[0] as THREE.Mesh).position.copy(cam.position); // sky follows camera
  }
}

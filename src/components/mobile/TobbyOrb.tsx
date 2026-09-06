'use client';

/**
 * Tobby as the create button in the middle of the tab bar.
 *
 * He stands still: the `Tobby_Idle` clip is posed at time 0, drawn once, and
 * then nothing runs — no spin, no bob, no hover reaction. That is the whole
 * point of this round, and it is also why one paint is enough.
 *
 * A single WebGL renderer is shared by every orb on the page and draws into an
 * offscreen `WebGLRenderTarget`; the pixels are read back and blitted into each
 * orb's own 2D canvas. Two reasons: a page with several orbs would otherwise
 * cost one WebGL context each, and `drawImage()` straight off a WebGL canvas is
 * not dependable across browsers, while `readRenderTargetPixels` is.
 *
 * three.js and the loader come from `/vendor/three` — the same copies the
 * standalone build uses — through the import map in `layout.tsx`. Nothing is
 * fetched until an orb mounts, and if any of it fails Tobby quietly becomes a
 * "TOBBY" label: the create button still works, which is what matters.
 */

import { useEffect, useRef, useState } from 'react';

const GLB_URL = '/assets/tobby/Tobby_Animated.glb';
const THREE_URL = '/vendor/three/build/three.module.js';
const LOADER_URL = '/vendor/three/addons/loaders/GLTFLoader.js';
/** Offscreen render size, px square. Plenty for a 58px button. */
const SIZE = 160;

interface Engine {
  render: () => Uint8Array;
}

let enginePromise: Promise<Engine> | null = null;

/** Keeps the specifier out of webpack's static graph — these are runtime URLs. */
function loadModule(url: string): Promise<Record<string, unknown>> {
  return import(/* webpackIgnore: true */ url) as Promise<Record<string, unknown>>;
}

async function buildEngine(): Promise<Engine> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const THREE = (await loadModule(THREE_URL)) as any;
  const { GLTFLoader } = (await loadModule(LOADER_URL)) as any;
  const gltf: any = await new Promise((resolve, reject) =>
    new GLTFLoader().load(GLB_URL, resolve, undefined, reject),
  );

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setSize(SIZE, SIZE, false);

  const scene = new THREE.Scene();
  const model = gltf.scene;
  scene.add(model);
  scene.add(new THREE.HemisphereLight(0xdfe7ff, 0x0a0c12, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(1.4, 2.2, 2.4);
  scene.add(key);

  // Pose first, measure second. Posing moves the rig, so fitting the raw
  // T-pose bounds is what used to crop Tobby's head off.
  const idle =
    gltf.animations.find((a: any) => a.name === 'Tobby_Idle') ?? gltf.animations[0] ?? null;
  if (idle) {
    const mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(idle).play();
    mixer.setTime(0);
  }
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  // Fit on HEIGHT: Tobby is deeper than he is tall, so fitting the largest
  // axis would leave him tiny in the frame.
  const fit = 1.45 / (size.y || 1);
  model.scale.setScalar(fit);
  model.position.copy(center).multiplyScalar(-fit);
  model.updateMatrixWorld(true);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  camera.position.set(0, 0, 3.4);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  const target = new THREE.WebGLRenderTarget(SIZE, SIZE);
  const pixels = new Uint8Array(SIZE * SIZE * 4);

  return {
    render() {
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, pixels);
      renderer.setRenderTarget(null);
      return pixels;
    },
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

function getEngine(): Promise<Engine> {
  if (!enginePromise) enginePromise = buildEngine();
  return enginePromise;
}

export function TobbyOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const engine = await getEngine();
        const cv = canvasRef.current;
        if (!alive || !cv) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(cv.clientWidth * dpr);
        cv.height = Math.round(cv.clientHeight * dpr);
        const ctx = cv.getContext('2d');
        if (!ctx) return;

        const pixels = engine.render();
        // WebGL reads bottom-up; flip the rows on the way into the ImageData.
        const scratch = document.createElement('canvas');
        scratch.width = SIZE;
        scratch.height = SIZE;
        const sctx = scratch.getContext('2d');
        if (!sctx) return;
        const img = sctx.createImageData(SIZE, SIZE);
        for (let y = 0; y < SIZE; y++) {
          const src = (SIZE - 1 - y) * SIZE * 4;
          img.data.set(pixels.subarray(src, src + SIZE * 4), y * SIZE * 4);
        }
        sctx.putImageData(img, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(scratch, 0, 0, cv.width, cv.height);
      } catch {
        // No WebGL, no vendored three, no GLB — the button still opens the sheet.
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (failed) {
    return (
      <span className="m-tobby">
        <span className="m-tobby-fallback">TOBBY</span>
      </span>
    );
  }
  return <canvas ref={canvasRef} className="m-tobby" aria-hidden="true" />;
}

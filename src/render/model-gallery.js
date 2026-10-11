// Live previews of the selected library models. No raster artwork is created.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { clone } from '../../vendor/three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const cache = new Map();
const views = [];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.createElement('canvas');
canvas.className = 'model-gallery-canvas';
canvas.setAttribute('aria-hidden', 'true');
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;
let width = 0, height = 0, lastTime = 0;

function load(model) {
  if (!cache.has(model)) cache.set(model, loader.loadAsync(model));
  return cache.get(model);
}

async function addView(slot, asset) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x617b8d, 2.6));
  const sun = new THREE.DirectionalLight(0xfff5df, 3);
  sun.position.set(-3, 6, 5);
  scene.add(sun);
  const camera = new THREE.OrthographicCamera(-1.25, 1.25, 1.25, -1.25, 0.1, 30);
  const view = { slot, asset, scene, camera, mixer: null, object: null, bodyHeight: 1 };
  views.push(view);
  try {
    const gltf = await load(asset.model);
    const model = clone(gltf.scene);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const scale = 1.65 / Math.max(size.x, size.y, size.z, 0.001);
    const normalised = new THREE.Group();
    normalised.scale.setScalar(scale);
    const anchor = new THREE.Group();
    anchor.position.set(-centre.x, -box.min.y, -centre.z);
    anchor.add(model);
    normalised.add(anchor);
    const turntable = new THREE.Group();
    turntable.add(normalised);
    // Gameplay faces away toward the next lane; the picker shows the face.
    turntable.rotation.y = (asset.yaw || 0) + (asset.id ? Math.PI : 0);
    scene.add(turntable);
    view.object = turntable;
    view.bodyHeight = size.y * scale;
    camera.position.set(3.5, 2.7 + view.bodyHeight / 2, 5.5);
    camera.lookAt(0, view.bodyHeight / 2, 0);
    if (gltf.animations.length && !reducedMotion) {
      view.mixer = new THREE.AnimationMixer(model);
      const idle = gltf.animations.find(clip => /idle|standing/i.test(clip.name)) || gltf.animations[0];
      view.mixer.clipAction(idle).play();
    }
    slot.dataset.state = 'ready';
    slot.textContent = '';
  } catch (error) {
    slot.dataset.state = 'error';
    slot.textContent = 'Model preview unavailable';
    console.error('Model preview failed:', asset.model, error);
  }
}

function frame(time) {
  requestAnimationFrame(frame);
  const nextWidth = innerWidth, nextHeight = innerHeight;
  if (nextWidth !== width || nextHeight !== height) {
    width = nextWidth; height = nextHeight;
    renderer.setSize(width, height, false);
  }
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  if (document.hidden) return;
  renderer.setScissorTest(false);
  renderer.clear(true, true, true);
  renderer.setScissorTest(true);
  for (const view of views) {
    const rect = view.slot.getBoundingClientRect();
    if (!view.object || rect.bottom <= 0 || rect.top >= height || rect.width <= 0) continue;
    if (view.mixer) view.mixer.update(dt);
    const aspect = rect.width / rect.height;
    view.camera.left = -1.25 * aspect;
    view.camera.right = 1.25 * aspect;
    view.camera.updateProjectionMatrix();
    renderer.setViewport(rect.left, height - rect.bottom, rect.width, rect.height);
    renderer.setScissor(rect.left, height - rect.bottom, rect.width, rect.height);
    renderer.render(view.scene, view.camera);
  }
}

function assetCard(key, asset, section) {
  const card = document.createElement('article');
  card.className = 'asset-card';
  const slot = document.createElement('div');
  slot.className = 'model-slot';
  slot.textContent = 'Loading model…';
  const title = document.createElement('h3');
  title.textContent = key;
  const name = document.createElement('p');
  name.textContent = asset.name || asset.model.split('/').pop();
  const source = document.createElement('a');
  source.textContent = 'Model file';
  source.href = asset.model;
  card.append(slot, title, name, source);
  if (asset.analogue) {
    const match = document.createElement('p');
    match.textContent = asset.analogue;
    card.appendChild(match);
  }
  section.appendChild(card);
  addView(slot, asset);
}

async function boot() {
  const response = await fetch('assets/models/manifest.json');
  if (!response.ok) throw new Error('Library manifest could not be loaded');
  const manifest = await response.json();
  if (document.body.dataset.gallery === 'characters') {
    for (const asset of manifest.characters) {
      const card = document.querySelector('.card[data-id="' + asset.id + '"]');
      if (!card) continue;
      card.setAttribute('aria-label', '#' + asset.id + ' ' + asset.name);
      card.querySelector('.name').textContent = asset.name;
      if (window.CHARACTERS) window.CHARACTERS[asset.id - 1].name = asset.name;
      addView(card.querySelector('.model-slot'), asset);
    }
  } else {
    for (const [category, records] of [
      ['Characters', manifest.characters.map(asset => ['#' + asset.id, asset])],
      ['Traffic and hazards', Object.entries(manifest.hazards)],
      ['Scenery', Object.entries(manifest.scenery)],
      ['Pursuer', [['Bird', manifest.pursuer]]]
    ]) {
      const heading = document.createElement('h2');
      heading.textContent = category;
      const section = document.createElement('section');
      section.className = 'asset-grid';
      document.getElementById('library').append(heading, section);
      for (const [key, asset] of records) assetCard(key, asset, section);
    }
    document.getElementById('library-status').textContent = 'Selected from your existing library. Live 3D previews; no image backgrounds.';
  }
  requestAnimationFrame(frame);
}

boot().catch(error => {
  console.error(error);
  const status = document.getElementById('library-status');
  if (status) status.textContent = error.message;
});

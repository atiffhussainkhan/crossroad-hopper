/* Live 3D view. Simulation coordinates remain authoritative: x = column,
 * z = -row, with the feet of every library model normalized onto y = 0.
 * All characters, vehicles, wildlife and scenery come from the local asset
 * manifest. Geometry here is limited to terrain, lane markings and effects.
 */
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from '../../vendor/three/addons/utils/SkeletonUtils.js';

const api = window.World3D = {
  ready: false,
  status: 'loading',
  modelsLoaded: 0,
  modelCount: 0,
  frameCount: 0,
  error: null,
  render,
};
const canvas = document.getElementById('board-3d');
const templates = new Map();
const rows = new Map();
let shieldMesh = null;
let shieldInstance = null;
let shieldGlow = null;
let shieldTarget = null;      // the pickup this frame is drawing; positioned last
const shieldAuras = [];        // one shimmer STACK per player, not one per game
const shieldBursts = [];       // the "one shield just went off" flashes
const hazards = new Map();
const materialCache = new Map();
const instancePool = new Map();
const avatars = [];
const geometry = {
  box: new THREE.BoxGeometry(1, 1, 1),
  ring: new THREE.TorusGeometry(0.45, 0.028, 6, 32),
  vent: new THREE.CylinderGeometry(0.14, 0.32, 1, 10),
};
let manifest, renderer, scene, camera, sunlight;
let rowLayer, hazardLayer, avatarLayer, backdrop, goalLayer, pursuer;
let worldKey = null, gameIdentity = null;
let lastTime = null, viewportWidth = 0, viewportHeight = 0;

function status(value, error) {
  if (api.status === 'error' && value === 'loading') return;
  api.status = value;
  if (error) api.error = String(error.message || error);
  if (canvas) {
    canvas.dataset.state = value;
    canvas.style.visibility = value === 'error' ? 'hidden' : 'visible';
    canvas.dataset.modelsLoaded = String(api.modelsLoaded);
    canvas.dataset.modelCount = String(api.modelCount);
    if (error) canvas.dataset.error = api.error;
  }
}

function material(color, emissive = false) {
  const key = color + (emissive ? ':lit' : '');
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({
      color, roughness: 0.88, metalness: 0,
      emissive: emissive ? color : '#000000',
      emissiveIntensity: emissive ? 0.45 : 0,
    }));
  }
  return materialCache.get(key);
}

function block(parent, x, y, z, width, height, depth, color) {
  const mesh = new THREE.Mesh(geometry.box, material(color));
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function ring(parent, color) {
  const mesh = new THREE.Mesh(geometry.ring, material(color, true));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.025;
  parent.add(mesh);
  return mesh;
}

/* The shimmer under a player who is holding a shield.
 *
 * One ring was not feedback. It was drawn at the same radius, the same height
 * and essentially the same colour as the marker ring that is under EVERY
 * player, so "shielded" and "not shielded" produced the same picture -- and
 * the two coincident surfaces fought for the depth buffer. Two rings at a
 * different radius and height, the outer one breathing, read as a different
 * state from across the board, which is the whole job of the effect.
 *
 * COUNT is the job, though. The brief is "2 shields, then each hit kills ONE
 * shield", so a single shimmer for one shield or two was the same picture: the
 * player could not see how many they were carrying, and an absorbed hit either
 * removed everything or nothing. Each held shield therefore gets its OWN
 * concentric shell, further out and in its own colour, so the number of rings
 * around the avatar IS the number of lives the next hit will not take.
 *
 * Layer 0 is the cyan shell. Layer 1 is violet, wider and lifted a little
 * clear of the ground so the two shells cannot z-fight into one shape. The
 * stage budget is two shields (SimCore.SHIELDS_PER_STAGE), so two layers
 * cover every state the simulation can reach; a count above that is clamped
 * rather than drawn as extra geometry nobody asked for. */
const SHIELD_LAYERS = [
  { inner: '#dff8ff', outer: '#7fdcff', innerScale: 1.18, outerScale: 1.62,
    y: 0, pulse: 0.10, rate: 240, burst: '#7fdcff' },
  { inner: '#e8d6ff', outer: '#b98cff', innerScale: 2.04, outerScale: 2.56,
    y: 0.022, pulse: 0.14, rate: 165, burst: '#b98cff' },
];
/* How long a spent shield stays on screen as a flash. Long enough to be seen
 * in peripheral vision -- the player is looking at the lane ahead, not at their
 * own feet -- and short enough that it is never mistaken for a fourth shield. */
const SHIELD_BREAK_MS = 420;

function aura(parent) {
  const root = new THREE.Group();
  const layers = SHIELD_LAYERS.map(spec => {
    const layer = new THREE.Group();
    const inner = new THREE.Mesh(geometry.ring, material(spec.inner, true));
    inner.rotation.x = -Math.PI / 2;
    inner.scale.setScalar(spec.innerScale);
    const outer = new THREE.Mesh(geometry.ring, material(spec.outer, true));
    outer.rotation.x = -Math.PI / 2;
    outer.scale.setScalar(spec.outerScale);
    layer.add(inner, outer);
    layer.position.y = spec.y;
    layer.userData.inner = inner;
    layer.userData.outer = outer;
    root.add(layer);
    return layer;
  });
  root.position.y = 0.03;
  parent.add(root);
  return { root, layers, shown: 0 };
}

/* The flash of a shield that was just spent.
 *
 * Without it, the count simply changes: a shell is not there any more and
 * nothing says WHY. The player has to see a shield break, so the layer that
 * turned off throws a ring of its own colour outwards and fades in under half
 * a second. Pooled and capped -- an absorbed hit can only ever pop one, and a
 * two player board pops at most two. */
function popShieldBurst(col, row, nowMs, layerIndex) {
  const spec = SHIELD_LAYERS[layerIndex];
  if (!spec) return;
  let entry = shieldBursts.find(item => !item.active);
  if (!entry) {
    if (shieldBursts.length >= 6) return;
    const mesh = new THREE.Mesh(geometry.ring,
      new THREE.MeshBasicMaterial({ color: spec.burst, transparent: true,
        opacity: 0, depthWrite: false, toneMapped: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    avatarLayer.add(mesh);
    entry = { mesh, active: false, startMs: 0, layer: 0 };
    shieldBursts.push(entry);
  }
  entry.active = true;
  entry.startMs = nowMs;
  entry.layer = layerIndex;
  entry.mesh.visible = true;
  entry.mesh.position.set(col, 0.05, -row);
  entry.mesh.scale.setScalar(spec.outerScale * 0.45);
}

function updateShieldBursts(nowMs) {
  for (const entry of shieldBursts) {
    if (!entry.active) continue;
    const t = (nowMs - entry.startMs) / SHIELD_BREAK_MS;
    if (!(t >= 0) || t >= 1) {
      entry.active = false;
      entry.mesh.visible = false;
      continue;
    }
    const spec = SHIELD_LAYERS[entry.layer];
    entry.mesh.scale.setScalar(spec.outerScale * (0.45 + t * 0.85));
    entry.mesh.material.opacity = 0.9 * (1 - t) * (1 - t);
  }
}

function modelURL(entry) {
  return new URL('../../' + entry.model, import.meta.url).href;
}

function instantiate(entry, dimensions = {}) {
  if (!entry || !entry.model) throw new Error('A 3D model is missing from the asset manifest');
  const fitted = {
    height: dimensions.height || entry.height || 1,
    length: dimensions.length || 0,
    depth: dimensions.depth || 0,
    maxWidth: dimensions.maxWidth || 0,
    maxDepth: dimensions.maxDepth || 0,
  };
  const key = modelURL(entry) + ':' + JSON.stringify(fitted) + ':' + (entry.yaw || 0);
  const pool = instancePool.get(key);
  if (pool && pool.length) {
    const cached = pool.pop();
    cached.group.visible = true;
    cached.group.rotation.set(0, 0, 0);
    return cached;
  }
  const template = templates.get(modelURL(entry));
  if (!template) throw new Error('Required model has not loaded: ' + entry.model);
  const model = cloneSkeleton(template.scene);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.y -= box.min.y;
  model.position.z -= center.z;
  const oriented = new THREE.Group();
  oriented.add(model);
  oriented.rotation.y = entry.yaw || 0;
  oriented.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(oriented).getSize(new THREE.Vector3());
  // Fit outside the authored orientation. Scaling a rotated object's local X
  // would stretch the wrong axis for vehicles whose native nose is +Z.
  const pivot = new THREE.Group();
  pivot.add(oriented);
  if (!(size.y > 0 && size.x > 0 && size.z > 0)) {
    throw new Error('Invalid model bounds: ' + entry.model);
  }
  const height = dimensions.height || entry.height || 1;
  // Character footprint limits use a single scalar, preserving the author's
  // proportions while keeping a crab's legs or a fox's tail inside the lane.
  const scale = Math.min(height / size.y,
    dimensions.maxWidth ? dimensions.maxWidth / size.x : Infinity,
    dimensions.maxDepth ? dimensions.maxDepth / size.z : Infinity);
  pivot.scale.set(
    dimensions.length ? dimensions.length / size.x : scale,
    scale,
    dimensions.depth ? Math.min(scale, dimensions.depth / size.z) : scale
  );
  const group = new THREE.Group();
  group.add(pivot);
  model.traverse(node => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  const instance = {
    group, pivot, model, entry, key, clips: template.animations || [],
    mixer: template.animations?.length ? new THREE.AnimationMixer(model) : null,
    action: null, animationState: null,
    bounds: { width: size.x * pivot.scale.x, height: size.y * pivot.scale.y,
      depth: size.z * pivot.scale.z },
  };
  return instance;
}

function release(instance) {
  instance.group.removeFromParent();
  for (const child of [...instance.group.children]) {
    if (child !== instance.pivot) instance.group.remove(child);
  }
  if (instance.mixer) instance.mixer.stopAllAction();
  instance.action = null;
  instance.animationState = null;
  instance.previous = null;
  instance.deathFallback = false;
  if (!instancePool.has(instance.key)) instancePool.set(instance.key, []);
  const pool = instancePool.get(instance.key);
  if (pool.length < 12) pool.push(instance);
}

function animate(instance, state, dt) {
  if (!instance.mixer) {
    instance.deathFallback = state === 'death';
    return;
  }
  if (instance.animationState !== state) {
    const preference = instance.entry.animation || {};
    const names = state === 'death' ? [preference.death, 'Death', 'Die', 'Dead']
      : state === 'hop' ? [preference.hop, 'Jump', 'Gallop_Jump', 'Run', 'Walk']
      : state === 'move' ? ['Run', 'Walk', 'Gallop', preference.idle, 'Idle']
      : [preference.idle, 'Idle', 'Stand'];
    let clip;
    for (const name of names.filter(Boolean)) {
      clip = instance.clips.find(item => item.name.toLowerCase() === name.toLowerCase());
      if (clip) break;
    }
    instance.deathFallback = state === 'death' && !clip;
    if (instance.deathFallback) instance.mixer.stopAllAction();
    if (!clip && state !== 'death') clip = instance.clips[0];
    if (clip) {
      const next = instance.mixer.clipAction(clip);
      if (instance.action && instance.action !== next) instance.action.fadeOut(0.09);
      next.reset();
      next.setLoop(state === 'death' || state === 'hop' ? THREE.LoopOnce : THREE.LoopRepeat,
        state === 'death' || state === 'hop' ? 1 : Infinity);
      next.clampWhenFinished = state === 'death' || state === 'hop';
      next.timeScale = state === 'hop' ? clip.duration / 0.42
        : state === 'death' ? clip.duration / 1.8 : 1;
      next.fadeIn(0.08).play();
      instance.action = next;
    }
    instance.animationState = state;
  }
  instance.mixer.update(dt);
}

function sceneryEntry(kind) {
  if (kind === 'treeBack' || kind === 'treeFront') kind = 'tree';
  return manifest.scenery[kind];
}

function buildRow(row, stage, s) {
  const lane = row <= 0 ? 'grass' : window.Tiles.laneOf(row, stage.laneMix, stage.id);
  const group = new THREE.Group();
  group.position.z = -row;
  const baseColor = lane === 'road' ? stage.road : lane === 'rail' ? '#88755b'
    : lane === 'water' ? stage.water : (row % 2 ? stage.ground : stage.groundAlt);
  const surface = new THREE.Group();
  group.add(surface);
  const props = [];
  block(surface, (s.cols - 1) / 2, -0.09, 0, s.cols, 0.18, 1, baseColor);
  if (lane === 'road') {
    for (let col = 0; col < s.cols; col += 2) {
      block(surface, col + 0.4, 0.006, 0, 0.62, 0.012, 0.055, '#fff5cc');
    }
  } else if (lane === 'rail') {
    const rail = { ...manifest.scenery.rail, yaw: Math.PI / 2 };
    for (let col = 0; col < s.cols; col++) {
      const track = instantiate(rail, { length: 1, height: 0.08, depth: 0.8 });
      track.group.position.set(col, 0, 0);
      surface.add(track.group);
      props.push({ instance: track, col, hideForPlayer: false });
    }
  } else if (lane === 'water') {
    for (let col = 0; col < s.cols; col += 1.7) {
      block(surface, col, 0.012, row % 2 ? -0.18 : 0.16,
        0.55, 0.013, 0.025, '#a0dfe0');
    }
  }
  if (lane === 'grass' && window.Scene?.sceneryFor) {
    for (let col = 0; col < s.cols; col++) {
      const kind = window.Scene.sceneryFor(stage, row, col, -999, -999);
      const entry = kind && sceneryEntry(kind);
      if (!entry) continue;
      // Tall decoration belongs beside the crossing, so six playable columns
      // remain legible and no decorative tree conceals a traffic collision.
      if (col >= s.playMin && col <= s.playMax && (entry.height || 1) > 0.65) continue;
      const prop = instantiate(entry);
      prop.group.position.set(col, 0, 0);
      prop.group.rotation.y = (window.Scene.hash2(col, row) % 4) * Math.PI / 2;
      group.add(prop.group);
      prop.group.updateWorldMatrix(true, true);
      const bounds = new THREE.Box3().setFromObject(prop.group);
      // A building's origin can sit beside the road while its facade covers
      // two playable columns. Keep the entire rotated model outside the band.
      let shift = 0;
      if (col < s.playMin) shift = Math.min(0, s.playMin - 0.65 - bounds.max.x);
      else if (col > s.playMax) shift = Math.max(0, s.playMax + 0.65 - bounds.min.x);
      prop.group.position.x += shift;
      bounds.translate(new THREE.Vector3(shift, 0, 0));
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      props.push({ instance: prop, col: center.x, row: -center.z,
        halfWidth: size.x / 2, halfDepth: size.z / 2, hideForPlayer: true });
    }
  }
  rowLayer.add(group);
  const result = { group, surface, props, lane };
  rows.set(row, result);
  return result;
}

function resetWorld(s, stage) {
  for (const data of rows.values()) {
    for (const prop of data.props) release(prop.instance);
    data.group.removeFromParent();
  }
  rows.clear();
  for (const data of hazards.values()) release(data.instance);
  hazards.clear();
  hazardLayer.clear();
  for (const avatar of avatars) {
    avatar.previous = null;
    avatar.group.rotation.set(0, 0, 0);
    if (avatar.mixer) avatar.mixer.stopAllAction();
    avatar.action = null;
    avatar.animationState = null;
    avatar.deathFallback = false;
  }
  goalLayer.clear();
  /* Shield pickups.
   *
   * One floating model for the next un-taken pickup, spinning slowly so it
   * reads as something to walk into rather than scenery. Placed on the
   * player's own column, because that is the only column they are guaranteed
   * to be able to reach.
   *
   * The instance goes back through release() on every rebuild, so a stage
   * change takes the pooled clone instead of cloning the whole node hierarchy
   * -- and building a fresh AnimationMixer for it -- on every attempt. */
  /* Shield auras belong to the attempt that earned them.
   *
   * The layers live in avatarLayer, which is never rebuilt, so a stage change
   * used to leave the previous attempt's shimmer in the scene -- visible over
   * the start line of a fresh board that the player had not earned anything
   * on. The pool is emptied here, and the burst pool is deactivated rather than
   * removed: six parked invisible meshes that cost nothing beat allocating six
   * new materials on every retry. */
  for (const stack of shieldAuras) if (stack) stack.root.removeFromParent();
  shieldAuras.length = 0;
  for (const entry of shieldBursts) {
    entry.active = false;
    entry.mesh.visible = false;
  }
  if (shieldInstance) { release(shieldInstance); shieldInstance = null; }
  shieldMesh = null;
  shieldGlow = null;          // a child of the instance; release() drops it
  shieldTarget = null;
  const pending = (s.pickups || []).filter(p => p.kind === 'shield' && !p.taken);
  if (pending.length && manifest.pickups && manifest.pickups.shield) {
    const entry = manifest.pickups.shield;
    shieldInstance = instantiate(entry, { height: entry.height || 0.62, maxWidth: 0.72 });
    shieldMesh = shieldInstance.group;
    shieldMesh.userData.pickups = pending;
    scene.add(shieldMesh);
    shieldGlow = ring(shieldMesh, '#7ad8ff');
  }
  if (!s.endlessMode) {
    for (let col = s.playMin - 0.5; col < s.playMax + 0.5; col += 0.3) {
      block(goalLayer, col + 0.15, 0.014, -s.goalRow,
        0.3, 0.025, 0.25, Math.round((col - s.playMin + 0.5) / 0.3) % 2 ? '#fffdfa' : '#2e4140');
    }
  }
  backdrop.material = material(stage.ground);
  scene.fog = new THREE.Fog(stage.ground, 33, 68);
  worldKey = [s.stageIndex, s.stageAttempt, s.endlessMode, s.endlessAttempt].join(':');
  gameIdentity = s;
}

function hazardInstance(h, s) {
  const entry = manifest.hazards[h.kind];
  if (!entry) throw new Error('No 3D mapping for hazard: ' + h.kind);
  const instance = instantiate(entry, {
    length: h.spec.len,
    height: entry.height || (h.spec.kind === 'rail' ? 0.7 : 0.48),
    depth: 0.7,
  });
  hazardLayer.add(instance.group);
  const warning = ring(instance.group, '#ffad35');
  warning.visible = false;
  let effect = null;
  let warningBand = null;
  if (h.kind === 'geyser' || h.kind === 'steamvent') {
    effect = new THREE.Mesh(geometry.vent, material(h.kind === 'geyser' ? '#84e3fc' : '#f4f5e9', true));
    effect.position.y = 0.8;
    instance.group.add(effect);
  } else if (h.spec.pit) {
    effect = new THREE.Group();
    block(effect, (s.cols - 1) / 2, -0.36, 0, s.cols, 0.03, 0.96, '#263b38');
    block(effect, (s.cols - 1) / 2, -0.16, -0.47, s.cols, 0.38, 0.03, '#445047');
    block(effect, (s.cols - 1) / 2, -0.16, 0.47, s.cols, 0.38, 0.03, '#445047');
    hazardLayer.add(effect);
    warningBand = new THREE.Group();
    block(warningBand, (s.playMin + s.playMax) / 2, 0.025, -0.44,
      s.playMax - s.playMin + 1, 0.02, 0.12, '#ffd361');
    for (let col = s.playMin; col <= s.playMax; col++) {
      block(warningBand, col, 0.037, -0.44, 0.35, 0.004, 0.12, '#574c36');
    }
    hazardLayer.add(warningBand);
  }
  const data = { instance, warning, effect, warningBand };
  hazards.set(h, data);
  return data;
}

function updateHazards(s, dt, nowMs, lowRow, highRow) {
  const current = new Set(s.hazards);
  for (const [h, data] of hazards) {
    if (!current.has(h)) {
      if (data.effect && h.spec.pit) data.effect.removeFromParent();
      if (data.warningBand) data.warningBand.removeFromParent();
      release(data.instance);
      hazards.delete(h);
    }
  }
  for (const data of rows.values()) data.surface.visible = true;
  for (const h of s.hazards) {
    if (h.row < lowRow || h.row > highRow) {
      const hidden = hazards.get(h);
      if (hidden) {
        hidden.instance.group.visible = false;
        if (hidden.effect && h.spec.pit) hidden.effect.visible = false;
        if (hidden.warningBand) hidden.warningBand.visible = false;
      }
      continue;
    }
    const data = hazards.get(h) || hazardInstance(h, s);
    const staged = window.Hazards.isStaged(h);
    const active = window.Hazards.isActive(h);
    const telegraph = window.Hazards.isTelegraphing(h);
    data.instance.group.visible = !staged;
    if (data.effect && h.spec.pit) data.effect.visible = !staged && active;
    if (data.warningBand) data.warningBand.visible = !staged && window.Hazards.isWarning(h);
    if (staged) continue;
    const flying = h.spec.flies;
    data.instance.group.position.set(h.x, flying ? 1.35 : 0, -h.row);
    data.instance.group.rotation.y = h.speed < 0 ? Math.PI : 0;
    data.warning.visible = telegraph || window.Hazards.isWarning(h);
    const pulse = 0.92 + Math.sin(nowMs / 95) * 0.09;
    data.warning.scale.setScalar(pulse);
    if (telegraph) {
      // The actual train waits beyond the lane. Its warning stays at the
      // visible entry, rather than disappearing beyond the camera crop.
      data.warning.position.x = (h.speed > 0 ? s.playMin - 0.4 : s.playMax + 0.4) - h.x;
      if (h.speed < 0) data.warning.position.x *= -1;
    } else data.warning.position.x = 0;
    if (h.spec.pit) {
      const row = rows.get(h.row);
      if (row && active) row.surface.visible = false;
      data.effect.position.z = -h.row;
      data.warningBand.position.z = -h.row;
      data.instance.group.position.x = s.playMin - 0.8;
      data.instance.pivot.visible = !active;
      data.warning.scale.set(1.2 * pulse, 1.2 * pulse, 1);
    } else if (data.effect) {
      data.effect.visible = active;
      data.effect.scale.y = active ? 1.7 + Math.sin(nowMs / 80) * 0.15 : 0.01;
      data.effect.position.y = data.effect.scale.y / 2;
      data.warning.visible = !active;
    } else {
      data.instance.pivot.visible = active;
    }
    animate(data.instance, flying ? 'move' : 'idle', dt);
  }
}

function selectedEntry(index) {
  const selected = window.Roster?.getSelectedCharacter?.();
  return manifest.characters.find(item => item.rosterId === selected?.id)
    || manifest.characters[index % manifest.characters.length];
}

function updateAvatars(s, poses, dt) {
  while (avatars.length > poses.length) release(avatars.pop());
  for (let i = 0; i < poses.length; i++) {
    const entry = selectedEntry(i);
    if (!avatars[i] || avatars[i].entry.model !== entry.model) {
      if (avatars[i]) release(avatars[i]);
      avatars[i] = instantiate(entry, { maxWidth: 1.2, maxDepth: 1.6 });
      avatars[i].marker = ring(avatars[i].group, i ? '#8ee7f1' : '#fff5ae');
      avatarLayer.add(avatars[i].group);
    }
    const avatar = avatars[i], pose = poses[i];
    const moving = avatar.previous &&
      (Math.abs(pose.col - avatar.previous.col) + Math.abs(pose.row - avatar.previous.row) > 0.002);
    if (moving && !pose.dead) {
      const dx = pose.col - avatar.previous.col;
      const dz = -(pose.row - avatar.previous.row);
      avatar.group.rotation.y = Math.atan2(dx, dz) - Math.PI;
    }
    avatar.group.position.set(pose.col, Math.max(0, pose.lift || 0), -pose.row);
    // The ring sits on the tile while the animated model follows the hop.
    avatar.marker.position.y = 0.025 - Math.max(0, pose.lift || 0);
    // The presented hop already supplies its vertical arc. Authored Jump
    // clips add another half tile of root motion, so use locomotion here and
    // keep the player's visible trajectory aligned with the supplied pose.
    animate(avatar, pose.dead ? 'death' : pose.lift > 0.025 || moving ? 'move' : 'idle', dt);
    avatar.group.rotation.z = avatar.deathFallback ? Math.PI / 2 : 0;
    if (avatar.deathFallback) avatar.group.position.y = 0.32;
    avatar.previous = { col: pose.col, row: pose.row };
  }
}

function updatePursuer(s, poses, dt, nowMs) {
  const state = s.pursuer.state();
  pursuer.group.visible = state.mode !== 'DISTANCE_LOCKED';
  if (!pursuer.group.visible) return;
  const leading = poses.reduce((a, b) => a.row > b.row ? a : b);
  const row = state.mode === 'SPAWNING' ? state.spawnRow : state.row;
  pursuer.group.position.set(leading.col, 1.7 + Math.sin(nowMs / 130) * 0.07, -row);
  pursuer.group.rotation.y = 0;
  pursuer.warning.visible = state.mode === 'SPAWNING';
  pursuer.warning.position.y = -pursuer.group.position.y + 0.025;
  animate(pursuer, 'move', dt);
}

function resize() {
  const width = Math.max(1, canvas.clientWidth || 440);
  const height = Math.max(1, canvas.clientHeight || 540);
  if (width === viewportWidth && height === viewportHeight) return;
  viewportWidth = width;
  viewportHeight = height;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  const aspect = width / height;
  const viewWidth = 8;
  const viewHeight = viewWidth / aspect;
  camera.left = -viewWidth / 2;
  camera.right = viewWidth / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
}

function horizontalCameraCenter(focusCol, s, halfWidth) {
  // Entry warning rings reach about .9 tile past each playable column.
  // One tile of clearance also leaves a little space around their full pulse.
  const minimum = s.playMax + 1 - halfWidth;
  const maximum = s.playMin - 1 + halfWidth;
  if (minimum > maximum) return (s.playMin + s.playMax) / 2;
  return Math.max(minimum, Math.min(maximum, focusCol));
}

/* The next shield the player has still to walk into, or null.
 *
 * Only an UNTaken pickup qualifies. The array was captured at resetWorld, and
 * reading `p.row` alone kept re-selecting a shield the player had already
 * collected, so it stayed on screen after being picked up. */
function selectPickup(mesh, pose) {
  if (!mesh) return null;
  const row = pose ? (pose.row || 0) : 0;
  let target = null;
  for (const p of mesh.userData.pickups || []) {
    if (p.taken) continue;
    if (p.row > row - 2 && (!target || p.row < target.row)) target = p;
  }
  return target;
}

/* The furthest row the camera can actually show.
 *
 * The board is BUILT out to focus.row + 22, but an orthographic frustum is far
 * shorter than that: on the board's own proportions the top edge of the screen
 * sits about twelve rows above the focus, not twenty two. Stage one's first
 * shield is dealt on row 23, so parking the token on its real row drew it
 * roughly eight rows ABOVE the top of the screen -- in the scene graph, on
 * screen nowhere. Confirmed in the browser, not inferred: a real game sitting
 * in READY with an uncollected shield on row 23 showed no token at all.
 *
 * Solving dot(groundPoint - camera, up) = camera.top for the row gives the edge
 * exactly, from the live camera, so it stays right if the pitch or the board's
 * proportions ever change. */
function visibleTopRow() {
  // The camera's own up axis, so this follows any future change of pitch.
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  if (!(up.z < -1e-4)) return Infinity;
  const camPos = camera.position;
  return -(camera.top + up.y * -camPos.y + up.z * -camPos.z) / up.z;
}

/* Draw the pickup token, kept inside the frame.
 *
 * When the real pickup row is on screen the token sits on it. When it is not,
 * the token is pinned just inside the top edge: it is a marker for a shield that
 * is still ahead, and a marker the player cannot see is not one. One row of
 * margin keeps the floating model and its glow ring off the crop. */
function placePickup(pickup, pose, nowMs) {
  if (!shieldMesh) return;
  if (!pickup) {
    shieldMesh.visible = false;
    return;
  }
  const top = visibleTopRow() - 1.1;
  const row = Math.min(pickup.row, Math.max(top, pose ? (pose.row || 0) + 2 : top));
  const lift = 0.72 + Math.sin(nowMs / 320) * 0.06;
  shieldMesh.visible = true;
  shieldMesh.position.set((pose ? pose.col : 0) + 0.5, lift, -row);
  shieldMesh.rotation.y = nowMs / 900;
  if (shieldGlow) shieldGlow.position.y = 0.02 - lift;
}

function render(s, stage, poses, nowMs) {
  if (!api.ready) return false;
  try {
    const dt = lastTime === null ? 0 : Math.min(0.1, Math.max(0, (nowMs - lastTime) / 1000));
    lastTime = nowMs;
    resize();
    const key = [s.stageIndex, s.stageAttempt, s.endlessMode, s.endlessAttempt].join(':');
    if (gameIdentity !== s || key !== worldKey) resetWorld(s, stage);
    const active = Math.min(s.activePlayer || 0, poses.length - 1);

    /* Park the shield on the NEXT pickup row in front of the player and spin
     * it. It is drawn at the player's own column so it is always reachable.
     *
     * WHERE it is parked is decided at the very end of this frame, once the
     * camera has been placed, because a row the camera cannot see is a row the
     * player cannot see either -- see visibleTopRow(). */
    const pickup = selectPickup(shieldMesh, poses[active]);
    shieldTarget = pickup;

    /* A shielded player shines -- ONE shell per shield held.
     *
     * This is the whole feedback loop: the player must be able to SEE how many
     * hits they can still walk into, and SEE one of them go when they do, without
     * reading a number. The state is read from the simulation every frame, so the
     * shells cannot outlive the shield that paid for them by even one frame, and a
     * drop from two to one takes exactly one shell with it.
     *
     * One stack per PLAYER. A single global ring followed the active player, so in
     * two-player mode the player who was not driving got no shield feedback at all
     * while their life string still read "3 🛡1" in the HUD. */
    while (shieldAuras.length > s.players.length) {
      const dropped = shieldAuras.pop();
      if (dropped) dropped.root.removeFromParent();
    }
    for (let pi = 0; pi < s.players.length; pi++) {
      const player = s.players[pi], pose = poses[pi];
      const held = player && pose ? Math.max(0, player.state().shields | 0) : 0;
      const shown = Math.min(held, SHIELD_LAYERS.length);
      let stack = shieldAuras[pi];
      if (!stack) {
        if (shown === 0) continue;
        stack = shieldAuras[pi] = aura(avatarLayer);
      }
      /* The layer count dropped: that is an absorbed hit, and the shell that
       * went off throws its own flash. Index `shown` is the layer that just
       * turned off -- 2 to 1 pops the violet outer one, 1 to 0 the cyan one. */
      if (shown < stack.shown) popShieldBurst(pose.col, pose.row, nowMs, shown);
      stack.shown = shown;
      if (shown === 0) {
        stack.root.removeFromParent();
        shieldAuras[pi] = null;
        continue;
      }
      /* The stack is parked under the player EVERY frame.
       *
       * Created in place it stays at the layer origin -- world (0, 0.025, 0),
       * which is beside the start line and behind the camera -- so a player
       * holding a shield got no shield feedback at all. Reading the pose fresh
       * each frame (rather than parenting to the avatar) is what stops it being
       * left behind at a stale position when the player moves or dies.
       *
       * It lives in WORLD space, so the height is the tile and only the tile.
       * Subtracting the hop lift here -- copied from the avatar marker, which
       * cancels it out because that ring is a child of the avatar group -- drove
       * the shimmer half a tile UNDERGROUND for the whole of every hop: the
       * shield feedback blinked out on take-off and popped back on landing. */
      stack.root.position.set(pose.col, 0.03, -pose.row);
      for (let li = 0; li < stack.layers.length; li++) {
        const layer = stack.layers[li];
        layer.visible = li < shown;
        if (!layer.visible) continue;
        const spec = SHIELD_LAYERS[li];
        // Each layer breathes on its own rate and out of phase with the others,
        // so two shields never look like one thick ring pulsing as one object.
        const wobble = Math.sin(nowMs / spec.rate + pi * 1.7 + li * 2.1);
        layer.position.y = spec.y;
        layer.userData.inner.scale.setScalar(spec.innerScale + wobble * spec.pulse);
        layer.userData.outer.scale.setScalar(spec.outerScale + wobble * spec.pulse * 1.35);
      }
    }
    updateShieldBursts(nowMs);

    let focus = poses[active];
    if (poses.length > 1 && Math.abs(poses[0].row - poses[1].row) < 5) {
      focus = { col: (poses[0].col + poses[1].col) / 2, row: (poses[0].row + poses[1].row) / 2 };
    }
    const lowRow = Math.floor(focus.row) - 7;
    const highRow = Math.floor(focus.row) + 22;
    for (const [row, data] of rows) {
      if (row < lowRow || row > highRow) {
        for (const prop of data.props) release(prop.instance);
        data.group.removeFromParent();
        rows.delete(row);
      }
    }
    for (let row = lowRow; row <= highRow; row++) {
      const data = rows.get(row) || buildRow(row, stage, s);
      for (const prop of data.props) {
        prop.instance.group.visible = !prop.hideForPlayer || !poses.some(pose =>
          Math.abs(pose.col - prop.col) < prop.halfWidth + 0.32 &&
          Math.abs(pose.row - prop.row) < prop.halfDepth + 0.32);
      }
    }
    const worldDt = s.phase === 'RUNNING' || s.phase === 'ENDLESS' ? dt : 0;
    const worldTime = s.endlessMode ? s.endlessMs : s.elapsedInStageMs;
    updateHazards(s, worldDt, worldTime, lowRow, highRow);
    updateAvatars(s, poses, dt);
    updatePursuer(s, poses, worldDt, worldTime);
    backdrop.position.set((s.cols - 1) / 2, -0.55, -focus.row - 5);
    const halfWidth = (camera.right - camera.left) / 2;
    const cameraX = horizontalCameraCenter(focus.col, s, halfWidth);
    const target = new THREE.Vector3(cameraX, 0, -focus.row - 4);
    camera.position.copy(target).add(new THREE.Vector3(0, 14, 16));
    camera.lookAt(target);
    // Last, because it needs to know where the camera ended up: the token is
    // pinned inside the frame, not on a row the frustum never reaches.
    placePickup(shieldTarget, poses[active], nowMs);
    sunlight.position.copy(target).add(new THREE.Vector3(-9, 17, 9));
    sunlight.target.position.copy(target);
    sunlight.target.updateMatrixWorld();
    renderer.render(scene, camera);
    api.frameCount++;
    canvas.dataset.rows = String(rows.size);
    canvas.dataset.hazards = String(hazards.size);
    canvas.dataset.characters = String(avatars.length);
    canvas.dataset.stage = String(stage.id);
    canvas.dataset.frameCount = String(api.frameCount);
    canvas.dataset.draws = String(renderer.info.render.calls);
    canvas.dataset.triangles = String(renderer.info.render.triangles);
    canvas.dataset.characterBounds = JSON.stringify(avatars.map(avatar => avatar.bounds));
    canvas.dataset.visibleXMin = String(cameraX - halfWidth);
    canvas.dataset.visibleXMax = String(cameraX + halfWidth);
    canvas.dataset.cameraX = String(cameraX);
    canvas.dataset.hopArcSource = 'simulation';
    return true;
  } catch (error) {
    api.ready = false;
    status('error', error);
    console.error('3D renderer fell back to the canvas view:', error);
    return false;
  }
}

async function boot() {
  if (!canvas) throw new Error('The 3D canvas is missing');
  status('loading');
  const response = await fetch(new URL('../../assets/models/manifest.json', import.meta.url));
  if (!response.ok) throw new Error('3D asset manifest could not be loaded');
  manifest = await response.json();
  if (!manifest.characters?.length || !manifest.hazards || !manifest.scenery || !manifest.pursuer) {
    throw new Error('The 3D asset manifest is incomplete');
  }
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    api.ready = false;
    status('error', new Error('The 3D graphics context was lost'));
  });
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-5, 5, 6, -6, 0.1, 100);
  scene.add(new THREE.HemisphereLight('#e3f5ff', '#7c9a71', 2.25));
  sunlight = new THREE.DirectionalLight('#fff1d3', 3.0);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  sunlight.shadow.camera.left = -16;
  sunlight.shadow.camera.right = 16;
  sunlight.shadow.camera.top = 18;
  sunlight.shadow.camera.bottom = -18;
  sunlight.shadow.camera.near = 0.5;
  sunlight.shadow.camera.far = 55;
  sunlight.shadow.normalBias = 0.025;
  sunlight.shadow.bias = -0.00015;
  scene.add(sunlight, sunlight.target);
  rowLayer = new THREE.Group();
  hazardLayer = new THREE.Group();
  avatarLayer = new THREE.Group();
  goalLayer = new THREE.Group();
  scene.add(rowLayer, hazardLayer, avatarLayer, goalLayer);
  backdrop = block(scene, 6.5, -0.55, -5, 60, 0.05, 80, '#89b785');
  /* Preload every model the game can put on screen, INCLUDING the shield pickup.
   * Leaving pickups out meant the shield template was never in `templates`, so
   * instantiate() threw during the first stage build and the whole 3D layer
   * fell back to the canvas view -- a pickup that breaks the renderer is not a
   * pickup, it is an outage. */
  const pickupEntries = manifest.pickups ? Object.values(manifest.pickups) : [];
  const entries = [...manifest.characters, ...Object.values(manifest.hazards),
    ...Object.values(manifest.scenery), manifest.pursuer, ...pickupEntries];
  const urls = [...new Set(entries.map(modelURL))];
  api.modelCount = urls.length;
  const loader = new GLTFLoader();
  // A missing lethal object is a gameplay bug. Finish all model loads before
  // replacing the complete 2D fallback, including later-stage hazard kinds.
  for (let offset = 0; offset < urls.length; offset += 8) {
    await Promise.all(urls.slice(offset, offset + 8).map(async url => {
      templates.set(url, await loader.loadAsync(url));
      api.modelsLoaded++;
      status('loading');
    }));
  }
  pursuer = instantiate(manifest.pursuer);
  pursuer.warning = ring(pursuer.group, '#ffad35');
  pursuer.group.visible = false;
  scene.add(pursuer.group);
  /* Sanity-fit three representative models at boot: a short ground vehicle, a
   long one, and a water log. This proves a model's world width agrees with its
   collision length, which is what stops a car clipping the player who is
   standing legally inside its hitbox.
   *
   * These names must exist in Hazards.KINDS. 'train' used to be the long case
   and was removed from the vocabulary with the rail vehicles; reading its spec
   here threw during boot, World3D.ready never flipped true, and the game
   silently fell back to the 2D sprite renderer -- every model loaded into
   memory (175/175) and none of it was ever shown. The check now derives its
   cases from the live vocabulary instead of naming hazards that can be
   deleted. */
  const fitKinds = ['car', 'log', 'trebuchet']
    .filter(kind => window.Hazards.KINDS[kind] && manifest.hazards[kind]);
  const fits = fitKinds.map(kind => {
    const spec = window.Hazards.KINDS[kind];
    const entry = manifest.hazards[kind];
    const sample = instantiate(entry, {
      length: spec.len, height: entry.height || (spec.kind === 'rail' ? 0.7 : 0.48), depth: 0.7,
    });
    sample.group.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(sample.pivot).getSize(new THREE.Vector3());
    release(sample);
    if (Math.abs(size.x - spec.len) > 0.000001) {
      throw new Error('Model width differs from its collision length: ' + kind);
    }
    return { kind, collisionLength: spec.len, worldXLength: size.x };
  });
  canvas.dataset.fittedModels = JSON.stringify(fits);
  api.ready = true;
  status('ready');
}

boot().catch(error => {
  api.ready = false;
  status('error', error);
  console.error('3D assets could not be loaded; the canvas game remains available:', error);
});

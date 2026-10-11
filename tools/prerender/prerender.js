// Pre-render a glTF rig to a turntable sprite sheet, in headless Chromium.
// Proof of concept: does a .glb become 2D sprite frames the existing canvas
// renderer can draw? That question gates every 3D asset in the library.
const { chromium } = require(process.env.HOME + '/.local/pw/node_modules/playwright');
const fs = require('fs'), path = require('path');
const ROOT = process.cwd();
const GLB = 'kaykit-adventurers/addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb';
const TEX = 'kaykit-adventurers/addons/kaykit_character_pack_adventures/Assets/gltf/knight_texture.png';
const DIRS = 8, FRAMES = 8, SIZE = 128;

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: SIZE*DIRS, height: SIZE } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('about:blank');
  // three.js from CDN, module build
  await p.addScriptTag({ url: 'https://unpkg.com/three@0.146.0/build/three.min.js' });
  await p.addScriptTag({ url: 'https://unpkg.com/three@0.146.0/examples/js/loaders/GLTFLoader.js' });

  const glbB64 = fs.readFileSync(GLB).toString('base64');
  const texB64 = fs.readFileSync(TEX).toString('base64');

  const info = await p.evaluate(async ({ glbB64, texB64, DIRS, FRAMES, SIZE }) => {
    const bin = atob(glbB64);
    const arr = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
    const glb = new Blob([arr], {type:'model/gltf-binary'});
    const glbUrl = URL.createObjectURL(glb);
    const img = new Image();
    await new Promise((res, rej) => { img.onload=res; img.onerror=rej;
      img.src = 'data:image/png;base64,'+texB64; });
    const tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;

    const loader = new THREE.GLTFLoader();
    const gltf = await new Promise((res, rej) =>
      loader.load(glbUrl, res, undefined, rej));

    const scene = new THREE.Scene();
    // KayKit exports Z-up (Blender default). The first render came out with the
    // knight lying on its side, and the tell was the bounding box: 2.69 x 2.47
    // x 2.58, which is a cube. A standing humanoid is tall and thin. Rotate
    // -90 about X and the Y axis becomes the character's height.
    gltf.scene.rotation.x = -Math.PI / 2;
    gltf.scene.updateMatrixWorld(true);
    scene.add(gltf.scene);
    gltf.scene.traverse(o => { if (o.isMesh) { o.material.map = tex; o.material.needsUpdate = true; } });

    // frame the model
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const c = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3());
    const radius = Math.max(sz.x, sz.y, sz.z) * 0.62;

    const canvas = document.createElement('canvas');
    canvas.width = DIRS*SIZE; canvas.height = SIZE;
    const r = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true,
                                        preserveDrawingBuffer:true });
    r.setSize(DIRS*SIZE, SIZE, false);
    r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;

    const cam = new THREE.OrthographicCamera(-radius, radius, radius, -radius, 0.1, radius*10);
    const light = new THREE.DirectionalLight(0xffffff, 2.2);
    light.position.set(radius, radius*2, radius); scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    const anims = gltf.animations.map(a => a.name);
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const clip = gltf.animations[0];

    // pick a clip that exists: walk/stand/idle preferred, else the first
    let pick = null;
    for (const pref of ['Walking','Idle','Walk','Stand','Run']) {
      const f = gltf.animations.find(a => a.name.toLowerCase() === pref.toLowerCase());
      if (f) { pick = f; break; }
    }
    if (!pick) pick = clip;

    for (let d=0; d<DIRS; d++) {
      const a = (d/DIRS)*Math.PI*2;
      const dist = radius*3;
      cam.position.set(c.x + Math.cos(a)*dist, c.y + sz.y*0.25, c.z + Math.sin(a)*dist);
      cam.lookAt(c.x, c.y, c.z);
      cam.updateProjectionMatrix();
      if (pick) {
        mixer.stopAllAction();
        const act = mixer.clipAction(pick); act.reset().play();
        act.paused = true;
        act.time = (d/FRAMES) * pick.duration;  // walk cycle distributed around the turntable
        mixer.update(0);
      }
      r.setViewport(d*SIZE, 0, SIZE, SIZE);
      r.setScissor(d*SIZE, 0, SIZE, SIZE);
      r.setScissorTest(true);
      r.render(scene, cam);
    }
    return { animations: anims.length, clip: pick && pick.name,
             size: [sz.x, sz.y, sz.z].map(v=>+v.toFixed(2)), data: canvas.toDataURL('image/png') };
  }, { glbB64, texB64, DIRS, FRAMES, SIZE });

  if (errs.length) { console.log('PAGE ERRORS:', errs.slice(0,3)); }
  fs.writeFileSync('knight_turntable.png', Buffer.from(info.data.split(',')[1], 'base64'));
  console.log('animations in rig :', info.animations);
  console.log('clip used         :', info.clip);
  console.log('model size        :', info.size.join(' x '));
  console.log('wrote             : knight_turntable.png');
  await b.close();
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });

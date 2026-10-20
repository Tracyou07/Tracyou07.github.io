// RGP1: little-endian uint32 magic + count, N float32 XYZ, then N uint8 sRGB.
// Geometry is normalized about the origin; its largest extent is 2, with Z up.
export function parsePointCloud(buffer, metadata) {
  if (buffer.byteLength < 8) throw new Error('Point-cloud header is missing.');
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x31504752) throw new Error('Unsupported point-cloud format (expected RGP1).');
  const count = view.getUint32(4, true);
  if (!count || count > 5000000) throw new Error('Point count must be between 1 and 5,000,000.');
  if (buffer.byteLength !== 8 + count * 15) throw new Error('Point-cloud byte length does not match its point count.');
  if (metadata.point_count !== undefined && metadata.point_count !== count) throw new Error('Metadata point count does not match the geometry.');
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const srgb = Array.from({ length: 256 }, (_, i) => {
    const c = i / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const rgb = new Uint8Array(buffer, 8 + count * 12);
  for (let i = 0; i < positions.length; i++) {
    const value = view.getFloat32(8 + i * 4, true);
    if (!Number.isFinite(value)) throw new Error('Point-cloud coordinates must be finite.');
    positions[i] = value;
    colors[i] = srgb[rgb[i]];
  }
  return { positions, colors, count };
}

export function readSceneManifest(manifest, base) {
  if (!Array.isArray(manifest?.scenes) || !manifest.scenes.length) throw new Error('Scene manifest must contain scenes.');
  const ids = new Set();
  const scenes = manifest.scenes.map(entry => {
    if (!entry || typeof entry.id !== 'string' || !entry.id.trim() || ids.has(entry.id) ||
        typeof entry.title !== 'string' || !entry.title.trim()) throw new Error('Scene manifest contains an invalid or duplicate scene.');
    ids.add(entry.id);
    const result = { ...entry };
    const assetKeys = ['metadata', 'binary', 'preview', 'input_strip'];
    if (entry.cameras != null) assetKeys.push('cameras');
    for (const key of assetKeys) {
      if (typeof entry[key] !== 'string' || !entry[key].trim()) throw new Error(`Scene ${entry.id} is missing its ${key} asset.`);
      const url = new URL(entry[key], base);
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw new Error(`Scene ${entry.id} has an invalid asset path.`);
      result[key] = url;
    }
    return result;
  });
  return { scenes, default_scene: ids.has(manifest.default_scene) ? manifest.default_scene : scenes[0].id };
}

// Camera corners and trajectory are already in the point cloud's world frame.
export function parseCameraPoses(document, metadata) {
  if (!document || typeof document.scene !== 'string' || !Number.isInteger(document.frames) || document.frames < 1 || document.frames > 100000) {
    throw new Error('Camera pose scene/frames metadata is invalid.');
  }
  if (metadata.scene !== undefined && document.scene !== metadata.scene) throw new Error('Camera pose scene does not match the point cloud.');
  if (metadata.frames !== undefined && document.frames !== metadata.frames) throw new Error('Camera pose frame count does not match the point cloud.');
  const cameras = document.cameras;
  if (!Array.isArray(cameras) || !Number.isInteger(document.camera_count) || document.camera_count < 1 ||
      document.camera_count !== cameras.length || cameras.length > document.frames) {
    throw new Error('Camera pose count does not match its cameras.');
  }
  const finitePoint = point => Array.isArray(point) && point.length === 3 && point.every(Number.isFinite);
  for (const camera of cameras) {
    if (!camera || typeof camera.frame !== 'string' || !finitePoint(camera.center) || !Array.isArray(camera.corners) ||
        camera.corners.length !== 4 || !camera.corners.every(finitePoint)) {
      throw new Error('Camera centers and four corners must contain finite XYZ coordinates.');
    }
  }
  if (!Array.isArray(document.trajectory) || document.trajectory.length !== document.frames || !document.trajectory.every(finitePoint)) {
    throw new Error('Camera trajectory must contain one finite XYZ point per frame.');
  }
  const frustumCount = Math.min(cameras.length, 40);
  const frustums = new Float32Array(frustumCount * 8 * 2 * 3);
  let offset = 0;
  const segment = (start, end) => { frustums.set(start, offset); frustums.set(end, offset + 3); offset += 6; };
  for (let i = 0; i < frustumCount; i++) {
    const index = frustumCount === 1 ? 0 : Math.round(i * (cameras.length - 1) / (frustumCount - 1));
    const camera = cameras[index];
    for (let corner = 0; corner < 4; corner++) {
      segment(camera.center, camera.corners[corner]);
      segment(camera.corners[corner], camera.corners[(corner + 1) % 4]);
    }
  }
  const trajectorySegments = new Float32Array(Math.max(document.trajectory.length - 1, 0) * 6);
  for (let i = 1; i < document.trajectory.length; i++) {
    trajectorySegments.set(document.trajectory[i - 1], (i - 1) * 6);
    trajectorySegments.set(document.trajectory[i], (i - 1) * 6 + 3);
  }
  return {
    frustums, trajectory: new Float32Array(document.trajectory.flat()), trajectorySegments,
    cameraCount: cameras.length, frustumCount
  };
}

// Corners are projected onto camera-right, camera-up, and target-to-camera axes.
// Fit both dimensions so a portrait viewport cannot crop a wide reconstruction.
export function fittedCameraDistance(corners, aspect, fov = 45, fill = 0.78) {
  const halfHeight = Math.tan(fov * Math.PI / 360) * fill;
  const halfWidth = halfHeight * Math.max(aspect, 0.01);
  return Math.max(0.15, ...corners.map(([x, y, z]) => z + Math.max(Math.abs(x) / halfWidth, Math.abs(y) / halfHeight))) + 0.02;
}

async function mountViewer(host) {
  host.classList.add('pc-viewer');
  host.innerHTML = `
    <div class="pc-scenes" role="group" aria-label="Choose reconstruction scene"></div>
    <div class="pc-toolbar">
      <div><span class="pc-eyebrow">EXPLORE IN 3D</span><strong class="pc-name">RegimeVGGT</strong><span class="pc-subtitle"></span></div>
      <div class="pc-actions">
        <button type="button" class="pc-reset" disabled>Reset view</button>
        <button type="button" class="pc-rotate" aria-pressed="false" disabled>Auto-rotate</button>
        <label class="pc-poses"><input class="pc-poses-toggle" type="checkbox" checked disabled aria-describedby="pointcloud-poses-status"> Camera poses</label>
        <label class="pc-size">Point size <input type="range" min="1" max="5" step="0.25" value="2" aria-label="Point size" disabled></label>
        <button type="button" class="pc-fullscreen" hidden>Full screen</button>
      </div>
    </div>
    <figure class="pc-inputs" hidden><figcaption>INPUT FRAMES <span>Sampled from the selected sequence</span></figcaption><img class="pc-input-strip" alt=""></figure>
    <div class="pc-stage">
      <img class="pc-fallback" src="assets/pointcloud/scene0013/preview.png" alt="Static RegimeVGGT reconstruction preview">
      <div class="pc-loading" aria-hidden="true">Loading reconstruction…</div>
    </div>
    <div class="pc-caption"><div class="pc-summary"><span class="pc-status" role="status" aria-live="polite">Loading available scenes…</span><span class="pc-pose-status" id="pointcloud-poses-status" role="status" aria-live="polite"></span><span class="pc-source" hidden>Inputs: <a target="_blank" rel="noopener noreferrer"></a></span></div>
    <span class="pc-help" id="pointcloud-help">Drag to orbit · Scroll or pinch to zoom · Right-drag to pan<br>Keyboard: arrow keys to orbit, + / − to zoom, R to reset</span></div>`;
  const status = host.querySelector('.pc-status');
  const stage = host.querySelector('.pc-stage');
  const fallback = host.querySelector('.pc-fallback');
  const loading = host.querySelector('.pc-loading');
  const sceneButtons = host.querySelector('.pc-scenes');
  const inputs = host.querySelector('.pc-inputs');
  const strip = host.querySelector('.pc-input-strip');
  const reset = host.querySelector('.pc-reset');
  const rotate = host.querySelector('.pc-rotate');
  const slider = host.querySelector('input[type="range"]');
  const poseToggle = host.querySelector('.pc-poses-toggle');
  const poseStatus = host.querySelector('.pc-pose-status');
  const fullscreen = host.querySelector('.pc-fullscreen');
  const source = host.querySelector('.pc-source');
  const lifecycle = new AbortController();
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const on = (element, event, handler) => element.addEventListener(event, handler, { signal: lifecycle.signal });
  const base = new URL('assets/pointcloud/', import.meta.url);
  let renderer, controls, scene, camera, THREE, OrbitControlsClass, points, resizeObserver, visibilityObserver;
  let enginePromise, sceneRequest, selected, frame = 0, generation = 0;
  let disposed = false, ready = false, inView = true, previousTime = 0;
  let initialPosition, initialTarget, initialUp, fittedAspect = 1;
  let contextError;
  let poseGroup, poseSummary = '', poseWanted = true;
  let wideLinesPromise;

  function clearPoses() {
    if (!poseGroup) return;
    scene.remove(poseGroup);
    poseGroup.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
    poseGroup = null;
    poseSummary = '';
  }
  function clearGeometry() {
    clearPoses();
    if (!points) return;
    scene.remove(points);
    points.geometry.dispose();
    points.material.dispose();
    points = null;
    renderer.renderLists.dispose();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    generation++;
    sceneRequest?.abort();
    cancelAnimationFrame(frame);
    lifecycle.abort();
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    controls?.dispose();
    clearGeometry();
    renderer?.dispose();
  }
  function requestDraw() {
    if (!frame && !disposed && ready && inView && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function draw(time) {
    frame = 0;
    if (disposed || !ready || document.hidden || !inView) return;
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.1) : 1 / 60;
    previousTime = time;
    if (controls.autoRotate) controls.update(delta);
    renderer.render(scene, camera);
    if (controls.autoRotate) requestDraw();
  }
  function stopRotation() {
    if (controls) controls.autoRotate = false;
    rotate.setAttribute('aria-pressed', 'false');
    requestDraw();
  }
  function setEnabled(enabled) {
    reset.disabled = slider.disabled = !enabled;
    poseToggle.disabled = !enabled || !poseGroup;
    rotate.disabled = !enabled || motion.matches;
    if (controls) controls.enabled = enabled;
    rotate.title = motion.matches ? 'Auto-rotation is disabled by your reduced-motion preference.' : '';
  }
  function fail(error) {
    if (disposed) return;
    ready = false;
    stopRotation();
    controls?.dispose();
    controls = undefined;
    clearGeometry();
    if (renderer) renderer.domElement.hidden = true;
    fallback.hidden = false;
    loading.hidden = true;
    host.classList.add('pc-unavailable');
    delete host.dataset.ready;
    setEnabled(false);
    status.textContent = `Interactive view unavailable${selected ? ` for ${selected.title}` : ''} — ${error.message || String(error)} Showing a static preview.`;
    poseStatus.textContent = '';
  }
  async function fetchAsset(url, signal) {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`${url.pathname.split('/').pop()}: HTTP ${response.status}.`);
    return response;
  }
  function updatePoseStatus() {
    poseStatus.textContent = poseSummary + (poseWanted ? '' : ' · hidden');
  }
  async function loadPoses(entry, metadata, signal, current) {
    if (!entry.cameras) {
      poseToggle.checked = false;
      poseStatus.textContent = 'Camera poses not provided for this scene.';
      return;
    }
    poseStatus.textContent = 'Loading predicted camera poses…';
    try {
      // Keep optional pose-line imports out of the cloud's required load path.
      wideLinesPromise ??= Promise.all([
        import('./vendor/three/lines/LineSegments2.js'),
        import('./vendor/three/lines/LineSegmentsGeometry.js'),
        import('./vendor/three/lines/LineMaterial.js')
      ]);
      const [response, [{ LineSegments2 }, { LineSegmentsGeometry }, { LineMaterial }]] = await Promise.all([
        fetchAsset(entry.cameras, signal), wideLinesPromise
      ]);
      const document = await response.json();
      if (current !== generation || signal.aborted || disposed || !ready) return;
      const data = parseCameraPoses(document, metadata);
      const group = new THREE.Group();
      const addWideLine = (positions, color, width, order) => {
        if (!positions.length) return;
        const geometry = new LineSegmentsGeometry().setPositions(positions);
        const material = new LineMaterial({ color, linewidth: width, worldUnits: false, opacity: 1,
          depthTest: false, depthWrite: false, alphaToCoverage: true, toneMapped: false });
        material.resolution.set(Math.max(stage.clientWidth, 1), Math.max(stage.clientHeight, 1));
        const line = new LineSegments2(geometry, material);
        line.renderOrder = order;
        group.add(line);
      };
      addWideLine(data.frustums, 0x00bfff, 3, 2);
      addWideLine(data.trajectorySegments, 0xff7a00, 2, 3);
      poseGroup = group;
      poseGroup.visible = poseWanted;
      scene.add(poseGroup);
      poseSummary = `${data.cameraCount.toLocaleString('en-US')} predicted poses · ${data.frustumCount.toLocaleString('en-US')} frustums`;
      poseToggle.checked = poseWanted;
      setEnabled(true);
      updatePoseStatus();
      requestDraw();
    } catch (error) {
      if (current !== generation || signal.aborted || disposed || !ready) return;
      clearPoses();
      poseToggle.checked = false;
      poseToggle.disabled = true;
      poseStatus.textContent = `Camera poses unavailable — ${error.message || String(error)}`;
    }
  }
  function fitView() {
    if (!points) return;
    camera.up.copy(initialUp);
    controls.target.copy(initialTarget);
    const direction = initialPosition.clone().sub(initialTarget).normalize();
    camera.position.copy(initialTarget).add(direction);
    camera.lookAt(initialTarget);
    camera.updateMatrixWorld(true);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const vertical = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const { min, max } = points.geometry.boundingBox;
    const corners = [];
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
      const corner = new THREE.Vector3(x, y, z).sub(initialTarget);
      corners.push([corner.dot(right), corner.dot(vertical), corner.dot(direction)]);
    }
    const distance = fittedCameraDistance(corners, camera.aspect, camera.fov);
    camera.position.copy(initialTarget).addScaledVector(direction, distance);
    controls.maxDistance = Math.max(30, distance * 4);
    camera.far = Math.max(100, controls.maxDistance * 2);
    camera.updateProjectionMatrix();
    controls.update();
    controls.saveState();
    fittedAspect = camera.aspect;
    requestDraw();
  }
  function resize() {
    if (!renderer) return;
    const width = Math.max(stage.clientWidth, 1);
    const height = Math.max(stage.clientHeight, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    // Wide lines use CSS pixels. Their onBeforeRender also tracks getViewport().
    poseGroup?.children.forEach(line => line.material.resolution.set(width, height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // Preserve user rotation/pan when resizing, but back off in a narrower view.
    if (ready && camera.aspect < fittedAspect) {
      const offset = camera.position.clone().sub(controls.target);
      camera.position.copy(controls.target).add(offset.multiplyScalar(fittedAspect / camera.aspect));
      fittedAspect = camera.aspect;
      controls.update();
    }
    requestDraw();
  }
  async function ensureEngine() {
    const [three, orbitModule] = await Promise.all([
      import('./vendor/three/three.module.js'), import('./vendor/three/OrbitControls.js')
    ]);
    if (disposed) throw new Error('Viewer was closed.');
    THREE = three;
    OrbitControlsClass = orbitModule.OrbitControls;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setClearColor(0xf5f4ef);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.hidden = true;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-describedby', 'pointcloud-help');
    on(canvas, 'webglcontextlost', event => {
      event.preventDefault();
      contextError = new Error('The browser lost its WebGL context. Reload to try again.');
      generation++;
      sceneRequest?.abort();
      fail(contextError);
    });
    stage.append(canvas);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.005, 100);
    on(canvas, 'pointerdown', () => canvas.focus({ preventScroll: true }));
    on(canvas, 'keydown', event => {
      if (!ready || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_', 'r', 'R'].includes(event.key)) return;
      event.preventDefault();
      stopRotation();
      if (event.key.toLowerCase() === 'r') { reset.click(); return; }
      const quaternion = new THREE.Quaternion().setFromUnitVectors(camera.up, new THREE.Vector3(0, 1, 0));
      const offset = camera.position.clone().sub(controls.target).applyQuaternion(quaternion);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      const angle = Math.PI / 36;
      if (event.key === 'ArrowLeft') spherical.theta -= angle;
      if (event.key === 'ArrowRight') spherical.theta += angle;
      if (event.key === 'ArrowUp') spherical.phi -= angle;
      if (event.key === 'ArrowDown') spherical.phi += angle;
      if (event.key === '+' || event.key === '=') spherical.radius *= 0.9;
      if (event.key === '-' || event.key === '_') spherical.radius /= 0.9;
      spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
      spherical.makeSafe();
      offset.setFromSpherical(spherical).applyQuaternion(quaternion.invert());
      camera.position.copy(controls.target).add(offset);
      controls.update();
      requestDraw();
    });
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    visibilityObserver = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      previousTime = 0;
      if (inView) requestDraw();
    });
    visibilityObserver.observe(stage);
    resize();
  }
  async function selectScene(entry) {
    const current = ++generation;
    sceneRequest?.abort();
    sceneRequest = new AbortController();
    const signal = sceneRequest.signal;
    selected = entry;
    ready = false;
    stopRotation();
    controls?.dispose();
    controls = undefined;
    clearGeometry();
    setEnabled(false);
    host.classList.remove('pc-unavailable');
    delete host.dataset.ready;
    host.dataset.scene = entry.id;
    sceneButtons.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scene === entry.id)));
    host.querySelector('.pc-name').textContent = `RegimeVGGT · ${entry.title}`;
    host.querySelector('.pc-subtitle').textContent = entry.subtitle || '';
    fallback.src = entry.preview.href;
    fallback.alt = `Static RegimeVGGT reconstruction of ${entry.title}`;
    fallback.hidden = false;
    if (renderer) renderer.domElement.hidden = true;
    strip.src = entry.input_strip.href;
    strip.alt = entry.input_alt || entry.input_strip_alt || `Sampled input frames from ${entry.title}`;
    inputs.hidden = false;
    loading.hidden = false;
    loading.textContent = `Loading ${entry.title}…`;
    status.textContent = `Loading ${entry.title}…`;
    poseStatus.textContent = '';
    poseToggle.checked = poseWanted;
    source.hidden = true;
    source.querySelector('a').removeAttribute('href');
    slider.value = '2';
    try {
      if (contextError) throw contextError;
      enginePromise ??= ensureEngine();
      const [metadata, buffer] = await Promise.all([
        fetchAsset(entry.metadata, signal).then(response => response.json()),
        fetchAsset(entry.binary, signal).then(response => response.arrayBuffer()),
        enginePromise
      ]);
      if (current !== generation || signal.aborted || disposed) return;
      if (!metadata || typeof metadata.scene !== 'string' || !metadata.scene.trim() ||
          !Number.isInteger(metadata.frames) || metadata.frames < 1 ||
          !Number.isInteger(metadata.point_count) || metadata.point_count < 1) {
        throw new Error('Scene metadata is missing a valid scene, frames, or point_count.');
      }
      const vector = (value, label, defaultValue) => {
        const result = value ?? defaultValue;
        if (!Array.isArray(result) || result.length !== 3 || !result.every(Number.isFinite)) throw new Error(`Invalid ${label} in scene metadata.`);
        return new THREE.Vector3().fromArray(result);
      };
      initialUp = vector(metadata.position_up, 'position_up', [0, 0, 1]);
      if (initialUp.length() < 0.001) throw new Error('Camera up direction cannot be zero.');
      initialUp.normalize();
      initialPosition = vector(metadata.camera_position, 'camera_position', [2.1, -2.7, 1.8]);
      initialTarget = vector(metadata.camera_target, 'camera_target', [0, 0, 0]);
      if (initialPosition.distanceTo(initialTarget) < 0.01) throw new Error('Camera position and target must be distinct.');
      const data = parsePointCloud(buffer, metadata);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
      // Three.js vertex colors use linear sRGB; RGP1 color bytes use sRGB.
      geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      points = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true }));
      scene.add(points);
      // OrbitControls caches the camera up vector at construction time.
      camera.up.copy(initialUp);
      controls = new OrbitControlsClass(camera, renderer.domElement);
      controls.minDistance = 0.15;
      controls.maxDistance = 30;
      controls.enableDamping = false;
      controls.autoRotateSpeed = 0.6;
      controls.addEventListener('change', requestDraw);
      renderer.domElement.setAttribute('aria-label', `Interactive RegimeVGGT point cloud: ${entry.title}`);
      ready = true;
      previousTime = 0;
      resize();
      fitView();
      setEnabled(true);
      fallback.hidden = true;
      loading.hidden = true;
      renderer.domElement.hidden = false;
      status.textContent = `${metadata.frames.toLocaleString('en-US')} frames · ${data.count.toLocaleString('en-US')} displayed points`;
      if (typeof metadata.source_url === 'string') {
        try {
          const url = new URL(metadata.source_url);
          if (url.protocol === 'https:' && !url.username && !url.password) {
            const link = source.querySelector('a');
            link.href = url.href;
            link.textContent = String(metadata.source_label || metadata.label || 'Input source');
            source.hidden = false;
          }
        } catch { /* Optional input credit is omitted when its URL is invalid. */ }
      }
      host.dataset.ready = 'true';
      requestDraw();
      loadPoses(entry, metadata, signal, current);
    } catch (error) {
      if (current !== generation || signal.aborted || disposed) return;
      sceneRequest.abort();
      fail(error);
    }
  }
  on(reset, 'click', () => { if (!ready) return; stopRotation(); slider.value = '2'; points.material.size = 2; fitView(); });
  on(rotate, 'click', () => {
    if (!ready) return;
    controls.autoRotate = !controls.autoRotate && !motion.matches;
    rotate.setAttribute('aria-pressed', String(controls.autoRotate));
    previousTime = 0;
    requestDraw();
  });
  on(slider, 'input', () => { if (ready) { points.material.size = Number(slider.value); requestDraw(); } });
  on(poseToggle, 'change', () => {
    if (!ready || !poseGroup) return;
    poseWanted = poseToggle.checked;
    poseGroup.visible = poseWanted;
    updatePoseStatus();
    requestDraw();
  });
  fullscreen.hidden = !document.fullscreenEnabled || !host.requestFullscreen;
  on(fullscreen, 'click', async () => {
    try {
      if (document.fullscreenElement === host) await document.exitFullscreen();
      else await host.requestFullscreen();
    } catch (error) { status.textContent = `Full screen unavailable — ${error.message}`; }
  });
  on(document, 'fullscreenchange', () => { fullscreen.textContent = document.fullscreenElement === host ? 'Exit full screen' : 'Full screen'; resize(); });
  on(document, 'visibilitychange', () => { previousTime = 0; requestDraw(); });
  on(motion, 'change', () => { if (motion.matches) stopRotation(); setEnabled(ready); });
  on(strip, 'error', () => { inputs.hidden = true; });
  on(strip, 'load', () => { inputs.hidden = false; });
  on(window, 'pagehide', event => { if (!event.persisted) dispose(); });
  on(window, 'pageshow', requestDraw);
  try {
    const response = await fetchAsset(new URL('scenes.json', base), lifecycle.signal);
    const manifest = readSceneManifest(await response.json(), base);
    if (disposed) return;
    for (const entry of manifest.scenes) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.scene = entry.id;
      button.textContent = entry.title;
      button.setAttribute('aria-pressed', 'false');
      on(button, 'click', () => { if (selected?.id !== entry.id || !ready) selectScene(entry); });
      sceneButtons.append(button);
    }
    selectScene(manifest.scenes.find(entry => entry.id === manifest.default_scene));
  } catch (error) { if (!disposed) fail(error); }
}

if (typeof document !== 'undefined') {
  const host = document.getElementById('pointcloud-viewer');
  if (host) mountViewer(host);
}

// 関ヶ原シミュレーター メインスクリプト
(function() {
  const container = document.getElementById('canvas-container');
  const W = container.clientWidth || window.innerWidth - 320;
  const H = container.clientHeight || window.innerHeight - 80;

  // Three.js セットアップ
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 80, 200);

  const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 500);
  camera.position.set(0, 120, 80);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(W, H);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // ライト
  const ambient = new THREE.AmbientLight(0xffeedd, 0.6);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff5cc, 1.2);
  sun.position.set(50, 80, 30);
  sun.castShadow = true;
  scene.add(sun);

  // 地形（簡易メッシュ）
  const terrainGeo = new THREE.PlaneGeometry(160, 160, 40, 40);
  const terrainMat = new THREE.MeshLambertMaterial({ color: 0x3a5c2a, wireframe: false });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.receiveShadow = true;

  // 地形に高低差を付ける（山・丘陵）
  const pos = terrainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getY(i);
    const h = Math.sin(x * 0.08) * 4 + Math.cos(z * 0.1) * 3 +
              (Math.abs(x) > 50 || Math.abs(z) > 50 ? 8 : 0);
    pos.setZ(i, h);
  }
  terrainGeo.computeVertexNormals();
  scene.add(terrain);

  // 霧（朝霧）
  const fogPlaneGeo = new THREE.PlaneGeometry(160, 160);
  const fogMat = new THREE.MeshBasicMaterial({ color: 0xaabbcc, transparent: true, opacity: 0.18, depthWrite: false });
  const fogPlane = new THREE.Mesh(fogPlaneGeo, fogMat);
  fogPlane.rotation.x = -Math.PI / 2;
  fogPlane.position.y = 3;
  scene.add(fogPlane);

  // 軍勢オブジェクト生成
  const unitMeshes = {};
  const arrowHelpers = {};

  Object.entries(BATTLE_DATA.armies).forEach(([armyKey, army]) => {
    army.units.forEach(unit => {
      // 本体（円柱）
      const geo = new THREE.CylinderGeometry(unit.size, unit.size * 1.2, 3, 8);
      const mat = new THREE.MeshLambertMaterial({ color: army.color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(unit.x, 1.5, unit.z);
      mesh.castShadow = true;
      scene.add(mesh);
      unitMeshes[unit.id] = { mesh, baseX: unit.x, baseZ: unit.z, armyKey };

      // ラベル（スプライト代わりにシンプルな板）
      const flagGeo = new THREE.BoxGeometry(0.4, 4, 0.1);
      const flagMat = new THREE.MeshBasicMaterial({ color: army.color });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(unit.x, 5, unit.z);
      scene.add(flag);
    });
  });

  // 時間スライダー・再生制御
  const slider = document.getElementById('time-slider');
  const timeLabel = document.getElementById('time-label');
  const eventList = document.getElementById('event-list');
  const playBtn = document.getElementById('play-btn');
  const resetBtn = document.getElementById('reset-btn');
  const ifToggle = document.getElementById('if-toggle');

  let playing = false;
  let currentTime = 0;
  let animFrame;

  function getTimeLabel(t) {
    const hour = 8 + Math.floor(t * 6 / 100);
    const min = Math.floor((t * 360 / 100) % 60);
    return `午前${hour < 12 ? hour : hour - 12}時${min > 0 ? min + '分' : ''}`;
  }

  function updateScene(t) {
    const isIf = ifToggle.checked;

    // 霧: 0〜20は濃い、それ以降薄くなる
    fogPlane.material.opacity = Math.max(0.02, 0.18 - t * 0.003);

    // 軍勢移動（時間に応じて動かす）
    Object.entries(unitMeshes).forEach(([id, obj]) => {
      const { mesh, baseX, baseZ, armyKey } = obj;
      let dx = 0, dz = 0;

      if (armyKey === 'east') {
        dx = -t * 0.18;
        dz = t * 0.05;
      } else if (armyKey === 'west' && t < 65) {
        dx = t * 0.12;
        dz = -t * 0.03;
      } else if (armyKey === 'west' && t >= 65) {
        // 崩壊: 散り散りに
        dx = t * 0.1 + (id === 'shimazu' ? 30 : -15);
        dz = t * 0.15;
      } else if (armyKey === 'kobayakawa') {
        if (!isIf && t >= 65) {
          // 裏切り: 東軍側へ移動
          dx = (t - 65) * 0.5;
          dz = (t - 65) * 0.4;
        }
      }

      mesh.position.x = baseX + dx;
      mesh.position.z = baseZ + dz;
      mesh.position.y = 1.5 + Math.sin(t * 0.2 + baseX) * 0.3;
    });

    // イベントログ更新
    const events = isIf ? BATTLE_DATA.ifEvents : BATTLE_DATA.events;
    const allEvents = isIf ? [...BATTLE_DATA.events.filter(e => e.time <= 60), ...BATTLE_DATA.ifEvents] : BATTLE_DATA.events;
    const passed = BATTLE_DATA.events.filter(e => e.time <= t);
    eventList.innerHTML = passed.map(e =>
      `<li class="${e.key === 'betrayal' && !isIf ? 'highlight' : ''}">[${e.label}] ${isIf && e.key === 'betrayal' ? '（IFモード: 裏切りなし）' : e.text}</li>`
    ).reverse().join('');

    timeLabel.textContent = getTimeLabel(t);
  }

  function tick() {
    if (!playing) return;
    currentTime = Math.min(currentTime + 0.3, 100);
    slider.value = currentTime;
    updateScene(currentTime);
    if (currentTime >= 100) {
      playing = false;
      playBtn.textContent = '▶ 再生';
    }
    animFrame = requestAnimationFrame(tick);
  }

  slider.addEventListener('input', () => {
    currentTime = parseFloat(slider.value);
    updateScene(currentTime);
  });

  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? '⏸ 停止' : '▶ 再生';
    if (playing) tick();
    else cancelAnimationFrame(animFrame);
  });

  resetBtn.addEventListener('click', () => {
    playing = false;
    playBtn.textContent = '▶ 再生';
    cancelAnimationFrame(animFrame);
    currentTime = 0;
    slider.value = 0;
    updateScene(0);
  });

  ifToggle.addEventListener('change', () => updateScene(currentTime));

  // 視点切り替え
  document.getElementById('view-switcher').addEventListener('click', e => {
    const btn = e.target.closest('.view-btn');
    if (!btn) return;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const gen = BATTLE_DATA.generals[btn.dataset.general];
    if (!gen) return;
    camera.position.set(gen.camera.x, gen.camera.y, gen.camera.z);
    camera.lookAt(gen.lookAt.x, gen.lookAt.y, gen.lookAt.z);
  });

  // マウスドラッグで視点回転（簡易）
  let isDragging = false, prevX = 0, prevY = 0;
  renderer.domElement.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
  window.addEventListener('mouseup', () => isDragging = false);
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = (e.clientX - prevX) * 0.5;
    const dy = (e.clientY - prevY) * 0.5;
    camera.position.x -= dx;
    camera.position.y = Math.max(10, camera.position.y - dy);
    prevX = e.clientX; prevY = e.clientY;
  });

  // マウスホイールでズーム
  renderer.domElement.addEventListener('wheel', e => {
    camera.position.y = Math.max(15, Math.min(200, camera.position.y + e.deltaY * 0.1));
  });

  // リサイズ対応
  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // アニメーションループ
  function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
  }

  updateScene(0);
  render();
})();

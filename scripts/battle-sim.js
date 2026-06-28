(function() {
  "use strict";
  try {

  const cfg = window.BATTLE_SCENE;
  if (!cfg || !window.THREE) return;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const $ = id => document.getElementById(id);

  $("battleTitle").textContent = cfg.title;
  $("battleEyebrow").textContent = cfg.eyebrow;
  $("clockDate").textContent = cfg.dateLabel;
  $("track").min = cfg.time.min;
  $("track").max = cfg.time.max;
  $("track").step = cfg.time.step || 0.005;
  $("track").value = cfg.time.min;

  function toColor(value) {
    return new THREE.Color(value);
  }

  function bump(x, z, item) {
    const d = ((x - item.x) ** 2 + (z - item.z) ** 2) / (item.r * item.r);
    return item.amp * Math.exp(-d);
  }

  function terrainH(x, z) {
    const terrain = cfg.terrain;
    let h = terrain.base || 0;
    h += Math.sin(x * (terrain.roughX || 0.03)) * Math.cos(z * (terrain.roughZ || 0.035)) * (terrain.roughAmp || 2);
    h += Math.sin(x * 0.011 + z * 0.017) * (terrain.longAmp || 2.5);
    (terrain.bumps || []).forEach(item => {
      h += bump(x, z, item);
    });
    return h;
  }

  function distanceToSegment(px, pz, ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz || 1;
    const t = clamp(((px - ax) * dx + (pz - az) * dz) / lenSq, 0, 1);
    const x = ax + dx * t;
    const z = az + dz * t;
    return Math.hypot(px - x, pz - z);
  }

  function distanceToPolyline(x, z, points) {
    let min = Infinity;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      min = Math.min(min, distanceToSegment(x, z, a[0], a[1], b[0], b[1]));
    }
    return min;
  }

  const stage = $("stage");
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = toColor(cfg.sky.morning);
  scene.fog = new THREE.FogExp2(cfg.sky.fog, cfg.sky.fogDensity || 0.002);

  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 1, 3200);
  const hemi = new THREE.HemisphereLight(0xdfe8f0, 0x48503e, 0.85);
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.0);
  sun.position.set(260, 360, -180);
  scene.add(hemi, sun);

  function buildTerrain() {
    const terrain = cfg.terrain;
    const size = terrain.size || 760;
    const seg = terrain.segments || 150;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const low = toColor(terrain.colors.low);
    const mid = toColor(terrain.colors.mid);
    const high = toColor(terrain.colors.high);
    const road = toColor(terrain.colors.road || 0xbda878);
    const water = toColor(terrain.colors.water || 0x526f8f);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = terrainH(x, z);
      pos.setY(i, h);

      tmp.copy(low).lerp(mid, clamp(h / 24, 0, 1));
      if (h > 24) tmp.lerp(high, clamp((h - 24) / 65, 0, 1));
      tmp.offsetHSL(0, 0, Math.sin(x * 0.19) * Math.cos(z * 0.17) * 0.045);

      (terrain.roads || []).forEach(item => {
        const dist = distanceToPolyline(x, z, item.points);
        if (dist < item.width) tmp.lerp(road, smooth(1 - dist / item.width) * 0.75);
      });
      (terrain.rivers || []).forEach(item => {
        const dist = distanceToPolyline(x, z, item.points);
        if (dist < item.width) tmp.lerp(water, smooth(1 - dist / item.width) * 0.86);
      });

      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    geo.computeVertexNormals();
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })));
  }

  buildTerrain();

  function makeTextSprite(text, opt = {}) {
    const fs = opt.fs || 44;
    const pad = 18;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = `${opt.weight || 700} ${fs}px "Shippori Mincho B1","Hiragino Mincho ProN",serif`;
    const width = context.measureText(text).width;
    canvas.width = Math.ceil(width + pad * 2);
    canvas.height = fs + pad * 2;
    const ctx = canvas.getContext("2d");
    ctx.font = `${opt.weight || 700} ${fs}px "Shippori Mincho B1","Hiragino Mincho ProN",serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = opt.stroke || 6;
    ctx.strokeStyle = opt.strokeColor || "rgba(0,0,0,.85)";
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = opt.color || "#fff";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.userData.aspect = canvas.width / canvas.height;
    return sprite;
  }

  (cfg.places || []).forEach(place => {
    const sprite = makeTextSprite(place.name, { fs: place.fs || 38, color: place.color || "#e8dfc8", stroke: 5, weight: 500 });
    sprite.position.set(place.x, terrainH(place.x, place.z) + (place.y || 16), place.z);
    sprite.scale.set(sprite.userData.aspect * (place.scale || 10), place.scale || 10, 1);
    sprite.material.opacity = place.opacity || 0.85;
    scene.add(sprite);
  });

  const soldierGeo = new THREE.BoxGeometry(1.7, 2.6, 1.7);
  soldierGeo.translate(0, 1.3, 0);
  const dummy = new THREE.Object3D();
  const unitObjs = {};

  function sideOf(unit) {
    return cfg.sides[unit.side] || cfg.sides.neutral;
  }

  function unitPosAt(unit, time) {
    const path = unit.path;
    if (time <= path[0][0]) return { x: path[0][1], z: path[0][2] };
    for (let i = 0; i < path.length - 1; i++) {
      if (time <= path[i + 1][0]) {
        const k = smooth((time - path[i][0]) / (path[i + 1][0] - path[i][0]));
        return {
          x: lerp(path[i][1], path[i + 1][1], k),
          z: lerp(path[i][2], path[i + 1][2], k)
        };
      }
    }
    const last = path[path.length - 1];
    return { x: last[1], z: last[2] };
  }

  cfg.units.forEach(unit => {
    const side = sideOf(unit);
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: side.color, transparent: true });
    const count = unit.size || 28;
    const inst = new THREE.InstancedMesh(soldierGeo, mat, count);
    const offsets = [];
    const cols = Math.ceil(Math.sqrt(count * 1.8));
    for (let i = 0; i < count; i++) {
      offsets.push([
        (i % cols - cols / 2) * 3.4 + (Math.random() - 0.5) * 1.6,
        Math.floor(i / cols) * 3.5 + (Math.random() - 0.5) * 1.6,
        0.85 + Math.random() * 0.45
      ]);
    }
    group.add(inst);

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a2e1c, transparent: true });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 24, 5), poleMat);
    pole.position.y = 12;
    group.add(pole);

    const flagCanvas = document.createElement("canvas");
    flagCanvas.width = 64;
    flagCanvas.height = 256;
    const fc = flagCanvas.getContext("2d");
    fc.fillStyle = side.flagBg || "#f4f1e6";
    fc.fillRect(0, 0, 64, 256);
    fc.fillStyle = side.flagStripe || "#b03a3a";
    fc.fillRect(0, 0, 64, 26);
    fc.font = '800 42px "Shippori Mincho B1",serif';
    fc.textAlign = "center";
    fc.fillStyle = side.flagText || "#222";
    unit.name.slice(0, 3).split("").forEach((char, i) => fc.fillText(char, 32, 80 + i * 58));
    const flagTex = new THREE.CanvasTexture(flagCanvas);
    const flagMat = new THREE.MeshBasicMaterial({ map: flagTex, side: THREE.DoubleSide, transparent: true });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 20), flagMat);
    flag.position.set(3, 15, 0);
    group.add(flag);

    const label = makeTextSprite(unit.name, { fs: 46, color: side.labelColor || "#fff", stroke: 7 });
    label.position.y = 31;
    group.add(label);

    scene.add(group);
    unitObjs[unit.id] = {
      unit,
      group,
      inst,
      mat,
      poleMat,
      flagMat,
      label,
      offsets,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      facing: new THREE.Vector3(unit.initialFacing?.[0] || -1, 0, unit.initialFacing?.[1] || 0),
      alpha: 1
    };
  });

  function makeSoftTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,255,255,.9)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }

  const softTex = makeSoftTexture();
  const fogPlanes = [];
  for (let i = 0; i < (cfg.weather?.fogCount || 8); i++) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(cfg.weather?.fogSize || 230, cfg.weather?.fogSize || 230),
      new THREE.MeshBasicMaterial({ map: softTex, transparent: true, opacity: 0, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((Math.random() - 0.5) * 340, 7 + Math.random() * 9, (Math.random() - 0.5) * 340);
    mesh.renderOrder = 3;
    mesh.userData = { vx: (Math.random() - 0.5) * 1.2, vz: (Math.random() - 0.5) * 1.2, base: 0.28 + Math.random() * 0.34 };
    scene.add(mesh);
    fogPlanes.push(mesh);
  }

  let rain = null;
  if (cfg.weather?.rain) {
    const drops = cfg.weather.rain.drops || 220;
    const vertices = [];
    for (let i = 0; i < drops; i++) {
      const x = (Math.random() - 0.5) * 460;
      const z = (Math.random() - 0.5) * 460;
      const y = 70 + Math.random() * 90;
      vertices.push(x, y, z, x + 2, y - 18, z + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    const mat = new THREE.LineBasicMaterial({ color: cfg.weather.rain.color || 0xcfe0ef, transparent: true, opacity: 0 });
    rain = new THREE.LineSegments(geo, mat);
    scene.add(rain);
  }

  const arrowObjs = [];
  (cfg.arrows || []).forEach(item => {
    const from = new THREE.Vector3(item.from[0], terrainH(item.from[0], item.from[1]) + 8, item.from[1]);
    const to = new THREE.Vector3(item.to[0], terrainH(item.to[0], item.to[1]) + 8, item.to[1]);
    const dir = to.clone().sub(from);
    const len = dir.length();
    const arrow = new THREE.ArrowHelper(dir.normalize(), from, len, item.color || 0xffd35c, item.head || 18, item.width || 10);
    arrow.line.material.transparent = true;
    arrow.line.material.opacity = 0;
    arrow.cone.material.transparent = true;
    arrow.cone.material.opacity = 0;
    scene.add(arrow);
    arrowObjs.push({ item, arrow });
  });

  const cam = {
    mode: "auto",
    unit: null,
    az: cfg.camera.az || -2.35,
    polar: cfg.camera.polar || 1.02,
    radius: cfg.camera.radius || 430,
    center: new THREE.Vector3(cfg.camera.center[0], cfg.camera.center[1], cfg.camera.center[2]),
    pos: new THREE.Vector3(),
    tgt: new THREE.Vector3(cfg.camera.center[0], cfg.camera.center[1], cfg.camera.center[2]),
    init: false
  };

  function orbitPos(center, az, polar, radius) {
    return new THREE.Vector3(
      center.x + radius * Math.sin(polar) * Math.cos(az),
      center.y + radius * Math.cos(polar),
      center.z + radius * Math.sin(polar) * Math.sin(az)
    );
  }

  function currentCaption(time) {
    let found = null;
    (cfg.captions || []).forEach(caption => {
      if (time >= caption.t && time < caption.t + (caption.duration || cfg.captionDuration || 0.75)) found = caption;
    });
    return found;
  }

  function desiredCamera(time, dt) {
    if (cam.mode === "free") {
      return { p: orbitPos(cam.center, cam.az, cam.polar, cam.radius), t: cam.center.clone(), k: 6 };
    }
    if (cam.mode === "unit" && unitObjs[cam.unit]) {
      const obj = unitObjs[cam.unit];
      const unitPos = obj.pos.clone();
      const facing = obj.facing.clone().setY(0).normalize();
      const p = unitPos.clone().addScaledVector(facing, -72);
      p.y = Math.max(p.y, terrainH(p.x, p.z)) + 48;
      const t = unitPos.clone().addScaledVector(facing, 68);
      t.y = unitPos.y + 6;
      return { p, t, k: 2.2 };
    }
    cam.az += dt * 0.04;
    const caption = currentCaption(time) || cfg.captions.reduce((prev, item) => time >= item.t ? item : prev, cfg.captions[0]);
    const focus = caption.focus || cfg.camera.focus || [0, 0];
    const target = new THREE.Vector3(focus[0], terrainH(focus[0], focus[1]) + 7, focus[1]);
    cam.center.lerp(target, 1 - Math.exp(-dt * 1.2));
    return { p: orbitPos(cam.center, cam.az, cfg.camera.autoPolar || 0.98, cfg.camera.autoRadius || 260), t: cam.center.clone(), k: 1.6 };
  }

  const pointers = new Map();
  let pinchDist = 0;
  let dragged = false;
  renderer.domElement.addEventListener("pointerdown", event => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    renderer.domElement.setPointerCapture(event.pointerId);
  });
  renderer.domElement.addEventListener("pointermove", event => {
    if (!pointers.has(event.pointerId)) return;
    const prev = pointers.get(event.pointerId);
    const dx = event.clientX - prev.x;
    const dy = event.clientY - prev.y;
    prev.x = event.clientX;
    prev.y = event.clientY;
    if (pointers.size === 1) {
      if (Math.abs(dx) + Math.abs(dy) > 2) dragged = true;
      if (dragged) {
        enterFree();
        cam.az += dx * 0.005;
        cam.polar = clamp(cam.polar - dy * 0.004, 0.18, 1.42);
      }
    } else if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchDist > 0) {
        enterFree();
        cam.radius = clamp(cam.radius * (pinchDist / dist), 70, 800);
      }
      pinchDist = dist;
    }
  });
  window.addEventListener("pointerup", event => {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    dragged = false;
  });
  renderer.domElement.addEventListener("wheel", event => {
    event.preventDefault();
    enterFree();
    cam.radius = clamp(cam.radius * (1 + event.deltaY * 0.0012), 70, 800);
  }, { passive: false });

  function enterFree() {
    if (cam.mode === "free") return;
    cam.center.copy(cam.tgt);
    const d = cam.pos.clone().sub(cam.center);
    cam.radius = clamp(d.length(), 70, 800);
    cam.polar = clamp(Math.acos(clamp(d.y / cam.radius, -1, 1)), 0.18, 1.42);
    cam.az = Math.atan2(d.z, d.x);
    cam.mode = "free";
    setActiveChip("free");
    hideInfo();
  }

  let H = cfg.time.min;
  let playing = true;
  let speedIdx = 0;
  const speeds = cfg.time.speeds || [0.07, 0.14, 0.28];
  const speedLabels = cfg.time.speedLabels || ["x1", "x2", "x4"];
  const track = $("track");
  const fill = $("fillBar");
  const wrap = $("trackWrap");

  function addChip(key, label, sideKey, fn) {
    const button = document.createElement("button");
    button.className = sideKey === "sys" ? "chip sys" : "chip";
    button.dataset.key = key;
    const color = sideKey !== "sys" && cfg.sides[sideKey] ? cfg.sides[sideKey].color : null;
    button.innerHTML = color ? `<span class="dot" style="background:#${Number(color).toString(16).padStart(6, "0")}"></span>${label}` : label;
    button.addEventListener("click", fn);
    $("viewStrip").appendChild(button);
  }

  function setActiveChip(key) {
    document.querySelectorAll(".chip").forEach(item => item.classList.toggle("active", item.dataset.key === key));
  }

  function showInfo(unit) {
    const side = sideOf(unit);
    $("infoName").textContent = unit.name;
    $("infoMeta").textContent = `${side.label}　兵力 ${unit.men}`;
    $("infoNote").textContent = unit.note;
    $("infoCard").classList.add("show");
  }

  function hideInfo() {
    $("infoCard").classList.remove("show");
  }

  addChip("auto", "おまかせ", "sys", () => {
    cam.mode = "auto";
    cam.unit = null;
    setActiveChip("auto");
    hideInfo();
  });
  addChip("free", "俯瞰", "sys", () => {
    cam.mode = "free";
    cam.unit = null;
    cam.center.set(cfg.camera.center[0], cfg.camera.center[1], cfg.camera.center[2]);
    cam.radius = cfg.camera.radius || 430;
    cam.polar = cfg.camera.polar || 1.02;
    setActiveChip("free");
    hideInfo();
  });
  cfg.units.forEach(unit => {
    addChip(unit.id, unit.name, unit.side, () => {
      cam.mode = "unit";
      cam.unit = unit.id;
      setActiveChip(unit.id);
      showInfo(unit);
    });
  });
  setActiveChip("auto");

  cfg.captions.forEach(caption => {
    const tick = document.createElement("div");
    tick.className = "tick";
    tick.style.left = ((caption.t - cfg.time.min) / (cfg.time.max - cfg.time.min) * 100) + "%";
    wrap.appendChild(tick);
  });

  const hourLabels = $("hourLabels");
  for (let h = Math.ceil(cfg.time.min); h <= Math.floor(cfg.time.max); h++) {
    const span = document.createElement("span");
    span.textContent = h + "時";
    hourLabels.appendChild(span);
  }

  track.addEventListener("input", () => {
    H = parseFloat(track.value);
  });
  $("playBtn").addEventListener("click", () => {
    if (!playing && H >= cfg.time.max - 0.01) H = cfg.time.min;
    playing = !playing;
    $("playBtn").textContent = playing ? "▮▮" : "▶";
  });
  $("speedBtn").addEventListener("click", () => {
    speedIdx = (speedIdx + 1) % speeds.length;
    $("speedBtn").textContent = speedLabels[speedIdx];
  });

  function updateClock() {
    const hour = Math.floor(H);
    const minute = Math.floor((H - hour) * 60);
    $("clockTime").textContent = hour + ":" + String(minute).padStart(2, "0");
    let label = cfg.time.wakoku[0]?.[1] || "";
    (cfg.time.wakoku || []).forEach(item => {
      if (H >= item[0]) label = item[1];
    });
    $("clockWakoku").textContent = label;
    track.value = H;
    fill.style.width = ((H - cfg.time.min) / (cfg.time.max - cfg.time.min) * 100) + "%";
  }

  let lastCaption = null;
  function updateCaption() {
    const caption = currentCaption(H);
    const el = $("caption");
    if (!caption) {
      el.classList.remove("show");
      lastCaption = null;
      return;
    }
    if (caption !== lastCaption) {
      $("capTitle").textContent = caption.title;
      $("capBody").textContent = caption.body;
      lastCaption = caption;
    }
    el.classList.add("show");
  }

  setTimeout(() => {
    $("hint").style.opacity = 0;
  }, 9000);

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (playing) {
      H += speeds[speedIdx] * dt;
      if (H >= cfg.time.max) {
        H = cfg.time.max;
        playing = false;
        $("playBtn").textContent = "▶";
      }
    }
    H = clamp(H, cfg.time.min, cfg.time.max);

    const day = smooth(clamp((H - cfg.time.min) / (cfg.sky.dayLength || 3), 0, 1));
    scene.background.copy(toColor(cfg.sky.morning).lerp(toColor(cfg.sky.noon), day));
    scene.fog.color.copy(toColor(cfg.sky.fog).lerp(toColor(cfg.sky.clearFog || cfg.sky.fog), day));
    const fogPeak = cfg.weather?.fogPeak ? cfg.weather.fogPeak(H) : clamp((cfg.time.min + 1.4 - H) / 1.4, 0, 1);
    scene.fog.density = (cfg.sky.fogDensity || 0.002) + smooth(fogPeak) * (cfg.sky.fogBoost || 0.008);
    sun.intensity = 0.75 + day * 0.5;
    sun.position.set(Math.cos(day * 1.2 + 0.2) * 360, 270 + day * 180, -160);

    fogPlanes.forEach(mesh => {
      mesh.material.opacity = smooth(fogPeak) * mesh.userData.base;
      mesh.position.x += mesh.userData.vx * dt;
      mesh.position.z += mesh.userData.vz * dt;
    });

    if (rain) {
      const rainCfg = cfg.weather.rain;
      const rainOn = clamp((H - rainCfg.start) / 0.22, 0, 1) * clamp((rainCfg.end - H) / 0.22, 0, 1);
      rain.material.opacity = rainOn * (rainCfg.opacity || 0.42);
      const pos = rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - dt * 85;
        if (y < 5) y = 120 + Math.random() * 55;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    for (const id in unitObjs) {
      const obj = unitObjs[id];
      const unit = obj.unit;
      const p = unitPosAt(unit, H);
      const pNext = unitPosAt(unit, H + 0.04);
      const y = terrainH(p.x, p.z);
      obj.pos.set(p.x, y, p.z);
      obj.vel.set(pNext.x - p.x, 0, pNext.z - p.z);
      if (obj.vel.lengthSq() > 0.01) obj.facing.lerp(obj.vel.clone().normalize(), 0.15);
      obj.group.position.copy(obj.pos);
      obj.group.rotation.y = Math.atan2(-obj.facing.z, obj.facing.x) + Math.PI / 2;

      let alpha = 1;
      if (unit.fade) alpha = 1 - smooth(clamp((H - unit.fade[0]) / (unit.fade[1] - unit.fade[0]), 0, 1));
      if (unit.appear) alpha *= smooth(clamp((H - unit.appear[0]) / (unit.appear[1] - unit.appear[0]), 0, 1));
      obj.alpha = alpha;
      obj.mat.opacity = alpha;
      obj.poleMat.opacity = alpha;
      obj.flagMat.opacity = alpha;
      obj.label.material.opacity = alpha;
      obj.group.visible = alpha > 0.02;

      const scatter = 1 + (1 - alpha) * 2.2;
      const wobble = performance.now() * 0.002;
      const rotY = obj.group.rotation.y;
      const cr = Math.cos(rotY);
      const sr = Math.sin(rotY);
      for (let i = 0; i < unit.size; i++) {
        const [ox, oz, scale] = obj.offsets[i];
        const lx = ox * scatter;
        const lz = oz * scatter;
        const wx = p.x + lx * cr + lz * sr;
        const wz = p.z - lx * sr + lz * cr;
        const bob = obj.vel.lengthSq() > 0.01 ? Math.sin(wobble * 6 + i) * 0.25 : 0;
        dummy.position.set(lx, terrainH(wx, wz) - y + bob, lz);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        obj.inst.setMatrixAt(i, dummy.matrix);
      }
      obj.inst.instanceMatrix.needsUpdate = true;

      const dist = camera.position.distanceTo(obj.pos);
      const scale = clamp(dist * 0.045, 7, 26);
      obj.label.scale.set(obj.label.userData.aspect * scale, scale, 1);
    }

    arrowObjs.forEach(({ item, arrow }) => {
      let opacity = 0;
      if (H >= item.t0 && H <= item.t1) {
        opacity = Math.min(clamp((H - item.t0) / 0.18, 0, 1), clamp((item.t1 - H) / 0.18, 0, 1));
      }
      arrow.line.material.opacity = opacity * 0.68;
      arrow.cone.material.opacity = opacity * 0.86;
    });

    const des = desiredCamera(H, dt);
    if (!cam.init) {
      cam.pos.copy(des.p);
      cam.tgt.copy(des.t);
      cam.init = true;
    }
    const k = 1 - Math.exp(-dt * des.k);
    cam.pos.lerp(des.p, k);
    cam.tgt.lerp(des.t, k);
    cam.pos.y = Math.max(cam.pos.y, terrainH(cam.pos.x, cam.pos.z) + 8);
    camera.position.copy(cam.pos);
    camera.lookAt(cam.tgt);

    const az = Math.atan2(camera.position.z - cam.tgt.z, camera.position.x - cam.tgt.x);
    $("compassNeedle").style.transform = `rotate(${-az * 180 / Math.PI - 90}deg)`;

    updateClock();
    updateCaption();
    renderer.render(scene, camera);
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  updateClock();
  tick();
  } catch (error) {
    console.error(error);
    const box = document.createElement("pre");
    box.style.cssText = "position:fixed;left:12px;right:12px;bottom:72px;z-index:100;background:#260b0b;color:#ffd8d8;padding:12px;white-space:pre-wrap;font:12px monospace";
    box.textContent = (error && error.stack) || String(error);
    document.body.appendChild(box);
  }
})();

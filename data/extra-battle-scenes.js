(function() {
  "use strict";

  const palette = {
    field: { low: 0x667d4b, field: 0x87965e, mid: 0x526c3d, high: 0x394f34, peak: 0x5c604d, road: 0xc6b784, water: 0x527ca0 },
    island: { low: 0x4e6f73, field: 0x748457, mid: 0x4b683f, high: 0x304b35, peak: 0x59634d, road: 0xbfae7e, water: 0x476f91 },
    winter: { low: 0x7f8373, field: 0x9a9889, mid: 0x606754, high: 0x424d40, peak: 0x6a695f, road: 0xb9aa88, water: 0x566f83 },
    night: { low: 0x3d5142, field: 0x4e5f44, mid: 0x344532, high: 0x2a382e, peak: 0x4e4a3e, road: 0x8b7657, water: 0x31465f },
    city: { low: 0x5e684d, field: 0x77755b, mid: 0x56503e, high: 0x403a30, peak: 0x5d5140, road: 0xb59d70, water: 0x536b85 }
  };

  const side = (label, color, labelColor, flagBg, flagStripe, flagText) => ({
    label,
    color,
    labelColor,
    flagBg,
    flagStripe,
    flagText
  });

  const baseTime = (min, max, wakoku) => ({
    min,
    max,
    step: 0.005,
    speeds: [0.08, 0.16, 0.32],
    speedLabels: ["x1", "x2", "x4"],
    wakoku
  });

  const sky = (morning, noon, fog, opts = {}) => {
    const data = {
      morning,
      noon,
      fog,
      clearFog: opts.clearFog || noon,
      fogDensity: opts.fogDensity ?? 0.00016,
      verifyFogDensity: opts.verifyFogDensity ?? 0.00008,
      fogBoost: opts.fogBoost ?? 0.00018,
      dayLength: opts.dayLength || 3.5
    };
    if (opts.nightMode) data.nightMode = true;
    if (opts.exposure !== undefined) data.exposure = opts.exposure;
    return data;
  };

  const terrain = (opts = {}) => ({
    size: opts.size || 820,
    segments: opts.segments || 154,
    base: opts.base ?? 2,
    roughX: opts.roughX || 0.035,
    roughZ: opts.roughZ || 0.038,
    roughAmp: opts.roughAmp ?? 2.4,
    longAmp: opts.longAmp ?? 2.3,
    colors: opts.colors || palette.field,
    contourColor: opts.contourColor || 0xe2d0a1,
    contourOpacity: opts.contourOpacity ?? 0.2,
    bumps: opts.bumps || [],
    ridges: opts.ridges || [],
    basins: opts.basins || [],
    roads: opts.roads || [],
    rivers: opts.rivers || [],
    barriers: opts.barriers || []
  });

  const weather = (count = 6, scale = 0.12, size = 230) => ({
    fogCount: count,
    fogSize: size,
    fogPeak: time => Math.max(0, Math.min(1, scale * (1.3 - ((time % 4) / 4)))),
    fogOpacityScale: 0.1
  });

  const commonCamera = (center, focus, radius = 470, az = -2.22) => ({
    center: [center[0], 16, center[1]],
    focus,
    az,
    polar: 1.02,
    radius,
    verifyCenter: [center[0], 20, center[1]],
    verifyAz: az + 0.04,
    verifyPolar: 0.82,
    verifyRadius: radius + 110,
    autoPolar: 0.96,
    autoRadius: 270
  });

  function enrichScenes(scenes) {
    const moments = {
      "komaki-nagakute": { at: [104, 66], t0: 11.1, t1: 13.1, radius: 46 },
      itsukushima: { at: [78, -18], t0: 5.6, t1: 7.3, radius: 44 },
      anegawa: { at: [-22, -8], t0: 9.6, t1: 12.1, radius: 54 },
      "kawagoe-night": { at: [30, 14], t0: 2.5, t1: 4.4, radius: 48, fire: true },
      shizugatake: { at: [34, -12], t0: 9.8, t1: 12.7, radius: 52 },
      honnoji: { at: [10, 4], t0: 5.9, t1: 7.2, radius: 34 },
      "tennoji-okayama": { at: [42, 14], t0: 11.7, t1: 14.4, radius: 50 },
      mimikawa: { at: [18, 24], t0: 11.4, t1: 14.1, radius: 50 },
      hitotoribashi: { at: [-12, 4], t0: 11.3, t1: 14.2, radius: 48 },
      "gassan-toda": { at: [0, 4], t0: 11.6, t1: 15.8, radius: 42 },
      "osaka-summer": { at: [-24, -2], t0: 10.6, t1: 13.4, radius: 58 },
      "osaka-winter": { at: [-116, -82], t0: 12.2, t1: 14.6, radius: 44 }
    };
    Object.entries(scenes).forEach(([slug, scene]) => {
      const moment = moments[slug];
      if (!moment) return;
      scene.effects ||= [];
      if (!scene.effects.some(effect => effect.type === "clash")) {
        scene.effects.push({ type: "clash", t0: moment.t0, t1: moment.t1, at: moment.at, radius: moment.radius, rate: 9 });
      }
      if (moment.fire && !scene.effects.some(effect => effect.type === "fire")) {
        scene.effects.push({ type: "fire", t0: 2.8, t1: 4.8, at: moment.at, radius: 22, rate: 8 });
      }
      const indices = [1, Math.floor(scene.captions.length / 2), scene.captions.length - 1];
      indices.forEach((index, order) => {
        const caption = scene.captions[index];
        if (!caption || caption.shot) return;
        const types = ["push", "crane", "pull"];
        caption.shot = {
          type: types[order],
          radius: order === 0 ? 215 : order === 1 ? 285 : 330,
          polar: order === 1 ? 0.76 : order === 0 ? 0.86 : 0.92,
          duration: 0.5 + order * 0.06,
          shake: order === 0 ? 0.26 : order === 1 ? 0.16 : 0.1
        };
      });
    });
    return scenes;
  }

  window.EXTRA_BATTLE_SCENES = enrichScenes({
    "komaki-nagakute": {
      title: "決戦 小牧・長久手",
      eyebrow: "対陣機動",
      dateLabel: "天正十二年 四月九日",
      time: baseTime(7, 16, [[7, "辰の刻"], [9, "巳の刻"], [12, "午の刻"], [14, "未の刻"], [16, "申の刻"]]),
      sky: sky(0xb9c3bd, 0x9db9c4, 0xd4dbd0),
      camera: commonCamera([0, 0], [40, 26], 460),
      terrain: terrain({
        bumps: [{ x: -190, z: -74, r: 150, amp: 36 }, { x: -170, z: 88, r: 128, amp: 20 }, { x: 142, z: -88, r: 170, amp: 28 }, { x: 124, z: 92, r: 140, amp: 22 }],
        ridges: [{ id: "komaki", x: -184, z: -70, rx: 132, rz: 76, rot: 0.12, amp: 34 }, { id: "nagakute", x: 116, z: 82, rx: 168, rz: 78, rot: -0.08, amp: 22 }],
        basins: [{ x: 10, z: 10, rx: 230, rz: 112, amp: 8 }],
        roads: [
          { width: 7, points: [[-250, -40], [-120, -18], [24, 4], [154, 42], [260, 80]] },
          { width: 6, points: [[-230, 96], [-80, 78], [44, 66], [174, 98]] },
          { width: 5, points: [[30, -180], [34, -70], [64, 18], [128, 96]] }
        ],
        rivers: [{ width: 8, points: [[-280, 150], [-112, 128], [18, 122], [188, 140]] }]
      }),
      sides: {
        hashba: side("羽柴軍", 0x82add9, "#d4e7ff", "#f3efe3", "#82add9", "#1e2730"),
        tokugawa: side("徳川・織田軍", 0xd9a441, "#ffd98a", "#171717", "#d9a441", "#efe0bb"),
        neutral: side("地形", 0xb9c4cf, "#e8eef2", "#65717a", "#b9c4cf", "#111")
      },
      places: [
        { name: "小牧山", x: -186, z: -74, scale: 9 },
        { name: "長久手", x: 126, z: 82, scale: 9 },
        { name: "岩崎城", x: 42, z: -132, scale: 8, opacity: 0.76 },
        { name: "大草", x: -58, z: 78, scale: 8 }
      ],
      units: [
        { id: "ieyasu", name: "徳川家康", side: "tokugawa", men: "約16,000", note: "小牧山方面に主力を置き、羽柴本隊を牽制する。", path: [[7, -174, -54], [16, -172, -54]], size: 58, initialFacing: [1, 0] },
        { id: "nobukatsu", name: "織田信雄", side: "tokugawa", men: "約12,000", note: "徳川方と連携し、中央道を抑える。", path: [[7, -178, 48], [16, -168, 44]], size: 48, initialFacing: [1, 0] },
        { id: "sakakibara", name: "榊原康政", side: "tokugawa", men: "約3,000", note: "長久手方面へ出て、池田・森隊を迎撃する。", path: [[7, -128, 24], [9.8, -40, 36], [11.2, 46, 54], [13, 112, 72], [16, 120, 70]], size: 32, initialFacing: [1, 0.2] },
        { id: "hideyoshi", name: "羽柴秀吉", side: "hashba", men: "約60,000", note: "犬山・楽田方面の大軍。主力は対陣を続ける。", path: [[7, 178, -76], [16, 168, -70]], size: 78, initialFacing: [-1, 0.1] },
        { id: "ikeda", name: "池田恒興", side: "hashba", men: "約6,000", note: "別働隊として三河方面を狙うが、長久手で捕捉される。", path: [[7, 72, -150], [9.4, 26, -110], [10.8, 70, 12], [12.2, 122, 70], [14.2, 150, 92], [16, 188, 112]], fade: [13.2, 16], size: 42, initialFacing: [-0.2, 1] },
        { id: "mori", name: "森長可", side: "hashba", men: "約3,000", note: "池田隊に近い別働隊。迎撃を受け、長久手方面で崩れる。", path: [[7, 92, -128], [9.6, 50, -76], [11.2, 92, 30], [12.6, 134, 74], [16, 196, 124]], fade: [12.6, 16], size: 34, initialFacing: [-0.2, 1] }
      ],
      arrows: [
        { t0: 8.2, t1: 11.2, from: [78, -144], to: [120, 72], color: 0x9fc5f0, head: 18, width: 10 },
        { t0: 9.8, t1: 12.8, from: [-128, 24], to: [118, 70], color: 0xffd35c, head: 19, width: 11 },
        { t0: 12.5, t1: 15.2, from: [132, 78], to: [194, 118], color: 0x9fc5f0, head: 16, width: 9 }
      ],
      timelineEvents: [
        { t: 7, label: "対陣", type: "phase" },
        { t: 9.4, label: "迂回", type: "charge" },
        { t: 11.2, label: "開戦", type: "clash" },
        { t: 12.4, label: "突撃", type: "charge" },
        { t: 14.2, label: "敗走", type: "rout" }
      ],
      captions: [
        { t: 7, title: "小牧山で対陣", body: "徳川家康は小牧山方面に主力を固定し、秀吉本隊を引きつける。", focus: [-160, -40], duration: 0.9 },
        { t: 9.2, title: "別働隊が南下", body: "池田恒興・森長可隊が三河方面へ迂回し、長久手方面へ伸びる。", focus: [58, -92], duration: 0.9 },
        { t: 11.2, title: "長久手で捕捉", body: "徳川方の迎撃隊が別働隊を捉え、主戦場は長久手へ移る。", focus: [78, 54], duration: 0.9 },
        { t: 12.4, title: "突撃", body: "榊原隊が圧力を強め、池田・森隊は持ちこたえられなくなる。", focus: [118, 72], duration: 0.9 },
        { t: 14.2, title: "敗走", body: "別働隊は崩れ、秀吉本隊との連携は果たせないまま退く。", focus: [166, 104], duration: 0.9 }
      ],
      weather: weather(5, 0.1),
      captionDuration: 0.86
    },

    "itsukushima": {
      title: "決戦 厳島",
      eyebrow: "海霧奇襲",
      dateLabel: "弘治元年 十月一日",
      time: baseTime(2, 8, [[2, "丑の刻"], [4, "寅の刻"], [6, "卯の刻"], [8, "辰の刻"]]),
      sky: sky(0x53606b, 0x9baeb2, 0xaab6b0, { fogDensity: 0.0003, fogBoost: 0.0005, dayLength: 4.2 }),
      camera: commonCamera([-12, 14], [0, 8], 440, -2.55),
      terrain: terrain({
        colors: palette.island,
        bumps: [{ x: -154, z: -20, r: 170, amp: 54 }, { x: -62, z: 108, r: 120, amp: 34 }, { x: 120, z: -54, r: 150, amp: 20 }],
        ridges: [{ id: "misen", x: -154, z: -20, rx: 176, rz: 102, rot: -0.12, amp: 54 }, { id: "camp", x: 126, z: -48, rx: 150, rz: 72, rot: 0.18, amp: 18 }],
        basins: [{ x: 20, z: 20, rx: 250, rz: 110, amp: 10 }],
        roads: [{ width: 5, points: [[-184, 76], [-86, 42], [16, 16], [128, -26], [220, -50]] }],
        rivers: [
          { width: 22, points: [[-286, 150], [-160, 128], [0, 142], [170, 160], [280, 150]] },
          { width: 18, points: [[-260, -150], [-120, -138], [20, -130], [150, -148], [270, -130]] }
        ]
      }),
      sides: {
        mori: side("毛利軍", 0xd9a441, "#ffd98a", "#171717", "#d9a441", "#efe0bb"),
        sue: side("陶軍", 0x7fb1d5, "#d4e7ff", "#f3efe3", "#7fb1d5", "#1f2933"),
        neutral: side("海上", 0xb9c4cf, "#e8eef2", "#65717a", "#b9c4cf", "#111")
      },
      places: [
        { name: "宮尾城", x: -36, z: 26, scale: 8 },
        { name: "塔岡", x: 126, z: -36, scale: 8 },
        { name: "包ヶ浦", x: -184, z: 104, scale: 8, opacity: 0.78 },
        { name: "厳島海峡", x: -18, z: 152, scale: 8, opacity: 0.72 }
      ],
      units: [
        { id: "motonari", name: "毛利元就", side: "mori", men: "約4,000", note: "夜陰と海上機動で島へ渡り、陶軍の背後を突く。", path: [[2, -236, 126], [3.6, -154, 84], [4.8, -72, 38], [6.2, 18, 2], [8, 48, -8]], appear: [2.2, 3.6], size: 38, initialFacing: [1, -0.4] },
        { id: "kobayakawa", name: "小早川隊", side: "mori", men: "約1,500", note: "別方向から上陸して包囲を狭める。", path: [[2, -246, 32], [3.8, -150, 18], [5.1, -48, 10], [6.4, 42, -32], [8, 70, -42]], appear: [2.4, 3.8], size: 28, initialFacing: [1, -0.1] },
        { id: "murakami", name: "村上水軍", side: "mori", men: "約800", note: "海上から退路を圧迫し、陶軍を島内へ閉じ込める。", path: [[2, -242, 158], [4.5, -110, 142], [6.4, 46, 136], [8, 104, 124]], appear: [2.1, 3.8], size: 24, initialFacing: [1, 0] },
        { id: "harukata", name: "陶晴賢", side: "sue", men: "約20,000", note: "宮尾城を攻める大軍。背後を突かれて混乱する。", path: [[2, 142, -36], [5.4, 124, -30], [6.4, 84, -16], [8, 132, -94]], fade: [6.4, 8], size: 66, initialFacing: [-1, 0] },
        { id: "sue_camp", name: "陶軍本営", side: "sue", men: "約5,000", note: "塔岡周辺の本営。毛利軍の奇襲で退路を失う。", path: [[2, 104, 50], [5.2, 100, 42], [6.6, 48, 24], [8, 92, 100]], fade: [6.5, 8], size: 42, initialFacing: [-1, -0.2] }
      ],
      arrows: [
        { t0: 2.8, t1: 5.4, from: [-230, 126], to: [16, 2], color: 0xffd35c, head: 20, width: 12 },
        { t0: 4.6, t1: 6.8, from: [-52, 8], to: [110, -34], color: 0xffd35c, head: 18, width: 10 },
        { t0: 6.1, t1: 8, from: [110, -24], to: [142, -100], color: 0x9fc5f0, head: 17, width: 10 }
      ],
      timelineEvents: [
        { t: 2, label: "渡海", type: "phase" },
        { t: 4.8, label: "奇襲", type: "charge" },
        { t: 5.8, label: "開戦", type: "clash" },
        { t: 6.8, label: "包囲", type: "phase" },
        { t: 7.4, label: "敗走", type: "rout" }
      ],
      captions: [
        { t: 2.2, title: "渡海", body: "毛利軍は海霧に紛れて厳島へ渡り、複数方向から上陸する。", focus: [-170, 92], duration: 0.9 },
        { t: 4.8, title: "奇襲", body: "背後に現れた毛利勢が陶軍本営へ迫り、宮尾城攻めは崩れ始める。", focus: [28, 0], duration: 0.9 },
        { t: 5.8, title: "開戦", body: "島内の狭い地形で陶軍は兵力を活かせず、戦列が乱れる。", focus: [92, -26], duration: 0.9 },
        { t: 6.8, title: "包囲", body: "水軍が海上退路を押さえ、陶軍は逃げ場を失う。", focus: [86, 84], duration: 0.9 },
        { t: 7.4, title: "敗走", body: "陶軍は島内で総崩れとなり、勝敗は一気に決する。", focus: [126, -88], duration: 0.9 }
      ],
      weather: {
        fogCount: 10,
        fogSize: 250,
        fogPeak: time => Math.max(0, Math.min(1, (5.2 - time) / 3.2)),
        fogOpacityScale: 0.32
      },
      captionDuration: 0.88
    },

    "anegawa": {
      title: "決戦 姉川",
      eyebrow: "四軍渡河",
      dateLabel: "元亀元年 六月二十八日",
      time: baseTime(6, 13, [[6, "卯の刻"], [8, "辰の刻"], [10, "巳の刻"], [12, "午の刻"]]),
      sky: sky(0xb9c8c0, 0x9fc2cb, 0xd6ded4),
      camera: commonCamera([0, 2], [0, 0], 455),
      terrain: terrain({
        bumps: [{ x: -150, z: 132, r: 140, amp: 18 }, { x: 96, z: 132, r: 140, amp: 16 }, { x: -130, z: -130, r: 140, amp: 18 }, { x: 112, z: -134, r: 140, amp: 18 }],
        ridges: [
          { id: "oda_tokugawa_rear", x: -74, z: 136, rx: 230, rz: 78, amp: 18 },
          { id: "azai_asakura_rear", x: 0, z: -136, rx: 250, rz: 80, amp: 20 }
        ],
        basins: [{ x: 0, z: 8, rx: 280, rz: 70, amp: 9 }],
        roads: [
          { width: 7, points: [[-260, 104], [-130, 92], [-20, 74], [108, 86], [250, 104]] },
          { width: 7, points: [[-254, -112], [-130, -96], [-22, -82], [108, -94], [254, -116]] },
          { width: 5, points: [[-180, 140], [-80, 62], [-10, 8], [64, -60], [156, -142]] }
        ],
        rivers: [{ width: 16, points: [[-300, 4], [-160, 0], [-40, 12], [80, 4], [300, 20]] }]
      }),
      sides: {
        oda: side("織田軍", 0xd9a441, "#ffd98a", "#171717", "#d9a441", "#efe0bb"),
        tokugawa: side("徳川軍", 0xe2bf5e, "#ffe4a1", "#202018", "#e2bf5e", "#f6e6ba"),
        azai: side("浅井軍", 0x82add9, "#d4e7ff", "#f3efe3", "#82add9", "#1e2730"),
        asakura: side("朝倉軍", 0x7cc2b2, "#d8fff5", "#e9efe8", "#5fae9e", "#1a302f"),
        neutral: side("地形", 0xb9c4cf, "#e8eef2", "#65717a", "#b9c4cf", "#111")
      },
      places: [
        { name: "姉川", x: -24, z: 8, scale: 9 },
        { name: "野村", x: -126, z: -94, scale: 8 },
        { name: "三田村", x: 104, z: -96, scale: 8 },
        { name: "織田徳川陣", x: -40, z: 116, scale: 8, opacity: 0.72 },
        { name: "小谷方面", x: 196, z: -142, scale: 8, opacity: 0.72 }
      ],
      units: [
        { id: "nobunaga", name: "織田信長", side: "oda", men: "約23,000", note: "南岸から姉川へ前進し、浅井軍と野村方面で衝突する。", path: [[6, -154, 112], [8.4, -120, 72], [10.2, -82, 20], [11.7, -72, -36], [13, -52, -58]], size: 66, initialFacing: [0, -1] },
        { id: "ieyasu", name: "徳川家康", side: "tokugawa", men: "約5,000", note: "南岸東寄りから渡河し、三田村方面で朝倉軍を押し返す。", path: [[6, 76, 112], [8.6, 54, 72], [10.4, 48, 22], [11.8, 62, -34], [13, 84, -58]], size: 40, initialFacing: [0, -1] },
        { id: "azai", name: "浅井長政", side: "azai", men: "約8,000", note: "北岸の野村方面で織田軍と向かい合い、後半に北へ退く。", path: [[6, -132, -126], [8.2, -106, -82], [10.4, -84, -24], [12, -112, -80], [13, -174, -150]], fade: [12, 13], size: 48, initialFacing: [0, 1] },
        { id: "asakura", name: "朝倉景健", side: "asakura", men: "約11,000", note: "北岸東寄りで徳川軍を受けるが、押し返されて北東へ下がる。", path: [[6, 126, -124], [8.6, 98, -84], [10.2, 70, -28], [12.2, 104, -80], [13, 172, -148]], fade: [12.2, 13], size: 54, initialFacing: [0, 1] },
        { id: "oda_reserve", name: "織田予備隊", side: "oda", men: "約3,000", note: "南岸中央から川筋へ進み、織田正面を支える。", path: [[6, -30, 108], [9.4, -28, 62], [11, -22, 14], [13, -14, -42]], size: 32, initialFacing: [0, -1] }
      ],
      arrows: [
        { t0: 7.8, t1: 10.6, from: [-154, 112], to: [-76, -32], color: 0xffd35c, head: 20, width: 12 },
        { t0: 8, t1: 10.8, from: [76, 112], to: [64, -34], color: 0xffd35c, head: 18, width: 10 },
        { t0: 11.2, t1: 13, from: [-90, -42], to: [-174, -150], color: 0x9fc5f0, head: 18, width: 10 },
        { t0: 11.2, t1: 13, from: [76, -42], to: [172, -148], color: 0x8fd9c9, head: 18, width: 10 }
      ],
      timelineEvents: [
        { t: 6, label: "布陣", type: "phase" },
        { t: 8.6, label: "渡河", type: "charge" },
        { t: 10.1, label: "開戦", type: "clash" },
        { t: 11.7, label: "押返し", type: "charge" },
        { t: 12.4, label: "敗走", type: "rout" }
      ],
      captions: [
        { t: 6.2, title: "姉川を挟んで対峙", body: "織田・徳川軍は南岸、浅井・朝倉軍は北岸に置かれ、川筋を挟んで向かい合う。", focus: [0, 4], duration: 0.9 },
        { t: 8.6, title: "渡河", body: "織田軍は野村方面、徳川軍は三田村方面へ、姉川を越えて前進する。", focus: [-16, 16], duration: 0.9 },
        { t: 10.1, title: "開戦", body: "北岸寄りで織田と浅井、徳川と朝倉がそれぞれ正面衝突する。", focus: [4, -18], duration: 0.9 },
        { t: 11.7, title: "押返し", body: "徳川軍と織田予備隊の圧力で、浅井・朝倉軍の線が北へ押し戻される。", focus: [34, -44], duration: 0.9 },
        { t: 12.4, title: "敗走", body: "浅井・朝倉軍は小谷方面へ退き、織田・徳川軍が川筋を越えて戦場を保持する。", focus: [82, -98], duration: 0.9 }
      ],
      weather: weather(5, 0.08),
      captionDuration: 0.86
    },

    "kawagoe-night": {
      title: "決戦 河越夜戦",
      eyebrow: "夜襲突破",
      dateLabel: "天文十五年 四月二十日",
      time: baseTime(0, 5.5, [[0, "子の刻"], [2, "丑の刻"], [4, "寅の刻"], [5, "卯の刻"]]),
      sky: sky(0x252a32, 0x667480, 0x3d4244, { fogDensity: 0.00025, fogBoost: 0.00035, dayLength: 5.5, nightMode: true, exposure: 0.92 }),
      camera: commonCamera([0, 8], [24, 16], 430, -2.42),
      terrain: terrain({
        colors: palette.night,
        bumps: [{ x: -120, z: 20, r: 130, amp: 26 }, { x: 112, z: 38, r: 190, amp: 12 }, { x: 180, z: -100, r: 140, amp: 12 }],
        ridges: [{ id: "castle", x: -122, z: 20, rx: 112, rz: 82, amp: 28 }],
        basins: [{ x: -96, z: 20, rx: 160, rz: 98, amp: 8 }],
        roads: [
          { width: 6, points: [[-220, 16], [-120, 18], [20, 20], [146, 42], [250, 58]] },
          { width: 5, points: [[-152, -108], [-86, -48], [22, 16], [120, -22], [230, -80]] }
        ],
        rivers: [{ width: 12, points: [[-178, -160], [-162, -80], [-154, 14], [-164, 106], [-178, 174]] }],
        barriers: [
          { width: 3.2, color: 0x6a4520, opacity: 0.82, points: [[-152, -18], [-120, -42], [-82, -18], [-76, 38], [-118, 62], [-154, 38], [-152, -18]] }
        ]
      }),
      sides: {
        hojo: side("北条軍", 0xd9a441, "#ffd98a", "#171717", "#d9a441", "#efe0bb"),
        coalition: side("連合軍", 0x8fb4da, "#d4e7ff", "#f3efe3", "#8fb4da", "#1e2730"),
        neutral: side("城", 0xb9c4cf, "#e8eef2", "#65717a", "#b9c4cf", "#111")
      },
      places: [
        { name: "河越城", x: -120, z: 20, scale: 9 },
        { name: "連合軍陣", x: 126, z: 42, scale: 8 },
        { name: "入間川筋", x: -174, z: -86, scale: 8, opacity: 0.72 }
      ],
      units: [
        { id: "ujiyasu", name: "北条氏康", side: "hojo", men: "約8,000", note: "夜陰に紛れて包囲陣へ突入し、敵陣の混乱を拡大させる。", path: [[0, -214, -78], [1.6, -134, -34], [2.7, -26, 8], [4.2, 106, -34], [5.5, 152, -70]], size: 44, initialFacing: [1, 0.1] },
        { id: "garrison", name: "河越守備隊", side: "hojo", men: "約3,000", note: "城内から呼応して出撃し、包囲陣の背を突く。", path: [[0, -118, 20], [2.2, -88, 28], [3.2, 2, 46], [5.5, 86, 62]], size: 32, initialFacing: [1, 0.2] },
        { id: "norimasa", name: "上杉憲政", side: "coalition", men: "約40,000", note: "河越城包囲の主力。夜襲で陣が分断される。", path: [[0, 120, 42], [2.8, 106, 42], [3.8, 82, 64], [5.5, 176, 112]], fade: [3.9, 5.5], size: 74, initialFacing: [-1, 0] },
        { id: "haruuji", name: "足利晴氏", side: "coalition", men: "約20,000", note: "南側の包囲陣。夜襲の連鎖で後退する。", path: [[0, 148, -86], [2.8, 118, -70], [4.1, 92, -48], [5.5, 190, -126]], fade: [4.0, 5.5], size: 58, initialFacing: [-1, 0.2] },
        { id: "tomosada", name: "上杉朝定", side: "coalition", men: "約15,000", note: "北寄りの陣。急襲を受けて統制を失う。", path: [[0, 84, 112], [2.5, 72, 92], [3.8, 44, 70], [5.5, 132, 148]], fade: [3.6, 5.5], size: 50, initialFacing: [-1, -0.2] }
      ],
      arrows: [
        { t0: 1.1, t1: 3.6, from: [-212, -76], to: [104, -34], color: 0xffd35c, head: 20, width: 12 },
        { t0: 2.2, t1: 4.2, from: [-110, 24], to: [88, 58], color: 0xffd35c, head: 18, width: 10 },
        { t0: 4.0, t1: 5.5, from: [88, 64], to: [180, 112], color: 0x9fc5f0, head: 17, width: 9 }
      ],
      timelineEvents: [
        { t: 0, label: "包囲", type: "phase" },
        { t: 1.8, label: "夜襲", type: "charge" },
        { t: 2.8, label: "開戦", type: "clash" },
        { t: 4, label: "混乱", type: "phase" },
        { t: 5, label: "敗走", type: "rout" }
      ],
      captions: [
        { t: 0.4, title: "包囲", body: "連合軍は河越城を囲むが、夜の陣は広く伸び切っている。", focus: [70, 32], duration: 0.8 },
        { t: 1.8, title: "夜襲", body: "北条氏康隊が暗闇から包囲陣へ突入し、連合軍の陣を裂く。", focus: [-20, -8], duration: 0.8 },
        { t: 2.8, title: "開戦", body: "河越城守備隊も呼応し、包囲陣は前後から圧迫される。", focus: [28, 44], duration: 0.8 },
        { t: 4, title: "混乱", body: "大軍は夜戦で統制を失い、陣内の混乱が広がる。", focus: [90, 58], duration: 0.8 },
        { t: 5, title: "敗走", body: "連合軍は包囲を維持できず、河越城周辺から退く。", focus: [160, 116], duration: 0.8 }
      ],
      weather: {
        fogCount: 8,
        fogSize: 230,
        fogPeak: time => Math.max(0, Math.min(1, (4.5 - time) / 4.5)) * 0.6,
        fogOpacityScale: 0.25
      },
      captionDuration: 0.82
    },

    "shizugatake": {
      title: "決戦 賤ヶ岳",
      eyebrow: "山道追撃",
      dateLabel: "天正十一年 四月二十一日",
      time: baseTime(5, 15, [[5, "卯の刻"], [7, "辰の刻"], [10, "巳の刻"], [12, "午の刻"], [14, "未の刻"]]),
      sky: sky(0xaec0bd, 0x9cbccb, 0xd3dbd3),
      camera: commonCamera([0, 8], [12, -8], 480, -2.35),
      terrain: terrain({
        bumps: [{ x: -174, z: 88, r: 160, amp: 30 }, { x: 0, z: -24, r: 140, amp: 48 }, { x: 174, z: -60, r: 160, amp: 34 }, { x: 96, z: 124, r: 118, amp: 20 }],
        ridges: [
          { id: "shizugatake", x: -28, z: -22, rx: 190, rz: 74, rot: -0.28, amp: 50 },
          { id: "north", x: 176, z: -62, rx: 162, rz: 82, rot: 0.12, amp: 34 },
          { id: "yogo", x: -180, z: 86, rx: 152, rz: 82, rot: 0.08, amp: 30 }
        ],
        basins: [{ x: -114, z: 144, rx: 180, rz: 80, amp: 10 }],
        roads: [
          { width: 6, points: [[-262, 102], [-154, 72], [-44, 28], [58, -14], [184, -46], [262, -62]] },
          { width: 5, points: [[-128, -136], [-42, -70], [34, -18], [122, 54], [220, 110]] }
        ],
        rivers: [{ width: 14, points: [[-260, 164], [-150, 150], [-44, 158], [70, 176], [220, 160]] }]
      }),
      sides: {
        hashba: side("羽柴軍", 0xd9a441, "#ffd98a", "#171717", "#d9a441", "#efe0bb"),
        shibata: side("柴田軍", 0x82add9, "#d4e7ff", "#f3efe3", "#82add9", "#1e2730"),
        neutral: side("山地", 0xb9c4cf, "#e8eef2", "#65717a", "#b9c4cf", "#111")
      },
      places: [
        { name: "賤ヶ岳", x: -18, z: -20, scale: 9 },
        { name: "余呉湖", x: -144, z: 154, scale: 8, opacity: 0.72 },
        { name: "北国街道", x: 82, z: -28, scale: 8 }
      ],
      units: [
        { id: "hideyoshi", name: "羽柴秀吉", side: "hashba", men: "約20,000", note: "大垣方面から急行し、賤ヶ岳正面へ圧力をかける。", path: [[5, -240, 104], [7.4, -140, 70], [9.6, -32, 30], [12, 48, -8], [15, 92, -24]], size: 62, initialFacing: [1, -0.2] },
        { id: "seven", name: "賤ヶ岳七本槍", side: "hashba", men: "約3,000", note: "前線の突破役として山道を押し上げる。", path: [[5, -164, 58], [8, -76, 34], [10.4, 12, 2], [12.2, 80, -24], [15, 128, -38]], size: 34, initialFacing: [1, -0.2] },
        { id: "niwa", name: "丹羽長秀", side: "hashba", men: "約6,000", note: "前線を支え、秀吉主力の到着まで持ちこたえる。", path: [[5, -72, 74], [9, -42, 42], [13, 10, 24], [15, 32, 18]], size: 38, initialFacing: [1, -0.1] },
        { id: "sakuma", name: "佐久間盛政", side: "shibata", men: "約8,000", note: "突出して前線を押すが、秀吉急行後に孤立する。", path: [[5, 114, 82], [7.6, 42, 40], [10, -6, 14], [12.4, 74, -18], [15, 190, -72]], fade: [12.4, 15], size: 46, initialFacing: [-1, -0.2] },
        { id: "katsuie", name: "柴田勝家", side: "shibata", men: "約15,000", note: "北側の主力。前線崩壊後、北国方面へ退く。", path: [[5, 190, -74], [10, 146, -58], [12.6, 112, -52], [15, 238, -116]], fade: [13, 15], size: 58, initialFacing: [-1, 0.1] },
        { id: "maeda", name: "前田利家", side: "shibata", men: "約3,000", note: "戦線から離脱し、柴田軍の連携に穴を開ける。", path: [[5, 154, -8], [9, 128, 6], [11.5, 118, 36], [15, 210, 106]], fade: [11.2, 14.2], size: 34, initialFacing: [-1, 0.2] }
      ],
      arrows: [
        { t0: 6.6, t1: 10.4, from: [-232, 98], to: [46, 0], color: 0xffd35c, head: 20, width: 12 },
        { t0: 7.4, t1: 10.4, from: [110, 76], to: [-4, 16], color: 0x9fc5f0, head: 18, width: 10 },
        { t0: 12.2, t1: 15, from: [74, -18], to: [198, -78], color: 0x9fc5f0, head: 17, width: 10 }
      ],
      timelineEvents: [
        { t: 5, label: "前線", type: "phase" },
        { t: 7.4, label: "急行", type: "charge" },
        { t: 10.2, label: "開戦", type: "clash" },
        { t: 12.2, label: "突撃", type: "charge" },
        { t: 13.2, label: "敗走", type: "rout" }
      ],
      captions: [
        { t: 5.4, title: "山道で対峙", body: "賤ヶ岳周辺の山道に、羽柴方と柴田方の前線が向かい合う。", focus: [0, 12], duration: 0.9 },
        { t: 7.4, title: "急行", body: "秀吉主力が急いで前線へ入り、佐久間隊の突出を捕捉する。", focus: [-80, 46], duration: 0.9 },
        { t: 10.2, title: "開戦", body: "山道の狭い接点で激突。柴田方の突出部は支援を受けにくい。", focus: [10, 10], duration: 0.9 },
        { t: 12.2, title: "突撃", body: "羽柴前衛が押し上げ、佐久間隊は北東へ崩れ始める。", focus: [76, -22], duration: 0.9 },
        { t: 13.2, title: "敗走", body: "柴田軍は戦線を維持できず、北国街道方面へ後退する。", focus: [166, -70], duration: 0.9 }
      ],
      weather: weather(5, 0.08),
      captionDuration: 0.86
    },

    "honnoji": {
      title: "本能寺の変",
      eyebrow: "寺院包囲",
      dateLabel: "天正十年 六月二日",
      time: baseTime(4, 8, [[4, "寅の刻"], [5, "卯の刻"], [6, "卯の刻"], [7, "辰の刻"], [8, "辰の刻"]]),
      sky: sky(0x32333a, 0x777e84, 0x5c5f61, { fogDensity: 0.00022, fogBoost: 0.00028, dayLength: 4 }),
      camera: commonCamera([0, 4], [0, 0], 390, -2.1),
      terrain: terrain({
        colors: palette.city,
        bumps: [{ x: -12, z: 0, r: 132, amp: 18 }, { x: 120, z: -90, r: 100, amp: 12 }],
        ridges: [{ id: "temple", x: -8, z: 0, rx: 120, rz: 88, amp: 18, contours: false }],
        roads: [
          { width: 8, points: [[-260, -78], [-120, -72], [0, -68], [128, -72], [260, -78]] },
          { width: 8, points: [[-254, 86], [-118, 74], [0, 68], [132, 72], [260, 84]] },
          { width: 6, points: [[-88, -190], [-76, -70], [-66, 56], [-58, 182]] },
          { width: 6, points: [[90, -190], [78, -70], [70, 64], [62, 180]] }
        ],
        barriers: [
          { width: 4, color: 0x5b3422, opacity: 0.85, points: [[-78, -58], [74, -58], [82, 58], [-72, 62], [-78, -58]] }
        ]
      }),
      sides: {
        akechi: side("明智軍", 0x82add9, "#d4e7ff", "#f3efe3", "#82add9", "#1e2730"),
        oda: side("織田方", 0xd9a441, "#ffd98a", "#171717", "#d9a441", "#efe0bb"),
        neutral: side("京洛", 0xb9c4cf, "#e8eef2", "#65717a", "#b9c4cf", "#111")
      },
      places: [
        { name: "本能寺", x: 0, z: 0, scale: 10 },
        { name: "京の町筋", x: -142, z: 84, scale: 8, opacity: 0.72 },
        { name: "明智包囲線", x: 112, z: -86, scale: 8, opacity: 0.76 }
      ],
      units: [
        { id: "mitsuhide", name: "明智光秀", side: "akechi", men: "約13,000", note: "洛中へ入り、本能寺を複数方向から包囲する。", path: [[4, -184, 92], [5, -104, 70], [5.8, -34, 40], [8, -18, 32]], size: 58, initialFacing: [1, -0.3] },
        { id: "saito", name: "斎藤利三", side: "akechi", men: "約4,000", note: "南東側から寺域へ迫り、包囲を閉じる。", path: [[4, 148, -156], [5, 94, -92], [5.7, 52, -40], [8, 36, -26]], size: 36, initialFacing: [-1, 0.8] },
        { id: "akechi_spear", name: "明智先手", side: "akechi", men: "約3,000", note: "寺の門前へ押し込み、防戦の余地を狭める。", path: [[4, 186, 72], [5.2, 102, 52], [6, 66, 26], [8, 42, 20]], size: 34, initialFacing: [-1, -0.2] },
        { id: "nobunaga", name: "織田信長", side: "oda", men: "約100", note: "少数の供回りで寺内に留まり、包囲を受ける。", path: [[4, -6, -2], [6.4, -4, -2], [8, -4, -2]], fade: [6.6, 8], size: 18, forceScale: 0.74, initialFacing: [1, 0] },
        { id: "ranmaru", name: "森蘭丸", side: "oda", men: "約200", note: "寺内で信長を守るが、包囲の圧力に耐えられない。", path: [[4, -24, 12], [6.2, -18, 10], [8, -18, 10]], fade: [6.4, 8], size: 20, forceScale: 0.76, initialFacing: [1, -0.1] }
      ],
      arrows: [
        { t0: 4.8, t1: 6.2, from: [-184, 92], to: [-26, 34], color: 0x9fc5f0, head: 18, width: 10 },
        { t0: 5, t1: 6.3, from: [148, -156], to: [42, -28], color: 0x9fc5f0, head: 18, width: 10 },
        { t0: 6.4, t1: 7.6, from: [44, 18], to: [0, 0], color: 0x9fc5f0, head: 14, width: 8 }
      ],
      effects: [
        { type: "clash", t0: 5.9, t1: 7.2, at: [10, 4], radius: 34, rate: 8 },
        { type: "fire", t0: 6.55, t1: 8, at: [0, 0], radius: 28, rate: 14 }
      ],
      timelineEvents: [
        { t: 4, label: "進入", type: "phase" },
        { t: 5.4, label: "包囲", type: "phase" },
        { t: 6, label: "開戦", type: "clash" },
        { t: 6.8, label: "炎上", type: "rout" },
        { t: 7.4, label: "壊滅", type: "rout" }
      ],
      captions: [
        { t: 4.2, title: "京へ進入", body: "明智軍は未明の京へ入り、本能寺へ向けて兵を集める。", focus: [-86, 60], duration: 0.72 },
        { t: 5.4, title: "包囲", body: "本能寺の四方に明智勢が迫り、寺内の織田方は孤立する。", focus: [0, 0], duration: 0.72, shot: { type: "push", radius: 210, polar: 0.9, duration: 0.42, shake: 0.12 } },
        { t: 6, title: "開戦", body: "門前から攻撃が始まり、少数の織田方が寺内で防戦する。", focus: [22, 8], duration: 0.72, shot: { type: "push", radius: 185, polar: 0.86, duration: 0.38, shake: 0.25 } },
        { t: 6.8, title: "炎上", body: "火の手が上がり、信長の退路は失われる。", focus: [0, 0], duration: 0.72, shot: { type: "crane", radius: 225, polar: 0.72, duration: 0.48, shake: 0.32 } },
        { t: 7.4, title: "壊滅", body: "本能寺は制圧され、京都の情勢は一気に反転する。", focus: [0, 0], duration: 0.72, shot: { type: "pull", radius: 285, polar: 0.92, duration: 0.5, shake: 0.18 } }
      ],
      weather: {
        fogCount: 6,
        fogSize: 210,
        fogPeak: time => Math.max(0, Math.min(1, (7.6 - time) / 3.6)) * 0.36,
        fogOpacityScale: 0.18
      },
      captionDuration: 0.72
    },

    "tennoji-okayama": {
      title: "決戦 天王寺・岡山",
      eyebrow: "真田突撃",
      dateLabel: "慶長二十年 五月七日",
      time: baseTime(10, 15, [[10, "巳の刻"], [12, "午の刻"], [14, "未の刻"], [15, "申の刻"]]),
      sky: sky(0xc4c0ad, 0xd0c1a0, 0xd8d1bd, { fogDensity: 0.00012, fogBoost: 0.00012 }),
      camera: commonCamera([0, 6], [36, 0], 455, -2.18),
      terrain: terrain({
        colors: palette.field,
        bumps: [{ x: -180, z: -120, r: 140, amp: 18 }, { x: 180, z: 42, r: 140, amp: 12 }, { x: -20, z: 152, r: 122, amp: 20 }],
        ridges: [{ id: "okayama", x: 166, z: 44, rx: 120, rz: 62, amp: 14 }, { id: "tennoji", x: -158, z: -104, rx: 150, rz: 72, amp: 18 }],
        roads: [
          { width: 7, points: [[-260, -70], [-160, -46], [-68, -24], [36, -4], [166, 18], [260, 32]] },
          { width: 6, points: [[-210, 88], [-96, 58], [14, 30], [126, 36], [236, 74]] }
        ],
        rivers: [{ width: 10, points: [[-60, 190], [-36, 104], [-20, 20], [6, -92], [28, -190]] }]
      }),
      sides: {
        toyotomi: side("豊臣軍", 0xc94133, "#ffc2b5", "#220c08", "#c94133", "#f6ddc8"),
        tokugawa: side("徳川軍", 0xd9a441, "#ffd98a", "#171717", "#d9a441", "#efe0bb"),
        neutral: side("地形", 0xb9c4cf, "#e8eef2", "#65717a", "#b9c4cf", "#111")
      },
      places: [
        { name: "天王寺口", x: -138, z: -78, scale: 8 },
        { name: "岡山口", x: 152, z: 42, scale: 8 },
        { name: "大坂城方面", x: -62, z: 150, scale: 8, opacity: 0.72 },
        { name: "徳川本陣", x: 134, z: 0, scale: 8 }
      ],
      units: [
        { id: "sanada", name: "真田信繁", side: "toyotomi", men: "約3,500", note: "赤備えで徳川本陣へ突撃し、一時的に本陣を揺さぶる。", path: [[10, -170, -74], [11.4, -92, -48], [12.3, -18, -18], [13.1, 76, 0], [15, 130, 36]], fade: [13.8, 15], size: 38, initialFacing: [1, 0.2] },
        { id: "mori_katsunaga", name: "毛利勝永", side: "toyotomi", men: "約6,000", note: "天王寺方面で前進し、真田隊の突撃を支える。", path: [[10, -196, 20], [11.6, -112, 12], [12.6, -36, 6], [13.6, 56, 12], [15, 94, 62]], fade: [14, 15], size: 44, initialFacing: [1, 0] },
        { id: "toyotomi_center", name: "豊臣中央", side: "toyotomi", men: "約10,000", note: "城外で徳川前線と交戦するが、包囲の圧力を受ける。", path: [[10, -112, 78], [12, -54, 46], [13.2, 0, 36], [15, -40, 104]], fade: [14.2, 15], size: 52, initialFacing: [1, -0.2] },
        { id: "ieyasu", name: "徳川家康", side: "tokugawa", men: "約15,000", note: "本陣が真田隊の突撃を受けて動揺する。", path: [[10, 154, 2], [12.6, 146, 2], [13.2, 112, 18], [14.2, 148, 30], [15, 176, 44]], size: 56, initialFacing: [-1, 0] },
        { id: "hidetada", name: "徳川秀忠", side: "tokugawa", men: "約35,000", note: "後方から包囲を整え、豊臣勢の退路を狭める。", path: [[10, 206, 90], [12, 162, 72], [13.5, 98, 68], [15, 56, 86]], size: 72, initialFacing: [-1, -0.1] },
        { id: "todo", name: "藤堂・井伊勢", side: "tokugawa", men: "約20,000", note: "側面から押し返し、豊臣軍を包囲へ追い込む。", path: [[10, 178, -108], [12, 118, -72], [13.4, 48, -24], [15, 12, 28]], size: 62, initialFacing: [-1, 0.2] }
      ],
      arrows: [
        { t0: 11.2, t1: 13.3, from: [-166, -72], to: [118, 8], color: 0xff6755, head: 22, width: 13 },
        { t0: 13, t1: 15, from: [178, -100], to: [10, 26], color: 0xffd35c, head: 18, width: 10 },
        { t0: 13.5, t1: 15, from: [154, 84], to: [0, 70], color: 0xffd35c, head: 18, width: 10 }
      ],
      timelineEvents: [
        { t: 10, label: "開戦", type: "clash" },
        { t: 11.8, label: "突撃", type: "charge" },
        { t: 13, label: "本陣", type: "betrayal" },
        { t: 14, label: "包囲", type: "phase" },
        { t: 14.6, label: "敗走", type: "rout" }
      ],
      captions: [
        { t: 10.2, title: "城外で開戦", body: "豊臣軍は天王寺・岡山口へ出て、徳川軍と正面からぶつかる。", focus: [-56, 18], duration: 0.76 },
        { t: 11.8, title: "突撃", body: "真田信繁隊が赤備えで徳川本陣へ向けて突入する。", focus: [14, -8], duration: 0.76 },
        { t: 13, title: "本陣動揺", body: "徳川本陣は一時押し込まれるが、周囲の大軍が態勢を立て直す。", focus: [116, 14], duration: 0.76 },
        { t: 14, title: "包囲", body: "藤堂・井伊勢と秀忠勢が側面から押し、豊臣軍の突出部を包む。", focus: [46, 48], duration: 0.76 },
        { t: 14.6, title: "敗走", body: "真田隊は孤立し、豊臣軍は城外戦の主導権を失う。", focus: [86, 54], duration: 0.76 }
      ],
      weather: weather(5, 0.05),
      captionDuration: 0.76
    },

    "mimikawa": {
      title: "決戦 耳川",
      eyebrow: "誘引渡河",
      dateLabel: "天正六年 十一月十二日",
      time: baseTime(8, 16, [[8, "辰の刻"], [10, "巳の刻"], [12, "午の刻"], [14, "未の刻"], [16, "申の刻"]]),
      sky: sky(0xb7c3bd, 0x9dc1c6, 0xd2ded6),
      camera: commonCamera([0, 0], [16, 18], 470, -2.34),
      terrain: terrain({
        colors: palette.island,
        bumps: [{ x: -180, z: -104, r: 160, amp: 34 }, { x: 168, z: 88, r: 160, amp: 42 }, { x: 86, z: -130, r: 120, amp: 24 }],
        ridges: [{ id: "shimazu_hill", x: 160, z: 88, rx: 168, rz: 88, rot: 0.12, amp: 42 }, { id: "otomo_rear", x: -180, z: -104, rx: 170, rz: 90, amp: 34 }],
        basins: [{ x: 0, z: 16, rx: 110, rz: 260, amp: 10 }],
        roads: [
          { width: 6, points: [[-246, 44], [-120, 34], [-22, 22], [86, 30], [218, 68]] },
          { width: 5, points: [[-220, -90], [-116, -52], [-10, 8], [86, 72], [178, 132]] }
        ],
        rivers: [{ width: 17, points: [[-40, -210], [-26, -120], [-12, -24], [4, 82], [22, 226]] }]
      }),
      sides: {
        otomo: side("大友軍", 0x82add9, "#d4e7ff", "#f3efe3", "#82add9", "#1e2730"),
        shimazu: side("島津軍", 0xd9a441, "#ffd98a", "#171717", "#d9a441", "#efe0bb"),
        neutral: side("河川", 0xb9c4cf, "#e8eef2", "#65717a", "#b9c4cf", "#111")
      },
      places: [
        { name: "耳川", x: -8, z: 18, scale: 9 },
        { name: "大友前線", x: -148, z: 38, scale: 8 },
        { name: "島津陣", x: 152, z: 72, scale: 8 },
        { name: "高城方面", x: 190, z: -118, scale: 8, opacity: 0.72 }
      ],
      units: [
        { id: "otomo_main", name: "大友宗麟勢", side: "otomo", men: "約30,000", note: "耳川方面へ進出するが、渡河後に隊列が伸びる。", path: [[8, -208, 48], [10.4, -112, 34], [11.8, -20, 22], [13.4, 24, 28], [16, -112, 88]], fade: [14.2, 16], size: 70, initialFacing: [1, 0] },
        { id: "otomo_vanguard", name: "大友先鋒", side: "otomo", men: "約8,000", note: "先に川を越えて突出し、島津方の反撃を受ける。", path: [[8, -176, -44], [10.2, -84, -20], [11.6, 10, 8], [13, 76, 36], [16, -84, 112]], fade: [13.6, 16], size: 46, initialFacing: [1, 0.2] },
        { id: "shimazu_main", name: "島津義久", side: "shimazu", men: "約20,000", note: "東側で構え、誘引後に川筋へ反撃をかける。", path: [[8, 154, 72], [11.8, 132, 66], [13, 72, 42], [16, 2, 50]], size: 62, initialFacing: [-1, -0.1] },
        { id: "yoshihiro", name: "島津義弘", side: "shimazu", men: "約5,000", note: "側面から回り込み、大友先鋒の退路を圧迫する。", path: [[8, 116, -114], [10.8, 78, -76], [12.8, 20, -30], [15, -52, 18], [16, -78, 46]], size: 40, initialFacing: [-1, 0.3] },
        { id: "decoy", name: "島津誘引隊", side: "shimazu", men: "約2,000", note: "後退を見せて大友軍を川筋へ引き込む。", path: [[8, 88, 24], [10.5, 52, 18], [12, 86, 34], [14, 28, 34], [16, -18, 50]], size: 28, initialFacing: [-1, 0] }
      ],
      arrows: [
        { t0: 9.6, t1: 12.4, from: [-198, 44], to: [58, 30], color: 0x9fc5f0, head: 20, width: 12 },
        { t0: 12.2, t1: 14.8, from: [132, 68], to: [2, 42], color: 0xffd35c, head: 20, width: 12 },
        { t0: 12.4, t1: 15, from: [106, -102], to: [-54, 20], color: 0xffd35c, head: 18, width: 10 }
      ],
      timelineEvents: [
        { t: 8, label: "接近", type: "phase" },
        { t: 11.4, label: "渡河", type: "charge" },
        { t: 12.8, label: "伏撃", type: "clash" },
        { t: 14, label: "崩壊", type: "rout" },
        { t: 15.2, label: "敗走", type: "rout" }
      ],
      captions: [
        { t: 8.4, title: "大友軍が接近", body: "大友軍は耳川方面へ進み、島津軍は東側で受ける。", focus: [-116, 30], duration: 0.88 },
        { t: 11.4, title: "渡河", body: "大友先鋒が川を越えて突出し、隊列が伸びる。", focus: [-4, 16], duration: 0.88 },
        { t: 12.8, title: "伏撃", body: "島津方が誘引から反撃へ転じ、川筋の大友軍を横から叩く。", focus: [52, 34], duration: 0.88 },
        { t: 14, title: "崩壊", body: "渡河した部隊が押し戻され、耳川沿いに混乱が広がる。", focus: [2, 62], duration: 0.88 },
        { t: 15.2, title: "敗走", body: "大友軍は西へ退き、島津軍が追撃して勝敗を決める。", focus: [-86, 88], duration: 0.88 }
      ],
      weather: weather(6, 0.11),
      captionDuration: 0.86
    },

    "hitotoribashi": {
      title: "決戦 人取橋",
      eyebrow: "橋頭防戦",
      dateLabel: "天正十三年 十一月十七日",
      time: baseTime(9, 16, [[9, "巳の刻"], [11, "午前"], [13, "未の刻"], [15, "申の刻"]]),
      sky: sky(0xaeb5b0, 0xc2bda5, 0xd5d7cf, { fogDensity: 0.00014, fogBoost: 0.00018 }),
      camera: commonCamera([0, 0], [-18, 6], 450, -2.28),
      terrain: terrain({
        colors: palette.winter,
        bumps: [{ x: -168, z: 74, r: 140, amp: 22 }, { x: 150, z: 74, r: 170, amp: 28 }, { x: 34, z: -120, r: 120, amp: 16 }],
        ridges: [{ id: "east", x: 150, z: 74, rx: 180, rz: 88, rot: 0.08, amp: 28 }, { id: "date_rear", x: -168, z: 74, rx: 140, rz: 72, amp: 22 }],
        basins: [{ x: -16, z: 0, rx: 90, rz: 230, amp: 8 }],
        roads: [
          { width: 7, points: [[-240, -8], [-126, -4], [-12, 2], [120, 12], [252, 20]] },
          { width: 5, points: [[-108, 126], [-58, 68], [-12, 8], [44, -64], [108, -136]] }
        ],
        rivers: [{ width: 14, points: [[-26, -200], [-20, -96], [-16, 0], [-24, 106], [-36, 210]] }],
        barriers: [{ width: 3.2, color: 0x6d5436, opacity: 0.72, points: [[-58, -12], [-18, -8], [22, -4], [62, 0]] }]
      }),
      sides: {
        date: side("伊達軍", 0xd9a441, "#ffd98a", "#171717", "#d9a441", "#efe0bb"),
        coalition: side("連合軍", 0x82add9, "#d4e7ff", "#f3efe3", "#82add9", "#1e2730"),
        neutral: side("橋", 0xb9c4cf, "#e8eef2", "#65717a", "#b9c4cf", "#111")
      },
      places: [
        { name: "人取橋", x: -12, z: 2, scale: 9 },
        { name: "本宮方面", x: -154, z: 80, scale: 8, opacity: 0.72 },
        { name: "連合軍前線", x: 132, z: 36, scale: 8 }
      ],
      units: [
        { id: "masamune", name: "伊達政宗", side: "date", men: "約7,000", note: "少数で橋頭を支え、包囲圧を受けながら後退の機を探る。", path: [[9, -116, 0], [11.2, -72, 0], [13.2, -38, 0], [15.2, -96, 48], [16, -142, 88]], size: 46, initialFacing: [1, 0] },
        { id: "oniniwa", name: "鬼庭良直", side: "date", men: "約700", note: "殿軍として前面に残り、伊達本隊の退却を助ける。", path: [[9, -82, -42], [11.8, -42, -18], [13.4, -8, -8], [16, -12, -8]], fade: [14, 16], size: 22, forceScale: 0.78, initialFacing: [1, 0.2] },
        { id: "shigezane", name: "伊達成実", side: "date", men: "約2,000", note: "橋付近で反撃し、包囲の圧力を一時押し返す。", path: [[9, -138, 50], [11.6, -78, 30], [13.1, -20, 12], [15, -72, 66], [16, -122, 106]], size: 30, initialFacing: [1, -0.1] },
        { id: "satake", name: "佐竹義重", side: "coalition", men: "約20,000", note: "東側から主力で圧迫し、伊達勢を橋へ追い込む。", path: [[9, 184, 28], [11, 124, 18], [13.2, 56, 6], [15.4, 4, 8], [16, -8, 10]], size: 66, initialFacing: [-1, 0] },
        { id: "ashina", name: "蘆名・二本松勢", side: "coalition", men: "約10,000", note: "北東から回り、伊達方の側面を圧迫する。", path: [[9, 148, 112], [11.4, 98, 80], [13.4, 36, 38], [15.4, -18, 44], [16, -28, 52]], size: 54, initialFacing: [-1, -0.2] }
      ],
      arrows: [
        { t0: 10.4, t1: 13.8, from: [180, 28], to: [-4, 8], color: 0x9fc5f0, head: 20, width: 12 },
        { t0: 12.2, t1: 14, from: [-96, 0], to: [8, -6], color: 0xffd35c, head: 17, width: 10 },
        { t0: 14.4, t1: 16, from: [-42, 16], to: [-142, 88], color: 0xffd35c, head: 16, width: 9 }
      ],
      timelineEvents: [
        { t: 9, label: "対峙", type: "phase" },
        { t: 11.4, label: "圧迫", type: "charge" },
        { t: 13, label: "開戦", type: "clash" },
        { t: 14.2, label: "後退", type: "rout" },
        { t: 15.2, label: "撤収", type: "rout" }
      ],
      captions: [
        { t: 9.4, title: "橋頭で対峙", body: "伊達勢は人取橋付近で連合軍を受け止める。", focus: [-18, 0], duration: 0.86 },
        { t: 11.4, title: "圧迫", body: "佐竹・蘆名勢が東から押し、伊達軍は橋へ押し込まれる。", focus: [48, 14], duration: 0.86 },
        { t: 13, title: "開戦", body: "橋の周辺で激しい接近戦となり、伊達成実隊が反撃する。", focus: [-8, 2], duration: 0.86 },
        { t: 14.2, title: "後退", body: "伊達本隊は退路を確保しながら西へ下がる。", focus: [-72, 48], duration: 0.86 },
        { t: 15.2, title: "撤収", body: "殿軍が粘る間に、政宗本隊は本宮方面へ退く。", focus: [-128, 84], duration: 0.86 }
      ],
      weather: weather(6, 0.08),
      captionDuration: 0.84
    },

    "gassan-toda": {
      title: "月山富田城包囲",
      eyebrow: "山城兵糧戦",
      dateLabel: "永禄九年 十一月二十一日",
      time: baseTime(6, 18, [[6, "卯の刻"], [9, "巳の刻"], [12, "午の刻"], [15, "申の刻"], [18, "酉の刻"]]),
      sky: sky(0xb1bbb5, 0x9db7be, 0xd2d9d0),
      camera: commonCamera([0, 0], [0, 4], 500, -2.48),
      terrain: terrain({
        bumps: [{ x: 0, z: 0, r: 170, amp: 68 }, { x: -180, z: 116, r: 130, amp: 24 }, { x: 180, z: -120, r: 130, amp: 24 }],
        ridges: [
          { id: "gassan", x: 0, z: 0, rx: 164, rz: 112, rot: -0.08, amp: 70 },
          { id: "east_siege", x: 180, z: -118, rx: 120, rz: 70, amp: 24 },
          { id: "west_siege", x: -184, z: 112, rx: 130, rz: 72, amp: 24 }
        ],
        basins: [{ x: 0, z: 0, rx: 210, rz: 150, amp: 8 }],
        roads: [
          { width: 5, points: [[-260, 132], [-142, 92], [-50, 42], [0, 4], [54, -42], [166, -94], [260, -126]] },
          { width: 5, points: [[-200, -128], [-110, -72], [-36, -18], [34, 48], [132, 112], [232, 150]] }
        ],
        rivers: [{ width: 12, points: [[-250, -176], [-150, -154], [-36, -148], [88, -164], [226, -150]] }],
        barriers: [
          { width: 4, color: 0x5a3b1e, opacity: 0.8, points: [[-64, -44], [36, -62], [82, 12], [36, 72], [-58, 58], [-90, 8], [-64, -44]] }
        ]
      }),
      sides: {
        mori: side("毛利軍", 0xd9a441, "#ffd98a", "#171717", "#d9a441", "#efe0bb"),
        amago: side("尼子軍", 0x82add9, "#d4e7ff", "#f3efe3", "#82add9", "#1e2730"),
        neutral: side("山城", 0xb9c4cf, "#e8eef2", "#65717a", "#b9c4cf", "#111")
      },
      places: [
        { name: "月山富田城", x: 0, z: 0, scale: 10 },
        { name: "菅谷口", x: -84, z: 60, scale: 8 },
        { name: "補給路", x: 110, z: -92, scale: 8, opacity: 0.72 },
        { name: "毛利包囲線", x: -176, z: 118, scale: 8 }
      ],
      units: [
        { id: "motonari", name: "毛利元就", side: "mori", men: "約25,000", note: "山城を囲み、兵糧と退路を断つ長期包囲を進める。", path: [[6, -214, 118], [9, -160, 88], [12, -102, 54], [16, -74, 38], [18, -56, 28]], size: 70, initialFacing: [1, -0.3] },
        { id: "kikkawa", name: "吉川元春", side: "mori", men: "約8,000", note: "北西側の包囲線を締め、城外の動きを封じる。", path: [[6, -206, -86], [10, -146, -58], [13, -82, -34], [18, -60, -28]], size: 46, initialFacing: [1, 0.2] },
        { id: "kobayakawa", name: "小早川隆景", side: "mori", men: "約7,000", note: "東側の補給路を遮断し、城の消耗を促す。", path: [[6, 202, -132], [9, 158, -96], [12, 108, -56], [18, 76, -32]], size: 44, initialFacing: [-1, 0.3] },
        { id: "yoshihisa", name: "尼子義久", side: "amago", men: "約10,000", note: "月山富田城内で籠城するが、兵糧と士気を失う。", path: [[6, 4, 6], [15, 4, 6], [18, 4, 6]], fade: [15.5, 18], size: 48, initialFacing: [-1, 0] },
        { id: "amago_route", name: "尼子補給隊", side: "amago", men: "約2,000", note: "補給路を維持しようとするが、毛利勢に遮断される。", path: [[6, 154, -112], [9, 100, -70], [11.4, 54, -36], [14, 86, -80], [18, 146, -134]], fade: [12.6, 16.5], size: 28, initialFacing: [-1, 0.4] }
      ],
      arrows: [
        { t0: 8, t1: 12.8, from: [200, -130], to: [64, -42], color: 0xffd35c, head: 18, width: 10 },
        { t0: 9.2, t1: 15, from: [-210, 116], to: [-62, 34], color: 0xffd35c, head: 18, width: 10 },
        { t0: 14, t1: 18, from: [4, 8], to: [4, 8], color: 0x9fc5f0, head: 12, width: 8 }
      ],
      timelineEvents: [
        { t: 6, label: "包囲", type: "phase" },
        { t: 9, label: "遮断", type: "charge" },
        { t: 12, label: "攻防", type: "clash" },
        { t: 15, label: "消耗", type: "rout" },
        { t: 17, label: "降伏", type: "rout" }
      ],
      captions: [
        { t: 6.4, title: "包囲", body: "毛利軍は月山富田城を囲み、山道ごと包囲線を作る。", focus: [0, 0], duration: 1.0 },
        { t: 9, title: "兵糧遮断", body: "小早川隊が東の補給路を押さえ、城の消耗を進める。", focus: [90, -56], duration: 1.0 },
        { t: 12, title: "攻防", body: "吉川隊と毛利主力が各口を締め、城外の動きを封じる。", focus: [-54, 18], duration: 1.0 },
        { t: 15, title: "消耗", body: "籠城する尼子方は兵糧を失い、戦線維持が難しくなる。", focus: [0, 0], duration: 1.0 },
        { t: 17, title: "降伏", body: "長期包囲の末、月山富田城は毛利方へ開かれる。", focus: [0, 0], duration: 1.0 }
      ],
      weather: weather(7, 0.1),
      captionDuration: 0.92
    },

    "osaka-summer": {
      title: "大坂夏の陣",
      eyebrow: "最後総攻撃",
      dateLabel: "慶長二十年 五月七日",
      time: baseTime(8, 16, [[8, "辰の刻"], [10, "巳の刻"], [12, "午の刻"], [14, "未の刻"], [16, "申の刻"]]),
      sky: sky(0xc8bd9f, 0xd1c097, 0xd7cdb5, { fogDensity: 0.00012, fogBoost: 0.00012 }),
      camera: commonCamera([0, 4], [16, 12], 500, -2.24),
      terrain: terrain({
        colors: palette.field,
        bumps: [{ x: -150, z: 148, r: 150, amp: 28 }, { x: 162, z: -96, r: 170, amp: 16 }, { x: -180, z: -96, r: 140, amp: 16 }],
        ridges: [{ id: "castle", x: -150, z: 148, rx: 152, rz: 92, amp: 30 }, { id: "tokugawa", x: 162, z: -96, rx: 180, rz: 82, amp: 16 }],
        basins: [{ x: -112, z: 120, rx: 210, rz: 120, amp: 9 }],
        roads: [
          { width: 8, points: [[-250, 120], [-146, 92], [-38, 50], [76, 12], [216, -30], [270, -52]] },
          { width: 7, points: [[-220, -68], [-116, -36], [-12, -12], [112, 20], [240, 74]] }
        ],
        rivers: [{ width: 15, points: [[-222, 172], [-126, 146], [-34, 132], [72, 144], [196, 176]] }],
        barriers: [
          { width: 4, color: 0x6a4520, opacity: 0.82, points: [[-190, 118], [-126, 98], [-72, 126], [-84, 176], [-152, 184], [-202, 156], [-190, 118]] }
        ]
      }),
      sides: {
        toyotomi: side("豊臣軍", 0xc94133, "#ffc2b5", "#220c08", "#c94133", "#f6ddc8"),
        tokugawa: side("徳川軍", 0xd9a441, "#ffd98a", "#171717", "#d9a441", "#efe0bb"),
        neutral: side("大坂城", 0xb9c4cf, "#e8eef2", "#65717a", "#b9c4cf", "#111")
      },
      places: [
        { name: "大坂城", x: -148, z: 148, scale: 10 },
        { name: "天王寺口", x: -92, z: -28, scale: 8 },
        { name: "岡山口", x: 88, z: 24, scale: 8 },
        { name: "徳川本陣", x: 158, z: -40, scale: 8 }
      ],
      units: [
        { id: "hideyori", name: "豊臣秀頼", side: "toyotomi", men: "約55,000", note: "城内と城外の豊臣方を支えるが、兵力差は大きい。", path: [[8, -150, 142], [16, -150, 142]], size: 70, initialFacing: [1, -0.4] },
        { id: "sanada", name: "真田信繁", side: "toyotomi", men: "約3,500", note: "城外へ出て徳川本陣へ突撃し、突出した先で包囲される。", path: [[8, -158, 20], [10.4, -94, -6], [12.3, -18, -10], [13.3, 84, -18], [16, 122, 32]], fade: [14.2, 16], size: 38, initialFacing: [1, 0] },
        { id: "mori", name: "毛利勝永", side: "toyotomi", men: "約6,000", note: "南側で徳川前線を押し、真田隊の突撃を支えるが、終盤に孤立する。", path: [[8, -184, -34], [10.8, -102, -22], [12.4, -24, 4], [14, 48, 26], [16, -2, 92]], fade: [14.6, 16], size: 44, initialFacing: [1, 0.1] },
        { id: "ieyasu", name: "徳川家康", side: "tokugawa", men: "約155,000", note: "大軍を束ねる本陣。突撃を受けても包囲を立て直す。", path: [[8, 172, -42], [12.4, 158, -34], [13.2, 126, -16], [15, 172, 0], [16, 188, 16]], size: 86, initialFacing: [-1, 0.1] },
        { id: "hidetada", name: "徳川秀忠", side: "tokugawa", men: "約80,000", note: "後方から厚い包囲を形成し、豊臣軍の突出部を包む。", path: [[8, 212, 80], [11.4, 156, 66], [13.4, 78, 54], [16, 26, 92]], size: 80, initialFacing: [-1, -0.1] },
        { id: "tokugawa_left", name: "徳川左翼", side: "tokugawa", men: "約40,000", note: "天王寺方面から押し返し、城外の豊臣勢を分断する。", path: [[8, 178, -136], [11.8, 112, -90], [13.8, 36, -34], [16, -20, 22]], size: 74, initialFacing: [-1, 0.3] }
      ],
      arrows: [
        { t0: 10.2, t1: 13.3, from: [-158, 20], to: [126, -16], color: 0xff6755, head: 22, width: 13 },
        { t0: 13.3, t1: 16, from: [178, -132], to: [-14, 20], color: 0xffd35c, head: 20, width: 12 },
        { t0: 13.4, t1: 16, from: [192, 80], to: [16, 90], color: 0xffd35c, head: 20, width: 12 }
      ],
      effects: [
        { type: "clash", t0: 10.6, t1: 13.4, at: [-24, -2], radius: 58, rate: 10 },
        { type: "clash", t0: 12.2, t1: 14.8, at: [78, -16], radius: 48, rate: 9 }
      ],
      timelineEvents: [
        { t: 8, label: "布陣", type: "phase" },
        { t: 10.6, label: "開戦", type: "clash" },
        { t: 12.4, label: "突撃", type: "charge" },
        { t: 14.2, label: "包囲", type: "phase" },
        { t: 15.2, label: "落城", type: "rout" }
      ],
      captions: [
        { t: 8.4, title: "城外へ布陣", body: "豊臣方は大坂城外へ出て、徳川の大軍を迎える。", focus: [-72, 36], duration: 0.88 },
        { t: 10.6, title: "開戦", body: "天王寺・岡山方面で広く戦闘が始まり、豊臣方は正面突破を狙う。", focus: [-18, 0], duration: 0.88, shot: { type: "push", radius: 230, polar: 0.9, duration: 0.48, shake: 0.2 } },
        { t: 12.4, title: "突撃", body: "真田隊が徳川本陣へ迫り、一時的に大きな動揺を起こす。", focus: [78, -16], duration: 0.88, shot: { type: "push", radius: 190, polar: 0.82, duration: 0.46, shake: 0.42 } },
        { t: 14.2, title: "包囲", body: "徳川軍は兵力差を活かして側面を包み、豊臣方の突出を断つ。", focus: [30, 40], duration: 0.88, shot: { type: "crane", radius: 300, polar: 0.74, duration: 0.58, shake: 0.18 } },
        { t: 15.2, title: "落城へ", body: "城外の突出部は包囲で崩れ、城内の秀頼勢だけが残って終局へ向かう。", focus: [-134, 132], duration: 0.88, shot: { type: "pull", radius: 340, polar: 0.92, duration: 0.6, shake: 0.16 } }
      ],
      weather: weather(5, 0.04),
      captionDuration: 0.86
    },

    "osaka-winter": {
      title: "大坂冬の陣",
      eyebrow: "堀防御戦",
      dateLabel: "慶長十九年 十一月",
      time: baseTime(8, 17, [[8, "辰の刻"], [10, "巳の刻"], [12, "午の刻"], [14, "未の刻"], [16, "申の刻"]]),
      sky: sky(0x8e989d, 0xb2b3aa, 0xc9cbc6, { fogDensity: 0.00018, fogBoost: 0.0002 }),
      camera: commonCamera([0, 4], [-34, 52], 510, -2.36),
      terrain: terrain({
        colors: palette.winter,
        bumps: [{ x: -82, z: 92, r: 168, amp: 30 }, { x: 148, z: -62, r: 170, amp: 16 }, { x: -180, z: -116, r: 120, amp: 20 }],
        ridges: [{ id: "castle", x: -78, z: 92, rx: 160, rz: 104, amp: 30 }, { id: "sanadamaru", x: -146, z: -76, rx: 114, rz: 70, amp: 20 }],
        basins: [{ x: -72, z: 80, rx: 210, rz: 132, amp: 10 }],
        roads: [
          { width: 8, points: [[-262, -86], [-154, -72], [-46, -38], [78, -20], [220, -30]] },
          { width: 6, points: [[-230, 120], [-116, 96], [10, 54], [136, 42], [248, 64]] }
        ],
        rivers: [
          { width: 18, points: [[-206, 166], [-116, 134], [-40, 112], [52, 120], [158, 154]] },
          { width: 13, points: [[-200, 24], [-112, 18], [-24, 24], [80, 36], [184, 32]] }
        ],
        barriers: [
          { width: 4, color: 0x6a4520, opacity: 0.82, points: [[-162, -106], [-92, -104], [-58, -62], [-94, -28], [-164, -42], [-186, -78], [-162, -106]] },
          { width: 4, color: 0x5d3f24, opacity: 0.8, points: [[-134, 54], [-62, 38], [-2, 74], [-22, 142], [-98, 154], [-152, 112], [-134, 54]] }
        ]
      }),
      sides: {
        toyotomi: side("豊臣軍", 0xc94133, "#ffc2b5", "#220c08", "#c94133", "#f6ddc8"),
        tokugawa: side("徳川軍", 0xd9a441, "#ffd98a", "#171717", "#d9a441", "#efe0bb"),
        neutral: side("大坂城", 0xb9c4cf, "#e8eef2", "#65717a", "#b9c4cf", "#111")
      },
      places: [
        { name: "大坂城", x: -78, z: 96, scale: 10 },
        { name: "真田丸", x: -142, z: -78, scale: 9 },
        { name: "外堀", x: -24, z: 28, scale: 8 },
        { name: "徳川砲列", x: 138, z: -30, scale: 8 }
      ],
      units: [
        { id: "toyotomi_main", name: "豊臣籠城軍", side: "toyotomi", men: "約100,000", note: "大坂城と外郭で守り、堀と土塁を活かす。", path: [[8, -82, 92], [17, -82, 92]], size: 82, initialFacing: [1, -0.3] },
        { id: "sanada", name: "真田信繁", side: "toyotomi", men: "約5,000", note: "真田丸で徳川勢を引き受け、防御陣地から撃退する。", path: [[8, -142, -78], [17, -142, -78]], size: 44, initialFacing: [1, 0.1] },
        { id: "ono", name: "大野治長", side: "toyotomi", men: "約8,000", note: "城内外の防御線を支え、真田丸と城の連絡を保つ。", path: [[8, -106, 42], [12, -92, 42], [17, -88, 48]], size: 48, initialFacing: [1, -0.1] },
        { id: "ieyasu", name: "徳川家康", side: "tokugawa", men: "約200,000", note: "大坂城を包囲し、砲撃と和議で圧力をかける。", path: [[8, 178, -30], [12, 148, -26], [15, 130, -18], [17, 128, -18]], size: 88, initialFacing: [-1, 0.1] },
        { id: "ii_todo", name: "井伊・藤堂勢", side: "tokugawa", men: "約30,000", note: "真田丸方面へ攻め寄せるが、防御陣地で損害を受ける。", path: [[8, 104, -130], [10.6, 42, -110], [12.6, -46, -88], [14.2, -102, -78], [17, 42, -118]], fade: [14.4, 17], size: 70, initialFacing: [-1, 0.2] },
        { id: "artillery", name: "徳川砲列", side: "tokugawa", men: "約2,000", note: "城へ向けて砲撃し、籠城側に心理的圧力をかける。", path: [[8, 138, -8], [17, 138, -8]], size: 28, initialFacing: [-1, 0.2] }
      ],
      arrows: [
        { t0: 10, t1: 13, from: [104, -128], to: [-118, -80], color: 0xffd35c, head: 20, width: 12 },
        { t0: 12, t1: 15, from: [138, -8], to: [-78, 90], color: 0xffd35c, head: 16, width: 8 },
        { t0: 14.4, t1: 17, from: [-110, -78], to: [42, -118], color: 0x9fc5f0, head: 18, width: 10 }
      ],
      effects: [
        { type: "snow", rate: 24, weatherBound: true },
        { type: "volley", t0: 10.6, t1: 14.2, at: [-128, -82], width: 104, dir: 0.08, interval: 0.62 },
        { type: "clash", t0: 12.2, t1: 14.6, at: [-116, -82], radius: 44, rate: 8 }
      ],
      timelineEvents: [
        { t: 8, label: "包囲", type: "phase" },
        { t: 10.6, label: "突撃", type: "charge" },
        { t: 12.6, label: "開戦", type: "clash" },
        { t: 14.2, label: "撃退", type: "rout" },
        { t: 16, label: "和議", type: "phase" }
      ],
      captions: [
        { t: 8.4, title: "包囲", body: "徳川軍は大坂城の周囲に巨大な包囲線を置き、堀と外郭へ圧力をかける。", focus: [-34, 48], duration: 0.9 },
        { t: 10.6, title: "突撃", body: "井伊・藤堂勢が真田丸へ攻め寄せる。", focus: [-90, -86], duration: 0.9, shot: { type: "push", radius: 220, polar: 0.88, duration: 0.5, shake: 0.28 } },
        { t: 12.6, title: "開戦", body: "真田丸の防御線が攻撃を受け止め、徳川勢は正面で止められる。", focus: [-132, -78], duration: 0.9, shot: { type: "push", radius: 195, polar: 0.82, duration: 0.45, shake: 0.32 } },
        { t: 14.2, title: "撃退", body: "真田丸方面の攻撃は大きな損害を出し、徳川勢が後退する。", focus: [-74, -96], duration: 0.9, shot: { type: "pull", radius: 300, polar: 0.9, duration: 0.55, shake: 0.22 } },
        { t: 16, title: "和議へ", body: "砲撃と包囲の圧力が続き、冬の陣は和議と堀の処理へ向かう。", focus: [-76, 92], duration: 0.9, shot: { type: "crane", radius: 330, polar: 0.76, duration: 0.65, shake: 0.08 } }
      ],
      weather: {
        fogCount: 8,
        fogSize: 250,
        fogPeak: time => Math.max(0, Math.min(1, 0.22 + (17 - time) / 24)),
        fogOpacityScale: 0.18
      },
      captionDuration: 0.88
    }
  });
})();

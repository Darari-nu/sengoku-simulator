# リッチ化 詳細実装計画書（Codex実行用）

作成日: 2026-07-03
前提文書: `docs/animation-enrichment-plan.md`（診断と方針。実装前に一読）
実施範囲: M0〜M8。上から順に、**1マイルストーン = 1コミット**で進める。

---

## 0. リポジトリ構成と絶対制約

### 構成（触るファイル）

```
index.html                  … トップ。カード生成JSはインライン
styles/index.css            … トップ用CSS（969行）
styles/battle-sim.css       … 合戦ページ共通CSS（694行）
scripts/battle-sim.js       … 3Dエンジン共通（1041行、IIFE、グローバルTHREE前提）
data/battles-index.js       … window.BATTLES = [...]（トップのカードデータ）
data/extra-battle-scenes.js … 後発12合戦の BATTLE_SCENE 生成
battles/<slug>/index.html   … 18合戦ページ。初期6合戦は BATTLE_SCENE をインライン定義
assets/…                    … 画像
```

- 全合戦ページは `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js">` → BATTLE_SCENE 定義 → `<script src="../../scripts/battle-sim.js">` の順で読み込む。
- 既存の検証用URLパラメータ: `?verify=1`（固定カメラ・自動再生停止）、`?t=<数値>`（開始時刻）、`?weather=0`（霧雨無効）、`?paused=1`、`?entry=card`。

### 絶対制約

1. **ビルド導入禁止。** 素のHTML/CSS/JSのみ。npm/バンドラ/TypeScript不可。
2. **Three.js は r128 のまま。** アップグレード禁止。グローバル `THREE` 前提を維持。
3. **BATTLE_SCENE の既存スキーマは後方互換を維持。** 新機能はすべて「任意の追加プロパティ」とし、追加プロパティが無い合戦ページでも従来どおり + 自動改善分だけ良くなって動くこと。
4. **モバイル実機相当（DevTools CPU 4x throttle + iPhone viewport）で30fps以上、デスクトップで60fps** を各マイルストーンで確認。
5. `prefers-reduced-motion: reduce` 時はカメラシェイク・UI登場アニメ・Ken Burns を無効化（M0のフラグで一元管理）。
6. 相対パス維持（GitHub Pagesサブパス配信）。日本語ファイル名禁止。
7. 各マイルストーン完了時に下記「検証手順」を実行し、コンソールエラーゼロを確認してからコミット。

### 検証手順（全マイルストーン共通）

```bash
python3 -m http.server 8000
# 最低限このページで確認（演出パターンの代表例）:
# http://localhost:8000/                                        … トップ
# http://localhost:8000/battles/sekigahara/                     … 大規模・裏切り
# http://localhost:8000/battles/nagashino/                      … 鉄砲・柵
# http://localhost:8000/battles/okehazama/                      … 雨
# http://localhost:8000/battles/kawagoe-night/                  … 夜戦
# http://localhost:8000/battles/honnoji/                        … 炎
# http://localhost:8000/battles/osaka-summer/                   … 最終回・大規模
# 静止比較: 各ページ + ?verify=1&t=<開戦時刻> でスクショ
```

---

## M0: 基盤 — 品質ティア・FXフラグ・reduced-motion

**対象ファイル**: `scripts/battle-sim.js`（先頭部）、`styles/battle-sim.css`

1. `battle-sim.js` の IIFE 冒頭（`const query = ...` の直後）に品質判定を追加:

```js
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fxParam = query.get("fx"); // "high" | "medium" | "low" | "0"
const FX = {
  tier: fxParam === "0" ? "off" : (fxParam || "auto"), // auto は起動後に確定
  shadows: true, particles: 1.0, clouds: true, shake: !reducedMotion
};
```

2. **自動ティア判定**: `tick()` 内で最初の120フレームの平均フレームタイムを計測し、
   - 平均 > 26ms → low（影OFF、パーティクル係数0.4、雲OFF）
   - 平均 > 18ms → medium（影は地形受けのみ、パーティクル係数0.7）
   - それ以外 → high
   判定確定時に一度だけ `applyTier()` を呼ぶ。`?fx=` 指定時は計測スキップ。`verify=1` 時は常に high（スクショ比較の安定のため）。
3. `document.documentElement.dataset.fx = tier` を設定（CSS側から参照可能に）。
4. `battle-sim.css` に `@media (prefers-reduced-motion: reduce)` ブロックを追加し、既存の `#introCut` 系アニメを `animation: none; transition: none;` で無効化。

**受入条件**: `?fx=0` で従来と同一の見た目・挙動。`?fx=low` などがコンソールエラーなく通る。既存18ページ全て無変更で動作。

---

## M1: ライティング・空・地形の底上げ（最重要）

**対象ファイル**: `scripts/battle-sim.js`

### 1-1. レンダラー設定（renderer生成直後に追加）

```js
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = cfg.sky.exposure ?? 1.05;
renderer.shadowMap.enabled = FX.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

**注意**: sRGB化で全体の見えが変わる。18合戦の `sky` / `terrain.colors` は再調整**しない**こと（トーンマッピングで概ね馴染む）。明らかに破綻したページのみ `sky.exposure` の追記で個別補正する。

### 1-2. 影

- `sun.castShadow = true`。shadow camera は `cfg.terrain.size` の約6割をカバーする OrthographicCamera（`left/right/top/bottom = ±size*0.3`）、`mapSize 2048`（medium: 1024）、`bias -0.0005`。
- 地形Mesh: `receiveShadow = true`。兵士 `InstancedMesh`: `castShadow = true`。旗・ラベル類は影に関与させない。
- ティア low では `renderer.shadowMap.enabled = false`。

### 1-3. 空ドーム

`buildTerrain()` の後に `buildSky()` を新設:

- `SphereGeometry(半径 = terrain.size * 1.6, 32, 16)` を `side: BackSide` の `ShaderMaterial` で描く。uniform: `topColor` / `horizonColor`。フラグメントで `mix(horizonColor, topColor, pow(max(vY,0), 0.55))`。
- 既存 `scene.background` 単色は廃止し、`tick()` 内で `topColor` に現行の `sky.morning→noon` lerp を、`horizonColor` に `sky.fog→clearFog` lerp を流用（データ追記不要で全ページ対応）。
- 任意プロパティ `sky.nightMode: true`（河越夜戦・手取川向け）: 太陽光を月光（0x9fb4d8, intensity 0.35）に、空を紺〜墨に。既存 `kawagoe-night` の BATTLE_SCENE に `nightMode: true` を追記する。
- **太陽/月ビルボード**: `makeSoftTexture()` を流用したスプライトを `sun.position` 方向の空ドーム上に配置。
- **雲**: `makeSoftTexture()` ベースの横長スプライトを 6枚（tier low: 0枚）、高度 `terrain.size*0.5` にランダム配置し、`tick()` で微速ドリフト。opacity 0.12〜0.2。

### 1-4. 兵士の接地感

- `soldierGeo` はそのまま。`MeshLambertMaterial` の `mat` に `emissive: side.color, emissiveIntensity: 0.06` を追加（陰面の黒潰れ防止）。
- footprint（既存の円）はそのまま維持。

**受入条件**: 全18ページで「影が落ち、空にグラデと雲がある」こと。`?verify=1` スクショで従来比の破綻（真っ黒/白飛び）がない。kawagoe-night が夜の画になっている。FPS制約内。

---

## M2: 部隊の生命感 — 旗・行進・個体差

**対象ファイル**: `scripts/battle-sim.js`

### 2-1. 旗のなびき

- 旗の `PlaneGeometry(5.5, 20)` を `PlaneGeometry(5.5, 20, 1, 8)` に変更し、生成時に各頂点の元位置を `userData.basePositions` に保存。
- `tick()` 内で各旗の頂点を `x += sin(time*3.2 + y*0.45 + unitIndex) * 0.55 * (1 - y正規化)`（旗竿側ほど振幅0）で変位、`needsUpdate = true`。
- 旗は最大18ユニット×18頂点程度なのでCPUで十分。ユニットごとに位相をずらす。

### 2-2. 行進サイクル

既存の `bob = sin(wobble*6+i)*0.25` を拡張:

- 移動中（`vel.lengthSq() > 0.01`）: bob振幅を 0.35 に、さらに `dummy.rotation.z = sin(wobble*6+i)*0.06`（左右揺れ）と進行方向へ `dummy.rotation.x = -0.08`（前傾）を追加。
- 待機中: `bob = sin(wobble*1.2+i)*0.06`（呼吸程度の微動）。
- 壊滅遷移（alpha < 0.5）: インスタンスの一部（`i % 3 === 0`）を `dummy.rotation.z = (1-alpha)*1.4` で徐々に倒す。

### 2-3. 個体色バラつき

- InstancedMesh 生成時に `inst.setColorAt(i, baseColor.clone().offsetHSL(0, (rand-0.5)*0.08, (rand-0.5)*0.12))` を全インスタンスへ。`inst.instanceColor.needsUpdate = true`。
- ※ r128 は `setColorAt` 対応済み。material の color は白 `0xffffff` にし、色は instanceColor に移す（`emissive` は side.color のまま）。

### 2-4. 状態バッジのトゥイーン

- `setUnitStateSprite()` で新スプライト追加時、`scale` を 0 から目標値へ約300msでイーズアウト（`tick()` 内で `sprite.userData.bornAt` を見て補間）。旧スプライトは除去前に150msフェード。

**受入条件**: 再生中、旗がなびき兵士が行進して見える。壊滅する部隊（関ヶ原西軍など）が「倒れて散る」。ドラッグ・チップ切替等の既存操作に影響なし。

---

## M3: 戦闘エフェクト基盤（パーティクル）

**対象ファイル**: `scripts/battle-sim.js`、各合戦ページ（データ追記）

### 3-1. 汎用パーティクルシステム

`battle-sim.js` に `FxPool` を新設。**1種類につき1つの `THREE.Points`**（BufferGeometry, 事前確保: 上限 `600 * FX.particles` 頂点）で実装し、`makeSoftTexture()` 系のスプライトテクスチャ + `AdditiveBlending`（火花/銃火/炎）または `NormalBlending`（土煙）を使う。attribute: position / velocity / bornAt / life / size。`tick()` でCPU更新（毎フレーム全頂点更新で問題ない規模）。

エフェクト種:

| type | 見た目 | 色 | 発生規則 |
|------|-------|----|---------|
| `dust` | 土煙。上昇+膨張+フェード | 0xb8a888, opacity≦0.35 | 交戦中ユニットの足元から自動発生（後述） |
| `spark` | 火花。短寿命で散る | 0xffd98a | `clash` エフェクト指定地点 |
| `volley` | 銃火。横一列の閃光+白煙 | 0xfff3c0 | `effects` 指定。`interval` 秒ごとに一斉発火 |
| `fire` | 炎+黒煙。揺らぎ上昇 | 0xff8a3c + 0x333 | `effects` 指定地点で燃焼 |
| `snow` | 全域降雪 | 0xffffff | `effects` で `{type:"snow"}` 指定時、rain と同要領 |

### 3-2. データスキーマ（BATTLE_SCENE への任意追加）

```js
window.BATTLE_SCENE.effects = [
  { type: "clash",  t0: 9.0, t1: 12.5, at: [0, 10],   radius: 46 },
  { type: "volley", t0: 8.2, t1: 11.0, at: [-58, 6],  width: 150, dir: 0.0, interval: 0.5 },
  { type: "fire",   t0: 5.2, t1: 8.0,  at: [12, -18], radius: 26 },
  { type: "snow" }
];
```

- `at` は地形座標 [x, z]。y は `terrainH()` で解決。
- 時刻ゲートは既存 arrows と同じ `t0/t1` + 前後0.18hのフェード。

### 3-3. 自動 dust（データ追記不要の全ページ改善）

`stateForUnit()` の結果が「交戦」のユニットは、footprint 周縁からランダムに `dust` を毎秒約 8 個（× FX.particles）放出。「前進」中は隊列後方から毎秒約 3 個。

### 3-4. データ追記（このマイルストーンで入れる分）

| ページ | 追記 |
|--------|------|
| `battles/nagashino/` | `volley`（馬防柵ライン、鉄砲斉射時間帯）+ `clash` |
| `battles/honnoji/` | `fire`（本能寺位置、炎上時間帯） |
| `battles/osaka-winter/` | `snow` + `volley`（真田丸の銃撃） |
| `battles/osaka-summer/` | `clash`（天王寺口） |
| `battles/sekigahara/` | `clash`（笹尾山前面、開戦〜総崩れ） |
| `battles/okehazama/` | `clash`（本陣急襲時間帯） |

座標と時間帯は各ページの `captions` / `units.path` から読み取って整合させること（`docs/battles/*-requirements.md` に各合戦の展開が記載されている）。残り12合戦への `clash` 追記は M7 で行う。

**受入条件**: 上記6ページで各エフェクトが発生し、`?weather=0` では snow/雨系のみ消える（clash/volley/fire は残す）。`?fx=0` で全エフェクト無効。FPS制約内（大坂夏の陣で確認）。

---

## M4: 進軍矢印と注記の再設計

**対象ファイル**: `scripts/battle-sim.js`

1. `THREE.ArrowHelper` を廃止。`cfg.arrows` の各要素を **テーパー付きリボン**で描く:
   - `from`→`to` を地形に沿って12分割サンプリング（`terrainH()+6`）、`addPathRibbon()` と同じ要領で三角形ストリップ生成。幅は根元 `item.width*0.35` → 先端手前 `item.width*0.55` と広げ、先端に三角形の鏃を付ける。
   - マテリアルは canvas 生成の縞テクスチャ（進行方向に明→暗の繰り返し）+ `transparent`、`tick()` で `texture.offset.x -= dt * 0.8`（流れる表現）。
   - 出現は現行と同じ t0/t1 フェードに加え、**根元→先端へ伸びるワイプ**（`geometry.setDrawRange` を進捗に応じて拡張）で登場させる。
2. データスキーマは不変（`from/to/t0/t1/color/width/head` を尊重。`head` は鏃サイズに読み替え）。
3. 場所ラベル（`cfg.places`）: カメラ距離に応じ opacity を減衰（遠距離でフェードアウト、近距離で0.85）。現在は常時表示で画面がうるさい。

**受入条件**: 矢印を使う全ページ（grep で `arrows:` を含むページを列挙して確認）で新矢印が表示され、方向・タイミングが従来と一致。デバッグヘルパー的な見た目が消えている。

---

## M5: カメラ演出 — ショット指定とシェイク

**対象ファイル**: `scripts/battle-sim.js`、各合戦ページ（データ追記）

### 5-1. ショットスキーマ（caption への任意追加）

```js
captions: [
  { t: 8.0, title: "開戦", body: "…",
    focus: [0,10], // 既存
    shot: { type: "push", radius: 150, polar: 0.72, duration: 0.6, shake: 0.4 } },
]
```

- `type`: `"push"`(寄る) / `"pull"`(引く) / `"orbit"`(現行回転・省略時) / `"crane"`(polar を下げつつ上昇)。
- `desiredCamera()` の auto モードを拡張: 現在のキャプションに `shot` があれば、`autoRadius/autoPolar` の代わりに `shot.radius/polar` へ `duration`(h) かけてイーズ。キャプション終了後は既定値へ戻す。**shot が無い場合は現行挙動と完全一致**させること。
- `az` はショットでは変更しない（回転の連続性を維持し酔いを防ぐ）。

### 5-2. カメラシェイク

- `FX.shake` が真のとき、`shot.shake > 0` のキャプション開始時に減衰ノイズ（振幅 `shake*2.2`、周期~11Hz、減衰~1.2s）を `cam.pos` に加算。`camera.lookAt` 前に適用。
- `timelineEvents` の type が `charge` / `rout` / `betrayal` のイベント通過時にも小シェイク（振幅0.8）を自動発火（データ追記不要）。
- `reducedMotion` 時と `verify=1` 時は常に無効。

### 5-3. データ追記

sekigahara / nagashino / okehazama / osaka-summer の主要転機（開戦・突撃・裏切り・決着）計3〜4箇所ずつに `shot` を追記。残りは M7。

**受入条件**: おまかせカメラで再生したとき、転機で寄り・引きが起き、突撃で画面が短く揺れる。ユーザーがドラッグした瞬間に free モードへ移行する既存挙動を壊さない。`?verify=1` のスクショが M4 時点と一致（シェイク・ショットが無効のため）。

---

## M6: Web UIモーション（トップ + 合戦ページUI）

**対象ファイル**: `index.html`、`styles/index.css`、`styles/battle-sim.css`、`scripts/battle-sim.js`

### 6-1. トップページ

1. **登場アニメ**: `IntersectionObserver` で `.battle-card` / `.featured-stage` / `.section-head` に `in-view` クラスを付与（threshold 0.15、一度きり）。CSS: `opacity 0→1` + `translateY(24px)→0`、`transition 600ms cubic-bezier(.22,1,.36,1)`、カードは `nth-child` で 60ms ずつ時差。初期状態のopacity:0 は `html.js` クラス（インラインJSで即付与）配下でのみ適用し、JS無効環境で不可視にならないこと。
2. **ヒーロー Ken Burns**: `.hero-bg` に `@keyframes` で 24s かけて `scale(1.0→1.06)` + わずかな translate。`animation-iteration-count: 1; forwards`。
3. **カード hover**: `.battle-visual img` を `transform: scale(1.05)` へ 500ms。カードに金の光沢スイープ（`::after` に 45deg の線形グラデを `translateX(-120%→120%)` 700ms、hover時のみ）。既存の 160ms transition と統合。
4. **rail-item hover**: 左ボーダー金線が高さ 0→100% に伸びる。
5. `@media (prefers-reduced-motion: reduce)` で 1〜4 を全て無効化。

### 6-2. 合戦ページUI

1. **導入カット** (`#introCut`): `.intro-bg` に 8s の緩ズーム（scale 1.08→1.0）。`.intro-title` は `letter-spacing 0.35em→0.14em` + fade を 900ms。`.intro-kicker` の下に金罫線が幅 0→100% に伸びる演出を追加。
2. **キャプション**: 表示時に `clip-path: inset(0 100% 0 0)` → `inset(0)` の 450ms ワイプ（刷毛はらい風）。タイトルと本文で 120ms 時差。
3. **タイムライン**: 再生ヘッドがイベント tick を通過した瞬間、該当 `.event-label` に `pulse` クラスを付与（`battle-sim.js` から。scale 1→1.25→1 + 金色発光 600ms、1回きり）。
4. **時計**: `#clockWakoku`（和刻）が変わる瞬間に fade-through（150ms out → 差し替え → 150ms in）。

**受入条件**: トップでスクロールするとカードが時差登場する。JS無効でも全カードが見える。合戦ページで転機通過時にタイムラインが光る。reduced-motion で全て静的表示。

---

## M7: 全18合戦へのデータ横展開

**対象ファイル**: `battles/*/index.html`、`data/extra-battle-scenes.js`

M3/M5 のスキーマを残り全ページに適用する。各合戦の `captions`・`units`・`docs/battles/*.md` を読み、以下の基準で追記:

- 全合戦: 主要交戦地点に `clash` 1〜3個、開戦/最大の転機/決着の3キャプションに `shot`。
- 個別: kawanakajima(霧は既存fogPeakで済・一騎打ち地点にclash+push)、mikatagahara(武田突撃にshake強め)、yamazaki(天王山にcrane)、shizugatake(賤ヶ岳に crane、大返し到着に push)、itsukushima(夜襲部分の nightMode 検討※史実上夜明け前奇襲のため sky はそのまま可)、anegawa(川中の clash)、komaki-nagakute(長久手の遭遇戦に clash+shake)、tennoji-okayama / mimikawa / hitotoribashi / gassan-toda / kawagoe-night(夜戦: volley無し、clash+火の手fire少量)、osaka-winter(済)、osaka-summer(済)。
- `data/extra-battle-scenes.js` 生成の合戦は、同ファイル内の各シーン定義に `effects` を追記する（生成ヘルパーを増設してよい）。

**受入条件**: 18ページ全てで最低1つの clash と 3つの shot が機能。`?verify=1` スクショ一式を撮り、`docs/visual-verification.md` の手順に追記。

---

## M8: PWA化 + 最終QA

**対象ファイル**: 新規 `manifest.webmanifest`、新規 `sw.js`、`index.html`、全 `battles/*/index.html`

1. `manifest.webmanifest`: name「戦国合戦 3D絵巻」、`display: standalone`、`background_color: #0a0d11`、`theme_color: #0a0d11`、アイコンは `assets/home/logo-crest.png` から 192/512px を生成して `assets/app/` に配置。**`start_url` と全パスは相対**（GitHub Pagesサブパス対応）。
2. `sw.js`: cache-first。プリキャッシュはトップ+CSS+JS+data のみ。合戦ページ・画像・three.min.js は runtime cache（cache-then-network）。キャッシュ名にバージョン接尾辞を付け、activate で旧世代を purge。
3. 全HTMLに `<link rel="manifest">` と SW 登録スニペット（`navigator.serviceWorker` 存在チェック付き、相対パス `../../sw.js` に注意。scope はサイトルート）。
4. 最終QA チェックリスト:
   - [ ] 18合戦 + トップ + 404 をコンソールエラーゼロで巡回
   - [ ] iPhone viewport (390x844, DevTools) でUI崩れなし・ピンチ/ドラッグ動作
   - [ ] CPU 4x throttle で自動ティアが low に落ち 30fps 前後を維持
   - [ ] `prefers-reduced-motion: reduce` エミュレートで主要モーション停止
   - [ ] `?fx=0` が完全に従来挙動
   - [ ] Lighthouse PWA installable 判定
   - [ ] オフラインでトップと訪問済み合戦ページが開く

---

## コミット規約

```
M0: feat: fx基盤（品質ティア/reduced-motion）
M1: feat: ライティング・空ドーム・影
M2: feat: 旗なびき・行進サイクル・個体差
M3: feat: 戦闘パーティクル基盤と主要6合戦への適用
M4: feat: 進軍矢印リボン化・注記調整
M5: feat: カメラショット演出とシェイク
M6: feat: トップ・UIモーション
M7: feat: 全合戦へ演出データ横展開
M8: feat: PWA対応と最終QA
```

各コミット前に `git status --short` で意図しないファイル混入がないこと。push は M8 完了後にまとめて、または各M完了ごと（どちらでも可）。

# 戦国シミュレーター 要件定義書 v1.0

種別判定: **種別1（情報サイト / 静的GitHub Pages）**
レビュー: Codex @Product Design

---

## サイト概要

| 項目 | 内容 |
|---|---|
| サイト名 | **戦国合戦 3D絵巻**（確定） |
| 目的 | 歴史上の合戦を「3D俯瞰絵巻」として体験できる入口を作る |
| 想定ユーザー | 歴史好きの日本人（40-60代）/ 若い歴史ファン / 大河ドラマ視聴層 |
| ユーザーの課題 | 合戦の地理・時間・部隊配置をテキストや静止画では理解しにくい |
| 提供価値 | 時刻スライダーで部隊の動きを追える3D体験 + NHK大河風の重厚感 |
| ユーザーにしてほしい行動 | トップで合戦を選ぶ → 各合戦ページで時刻を進めて見る → 別の合戦も見る |
| 最終ゴール | 「合戦コレクション」として継続的に作品が増えるサイトに育てる |
| 収益モデル | なし（趣味/技術発信ポートフォリオ） |
| 運用者 | darari（個人） |
| 初期リリース範囲 | トップ + 関ヶ原（公開済） + 桶狭間/川中島（番組予告風の準備中） |

---

## サイトマップ

| ページ | URL | 役割 |
|---|---|---|
| トップ | `/` | 合戦一覧（番組表風）。サイトの入口 |
| 関ヶ原 | `/battles/sekigahara/` | 3D俯瞰シミュレーター（完成済みコード移設） |
| 桶狭間 | `/battles/okehazama/` | 番組予告風の準備中ページ |
| 川中島 | `/battles/kawanakajima/` | 番組予告風の準備中ページ |
| 404 | `/404.html` | 戻り導線つきエラーページ |
| About | `/about/` | Phase 2で追加（Phase 1ではフッターリンクのみ） |

---

## ユーザー導線

```
[トップ] 
   ↓ 合戦カードをタップ
[各合戦ページ] 
   ↓ 時刻スライダー / 視点切替で体験
   ↓ ページ下部「他の合戦を見る」
[トップに戻る or 別の合戦へ]
```

---

## ディレクトリ構成

```
/
├─ index.html                      ← トップ（新規）
├─ .nojekyll                       ← Jekyll処理を無効化（必須）
├─ 404.html                        ← エラーページ
├─ battles/
│  ├─ sekigahara/index.html        ← 既存sekigahara/index.htmlを移設
│  ├─ okehazama/index.html         ← 番組予告風の準備中
│  └─ kawanakajima/index.html      ← 番組予告風の準備中
├─ assets/
│  ├─ ogp/                         ← OGP画像
│  └─ previews/                    ← カード用プレビュー画像
├─ styles/
│  └─ index.css                    ← トップ用CSS
└─ data/
   └─ battles-index.js             ← window.BATTLES = [...] 形式
```

**補足**: 
- GitHub Pages のJekyll処理を避けるため `.nojekyll` 必須
- Phase 1では関ヶ原ページを単一HTMLのまま移設し、共通化しない
- 旧プロトタイプ（ルートの `index.html` / `simulator.js` / `style.css` / `battle-data.js` / `sekigahara/`）は **新トップが動作確認できた後に削除**

---

## トップページUI/UX方針

### コンセプト
**「NHK大河ドラマの番組表 × 歴史絵巻」**

普通のカード一覧ではなく、**番組編成表らしさ**を出す。

### トーン
- 黒漆・金・和紙・深緑・墨
- 暗すぎず読みやすく
- Shippori Mincho B1（見出し）+ Zen Kaku Gothic New（本文）

### トップ構成

1. **ヘッダー**: サイト名 / About
2. **注目枠（今週の合戦）**: 関ヶ原を大きく表示
3. **番組表風コレクション**:
   - 公開中: 関ヶ原の戦い
   - 制作中: 桶狭間の戦い
   - 制作中: 川中島の戦い
4. **フッター**: 制作者 / 参考資料 / 史実注記

### 合戦カードに表示する情報

- 合戦名
- 年号 / 西暦 / 場所
- 主要人物（vs表記）
- **見どころ**（追加）
- **地形・戦術タグ**（追加）
- 公開状態（公開中/制作中）
- CTA: 「見る」 or 「予告を見る」

### モバイル方針
- 1カラム縦積み
- 注目枠コンパクト化
- カードは縦並び
- 十分なタップ領域

---

## 各合戦ページのテンプレート化方針

**Phase 1ではテンプレート化しない**。完成済みの `sekigahara/index.html` を `battles/sekigahara/` に**そのまま移設**する。

理由: 単一HTMLで完成しているため、無理に分割すると壊れるリスクが高い。

**Phase 4で共通化検討**（必要になったら）。

---

## デプロイ・インフラ

- **公開先**: GitHub Pages（既に有効）
- **URL**: https://darari-nu.github.io/sengoku-simulator/
- **ドメイン**: 独自ドメインなし
- **費用**: 無料
- **CDN**: Three.js r128 を cdnjs から読み込み（バージョン固定）

---

## GitHub Pages 注意点

- 静的HTML/CSS/JSのみ
- ルートに `.nojekyll` を必ず置く
- パスは**相対パス**で統一（`./battles/sekigahara/` 等）
- 日本語ファイル名禁止
- SPA化しない（静的多ページ）
- 公開後の確認URL:
  - `/`
  - `/battles/sekigahara/`
  - `/battles/okehazama/`
  - `/battles/kawanakajima/`
  - OGP/meta（Twitter Card Validator等）
  - モバイル表示

---

## SEO

| 要素 | 内容 |
|---|---|
| ターゲットキーワード | 関ヶ原 シミュレーター / 戦国 3D / 関ヶ原 部隊配置 / 歴史 ビジュアル |
| トップタイトル | 戦国合戦 3D絵巻 - 歴史を俯瞰で体験する |
| ディスクリプション | 関ヶ原・桶狭間・川中島など歴史上の合戦を3D俯瞰絵巻で体験できるサイト |
| OGP画像 | 関ヶ原3Dスクリーンショット（1200x630） |
| 構造化データ | Phase 2で検討 |

---

## 法務ページ

- プライバシーポリシー: 不要（個人情報収集なし）
- 利用規約: 不要
- **史実注記**: フッターに「これは歴史理解のための可視化であり厳密再現ではない」を明記
- クレジット: 制作者名 + 参考資料リストをフッターに

---

## 不確定事項への確定方針（Codex推奨）

| 項目 | 確定内容 |
|---|---|
| サイト名 | 「戦国合戦 3D絵巻」で確定 |
| About | Phase 1ではフッターリンクのみ。本文はPhase 2 |
| GA4 | Phase 1では入れない（プライバシーポリシー追加の手間回避） |
| 準備中ページ | 「Coming Soon」だけでなく**番組予告風カード**で見せる |

---

# 実装手順書（Phase 1）

## 目標
トップから関ヶ原に遷移できる + 番組予告風の準備中ページが見える状態をGitHub Pagesで公開。

## ステップ（Codex実行用bashコマンド）

```bash
# 0. 現状確認
pwd
git status --short
find . -maxdepth 3 -type f | sort

# 1. 必要ディレクトリ作成
mkdir -p battles/sekigahara battles/okehazama battles/kawanakajima styles data assets/ogp assets/previews

# 2. GitHub Pages の Jekyll 処理を無効化（必須）
touch .nojekyll

# 3. 完成済み関ヶ原ページを移設
cp sekigahara/index.html battles/sekigahara/index.html

# 4. トップ・CSS・データ・準備中・404を生成
# → 下記HTML生成プロンプトに従いCodex @Product Designで実装

# 5. ローカル確認
python3 -m http.server 8000
# ブラウザで確認:
# http://localhost:8000/
# http://localhost:8000/battles/sekigahara/
# http://localhost:8000/battles/okehazama/
# http://localhost:8000/battles/kawanakajima/

# 6. 表示確認後に旧プロトタイプを削除
rm -f index.html simulator.js style.css battle-data.js
# ※ 新トップ生成後にルート index.html は新ファイルになっているので、step 6の rm -f index.html は不要。
#    削除対象は simulator.js / style.css / battle-data.js / sekigahara/ のみ
rm -rf sekigahara

# 7. 最終確認 → commit & push
find . -maxdepth 3 -type f | sort
git status --short
git add -A
git commit -m "feat: 多合戦サイト Phase 1 - トップ＋関ヶ原移設＋準備中ページ"
git push origin main
```

## HTML生成プロンプト（Codex @Product Designに渡す）

```
静的GitHub Pages用に、以下のファイルを生成してください。

対象:
- index.html（トップ）
- styles/index.css
- data/battles-index.js
- battles/okehazama/index.html（番組予告風の準備中）
- battles/kawanakajima/index.html（番組予告風の準備中）
- 404.html

条件:
- 全ページ日本語
- 依存は外部ビルドなし。素のHTML/CSS/JSのみ
- トップは「NHK大河ドラマの番組表 × 歴史絵巻」コンセプト
- 黒漆、金、和紙、深緑、墨を使うが、暗すぎず読みやすく
- 見出しは Shippori Mincho B1、本文は Zen Kaku Gothic New（Google Fonts）
- index.html は ./styles/index.css と ./data/battles-index.js を読み込む
- data/battles-index.js は window.BATTLES = [...] として定義
- 関ヶ原カードは ./battles/sekigahara/ に遷移
- 桶狭間/川中島カードは準備中ページへ遷移
- カードには、合戦名、年号/西暦、場所、主要人物、見どころ、地形/戦術タグ、公開状態を表示
- 準備中ページは番組予告風（Coming Soon単独はNG）
- すべてのリンクはGitHub Pagesのサブパスで壊れない相対パスにする
- meta description、OGP基本タグ（og:title, og:description, og:image, twitter:card）
- aria-label、十分なタップ領域（44x44px以上）
- 404.html にはトップへ戻るリンクを置く
- フッターに史実注記「これは歴史理解のための可視化であり厳密再現ではない」
```

## 完了条件

- [ ] https://darari-nu.github.io/sengoku-simulator/ がトップとして表示される
- [ ] 関ヶ原カードから https://darari-nu.github.io/sengoku-simulator/battles/sekigahara/ に遷移できる
- [ ] 桶狭間/川中島の番組予告ページが表示される
- [ ] 404.html がトップへの戻り導線とともに表示される
- [ ] モバイル表示が破綻していない
- [ ] OGPタグがセットされている

---

# Phase 2以降

### Phase 2: 仕上げ
- ヒーローバナーに3D静止プレビュー画像
- OGP画像作成（関ヶ原スクショ）
- About ページ本実装
- 構造化データ追加検討

### Phase 3: 新合戦追加
- 桶狭間（奇襲・豪雨・狭隘地形）
- 川中島（霧・八幡原・啄木鳥戦法）

### Phase 4: 共通化（必要になったら）
- `scripts/battle-simulator.js`（Three.js共通処理）
- `data/<battle-id>.js`（合戦データ分離）
- `styles/battle.css`（UI共通CSS）

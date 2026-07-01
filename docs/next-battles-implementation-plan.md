# 追加三合戦 実行計画

対象:

- `battles/nagashino/index.html`
- `battles/yamazaki/index.html`
- `battles/mikatagahara/index.html`

## 方針

既存の桶狭間・川中島と同じく、各ページは `window.BATTLE_SCENE` に合戦データを定義し、共通ランタイム `scripts/battle-sim.js` で描画する。関ヶ原の単一HTMLは触らない。

## 実装順

1. 各合戦の要件定義を作る
2. トップ一覧 `data/battles-index.js` に3合戦を追加する
3. 各合戦ページを作る
4. `docs/visual-verification.md` に代表スクショ時刻を追加する
5. ローカルサーバーでトップと各ページを確認する
6. `verify=1&t=<時刻>&weather=0` で代表時刻のスクショを撮る
7. 通常表示で演出が部隊を隠しすぎないか確認する

## 品質基準

- 初回表示で3Dシーンが空白にならない
- 時刻スライダーで部隊位置、字幕、矢印が変わる
- 各合戦の決定的な戦術が画面上で読める
- 通常天候でも部隊ラベルが読める
- 検証モードで要件定義の時刻別確認ができる

## 追加後にやるべきこと

- 18合戦トップの情報密度をスマホで確認する
- 実スクショから OGP 画像を作る
- About / 参考資料ページを追加する
- 合戦データを将来的に `data/battles/<id>.js` へ分離するか検討する

# 追加十二合戦 品質チェック記録

実施日: 2026-07-01

## 確認環境

- ローカルサーバー: `python3 -m http.server 8018`
- 確認URL: `http://127.0.0.1:8018/`
- ブラウザ: Codex app 内蔵ブラウザ

## 確認結果

| 対象 | 確認内容 | 結果 |
|---|---|---|
| トップ | 合戦カードが18件表示される | OK |
| トップ | ヒーロー公開数が「18合戦」になっている | OK |
| トップ | 追加カード先頭の小牧・長久手、厳島、姉川の生成画像が表示される | OK |
| トップ | 追加カード末尾の月山富田城、大坂夏の陣、大坂冬の陣の生成画像が表示される | OK |
| モバイル | 390px幅トップで横スクロールなし | OK |
| 追加12ページ | 全slugでcanvas表示、エラー表示なし、転機ラベル5件以上 | OK |
| 小牧・長久手 | `verify=1&t=12.4&weather=0` で突撃局面、部隊ラベル、状態ラベル、転機ラベル表示 | OK |
| 厳島 | `verify=1&t=5.8&weather=0` で開戦局面、島嶼地形、部隊ラベル、転機ラベル表示 | OK |
| 大坂冬の陣 | `verify=1&t=12.6&weather=0` で真田丸攻防、砲列、状態ラベル、転機ラベル表示 | OK |
| 姉川 | `verify=1&t=8.6&weather=0` で織田・徳川が南岸、浅井・朝倉が北岸に見える | OK |
| 姉川 | `verify=1&t=10.1&weather=0` で姉川を越えた北岸寄りの衝突になっている | OK |
| 全18ページ | 代表時刻でページを順次開き、canvas表示、エラー表示なし、console error 0件 | OK |
| 長篠 | `verify=1&t=6&weather=0` で長篠城を設楽原東側、馬防柵を連吾川西岸寄りに表示 | OK |
| 長篠 | `verify=1&t=11.3&weather=0` で武田騎馬隊が連吾川を越え、馬防柵前で止まる構図 | OK |
| 大坂夏の陣 | note と終盤字幕を、城外突出部が包囲で崩れる実動に合わせて修正 | OK |

## スクショ保存先

- `/private/tmp/sengoku-add12-home.png`
- `/private/tmp/sengoku-add12-newcards.png`
- `/private/tmp/sengoku-add12-bottomcards-images.png`
- `/private/tmp/sengoku-add12-komaki-nagakute.png`
- `/private/tmp/sengoku-add12-itsukushima.png`
- `/private/tmp/sengoku-add12-osaka-winter.png`
- `/private/tmp/sengoku-add12-mobile-home.png`
- `/private/tmp/sengoku-anegawa-fixed-086.png`
- `/private/tmp/sengoku-anegawa-fixed-101.png`
- `/private/tmp/sengoku-nagashino-fixed-060.png`
- `/private/tmp/sengoku-nagashino-fixed-113.png`

## 地形監査

- 既存18合戦の相対地形監査は `docs/battles/terrain-audit-260701.md` に記録した。
- 姉川は修正前に、川を挟む説明と実座標が食い違っていたため修正済み。
- ナレーションと部隊移動の照合は `docs/battles/narration-audit-260701.md` に記録した。

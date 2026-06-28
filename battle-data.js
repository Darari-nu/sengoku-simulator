// 関ヶ原の戦い データ定義
const BATTLE_DATA = {
  title: "関ヶ原の戦い",
  date: "慶長5年9月15日（1600年10月21日）",

  // 武将データ（視点カメラ位置）
  generals: {
    overview: { name: "俯瞰", camera: { x: 0, y: 120, z: 80 }, lookAt: { x: 0, y: 0, z: 0 } },
    ieyasu:   { name: "徳川家康", camera: { x: 40, y: 30, z: 60 }, lookAt: { x: -10, y: 0, z: 0 }, army: "east" },
    mitsunari:{ name: "石田三成", camera: { x: -50, y: 25, z: -30 }, lookAt: { x: 10, y: 0, z: 10 }, army: "west" },
    hideaki:  { name: "小早川秀秋", camera: { x: -20, y: 40, z: -60 }, lookAt: { x: 0, y: 0, z: 0 }, army: "kobayakawa" },
  },

  // 軍勢初期配置（正規化座標 -50〜50）
  armies: {
    east: {
      color: 0xE84C4C,
      label: "東軍（徳川）",
      units: [
        { id: "ieyasu_main", name: "徳川家康 本隊", x: 35, z: 20, size: 3.0 },
        { id: "fukushima",   name: "福島正則",      x: 10, z: 10, size: 2.0 },
        { id: "kuroda",      name: "黒田長政",      x: 15, z: -5, size: 1.5 },
        { id: "ii",          name: "井伊直政",      x: 5,  z: 5,  size: 1.5 },
        { id: "hosokawa",    name: "細川忠興",      x: 20, z: -10, size: 1.5 },
      ]
    },
    west: {
      color: 0x4C9CE8,
      label: "西軍（石田）",
      units: [
        { id: "mitsunari_main", name: "石田三成 本隊", x: -35, z: -15, size: 2.5 },
        { id: "konishi",        name: "小西行長",      x: -15, z: 5,   size: 1.5 },
        { id: "ukita",          name: "宇喜多秀家",   x: -10, z: -5,  size: 2.0 },
        { id: "shimazu",        name: "島津義弘",     x: 0,   z: -15, size: 1.5 },
        { id: "otani",          name: "大谷吉継",     x: -25, z: -30, size: 1.0 },
      ]
    },
    kobayakawa: {
      color: 0xF0C040,
      label: "小早川（日和見）",
      units: [
        { id: "kobayakawa_main", name: "小早川秀秋", x: -20, z: -50, size: 2.0 },
      ]
    }
  },

  // 時間軸イベント（0〜100 = 午前8時〜午後2時）
  events: [
    { time: 0,  label: "開戦",     text: "両軍が対峙。濃霧の中、午前8時に開戦の火蓋が切られる。" },
    { time: 15, label: "福島前進",  text: "福島正則が中央突破を図り西軍へ突撃。" },
    { time: 30, label: "膠着",     text: "中央で激しい攻防。石田三成、指揮をとるも劣勢。" },
    { time: 50, label: "家康前進", text: "徳川家康が本隊を進める。小早川にまだ動きなし。" },
    { time: 65, label: "小早川裏切り", text: "⚡ 小早川秀秋が東軍に寝返り！西軍の崩壊が始まる。", key: "betrayal" },
    { time: 80, label: "西軍崩壊", text: "大谷吉継が戦死。西軍は総崩れ。石田三成は逃走。" },
    { time: 95, label: "決着",    text: "関ヶ原の戦い終結。わずか6時間で天下の行方が決まった。" },
    { time: 100,label: "戦後",    text: "徳川家康が天下を手中に。1603年、江戸幕府開幕へ。" },
  ],

  // IFモード: 小早川が動かなかった場合の軌跡
  ifEvents: [
    { time: 65, text: "（IFモード）小早川が動かず。西軍は踏みとどまる。" },
    { time: 80, text: "（IF）膠着が続く。東軍の補給が問題に…" },
    { time: 100, text: "（IF）この戦いは引き分け、あるいは西軍の勝利だったかもしれない。" },
  ]
};

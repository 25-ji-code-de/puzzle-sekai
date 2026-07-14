export const ja = {
  loading: "読み込み中",
  page: {
    title: "パズル⭐︎セカ | Puzzle × SEKAI",
  },
  welcome: {
    title: "パズル⭐︎セカ",
    subtitle: "～ Puzzle × SEKAI ～",
    desc: "Project SEKAIのメンバーを集めて<br>ブロックを消し、ハイスコアを目指そう！",
    click: "タップ／クリックで続ける",
  },
  menu: {
    title: "パズル⭐︎セカ",
    subtitle: "Puzzle × SEKAI",
    endless: "エンドレス",
    timeAttack: "タイムアタック",
    settings: "設定",
    controls: "操作説明",
    highScore: {
      endless: "エンドレス",
      timeAttack: "タイムアタック",
    },
  },
  settings: {
    title: "設定",
    speed: {
      label: "速度レベル",
      slow: "低速",
      normal: "普通",
      fast: "高速",
      faster: "超高速",
      hell: "地獄",
    },
    ta: {
      label: "タイムアタック時間",
      duration: "{seconds}秒",
    },
    groups: {
      label: "出現ユニット（最低3つ）",
    },
    item: {
      label: "アイテムドロップ確率",
      none: "なし",
      tooltip: "スコア倍率 ×{factor}",
    },
    fun: {
      label: "お楽しみモード（1つでもONで有効）",
      help: "チップを選ぶと説明が表示されます",
      itemLinked: "（アイテム率連動）",
    },
    difficulty: {
      label: "難易度 / スコア倍率",
      entertainment: "お楽しみ",
      info: "ⓘ 詳細",
      breakdownTitle: "スコア倍率の内訳",
      total: "合計",
      diffLine: "難易度 {difficulty}（速度{speed} · {groups}ユニット）",
      itemLine: "アイテムドロップ {rate}",
      funLineItemLinked: "{name}（アイテム率連動）",
    },
    lang: {
      label: "言語 / Language",
    },
  },
  difficulty: {
    1: "Easy",
    2: "Normal",
    3: "Hard",
    4: "Expert",
    5: "Master",
    6: "Re:Master",
    7: "Append",
  },
  fun: {
    mikudayo: {
      name: "「ミクダヨー！」",
      subtitle: "「セカイ」からの来訪者",
      description:
        "ミクダヨーは特製の 2×2 巨大ピースとして落下します。消去判定では、どの「ミク」ユニットの一員としても数えられます。さらに消去時、隣接する異なるユニットをまとめて連鎖消去できます。",
    },
    kanadeSlow: {
      name: "奏で灯す空",
      subtitle: "か細い呼吸と、消えていく引力",
      description:
        "「奏」の落下中、自身の落下速度は常に 50% 低下します。\n着地後、その減速は「余韻」となり後続ピースへ伝わり、全体の落下速度は時間とともに徐々に回復します。「奏」が場から消去されると、この回復効果は即座に解除されます。\n\n「音の響きが、まだ残っているから……」",
    },
    wonderBlast: {
      name: "ワンダー爆破",
      subtitle: "It's Showtime！",
      description:
        "「類」と「ネネロボ」が隣接した状態で消去されると、ステージ大爆発が起き、場のピースがランダムに吹き飛ばされます。\n爆発で巻き込まれる数は、その消去に含まれる「類」と「ネネロボ」の合計に比例します。この効果によるコンボは「消したピース数 ÷ 5（切り捨て）」で計算されます。\n\n「さあ、最高のショウタイムだ！ネネロボ、出力最大に――！」",
    },
    shizukuSwap: {
      name: "コンパスの悪戯",
      subtitle: "「え？ここはどこ……？」",
      description:
        "「雫」を消去すると「異変」が発生し、左右移動と左右回転がすべて反転します。\n場に「志歩」がいる間は発動しません。異変中に「志歩」が着地すると、残り時間に関係なく異変は即座に強制解除されます。\n\n「あら……反対方向だったかしら？なんだか、少し遠回りしちゃったみたい……」",
    },
    itemAllergy: {
      name: "オレンジ警報！",
      subtitle: "絶対に直視してはいけない「あれ」",
      description:
        "落下中の「絵名」または「彰人」が場の「にんじん」に触れると、「本能的な拒絶」が発動し、そのキャラクターピースは即座に消滅します。\n操作中、この二人を拒絶が起きる列へ自ら移動させることはできません。重力で隣接マスへ落ちた場合は、拒絶チェックが再実行されます。なお、「にんじん」自体はこの効果では消えません。\n\n「バカ彰人！そのオレンジのやつ遠ざけて！」「……その言葉、そっくりそのまま返すわ、絵名」",
    },
    mizukiShift: {
      name: "ポテト重力場",
      subtitle: "香りをたどって、捕獲成功♪",
      description:
        "場に「ポテト」があるとき、着地後に必ずポテトと隣接する列がすべて「トリガー列」としてロックされます。この間「瑞希」は、それらの列のあいだだけをジャンプ移動できます。接触可能な列がなければ、移動は通常どおりに戻ります。\nさらに「ポテト」が着地すると、最も近い「瑞希」が強制的に吸い寄せられ、その真上へ移動します。\n\n「ポテトの匂いをたどっていけば、きっとあの、こっそり近づいてくる姿を捕まえられるよね♪」",
    },
    emuShrink: {
      name: "鳳の生存法則",
      subtitle: "「ひゃっ——！縮まないと……！」",
      description:
        "「えむ」と「まふゆ」が隣接マスにいると、「えむ」は驚いて 1×1 の単マスに縮みます。縮む向きは「まふゆ」からできるだけ離れる側を優先します。縮み終わると、場全体の重力と物理落下判定が再実行されます。\n\n「なんだか……朝比奈先輩の隣にいるときは、きゅっと縮んでないと、すっごく恐ろしいことが起きる気がするの——！」",
    },
  },
  inGame: {
    combo: "コンボ",
    timeLeft: "残り時間",
  },
  hsTags: {
    record: "記録",
    entertainment: "お楽しみ",
    entCompact: "FUN",
  },
  controls: {
    title: "操作説明",
    keyboard: "キーボード",
    mobile: "タッチ",
    close: "閉じる",
    moveLeftRight: "← → 左右移動",
    rotateClockwise: "↑ / X 時計回り回転",
    rotateCounter: "Z / Ctrl 反時計回り回転",
    softDrop: "↓ 加速落下",
    hardDrop: "Space ハードドロップ",
    restart: "R リスタート",
    swipeMove: "← → スワイプで左右移動",
    tapRotate: "画面の左/右側をタップで回転",
    swipeHardDrop: "下スワイプでハードドロップ",
    pressSoftDrop: "長押しで加速落下",
  },
  noscript: {
    title: "ブラウザ非対応",
    message:
      "白い画面が表示されている場合、お使いのブラウザが WebGL に対応していない可能性があります。<br/>Chrome などのモダンブラウザをお試しください。",
  },
  footer: {
    original: "原作",
    inspiration: "インスピレーション",
    thisProject: "本作",
    author: "作者",
  },
};

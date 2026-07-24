export const ja = {
  loading: "読み込み中",
  page: {
    title: "パズル⭐︎セカ | Puzzle × SEKAI",
    description:
      "気がつけば「セカイ」はカラフルなブロックでできたパズルの世界に。ユニットのメンバーを揃えて消し、ハイスコアを目指そう！（Project SEKAI ファン作品）",
    keywords:
      "パズル⭐︎セカ,Puzzle SEKAI,プロジェクトセカイ,プロセカ,PJSK,Project SEKAI,初音ミク,ボーカロイド,バーチャルシンガー,パズル,ブロック消し,落ち物,ファンゲーム,エンドレス,タイムアタック,デイリーチャレンジ,ユニット,Leo/need,MORE MORE JUMP,Vivid BAD SQUAD,ワンダーランズ×ショウタイム,25時,ナイトコード,NeneRobo,Mikudayo,ハイスコア,ブラウザゲーム,PixiJS",
  },
  welcome: {
    title: "パズル⭐︎セカ",
    subtitle: "～ Puzzle × SEKAI ～",
    desc: "Project SEKAIのメンバーを集めて<br>ブロックを消し、ハイスコアを目指そう！",
    click: "タップ／クリックで続ける",
    disclaimer: "セカイは、パズルになった。 · By 1806",
    howto: "遊び方",
    howtoClose: "閉じる",
  },
  menu: {
    title: "パズル⭐︎セカ",
    subtitle: "Puzzle × SEKAI",
    endless: "エンドレス",
    timeAttack: "タイムアタック",
    daily: "デイリー",
    settings: "設定",
    controls: "操作説明",
    about: "について",
    highScore: {
      endless: "エンドレス",
      timeAttack: "タイムアタック",
      daily: "デイリー",
      tapToSwitch: "タップで記録切替",
    },
  },
  display: {
    rotateLandscape: "端末を横向きにしてプレイしてください",
  },
  a11y: {
    matchStart: "対戦開始。モード：{mode}。",
    score: "スコア {score}",
    scoreCombo: "スコア {score}、コンボ {combo}",
    timeLow: "残り時間 {time}",
    paused: "一時停止",
    resumed: "再開",
    gameOver: "ゲームオーバー。最終スコア {score}。",
    menu: "メインメニュー",
    mainMenu: "メインメニュー",
  },
  pause: {
    title: "一時停止",
    resume: "続ける",
    restart: "やり直す",
    menu: "メニューに戻る",
    button: "一時停止",
  },
  gameOver: {
    title: "ゲームオーバー",
    mode: "モード",
    score: "スコア",
    highScore: "ハイスコア",
    maxCombo: "COMBO",
    multiplier: "倍率",
    difficulty: "難易度",
    groups: "ユニット消去",
    newRecord: "新記録！",
    share: "カードを共有",
    shareFailed: "共有に失敗しました",
    shareText: "パズル⭐︎セカで {score} 点出したよ！",
    shareTextNamed: "{name} がパズル⭐︎セカで {score} 点出したよ！",
    restart: "もう一度",
    menu: "メニューに戻る",
  },
  replay: {
    watchAgain: "もう一度見る",
  },
  dan: {
    none: "段位なし",
    beginner: "初級",
    intermediate: "中級",
    advanced: "高級",
    expert: "達人",
    kaiden: "皆伝",
    hiden: "秘伝",
    shinKaiden: "真・皆伝",
    shinHiden: "真・秘伝",
    gokuden: "極伝",
    promoted: "段位アップ！",
    rating: "段位点 {total}",
  },
  auth: {
    login: "SEKAIでログイン",
    loginShort: "ログイン",
    loggingIn: "ログイン中…",
    logout: "ログアウト",
    syncing: "同期中…",
    syncOk: "同期済み",
    syncFailed: "同期失敗",
    notConfigured: "ログイン未設定（client_id なし）",
    loggedInAs: "{name}",
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
    orientation: {
      label: "落下の向き",
      inverted: "頭下がり",
      upright: "頭上向き",
      invertedHelp:
        "キャラクターが逆さま（頭を下）で落下します（デフォルト）。判別はやや難しく、スコア倍率は標準です。",
      uprightHelp:
        "キャラクターが正位置（頭を上）で落下します。判別しやすく、スコア倍率はやや下がります。",
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
      orientLine: "落下の向き · {orient}",
      funLineItemLinked: "{name}（アイテム率連動）",
      starHint:
        "難易度名（Easy～Append）は落下速度と出場ユニット数で決まります。アイテム・向き・お楽しみはスコア倍率だけを変え、難易度名自体は変わりません。ランクや段位はプレイの上手さを見るので、倍率を下げても評価は下がりません。",
    },
    lang: {
      label: "言語 / Language",
    },
    audio: {
      label: "音量",
      bgm: "BGM",
      sfx: "効果音",
      voice: "ボイス",
    },
    performance: {
      label: "パフォーマンス",
      normal: "標準",
      low: "低負荷",
      normalHelp:
        "フル解像度バッファで描画（最も鮮明）。レイアウトと操作は同じです。",
      lowHelp:
        "描画バッファを半分（画素は約1/4）。少し柔らかく見えますが、レイアウト・判定・操作範囲は変わりません。",
    },
    display: {
      label: "表示モード",
      windowed: "ウィンドウ",
      borderless: "ボーダーレス",
      fullscreen: "フルスクリーン",
      windowedHelp: "ウィンドウ表示。ゲーム開始時に全画面にはなりません。",
      windowedWebHelp: "通常のページ表示。ゲーム開始時に全画面にはなりません。",
      borderlessHelp:
        "タイトルバーなしで画面いっぱいに表示（デスクトップ版のみ）。",
      fullscreenHelp: "フルスクリーン。ゲーム開始時に自動で切り替わります。",
    },
    touchControl: {
      label: "タッチ操作",
      stick: "スティック",
      gesture: "ジェスチャー",
      drag: "ドラッグ",
      zones: "ゾーン",
      stickHelp:
        "標準。タッチでスティックを表示し、倒してピースを移動。中心を長押しでハードドロップ。",
      gestureHelp:
        "クラシック操作。スワイプで移動、そのまま押さえて加速落下、フリックでハードドロップ、タップで回転。",
      dragHelp: "指を動かした距離だけピースを移動。高速操作向け。",
      zonesHelp:
        "左右端を押さえて移動、中央をタップで回転、下端を押さえて加速落下。",
      nextPieceHint: "次のピースから反映",
    },
    replays: {
      label: "リプレイ",
      watch: "リプレイを見る",
      empty: "見られるリプレイはまだありません。",
      help: "truePhysics 以外の直近 20 プレイを端末内に保存します。",
    },
    data: {
      label: "データ / キャッシュ",
      clearCache: "キャッシュを削除",
      clearData: "データを削除",
      clearCacheConfirm:
        "オフライン用キャッシュ（音声・フォントなど）を削除しますか？設定とハイスコアは残ります。",
      clearDataConfirm:
        "ローカル設定・言語・すべてのハイスコア・保存済みリプレイを削除しますか？この操作は取り消せません。",
      clearCacheDone: "キャッシュを削除しました",
      clearDataDone: "データを削除しました。再読み込みします",
      clearFailed: "失敗しました。しばらくしてから再試行してください。",
      working: "処理中…",
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
        "同一消去内で「類」と「ネネロボ」が隣接していると、ステージ大爆発が起き、場の他ピースがランダムに吹き飛ばされます（複数マスピースはまとめて消滅）。\n巻き込まれる数はおおよそ「2 + 2 ×（その消去の類＋ネネロボのスプライト数）」、上限 12・盤面の半分まで。爆破で消えたマス数ぶんが一度に加点されます。\n\n「さあ、最高のショウタイムだ！ネネロボ、出力最大に――！」",
    },
    shizukuSwap: {
      name: "コンパスの悪戯",
      subtitle: "「え？ここはどこ……？」",
      description:
        "「雫」を消去すると「異変」が発生し、左右移動と左右回転がすべて反転します。解除されるまで継続します。\n消去時に場に「志歩」がいると発動しません。異変中に「志歩」が着地する（または場に再びいる）と、異変は即座に強制解除されます。\n\n「あら……反対方向だったかしら？なんだか、少し遠回りしちゃったみたい……」",
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
        "場に「ポテト」があるとき、着地後に必ずポテトと隣接する列がすべて「トリガー列」としてロックされます。この間「瑞希」は、それらの列のあいだだけをジャンプ移動できます。接触可能な列がなければ、移動は通常どおりに戻ります。\nさらに「ポテト」が着地すると、最も近い「瑞希」が強制的に吸い寄せられ、その真上へ移動します。\n「瑞希」が「ポテト」と隣接すると、すぐに食べてしまい（ポテトは消滅）、追加スコアが入ります。\n\n「ポテトの匂いをたどっていけば、きっとあの、こっそり近づいてくる姿を捕まえられるよね♪」",
    },
    emuShrink: {
      name: "鳳の生存法則",
      subtitle: "「ひゃっ——！縮まないと……！」",
      description:
        "「えむ」と「まふゆ」が隣接マスにいると、「えむ」は驚いて 1×1 の単マスに縮みます。縮む向きは「まふゆ」からできるだけ離れる側を優先します。縮み終わると、場全体の重力と物理落下判定が再実行されます。\n\n「なんだか……朝比奈先輩の隣にいるときは、きゅっと縮んでないと、すっごく恐ろしいことが起きる気がするの——！」",
    },
    cantilever: {
      name: "片持ちフリップ",
      subtitle: "片側だけ支えられていたら、そちらへ倒れる",
      description:
        "簡易物理エンジンのひとつ。重力が落ち着いたあと、横に複数列あるピース（横置き 2 マス、2×2 のネネロボ／ミクダヨーを含む）が底辺の片側だけ支えられ反対側が宙に浮いていると、支点側の端を軸に浮いている側へ 90° 剛体回転し、その後ふたたび重力で落下します。縦置き 2 マスは発動しません。\nその構造だけに乗っている上のピースも一緒に持ち上がって回転します。上から別の支えで固定されていると倒れません。回転後は接触系効果（えむ縮み・消去判定など）がすぐ再実行されます。\n「本格物理」とは排他で、どちらか一方のみ選べます。\n\n「支点……ちょっと危うくない？」",
    },
    truePhysics: {
      name: "本格物理",
      subtitle: "重心とモーメント、そして大崩壊",
      description:
        "フル剛体物理エンジン（Rapier2D）。質量・摩擦・モーメントで本物のように落下・積み上がり、転倒・滑落・連鎖崩壊が起きます。ユニット消去は格子ではなく接触近接で判定します。\n初回オン時に物理エンジン一式をダウンロードします。「片持ちフリップ」とは排他です。\n\n「……ニュートンさん、このセカイには優しくしてね」",
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
    rotateCounter: "Ctrl / Z 反時計回り回転",
    softDrop: "↓ 加速落下",
    hardDrop: "Space ハードドロップ",
    restart: "R リスタート",
    pause: "Esc / P 一時停止（左上ボタンでも可）",
    swipeMove: "タッチでスティック表示 · 傾けると動く、遠いほど速い",
    tapRotate: "左右半分を短くタップで回転",
    swipeHardDrop: "中心を長押しでハードドロップ",
    pressSoftDrop: "スティックを下に倒して加速落下",
    easterEgg: "えむ / ネネロボ落下中 · Shift+↑ または上フリック で1マス上昇",
    modeStickMove: "タッチでスティック表示 · 倒して移動",
    modeStickRotate: "左右半分を短くタップで回転",
    modeStickSoft: "スティックを下に倒して加速落下",
    modeStickHard: "中心を長押しでハードドロップ · 下フリックでも可",
    modeGestureMove: "左右スワイプで1マス移動",
    modeGestureRotate: "左右半分を短くタップで回転",
    modeGestureSoft: "そのまま押さえて加速落下",
    modeGestureHard: "下フリックでハードドロップ · 上フリックで上昇",
    modeDragMove: "ドラッグでピースを移動",
    modeDragRotate: "左右半分を短くタップで回転",
    modeDragSoft: "下にドラッグして押さえると加速落下",
    modeDragHard: "下フリックでハードドロップ · 上フリックで上昇",
    modeZonesMove: "左右端を押さえて移動",
    modeZonesRotate: "中央をタップで回転",
    modeZonesSoft: "下端を押さえて加速落下",
    modeZonesHard: "中央を長押しでハードドロップ · 下フリックでも可",
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
    support: "支援",
    feedback: "フィードバック",
  },
  about: {
    title: "クレジット",
    version: "バージョン",
    afdian: "愛発電 (Afdian)",
    reportIssue: "Issue を作成",
    disclaimerTitle: "免責事項",
    disclaimerP1:
      "本プロジェクト（パズル⭐︎セカ / puzzle-sekai）は非公式のファン作品であり、SEGA、Colorful Palette、Crypton Future Media とは一切関係ありません。",
    disclaimerP2:
      "本プロジェクトで使用しているすべてのゲーム素材（映像、音声、画像、キャラクターデザイン、スクリプト等を含む）の著作権は <strong>© SEGA</strong>、<strong>© Colorful Palette Inc.</strong> および <strong>© Crypton Future Media, INC.</strong> に帰属します。",
    disclaimerP3:
      "本プロジェクトは学習・研究・個人鑑賞のみを目的としており、<strong>あらゆる商業利用・営利活動を固く禁じます</strong>。開発者は、本プロジェクトの利用に起因する直接・間接の損害について責任を負いません。",
    disclaimerP4:
      "権利者の方で本プロジェクトが権利を侵害していると判断される場合は、開発者までご連絡ください。速やかに対応いたします。",
    disclaimerAgree:
      "本サイトを利用することで、上記の条項を読み同意したものとみなします。",
  },
};

export const en = {
  loading: "Loading",
  page: {
    title: "Puzzle ⭐︎ SEKAI",
    description:
      "The world has turned into a puzzle of colorful blocks. Gather unit members, clear the board, and chase high scores! Unofficial Project SEKAI fan work.",
    keywords:
      "Puzzle SEKAI,パズル⭐︎セカ,Project SEKAI,PJSK,Hatsune Miku,Vocaloid,virtual singer,puzzle game,block puzzle,match-3,fan game,endless mode,time attack,daily challenge,unit clear,Leo/need,MORE MORE JUMP,Vivid BAD SQUAD,Wonderlands Showtime,Nightcord,NeneRobo,Mikudayo,high score,browser game,PixiJS",
  },
  welcome: {
    title: "パズル⭐︎セカ",
    subtitle: "～ Puzzle × SEKAI ～",
    desc: "Gather the members of Project SEKAI,<br>clear the blocks, and chase the high score!",
    click: "Tap / Click to Continue",
    disclaimer: "セカイは、パズルになった。 · By 1806",
    howto: "How to play",
    howtoClose: "Close",
  },
  menu: {
    title: "パズル⭐︎セカ",
    subtitle: "Puzzle × SEKAI",
    endless: "Endless",
    timeAttack: "Time Attack",
    daily: "Daily",
    settings: "Settings",
    controls: "Controls",
    about: "About",
    highScore: {
      endless: "Endless",
      timeAttack: "Time Attack",
      daily: "Daily",
      tapToSwitch: "Tap to switch records",
    },
  },
  display: {
    rotateLandscape: "Rotate your device to landscape to play",
  },
  a11y: {
    matchStart: "Match started. Mode: {mode}.",
    score: "Score {score}",
    scoreCombo: "Score {score}, combo {combo}",
    timeLow: "Time left {time}",
    paused: "Paused",
    resumed: "Resumed",
    gameOver: "Game over. Final score {score}.",
    menu: "Main menu",
    mainMenu: "Main menu",
  },
  pause: {
    title: "Paused",
    resume: "Continue",
    restart: "Restart",
    menu: "Quit to menu",
    button: "Pause",
  },
  gameOver: {
    title: "Game Over",
    mode: "Mode",
    score: "Score",
    highScore: "High Score",
    maxCombo: "COMBO",
    multiplier: "Multiplier",
    difficulty: "Difficulty",
    groups: "Unit Clears",
    newRecord: "New Record!",
    share: "Share card",
    shareFailed: "Couldn't share",
    shareText: "I scored {score} in パズル⭐︎セカ!",
    shareTextNamed: "{name} scored {score} in パズル⭐︎セカ!",
    restart: "Play again",
    menu: "Back to menu",
  },
  replay: {
    watchAgain: "Watch again",
  },
  dan: {
    none: "Unranked",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    expert: "Expert",
    kaiden: "Kaiden",
    hiden: "Hiden",
    shinKaiden: "Shin Kaiden",
    shinHiden: "Shin Hiden",
    gokuden: "Gokuden",
    promoted: "Dan up!",
    rating: "Rating {total}",
  },
  auth: {
    login: "Sign in with SEKAI",
    loginShort: "Sign in",
    loggingIn: "Signing in…",
    logout: "Sign out",
    syncing: "Syncing…",
    syncOk: "Synced",
    syncFailed: "Sync failed",
    notConfigured: "Login not configured (missing client_id)",
    loggedInAs: "{name}",
  },
  settings: {
    title: "Settings",
    speed: {
      label: "Speed Level",
      slow: "Slow",
      normal: "Normal",
      fast: "Fast",
      faster: "Faster",
      hell: "Hell",
    },
    ta: {
      label: "Time Attack Duration",
      duration: "{seconds}s",
    },
    groups: {
      label: "Active Units (min. 3)",
    },
    item: {
      label: "Item Drop Rate",
      none: "None",
      tooltip: "Score multiplier ×{factor}",
    },
    orientation: {
      label: "Falling Orientation",
      inverted: "Inverted",
      upright: "Normal",
      invertedHelp:
        "Characters fall inverted (default). Harder to read; standard score mult.",
      uprightHelp:
        "Characters fall right-side up. Easier to recognize; slightly lower score mult.",
    },
    fun: {
      label: "Fun Modes (any ON enables Fun Mode)",
      help: "Select a chip to view its description",
      itemLinked: " (item-linked)",
    },
    difficulty: {
      label: "Difficulty / Score Multiplier",
      entertainment: "Fun",
      info: "ⓘ Details",
      breakdownTitle: "Score Multiplier Breakdown",
      total: "Total",
      diffLine: "Difficulty {difficulty} (Speed {speed} · {groups} units)",
      itemLine: "Item Drop {rate}",
      orientLine: "Falling Orientation · {orient}",
      funLineItemLinked: "{name} (item-linked)",
      starHint:
        "Your difficulty name (Easy–Append) comes from fall speed and how many units you field. Items, orientation, and fun modes only change the score multiplier — not the difficulty name. Rank and dan grade how you play, so turning the mult down won’t cost you the grade.",
    },
    lang: {
      label: "Language / 言語",
    },
    audio: {
      label: "Volume",
      bgm: "BGM",
      sfx: "SFX",
      voice: "Voice",
    },
    performance: {
      label: "Performance",
      normal: "Normal",
      low: "Low",
      normalHelp:
        "Full render buffer (sharpest). Layout and controls unchanged.",
      lowHelp:
        "Half render buffer (~¼ pixels). Looks softer; layout, hitboxes, and controls stay the same.",
    },
    display: {
      label: "Display mode",
      windowed: "Windowed",
      borderless: "Borderless",
      fullscreen: "Fullscreen",
      windowedHelp:
        "Normal resizable window. The game won't auto-fullscreen on start.",
      windowedWebHelp:
        "Normal page layout. The game won't auto-fullscreen on start.",
      borderlessHelp: "Borderless maximized window (desktop app only).",
      fullscreenHelp: "Fullscreen (entered on start or when selected).",
    },
    replays: {
      label: "Replays",
      watch: "Watch replay",
      empty: "No saved replays yet.",
      help: "Stores the latest 20 non-truePhysics runs locally.",
    },
    data: {
      label: "Data / Cache",
      clearCache: "Clear cache",
      clearData: "Clear data",
      clearCacheConfirm:
        "Clear downloaded offline caches (audio, fonts, etc.)? Settings and high scores stay intact.",
      clearDataConfirm:
        "Clear local settings, language, all high scores, and saved replays? This cannot be undone.",
      clearCacheDone: "Cache cleared",
      clearDataDone: "Data cleared — reloading",
      clearFailed: "Something went wrong. Please try again.",
      working: "Working…",
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
      name: "「Mikudayo!」",
      subtitle: "A visitor from another SEKAI",
      description:
        "Mikudayo falls as a special 2×2 mega piece. In clear checks, she counts as a member of any Miku unit. When she is cleared, she can chain-clear different adjacent units together.",
    },
    kanadeSlow: {
      name: "Melody-Lit Sky",
      subtitle: "Faint breath, fading gravity",
      description:
        'While falling, Kanade\'s drop speed is fixed at −50%.\nOnce she lands, that slowdown becomes a lingering "afterglow" that passes to later pieces, with overall drop speed recovering gradually over time. If Kanade is cleared from the board, the recovery effect ends at once.\n\n"As long as the notes have not fully fallen silent..."',
    },
    wonderBlast: {
      name: "Wonder Blast",
      subtitle: "It's Showtime!",
      description:
        'When Rui and NeneRobo are adjacent in the same clear, a stage-wide explosion blasts random other pieces off the board (multi-cell pieces are removed whole).\nBlast count is about "2 + 2 × (Rui + NeneRobo sprites in that clear)", capped at 12 and half the board. Score is awarded once for the cells removed by the blast.\n\n"And now—the finest Showtime of all! NeneRobo, maximum output!!"',
    },
    shizukuSwap: {
      name: "Compass Mischief",
      subtitle: "「Huh? Where is this...?」",
      description:
        'Clearing Shizuku triggers an "anomaly": left/right movement and left/right rotation are fully inverted, and it stays on until cleared.\nIf Shiho is already on the board when Shizuku is cleared, the effect does not activate. If Shiho lands during the anomaly (or is present again), the anomaly ends immediately.\n\n"Oh my... so that was the wrong way? I feel like we took a bit of a detour..."',
    },
    itemAllergy: {
      name: "Orange Alert!",
      subtitle: "The thing you must never look at",
      description:
        'When falling Ena or Akito touches a carrot on the board, instinctive rejection kicks in and the character piece vanishes instantly.\nDuring control, you cannot intentionally move either of them into a column that would trigger rejection. If gravity drops them into an adjacent cell, the rejection check runs again. Note: the carrot itself never disappears from this effect.\n\n"Idiot Akito! Get that orange thing away!" "...I\'m giving those exact words right back to you, Ena."',
    },
    mizukiShift: {
      name: "French Fries Gravity Field",
      subtitle: "Follow the scent—capture complete ♪",
      description:
        'While French fries are on the board, every column that would land adjacent to fries is locked as a trigger column. Mizuki can only jump between those columns. If no contact columns exist, movement returns to normal.\nAlso, when fries land, the nearest Mizuki is forcibly pulled and shifted directly above them.\nIf Mizuki ends up adjacent to fries, the fries are instantly eaten (and vanish) for bonus score.\n\n"If you follow the smell of fries, you\'ll definitely catch that figure quietly sidling over ♪"',
    },
    emuShrink: {
      name: "Otori Survival Rule",
      subtitle: "「Eek—! I have to shrink...!」",
      description:
        "When Emu and Mafuyu occupy adjacent cells, Emu panics and collapses into a 1×1 single cell. The collapse shift prioritizes the side farther from Mafuyu. After collapsing, the whole board re-runs gravity and physics.\n\n\"I just feel like... when I'm next to Asahina-senpai, if I don't quietly curl up small, something really terrifying will happen...!\"",
    },
    cantilever: {
      name: "Cantilever Tip",
      subtitle: "Support on one side—over it goes",
      description:
        'One of the simplified physics engines. After gravity settles: multi-column pieces (horizontal 2-cell, and 2×2 NeneRobo / Mikudayo) with support on only one bottom side tip 90° as a rigid body toward the hang, then fall again. Vertical 2-cell pieces never tip.\nPieces resting only on that structure are pried up and rotate with it; external support above can pin the tip. After tipping, contact effects (Emu shrink, clears, etc.) re-run immediately.\nMutually exclusive with True Physics.\n\n"That fulcrum... doesn\'t look very stable."',
    },
    truePhysics: {
      name: "True Physics",
      subtitle: "Center of mass, torque, then chaos",
      description:
        'Full rigid-body physics powered by Rapier2D. Pieces fall and stack with real mass, friction, and torque; stacks can topple, slide, and cascade-collapse. Group clears use contact proximity instead of the grid.\nThe physics engine package is downloaded the first time you enable this mode. Mutually exclusive with Cantilever Tip.\n\n"...Sir Isaac, please be gentle with this SEKAI."',
    },
  },
  inGame: {
    combo: "Combo",
    timeLeft: "Time Left",
  },
  hsTags: {
    record: "Record",
    entertainment: "Fun",
    entCompact: "FUN",
  },
  controls: {
    title: "Controls",
    keyboard: "Keyboard",
    mobile: "Touch",
    close: "Close",
    moveLeftRight: "← → Move left / right",
    rotateClockwise: "↑ / X Rotate clockwise",
    rotateCounter: "Ctrl / Z Rotate counter-clockwise",
    softDrop: "↓ Soft drop",
    hardDrop: "Space Hard drop",
    restart: "R Restart",
    pause: "Esc / P Pause (or the top-left button)",
    swipeMove: "Drag to steer",
    tapRotate: "Short-tap left half CCW / right half CW",
    swipeHardDrop: "Fast flick down to hard drop",
    pressSoftDrop: "Drag down to soft drop (still steerable)",
    easterEgg:
      "While falling, Emu / NeneRobo — keyboard Shift+↑ · fast flick up — lift one cell",
  },
  noscript: {
    title: "Browser Not Supported",
    message:
      "If you see a blank page, your browser may not support WebGL.<br/>Please try a modern browser such as Chrome.",
  },
  footer: {
    original: "Original",
    inspiration: "Inspired by",
    thisProject: "This project",
    author: "Author",
    support: "Support",
    feedback: "Feedback",
  },
  about: {
    title: "About",
    version: "Version",
    afdian: "Afdian",
    reportIssue: "Open an issue",
    disclaimerTitle: "Disclaimer",
    disclaimerP1:
      "This project (パズル⭐︎セカ / puzzle-sekai) is an unofficial fan work and is not affiliated with SEGA, Colorful Palette, or Crypton Future Media.",
    disclaimerP2:
      "All game assets used in this project (including but not limited to video, audio, images, character designs, and scripts) are copyrighted by <strong>© SEGA</strong>, <strong>© Colorful Palette Inc.</strong>, and <strong>© Crypton Future Media, INC.</strong>",
    disclaimerP3:
      "This project is intended for learning, research, and personal enjoyment only. <strong>Any commercial use or monetization is strictly prohibited</strong>. The developer is not liable for any direct or indirect damages arising from the use of this project.",
    disclaimerP4:
      "If you are a rights holder and believe this project infringes your rights, please contact the developer and we will take appropriate action promptly.",
    disclaimerAgree:
      "By using this site, you acknowledge that you have read and agree to the above terms.",
  },
};

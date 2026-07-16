export const en = {
  loading: "Loading",
  page: {
    title: "Puzzle ⭐︎ SEKAI",
    description:
      "A Project SEKAI-themed puzzle game. Clear blocks with unit members and chase high scores. Unofficial fan work.",
  },
  welcome: {
    title: "パズル⭐︎セカ",
    subtitle: "～ Puzzle × SEKAI ～",
    desc: "Gather the members of Project SEKAI,<br>clear the blocks, and chase the high score!",
    click: "Tap / Click to Continue",
  },
  menu: {
    title: "パズル⭐︎セカ",
    subtitle: "Puzzle × SEKAI",
    endless: "Endless",
    timeAttack: "Time Attack",
    settings: "Settings",
    controls: "Controls",
    about: "About",
    highScore: {
      endless: "Endless",
      timeAttack: "Time Attack",
    },
  },
  display: {
    rotateLandscape: "Rotate your device to landscape to play",
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
    restart: "Play again",
    menu: "Back to menu",
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
      funLineItemLinked: "{name} (item-linked)",
    },
    lang: {
      label: "Language / 言語",
    },
    data: {
      label: "Data / Cache",
      clearCache: "Clear cache",
      clearData: "Clear data",
      clearCacheConfirm:
        "Clear downloaded offline caches (audio, fonts, etc.)? Settings and high scores stay intact.",
      clearDataConfirm:
        "Clear local settings, language, and all high scores? This cannot be undone.",
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
        "While falling, Kanade's drop speed is fixed at −50%.\nOnce she lands, that slowdown becomes a lingering \"afterglow\" that passes to later pieces, with overall drop speed recovering gradually over time. If Kanade is cleared from the board, the recovery effect ends at once.\n\n\"As long as the notes have not fully fallen silent...\"",
    },
    wonderBlast: {
      name: "Wonder Blast",
      subtitle: "It's Showtime!",
      description:
        "When Rui and NeneRobo are adjacent and cleared together, a stage-wide explosion erupts, blasting random pieces off the board.\nThe number of pieces hit scales with how many Rui and NeneRobo were in that clear. Combos from this effect resolve as \"pieces cleared ÷ 5 (floored).\"\n\n\"And now—the finest Showtime of all! NeneRobo, maximum output!!\"",
    },
    shizukuSwap: {
      name: "Compass Mischief",
      subtitle: "「Huh? Where is this...?」",
      description:
        "Clearing Shizuku triggers an \"anomaly\": left/right movement and left/right rotation are fully inverted.\nIf Shiho is already on the board, the effect cannot activate. If Shiho drops during the anomaly, it is forced to end immediately, regardless of remaining duration.\n\n\"Oh my... so that was the wrong way? I feel like we took a bit of a detour...\"",
    },
    itemAllergy: {
      name: "Orange Alert!",
      subtitle: "The thing you must never look at",
      description:
        "When falling Ena or Akito touches a carrot on the board, instinctive rejection kicks in and the character piece vanishes instantly.\nDuring control, you cannot intentionally move either of them into a column that would trigger rejection. If gravity drops them into an adjacent cell, the rejection check runs again. Note: the carrot itself never disappears from this effect.\n\n\"Idiot Akito! Get that orange thing away!\" \"...I'm giving those exact words right back to you, Ena.\"",
    },
    mizukiShift: {
      name: "French Fries Gravity Field",
      subtitle: "Follow the scent—capture complete ♪",
      description:
        "While French fries are on the board, every column that would land adjacent to fries is locked as a trigger column. Mizuki can only jump between those columns. If no contact columns exist, movement returns to normal.\nAlso, when fries land, the nearest Mizuki is forcibly pulled and shifted directly above them.\nIf Mizuki ends up adjacent to fries, the fries are instantly eaten (and vanish) for bonus score.\n\n\"If you follow the smell of fries, you'll definitely catch that figure quietly sidling over ♪\"",
    },
    emuShrink: {
      name: "Otori Survival Rule",
      subtitle: "「Eek—! I have to shrink...!」",
      description:
        "When Emu and Mafuyu occupy adjacent cells, Emu panics and collapses into a 1×1 single cell. The collapse shift prioritizes the side farther from Mafuyu. After collapsing, the whole board re-runs gravity and physics.\n\n\"I just feel like... when I'm next to Asahina-senpai, if I don't quietly curl up small, something really terrifying will happen...!\"",
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
    rotateCounter: "Z / Ctrl Rotate counter-clockwise",
    softDrop: "↓ Soft drop",
    hardDrop: "Space Hard drop",
    restart: "R Restart",
    swipeMove: "← → Swipe to move",
    tapRotate: "Tap left / right half to rotate",
    swipeHardDrop: "Swipe down to hard drop",
    pressSoftDrop: "Hold to soft drop",
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

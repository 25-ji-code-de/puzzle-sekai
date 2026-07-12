// Entertainment / fun-mode definitions (no gameplay logic here)

export const FUN_MODE_IDS = [
  "mikudayo",
  "kanadeSlow",
  "wonderBlast",
  "shizukuSwap",
  "itemAllergy",
  "mizukiShift",
  "emuShrink",
] as const;

export type FunModeId = (typeof FUN_MODE_IDS)[number];

export type FunModeFlags = Record<FunModeId, boolean>;

export type FunModeDef = {
  id: FunModeId;
  /** Chip title */
  name: string;
  /** Small subtitle under / beside chip */
  subtitle: string;
  /** Full tooltip / help text */
  description: string;
  /** Score factor when enabled (<1 easier, >1 harder) */
  scoreFactor: number;
};

export const DEFAULT_FUN_MODES: FunModeFlags = {
  mikudayo: false,
  kanadeSlow: false,
  wonderBlast: false,
  shizukuSwap: false,
  itemAllergy: false,
  mizukiShift: false,
  emuShrink: false,
};

export const FUN_MODE_DEFS: FunModeDef[] = [
  {
    id: "mikudayo",
    name: "ミクダヨー参戦",
    subtitle: "どのユニットにもなれる 2×2",
    description:
      "ミクダヨーが落ちてくる、ひと回り大きい 2×2 ピース。どのユニットのミクとしても数えられ、隣り合う別ユニットをつないでまとめて消すことができます。",
    scoreFactor: 0.85,
  },
  {
    id: "kanadeSlow",
    name: "カナデの余韻",
    subtitle: "奏を落とすと、世界がゆっくりに",
    description:
      "奏の落下は常に 0.5 倍速。着地後は「余韻」として後続ピースにも減速が伝わり、時間とともに薄れていきます。奏を消すと、効果はすぐに消えます。",
    scoreFactor: 0.9,
  },
  {
    id: "wonderBlast",
    name: "ショウタイム爆破",
    subtitle: "類＋ネネロボ隣接消しでフィナーレ",
    description:
      "類とネネロボが隣り合った状態で消すと、場のピースがランダムに吹き飛びます。消した塊の中に類・ネネロボが多いほど、消える数も増えます。コンボは「消した塊の数 ÷ 5（切り捨て）」として扱います。",
    scoreFactor: 0.8,
  },
  {
    id: "shizukuSwap",
    name: "雫のミラー",
    subtitle: "雫消しで左右操作がひっくり返る",
    description:
      "雫を消すと、左右移動と左右回転の操作が入れ替わります。場に志歩がいるあいだは発動しません。志歩を落とすと、効果はすぐに消えます。",
    scoreFactor: 1.15,
  },
  {
    id: "itemAllergy",
    name: "にんじん嫌い",
    subtitle: "にんじんが絵名・彰人に当たると即消し",
    description:
      "にんじん（道具）が絵名または彰人に触れると、そのキャラだけが即座に消えます。にんじん自体は消えず、そのまま落ち続けます。",
    scoreFactor: 1.1,
  },
  {
    id: "mizukiShift",
    name: "ポテトと瑞希",
    subtitle: "薯条着地で、いちばん近い瑞希が上へ",
    description:
      "ポテト／薯条が着地すると、いちばん近い瑞希がポテトの真上へ移動します。瑞希がいた場所は空になり、上に乗っていたピースは物理に従って落ちます。",
    scoreFactor: 1.12,
  },
  {
    id: "emuShrink",
    name: "えむちぢみ",
    subtitle: "まふゆの隣で、えむが 1 マスに",
    description:
      "まふゆとえむが隣り合うと、えむは 1 マスサイズに縮みます。縮む向きは、まふゆからできるだけ離れる方向を選びます。そのあと、場のピースが物理落下します。",
    scoreFactor: 1.08,
  },
];

export const FUN_MODE_MAP: Record<FunModeId, FunModeDef> = Object.fromEntries(
  FUN_MODE_DEFS.map((d) => [d.id, d]),
) as Record<FunModeId, FunModeDef>;

export function normalizeFunModes(raw: unknown): FunModeFlags {
  const result = { ...DEFAULT_FUN_MODES };
  if (!raw || typeof raw !== "object") return result;
  const obj = raw as Record<string, unknown>;
  for (const id of FUN_MODE_IDS) {
    if (typeof obj[id] === "boolean") result[id] = obj[id];
  }
  return result;
}

export function isEntertainmentMode(flags: FunModeFlags): boolean {
  return FUN_MODE_IDS.some((id) => flags[id]);
}

/** Product of enabled factors, clamped. */
export function getFunModeMultiplier(flags: FunModeFlags): number {
  let product = 1;
  for (const def of FUN_MODE_DEFS) {
    if (flags[def.id]) product *= def.scoreFactor;
  }
  return Math.min(1.6, Math.max(0.45, product));
}

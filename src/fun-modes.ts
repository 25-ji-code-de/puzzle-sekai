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
  /**
   * Score factor when enabled.
   * - Harder modes: >1
   * - Easier modes: <1
   * If itemLinked, this is the factor at the baseline 10% item rate and is
   * scaled with the actual item drop rate (see getFunModeMultiplier).
   */
  scoreFactor: number;
  /**
   * Mode depends on items (carrot / fries). Factor is scaled so that
   * more items → effect triggers more → easier → factor moves toward 1
   * from the hard side, or deeper below 1 from the easy side...
   * For hard item-linked modes (factor>1): higher drop rate → higher factor.
   * For easy item-linked modes (factor<1): higher drop rate → lower factor (more help).
   */
  itemLinked?: boolean;
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
    subtitle: "左右移動・左右回転がそれぞれ反転",
    description:
      "雫を消すと、左右移動が互いに入れ替わり、左右回転も互いに入れ替わります。場に志歩がいるあいだは発動しません。志歩を落とすと、効果はすぐに消えます。",
    scoreFactor: 1.15,
  },
  {
    id: "itemAllergy",
    name: "にんじん嫌い",
    subtitle: "にんじん ↔ 絵名・彰人で即消し",
    description:
      "にんじんが絵名または彰人に触れると、そのキャラが即座に消えます（ユニットボイスは鳴りません）。逆に絵名・彰人がにんじんの隣に着地しても同様です。操作中、絵名・彰人は「落下後ににんじんに接触する列」（可能列）へ自ら出現／移動できません。重力で隣り合った場合は再チェックして消えます。にんじん自体は消えません。",
    scoreFactor: 1.1,
    itemLinked: true,
  },
  {
    id: "mizukiShift",
    name: "ポテトと瑞希",
    subtitle: "瑞希は可能列のみ / 薯条で吸い寄せ",
    description:
      "可能列＝その列に落下着地するとポテトに接触する列。場にポテトがあるとき瑞希は可能列にだけ出現・移動できます（←→は可能列間をジャンプ）。可能列が無いときは通常どおり。またポテトが着地すると、場にいるいちばん近い瑞希がポテトの真上へ移動します。",
    scoreFactor: 1.12,
    itemLinked: true,
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

/**
 * Scale an item-linked mode factor by drop rate (baseline 10% = 1.0).
 * Hard modes (factor > 1): more items → more disruption → higher factor.
 * Easy modes (factor < 1): more items → more help → lower factor.
 * At 0% items the linked effect almost never fires → factor pulled toward 1.
 */
export function scaleItemLinkedFactor(
  baseFactor: number,
  itemDropRatePercent: number,
): number {
  // weight: 0%→0, 10%→1, 30%→1.5 (clamped)
  const weight = Math.min(1.5, Math.max(0, itemDropRatePercent / 10));
  // Interpolate between 1 (no effect) and baseFactor (full effect at 10%+)
  // weight 0 → 1, weight 1 → baseFactor, weight 1.5 → slightly beyond base
  return 1 + (baseFactor - 1) * weight;
}

/** Product of enabled factors, clamped. itemDropRatePercent scales item-linked modes. */
export function getFunModeMultiplier(
  flags: FunModeFlags,
  itemDropRatePercent: number = 10,
): number {
  let product = 1;
  for (const def of FUN_MODE_DEFS) {
    if (!flags[def.id]) continue;
    const factor = def.itemLinked
      ? scaleItemLinkedFactor(def.scoreFactor, itemDropRatePercent)
      : def.scoreFactor;
    product *= factor;
  }
  return Math.min(1.6, Math.max(0.45, product));
}

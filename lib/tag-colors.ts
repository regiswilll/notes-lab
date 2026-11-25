// The tag colour palette. Keep TAG_COLORS in step with the check constraint
// tags_color_check (migration 20261125091038_tags_color.sql).
// The class strings are written out in full so Tailwind can find them
// (tailwind.config.ts scans lib/).

export const TAG_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "pink",
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export function isTagColor(value: unknown): value is TagColor {
  return typeof value === "string" && (TAG_COLORS as readonly string[]).includes(value);
}

/** Display name for a colour ("red" -> "Red"). */
export function colorLabel(color: TagColor): string {
  return color[0].toUpperCase() + color.slice(1);
}

type ColorClasses = {
  /** Soft pill: note cards, editor chips, tags list, unselected filter pills. */
  soft: string;
  /** Strong pill: a selected filter pill. */
  solid: string;
  /** A plain dot of the colour (colour picker). */
  swatch: string;
};

export const TAG_COLOR_CLASSES: Record<TagColor, ColorClasses> = {
  red: {
    soft: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
    solid: "bg-red-600 text-white dark:bg-red-500 dark:text-white",
    swatch: "bg-red-500",
  },
  orange: {
    soft: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200",
    solid: "bg-orange-600 text-white dark:bg-orange-500 dark:text-white",
    swatch: "bg-orange-500",
  },
  yellow: {
    soft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-400/20 dark:text-yellow-100",
    solid: "bg-yellow-400 text-yellow-950 dark:bg-yellow-400 dark:text-yellow-950",
    swatch: "bg-yellow-400",
  },
  green: {
    soft: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200",
    solid: "bg-green-600 text-white dark:bg-green-500 dark:text-white",
    swatch: "bg-green-500",
  },
  teal: {
    soft: "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200",
    solid: "bg-teal-600 text-white dark:bg-teal-500 dark:text-white",
    swatch: "bg-teal-500",
  },
  blue: {
    soft: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
    solid: "bg-blue-600 text-white dark:bg-blue-500 dark:text-white",
    swatch: "bg-blue-500",
  },
  purple: {
    soft: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200",
    solid: "bg-purple-600 text-white dark:bg-purple-500 dark:text-white",
    swatch: "bg-purple-500",
  },
  pink: {
    soft: "bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-200",
    solid: "bg-pink-600 text-white dark:bg-pink-500 dark:text-white",
    swatch: "bg-pink-500",
  },
};

/** Classes for a tag's soft pill; a neutral look for a tag not saved yet. */
export function tagPillClass(color: TagColor | null | undefined): string {
  return color ? TAG_COLOR_CLASSES[color].soft : "bg-secondary text-secondary-foreground";
}

/**
 * Colours for new tags: each one gets the colour used least so far
 * (ties go to the earlier palette colour), so tags stay varied.
 */
export function pickColors(existing: TagColor[], count: number): TagColor[] {
  const uses = new Map<TagColor, number>(TAG_COLORS.map((c) => [c, 0]));
  for (const color of existing) uses.set(color, (uses.get(color) ?? 0) + 1);
  const picked: TagColor[] = [];
  for (let i = 0; i < count; i++) {
    const least = TAG_COLORS.reduce((best, c) => (uses.get(c)! < uses.get(best)! ? c : best));
    picked.push(least);
    uses.set(least, uses.get(least)! + 1);
  }
  return picked;
}

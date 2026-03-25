/** 人数・倍率を 0.25 刻みで増減 */

export function snapServingsToQuarter(n: number): number {
  if (!Number.isFinite(n)) return 0.25;
  const q = Math.round(n * 4) / 4;
  return q < 0.25 ? 0.25 : q;
}

export function incServingsQuarter(value: number, max = 100): number {
  const v = snapServingsToQuarter(value);
  return Math.min(max, v + 0.25);
}

export function decServingsQuarter(value: number, min = 0.25): number {
  const v = snapServingsToQuarter(value);
  const n = v - 0.25;
  if (n < min) return min;
  return n;
}

export function formatServingsLabel(n: number): string {
  const q = Math.round(n * 4) / 4;
  if (Number.isInteger(q)) return String(q);
  return String(q);
}

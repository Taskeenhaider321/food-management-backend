/** Human-readable label from a lowercase resource key (e.g. `company` → `Company`). */
export function resourceDefaultDisplayName(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

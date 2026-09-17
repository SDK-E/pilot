/**
 * Small helpers shared by the generic connector adapter: bounding list
 * length and truncating free text before it ever reaches the model.
 */
// Not exported: only used as default parameter values below.
const MAX_LIST_ITEMS = 25;
const MAX_TEXT_CHARS = 8000;

export function truncate(text: string, max: number = MAX_TEXT_CHARS): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function capList<T>(items: T[], max: number = MAX_LIST_ITEMS): T[] {
  return items.slice(0, max);
}

import { isRTL, getDirection } from "./locale-registry";
import type { TextDirection } from "./locale-definition";

export function resolveDirection(
  tag: string,
  explicit?: TextDirection,
): TextDirection {
  if (explicit) return explicit;
  return getDirection(tag);
}

export function needsBidiIsolation(tag: string): boolean {
  return isRTL(tag);
}

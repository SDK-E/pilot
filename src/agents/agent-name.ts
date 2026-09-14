const MAX_AGENT_NAME_LENGTH = 100;
const MAX_COPIES = 100;

/**
 * "Copy of X", then "Copy of X (2)"… until a free name is found.
 */
export function nextCopyName(sourceName: string, existingNames: Set<string>) {
  const root = `Copy of ${sourceName}`.slice(0, MAX_AGENT_NAME_LENGTH);
  if (!existingNames.has(root)) return root;

  for (let number = 2; number <= MAX_COPIES; number += 1) {
    const suffix = ` (${number})`;
    const candidate = `${root.slice(0, MAX_AGENT_NAME_LENGTH - suffix.length)}${suffix}`;
    if (!existingNames.has(candidate)) return candidate;
  }
}

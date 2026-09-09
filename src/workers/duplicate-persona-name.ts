const maximumPersonaNameLength = 100;

export function nextDuplicatePersonaName(
  sourceName: string,
  existingNames: Set<string>,
) {
  const prefix = "Copy of ";
  const root = `${prefix}${sourceName}`.slice(0, maximumPersonaNameLength);
  if (!existingNames.has(root)) return root;

  for (let number = 2; number <= 100; number += 1) {
    const suffix = ` (${number})`;
    const candidate = `${root.slice(0, maximumPersonaNameLength - suffix.length)}${suffix}`;
    if (!existingNames.has(candidate)) return candidate;
  }

  return undefined;
}

/**
 * A trimmed optional text field: an absent or blank input becomes
 * `undefined` so the schema treats it as "not provided".
 */
export function optionalText(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

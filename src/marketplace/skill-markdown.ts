const MAX_INSTRUCTIONS_LENGTH = 8000;
// Must match the skill edit form's own description cap
// (src/app/(workspace)/skills/actions.ts's skillFormSchema) — otherwise a
// marketplace skill installs fine but immediately fails validation the
// moment its edit form is re-submitted, even unmodified.
const MAX_DESCRIPTION_LENGTH = 300;
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * A minimal, line-based reader for SKILL.md's YAML frontmatter — just
 * `key: value` pairs, which is all the skill spec actually uses (no nested
 * structures). A full YAML parser is unwarranted for that.
 */
function readFrontmatterField(frontmatter: string, key: string) {
  const line = frontmatter
    .split("\n")
    .find((candidate) => candidate.trim().startsWith(`${key}:`));
  if (!line) return;
  const value = line.slice(line.indexOf(":") + 1).trim();
  return value.replaceAll(/^["']|["']$/g, "") || undefined;
}

/**
 * Splits a SKILL.md file into its frontmatter's `name`/`description` (when
 * present) and a body bounded to a sane instructions length — these files
 * can carry far more than Pilot's skill instructions are meant to hold, so
 * this keeps only the leading, most load-bearing portion rather than
 * silently truncating mid-sentence with no signal.
 */
export function parseSkillMarkdown(contents: string): {
  name?: string;
  description?: string;
  body: string;
} {
  const match = FRONTMATTER_PATTERN.exec(contents);
  const frontmatter = match?.[1] ?? "";
  const rest = (match ? match[2] : contents) ?? "";
  const body = rest.trim();
  const truncated =
    body.length > MAX_INSTRUCTIONS_LENGTH
      ? `${body.slice(0, MAX_INSTRUCTIONS_LENGTH).trim()}\n\n[Truncated — see the full skill at its marketplace source.]`
      : body;
  const description = readFrontmatterField(frontmatter, "description");
  return {
    name: readFrontmatterField(frontmatter, "name"),
    description:
      description && description.length > MAX_DESCRIPTION_LENGTH
        ? `${description.slice(0, MAX_DESCRIPTION_LENGTH - 1).trim()}…`
        : description,
    body: truncated,
  };
}

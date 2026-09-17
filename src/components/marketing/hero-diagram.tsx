/**
 * A hand-built diagram of the real ask → plan → result mechanism described
 * in `how-it-works.tsx`, not a mocked-up product screenshot — there's no
 * claim here beyond what the product actually does.
 */
export function HeroDiagram() {
  return (
    <svg
      aria-hidden="true"
      className="h-auto w-full max-w-sm text-border"
      fill="none"
      viewBox="0 0 320 360"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        className="fill-muted/40 stroke-border"
        height="72"
        rx="12"
        width="280"
        x="20"
        y="16"
      />
      <circle className="fill-primary" cx="44" cy="40" r="4" />
      <rect
        className="fill-foreground/70"
        height="8"
        rx="4"
        width="200"
        x="56"
        y="36"
      />
      <rect
        className="fill-muted-foreground/50"
        height="6"
        rx="3"
        width="150"
        x="44"
        y="60"
      />

      <line
        className="stroke-border"
        strokeDasharray="4 4"
        x1="160"
        x2="160"
        y1="88"
        y2="140"
      />

      <rect
        className="fill-muted/40 stroke-border"
        height="96"
        rx="12"
        width="280"
        x="20"
        y="140"
      />
      <rect
        className="fill-primary/70"
        height="6"
        rx="3"
        width="10"
        x="44"
        y="160"
      />
      <rect
        className="fill-muted-foreground/50"
        height="6"
        rx="3"
        width="180"
        x="60"
        y="160"
      />
      <rect
        className="fill-primary/70"
        height="6"
        rx="3"
        width="10"
        x="44"
        y="180"
      />
      <rect
        className="fill-muted-foreground/50"
        height="6"
        rx="3"
        width="160"
        x="60"
        y="180"
      />
      <rect
        className="fill-primary"
        height="6"
        rx="3"
        width="10"
        x="44"
        y="200"
      />
      <rect
        className="fill-foreground/70"
        height="6"
        rx="3"
        width="140"
        x="60"
        y="200"
      />

      <line
        className="stroke-border"
        strokeDasharray="4 4"
        x1="160"
        x2="160"
        y1="236"
        y2="288"
      />

      <rect
        className="fill-muted/40 stroke-border"
        height="56"
        rx="12"
        width="280"
        x="20"
        y="288"
      />
      <rect
        className="fill-primary/20"
        height="10"
        rx="2"
        width="240"
        x="40"
        y="304"
      />
      <rect
        className="fill-primary"
        height="10"
        rx="2"
        width="90"
        x="40"
        y="304"
      />
      <rect
        className="fill-muted-foreground/50"
        height="6"
        rx="3"
        width="120"
        x="40"
        y="324"
      />
    </svg>
  );
}

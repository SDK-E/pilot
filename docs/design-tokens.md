# Design Tokens

Pilot's design tokens are defined in `src/app/globals.css` via Tailwind v4 `@theme inline`.

## Color Tokens

| Token              | CSS Variable           | Usage                      |
| ------------------ | ---------------------- | -------------------------- |
| background         | `--background`         | Page background            |
| foreground         | `--foreground`         | Primary text               |
| card               | `--card`               | Card surface               |
| card-foreground    | `--card-foreground`    | Card text                  |
| primary            | `--primary`            | Primary action, Pilot. dot |
| primary-foreground | `--primary-foreground` | Text on primary            |
| secondary          | `--secondary`          | Secondary surface          |
| muted              | `--muted`              | Muted surface              |
| muted-foreground   | `--muted-foreground`   | Muted text                 |
| destructive        | `--destructive`        | Destructive action         |
| border             | `--border`             | Border                     |
| input              | `--input`              | Input border               |
| ring               | `--ring`               | Focus ring                 |

## Spacing Densities

| Token       | Value                     | Usage             |
| ----------- | ------------------------- | ----------------- |
| --radius    | 0.875rem                  | Default radius    |
| --radius-sm | calc(var(--radius) * 0.6) | Small components  |
| --radius-md | calc(var(--radius) * 0.8) | Medium components |
| --radius-lg | var(--radius)             | Default           |
| --radius-xl | calc(var(--radius) * 1.4) | Large components  |

## Font Tokens

| Token          | Font                      | Usage          |
| -------------- | ------------------------- | -------------- |
| --font-sans    | JetBrains Mono + fallback | Interface text |
| --font-mono    | JetBrains Mono + fallback | Code, numbers  |
| --font-heading | JetBrains Mono + fallback | Headings       |

## Themes

- Light: `:root` block (oklch values)
- Dark: `.dark` block (oklch values)
- System default via next-themes

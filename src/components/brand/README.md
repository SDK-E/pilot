# Pilot Branding

## Wordmark

- Text-based: `Pilot.` (expanded) / `P.` (compact)
- Font: system sans-serif, semibold, tracking-tight
- The dot uses `text-primary` color token
- No image-based wordmark; favicon only for image branding

## Fonts

- **JetBrains Mono** (primary interface font)
  - Licensed under SIL Open Font License
  - Fallback: ui-monospace, monospace
  - Applied via Next.js font optimization

## Color Palette

- **Primary**: `oklch(0.527 0.154 150.069)` — green (light), `oklch(0.448 0.119 151.328)` — green (dark)
- **Destructive**: `oklch(0.577 0.245 27.325)` (light), `oklch(0.704 0.191 22.216)` (dark)
- All colors use OKLCH color space for perceptual uniformity

## Theme

- System (default), Light, Dark — via next-themes
- Persisted in localStorage
- No flash of wrong theme (`disableTransitionOnChange`)
- Suppressed hydration warning on `<html>`

## Favicon

- Pilot. wordmark as favicon
- No additional image branding

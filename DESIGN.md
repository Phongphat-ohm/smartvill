# Village Management design system

## Product direction

An operations workspace for village staff. Optimize for finding a resident, household, meter, bill, fund entry, or sale and completing a traceable task. Keep the interface calm and familiar: strong hierarchy, clear status, compact data views, and restrained use of color. Thai is the default language; dates use the Buddhist calendar and `Asia/Bangkok`.

## Color tokens

Tokens are defined in `src/app/globals.css` and should be reused across pages, components, charts, exports, and dialogs.

| Token | Value | Use |
| --- | --- | --- |
| `--primary` | `#008BF8` | Primary action, active navigation, focus ring, selected state |
| `--primary-hover` | `#0075D1` | Hover state for primary actions |
| `--primary-soft` | `#EAF5FF` | Quiet selected/related background |
| `--background` | `#F5F8FC` | Main application canvas |
| `--surface` / `--card` | `#FFFFFF` | Panels, forms, tables, dialogs |
| `--surface-subtle` | `#F8FAFC` | Table headers and secondary surfaces |
| `--muted` | `#F1F5F9` | Quiet control and selection backgrounds |
| `--foreground` | `#172033` | Main text |
| `--muted-foreground` | `#64748B` | Supporting text, labels, metadata |
| `--border` | `#E4EAF2` | Default separators and control outlines |
| `--border-strong` | `#D5DEEA` | Emphasized boundaries |
| `--success` / `--success-soft` | `#16845B` / `#E8F7EF` | Completed, approved, paid |
| `--warning` / `--warning-soft` | `#A96508` / `#FFF4DF` | Due, pending review, attention |
| `--danger` / `--danger-soft` | `#C24148` / `#FFF0EF` | Rejected, overdue, destructive action |

Keep status colors sparse and pair color with a readable status label or icon. Do not use the blue accent as decoration on every element.

## Typography and language

Use Noto Sans Thai Variable (`@fontsource-variable/noto-sans-thai`) for Thai and Latin text. Use the font stack declared by `--font-sans`; headings share the same family. Page headings are typically 24–28px, section headings 14–16px, body text 13–14px, and table metadata 11–12px. Maintain readable Thai line-height and avoid shrinking essential mobile labels. Format money in THB and dates with `formatThaiDate` from `src/lib/format.ts`.

## Shape, spacing, and elevation

- Base radius: `--radius: 10px`; shadcn radius aliases derive from this value.
- Prefer 8px spacing increments and compact, consistent gaps for dense operations screens.
- Use a 1px cool-slate border to define panels and inputs.
- Reserve `--shadow-soft` for elements that need separation; avoid floating cards and decorative gradients.
- Keep controls comfortably tappable on phones; primary touch targets should be at least 40px high.

## Components and interaction patterns

- Use shadcn/ui primitives from `src/components/ui/` for consistent button semantics, variants, keyboard focus, disabled states, and accessible control behavior. Use `lucide-react` icons with labels where actions could otherwise be ambiguous.
- Primary actions use the blue token, secondary actions use neutral outlines or ghost styles, and destructive actions use the danger treatment.
- Form validation appears next to the relevant field. Reserve SweetAlert2 for consequential confirmation and operation feedback; apply the `village-swal` class and the same primary token to dialogs.
- Status badges include text and use the semantic success/warning/danger palettes. Tables provide search and clear empty states; mobile views should turn wide rows into readable stacked records rather than force horizontal scrolling.
- Desktop uses persistent navigation and a compact context header. Mobile collapses navigation into a drawer and stacks task content in priority order.
- Use explicit loading, permission-denied, error, empty, and success states. Preserve focus visibility and keyboard operation.

## Data visualization

Use Recharts for operational trends and progress. Blue is the primary series; green, amber, violet, and slate are supporting series (`--chart-1` through `--chart-5`). Label units and date ranges, keep grids subtle, and provide the underlying record list for actionable data. Avoid charts that do not help staff decide what to do next.

## SweetAlert2 theme

The `.swal2-popup.village-swal` rules in `src/app/globals.css` define white surface, slate text, rounded corners, soft elevation, blue confirmation, and neutral cancellation. Reuse this class and the `#008BF8` confirmation color in every SweetAlert2 call. Do not use alert dialogs for ordinary field validation.

## Source of truth

CSS variables in `src/app/globals.css` are the canonical visual tokens. Shared utilities live in `src/lib/format.ts`, and shadcn controls live in `src/components/ui/`. When changing the palette or component radius, update CSS variables first and check both desktop and narrow mobile screens.

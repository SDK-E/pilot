# Component Catalog

All Pilot components are traced to their source below.

## shadcn/ui Components

| Component    | Source    | Location                              | Modifications |
| ------------ | --------- | ------------------------------------- | ------------- |
| Button       | shadcn/ui | `src/components/ui/button.tsx`        | None          |
| Card         | shadcn/ui | `src/components/ui/card.tsx`          | None          |
| Input        | shadcn/ui | `src/components/ui/input.tsx`         | None          |
| Label        | shadcn/ui | `src/components/ui/label.tsx`         | None          |
| Textarea     | shadcn/ui | `src/components/ui/textarea.tsx`      | None          |
| AlertDialog  | shadcn/ui | `src/components/ui/alert-dialog.tsx`  | None          |
| DropdownMenu | shadcn/ui | `src/components/ui/dropdown-menu.tsx` | None          |
| Sheet        | shadcn/ui | `src/components/ui/sheet.tsx`         | None          |
| Sidebar      | shadcn/ui | `src/components/ui/sidebar.tsx`       | None          |
| Skeleton     | shadcn/ui | `src/components/ui/skeleton.tsx`      | None          |
| Tooltip      | shadcn/ui | `src/components/ui/tooltip.tsx`       | None          |
| Separator    | shadcn/ui | `src/components/ui/separator.tsx`     | None          |
| ButtonGroup  | Local     | `src/components/ui/button-group.tsx`  | Created       |

## AI Elements

| Component    | Source        | Location                                      | Modifications          |
| ------------ | ------------- | --------------------------------------------- | ---------------------- |
| Conversation | @ai-sdk/react | `src/components/ai-elements/conversation.tsx` | Pilot-specific styling |
| Message      | @ai-sdk/react | `src/components/ai-elements/message.tsx`      | Pilot-specific styling |

## Brand Components

| Component     | Source | Location                                  | Modifications |
| ------------- | ------ | ----------------------------------------- | ------------- |
| PilotWordmark | Local  | `src/components/brand/pilot-wordmark.tsx` | None          |

## Status States (new)

| Component        | Source | Location                              | Description             |
| ---------------- | ------ | ------------------------------------- | ----------------------- |
| LoadingState     | Local  | `src/components/ui/status-states.tsx` | Loading skeleton        |
| EmptyState       | Local  | `src/components/ui/status-states.tsx` | Empty/initial state     |
| ErrorState       | Local  | `src/components/ui/status-states.tsx` | Recoverable error       |
| ForbiddenState   | Local  | `src/components/ui/status-states.tsx` | Access denied           |
| SuccessState     | Local  | `src/components/ui/status-states.tsx` | Completed success       |
| UnavailableState | Local  | `src/components/ui/status-states.tsx` | Temporarily unavailable |

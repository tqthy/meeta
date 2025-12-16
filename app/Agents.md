# Meeta - Agent Guidelines

This document provides guidelines for AI agents and contributors working on the Meeta codebase.

---

## UI vs Logic Separation

### UI Layer (Replaceable)
Files containing presentation logic, layouts, and visual components:

- `src/components/layout/*` - Sidebar, headers, navigation
- `src/components/ui/*` - Reusable UI primitives
- `src/components/dashboard/*` - Dashboard-specific UI components
- `src/app/dashboard/page.tsx` - Dashboard page layout

**Rules:**
- ✅ May modify layout structure, spacing, visual hierarchy
- ✅ May update styling classes and CSS properties
- ✅ May add new UI components for presentation
- ⛔ Must NOT change function signatures or props contracts
- ⛔ Must NOT modify data fetching or state logic

### Logic Layer (Immutable)
Files containing business logic, data fetching, and state management:

- `src/domains/*/hooks/*` - React hooks with data logic
- `src/domains/*/services/*` - Service adapters and API calls
- `src/domains/*/store/*` - Redux slices and state
- `src/lib/*` - Utility libraries (auth, prisma, utils)
- `src/app/api/*` - API route handlers

**Rules:**
- ⛔ Must NOT modify business logic behavior
- ⛔ Must NOT rename functions or change signatures
- ⛔ Must NOT alter data flow or API contracts
- ⛔ Must NOT add new backend calls from UI components

---

## Theme Consistency

### Color System
The project uses HSL-based color tokens defined in `globals.css`:

| Token | Purpose |
|-------|---------|
| `--primary` | Primary brand color (blue) |
| `--muted-foreground` | Secondary text color |
| `--background` | Page background |
| `--foreground` | Primary text color |
| `--border` | Border color |
| `--destructive` | Error/danger color |

### Usage Guidelines
- ✅ Use semantic tokens: `text-primary`, `bg-muted`, `border-border`
- ✅ Use opacity variants: `bg-primary/10`, `text-muted-foreground`
- ⛔ Do NOT introduce new color values (e.g., `#3B82F6`)
- ⛔ Do NOT use hardcoded colors outside the token system

### Dark Mode
The theme supports automatic dark mode via `prefers-color-scheme`. When adding styles:
- Use token-based colors that adapt automatically
- Test in both light and dark modes

---

## Component Ownership

### Layout Components (`src/components/layout/`)
| File | Purpose | State Managed |
|------|---------|---------------|
| `sidebar.tsx` | Navigation sidebar | None (receives isCollapsed) |
| `dashboard-shell.tsx` | Dashboard container | Sidebar collapse state |
| `dashboard-header.tsx` | Top header bar | None (receives onMenuClick) |
| `navbar.tsx` | Legacy navbar (backup) | None |
| `user-menu.tsx` | User dropdown menu | Auth session |

### Dashboard Components (`src/components/dashboard/`)
| File | Purpose | State Managed |
|------|---------|---------------|
| `summarize-section.tsx` | Summary UI placeholder | None (UI only) |

---

## Agent Constraints

### When Modifying UI
1. Preserve all existing prop interfaces
2. Maintain component boundaries (no merging unrelated logic)
3. Use existing UI primitives from `@/components/ui/*`
4. Follow the color token system

### When Adding Features
1. Create new components in appropriate directories
2. Keep UI and logic separated
3. Use hooks for data fetching
4. Document new components in this file

### Forbidden Actions
- ❌ Modifying API routes without explicit permission
- ❌ Changing database schema or Prisma models
- ❌ Altering authentication flow
- ❌ Implementing AI/summarization logic (placeholder only)
- ❌ Adding new npm dependencies without approval

---

## Quick Reference

### File Categories
```
UI Files (Replaceable)     | Logic Files (Protected)
---------------------------|-------------------------
components/layout/*        | domains/*/hooks/*
components/ui/*            | domains/*/services/*
components/dashboard/*     | domains/*/store/*
app/*/page.tsx (layout)    | app/api/*
*.css                      | lib/*
```

### Testing Checklist
Before submitting changes:
- [ ] Build passes: `npm run build`
- [ ] Lint passes: `npm run lint`
- [ ] Existing features work identically
- [ ] Theme colors are consistent
- [ ] Dark mode works correctly

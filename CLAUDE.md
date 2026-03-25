# CLAUDE.md

## Build

```bash
npm run build   # runs: vue-tsc -b && vite build
```

All code must compile cleanly with `vue-tsc -b`.

## Stack

- Vue 3, TypeScript, Vite
- Tailwind CSS 3 with `@tailwindcss/forms`
- Vercel (deployment)
- Clerk (auth)
- Supabase (database)
- Stripe (payments)

## TypeScript Rules

Strict mode is enabled with `noUnusedLocals` and `noUnusedParameters`.

- Never assign `defineProps()` or `defineEmits()` to a variable unless that variable is used in the `<script setup>` block. Vue auto-exposes them to the template.
- Never leave unused imports, variables, or parameters.
- Prefix intentionally unused parameters with `_`.

## Deployment

Claude Code works on a `claude/*` branch and pushes it. A GitHub Actions workflow auto-merges `claude/*` branches to main. Vercel deploys main to production automatically.

## What and why

<!-- What does this change, and why? Link the plan section or issue. -->

## How it was tested

<!-- Commands you ran and what you checked by hand (pages, browsers, light/dark, mobile). -->

## Checklist

- [ ] `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` and `npm run build` pass locally
- [ ] If this fixes a bug: I added a test that would have caught this bug
- [ ] New or changed behaviour has tests (unit in `src/**/*.test.ts` or `apps/web/tests/unit/`, E2E in `apps/web/tests/e2e/`)
- [ ] No database access in page renders or middleware; premium content can't reach a non-entitled response
- [ ] No secrets, tokens or account IDs in code, config or logs; nothing from another project (Mythical) reused
- [ ] `AGENTS.md` / `README.md` updated if commands, paths or rules changed

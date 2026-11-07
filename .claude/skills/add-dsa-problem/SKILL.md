---
name: add-dsa-problem
description: Use when adding or editing a DSA coding problem, its test cases or a DSA topic under apps/web/content/dsa.
---

# Add a DSA problem

Background: `apps/web/src/features/dsa/AGENTS.md`; schemas in `apps/web/src/features/dsa/schema.ts`. Copy
`apps/web/content/dsa/problems/two-sum.mdx` as the model.

1. **Three files per problem**, same kebab-case slug:
   `apps/web/content/dsa/problems/<slug>.mdx`, `apps/web/content/dsa/tests/<slug>.public.json`,
   `apps/web/content/dsa/tests/<slug>.hidden.json`.

2. **Frontmatter is strict:** `title`, `description` (one line, never the solution), `difficulty`
   (easy/medium/hard), `patterns` (slugs from `apps/web/content/dsa/patterns.yaml`), `topics` (files in
   `apps/web/content/dsa/topics/`), `companies` (slugs from `apps/web/content/companies/companies.yaml`),
   `languages` (`javascript`, `python`), `starter` and `entry` for **every** listed language, `tests`, `complexity`.
   - Good: `entry: { javascript: twoSum, python: two_sum }`
   - Bad: `languages: [javascript, python]` with only a JavaScript starter

3. **Body:** the statement, then a line with only `<PremiumBreak/>`, then the editorial. Everything after the break
   is the editorial and is never compiled for a page the visitor can't read.

4. **Tests:** each case is `{ "name", "args", "expected" }`; class-mode problems (`mode: class`) use
   `args: [operations, argumentsPerOperation]`. Public cases are shown and run in the browser; hidden cases
   (at least 5) are for the future server judge.
   - Bad: copying a hidden case into the statement or the public file

5. **Hidden tests never ship.** Don't import `readHiddenTestsForValidation()` or the hidden JSON from any page or
   client code; `apps/web/src/features/dsa/leak.test.ts` will fail.

6. **Access:** leave `access` unset unless the owner decided; easy problems and topics are free by registry rule.

7. **Add a reference solution.** `apps/web/src/features/dsa/runner.test.ts` runs a JavaScript reference solution
   against every public and hidden case and fails for a problem without one: add yours to its `REFERENCE` map.

8. **Verify:** `npm run content-check -w web` and `npm test`, then `npm run dev` → `/dsa/problems/<slug>` →
   "Run tests" with the starter (fails) and a correct solution (passes).

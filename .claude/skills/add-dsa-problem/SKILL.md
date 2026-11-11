---
name: add-dsa-problem
description: Use when adding or editing a DSA coding problem, its test cases or a DSA topic under apps/web/content/dsa.
---

# Add a DSA problem

Background: `apps/web/src/features/dsa/AGENTS.md`; schemas in `apps/web/src/features/dsa/schema.ts`. Copy
`apps/web/content/dsa/problems/two-sum.mdx` as the model.

1. **Four files per problem**, same kebab-case slug:
   `apps/web/content/dsa/problems/<slug>.mdx`, `apps/web/content/dsa/tests/<slug>.public.json`,
   `apps/web/content/dsa/tests/<slug>.hidden.json` and the Python reference solution
   `apps/web/content/dsa/solutions/<slug>.py` (required whenever `languages` lists `python`).

2. **Frontmatter is strict:** `title`, `description` (one line, never the solution), `difficulty`
   (easy/medium/hard), `patterns` (slugs from `apps/web/content/dsa/patterns.yaml`), `topics` (files in
   `apps/web/content/dsa/topics/`), `companies` (slugs from `apps/web/content/companies/companies.yaml`),
   `languages` (`javascript`, `python`), `starter` and `entry` for **every** listed language, `tests`, `complexity`.
   Python-only problems are allowed: `languages: [python]`.
   - Good: `entry: { javascript: twoSum, python: two_sum }`
   - Bad: `languages: [javascript, python]` with only a JavaScript starter
   - `status: draft` keeps a problem (or topic) out of pages, the sitemap, search and the nav; it is still checked.

3. **Body:** the statement, then a line with only `<PremiumBreak/>`, then the editorial. Everything after the break
   is the editorial and is never compiled for a page the visitor can't read.

4. **Tests:** each case is `{ "name", "args", "expected" }`; class-mode problems (`mode: class`) use
   `args: [operations, argumentsPerOperation]`. Public cases are shown and run in the browser; hidden cases
   (at least 5) are for the future server judge.
   - Every hidden case is named `hidden/<slug>/NN <label>`, NN two digits from `01`:
     `"name": "hidden/two-sum/03 large magnitudes cancel"`. content-check rejects any other name.
   - Bad: copying a hidden case into the statement or the public file

5. **Hidden tests and reference solutions never ship.** Don't import `readHiddenTestsForValidation()`,
   `readReferenceSolutionForValidation()`, the hidden JSON or the solution files from any page or client code;
   `apps/web/src/features/dsa/leak.test.ts` will fail.

6. **Access:** leave `access` unset unless the owner decided; easy problems and topics are free by registry rule.

7. **Add reference solutions.**
   - Python (`apps/web/content/dsa/solutions/<slug>.py`): defines the starter's `entry` at the top level (a
     function, or the class for `mode: class`), standard library only, and no `if __name__ == "__main__":` block
     (the starter neither).
     `apps/web/src/features/dsa/reference.test.ts` runs it in Pyodide against every public and hidden case and checks
     that the Python starter fails public case 1.
   - JavaScript, only if `languages` lists `javascript`: add one to the `REFERENCE` map in
     `apps/web/src/features/dsa/runner.test.ts`.

8. **Verify:** `npm run content-check -w web` and `npm test` (`apps/web/src/features/dsa/mdx.test.tsx` compiles
   the statement and the editorial), then `npm run dev` → `/dsa/problems/<slug>` → "Run tests" with the starter (fails) and a correct
   solution (passes). To read a premium editorial, switch the "Local view" control (bottom right) to Paid, or set
   `LOCAL_VIEW_AS=paid` in .env.local; only local builds honour it.

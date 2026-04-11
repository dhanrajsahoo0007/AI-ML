# GitHub setup: `main` and `development`

This repository is **Origins AI Learn** — a structured learning system for ML, deep learning, GenAI, LLMs, agentic AI, interview prep, and ML system design.

Target account: [https://github.com/dhanrajsahoo0007](https://github.com/dhanrajsahoo0007)

**Suggested repository name:** `origins-ai-learn` (see root [README.md](../README.md) for the full push runbook).

## Prerequisites

- [GitHub CLI `gh`](https://cli.github.com/) installed, or use the GitHub website.
- `gh auth login` completed if using the CLI.

## Create the repository and push both branches

1. Use repository name **`origins-ai-learn`** (or pick another and substitute below).

2. From your local clone at the **repository root**:

   ```bash
   git init
   git checkout -b main
   git add .
   git commit -m "Initial commit: Origins AI Learn"
   ```

3. Create the GitHub repo and push **main**:

   ```bash
   gh repo create dhanrajsahoo0007/origins-ai-learn --public --source=. --remote=origin --push
   ```

   If you chose a different name, replace `origins-ai-learn` in the command.

4. Create and push **development**:

   ```bash
   git checkout -b development
   git push -u origin development
   ```

5. Confirm on GitHub: branches **main** and **development** exist; default branch is **main** (Settings → General → Default branch).

## If the repository already exists (empty)

```bash
git remote add origin https://github.com/dhanrajsahoo0007/origins-ai-learn.git
git branch -M main
git push -u origin main
git checkout -b development
git push -u origin development
```

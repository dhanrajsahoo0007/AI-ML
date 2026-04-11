# GitHub setup: `main` and `development`

Target account: [https://github.com/dhanrajsahoo0007](https://github.com/dhanrajsahoo0007)

## Prerequisites

- [GitHub CLI `gh`](https://cli.github.com/) installed, or use the GitHub website.
- `gh auth login` completed if using the CLI.

## Create the repository and push both branches

1. Choose a repository name, for example `ai-ml-learning-platform`.

2. From your local clone of this project:

   ```bash
   git init
   git checkout -b main
   git add .
   git commit -m "Initial commit: AI-ML learning platform"
   ```

3. Create the GitHub repo and push **main**:

   ```bash
   gh repo create dhanrajsahoo0007/REPO_NAME --public --source=. --remote=origin --push
   ```

   Replace `REPO_NAME` with your chosen name.

4. Create and push **development**:

   ```bash
   git checkout -b development
   git push -u origin development
   ```

5. Confirm on GitHub: two branches **main** and **development** exist; default branch is **main** (Settings → General → Default branch).

## If the repository already exists (empty)

```bash
git remote add origin https://github.com/dhanrajsahoo0007/REPO_NAME.git
git branch -M main
git push -u origin main
git checkout -b development
git push -u origin development
```

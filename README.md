## 🤝 Git Collaboration Workflow

To keep AllpaNina stable and allow multiple team members to work simultaneously, we follow a simplified **GitHub Flow**.

### 1. Branching strategy

The `main` branch contains the latest stable and integrated version of the project.

Cada integrante tiene su propia rama.


### 2. Step-by-step workflow

**Step 1 — Update your local repository**

Before starting a new task, synchronize your local `main` branch:

```bash
git switch main
git pull origin main
```

**Step 2 — Create a feature branch**

Create a new branch using the appropriate naming convention:

```bash
git switch -c feat/frontend-map
```

**Step 3 — Make and commit your changes**

Implement your assigned task and verify that it works.

```bash
git status
git add .
git commit -m "feat: implement wildfire map"
```

**Step 4 — Push your branch to GitHub**

```bash
git push -u origin feat/frontend-map
```

**Step 5 — Open a Pull Request (PR)**

1. Go to the repository on GitHub.
2. Select **Compare & pull request**.
3. Set `main` as the destination branch.
4. Explain what you implemented and how it was tested.
5. Request a review from another team member.

After approval and successful checks, merge the PR into `main`.

**Step 6 — Synchronize before your next task**

```bash
git switch main
git pull origin main
```

Create a new branch for the next task. Delete merged branches when they are no longer needed.

### 3. Collaboration rules

- **Never push directly to `main`.**
- Create one branch per task, not per developer.
- Keep commits small and descriptive.
- Test your changes before opening a PR.
- Coordinate changes that affect shared files or API contracts.
- Never commit passwords, API keys, credentials, or local environment files.
- Do not force-push to `main`.
- Do not merge a PR with unresolved conflicts or failing required checks.
- Review another contributor's changes before merging whenever possible.

### 4. Working with AI coding agents

Codex, Claude, and other AI coding assistants must follow the same collaboration rules.

- Read `AGENTS.md` before making changes.
- Work on the branch assigned to the current task.
- Do not create unnecessary branches.
- Do not modify unrelated code without authorization.
- Do not commit secrets or generated temporary files.
- Review and test AI-generated changes before committing.
- Never merge automatically into `main` without human approval.

### 5. Commit message conventions

Use concise, descriptive commit messages following this format:

```text
type: short description
```

Examples:

```bash
git commit -m "feat: add satellite hotspot markers"
git commit -m "fix: handle empty NASA API responses"
git commit -m "docs: update installation instructions"
git commit -m "test: add fire analysis unit tests"
```

### 6. Resolving merge conflicts

If your branch is outdated, synchronize it with the latest `main`:

```bash
git fetch origin
git switch feat/frontend-map
git merge origin/main
```

If Git reports conflicts:

1. Open the conflicting files.
2. Resolve the differences carefully.
3. Remove all conflict markers.
4. Stage the resolved files.
5. Complete the merge:

```bash
git add .
git commit
git push
```

If you are unsure how to resolve a conflict, ask another team member before proceeding.

---

**Our priority:** Deliver a functional, integrated, and reproducible solution within the hackathon timeframe. Collaboration practices should support development, not slow it down.
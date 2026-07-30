# Git and Release Workflow

## Branches

- `main`: protected production branch.
- `feature/<name>`: new functionality.
- `fix/<name>`: bug fixes.
- `refactor/<name>`: internal restructuring.
- `release/<version>`: optional release preparation.

## Daily workflow

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/short-description
```

Commit focused changes:

```powershell
git add <explicit-files>
git commit -m "feat: describe the change"
git push -u origin feature/short-description
```

Open a pull request into `main`. Merge only after CI passes.

## Commit convention

- `feat:` new capability
- `fix:` defect correction
- `refactor:` structural change
- `perf:` performance improvement
- `test:` test changes
- `docs:` documentation
- `chore:` tooling or maintenance
- `release:` version release

## Release process

Patch release:

```powershell
npm run release:patch
```

Minor release:

```powershell
npm run release:minor
```

Major release:

```powershell
npm run release:major
```

The release script verifies:

1. Current branch is `main`.
2. Working tree is clean.
3. Local `main` matches `origin/main`.
4. Lint, typecheck and production build pass.
5. Version files and changelog are prepared.

Review the generated changelog entry before committing and tagging.

## Rollback

Never delete production history. Revert the problematic commit:

```powershell
git revert <commit-sha>
git push origin main
```

For a released version, create a patch release after the revert.
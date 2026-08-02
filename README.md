# gtm_projects

Personal GTM (go-to-market) tools and experiments — shipped products and an idea backlog,
in one repo.

## Structure

- [`work/`](work) — active projects: shipped tools ([`hooks`](work/hooks),
  [`verificateur-score-geo`](work/verificateur-score-geo)) and an [idea backlog](work/ideas)
- `temporary/` — local scratch space, git-ignored (never pushed)
- `private/` — personal/paid projects excluded from this public repo, git-ignored
- `.env.example` — template for local environment variables

## Setup

1. Copy the env template and fill in your own values locally:
   ```bash
   cp .env.example .env
   ```
2. Never commit `.env` — it's git-ignored by default.

## Security

- Secrets, API keys, and credentials must live only in `.env` (git-ignored), never in tracked files.
- This repository is **public** — double-check `git status` before committing anything that touches config or credentials.

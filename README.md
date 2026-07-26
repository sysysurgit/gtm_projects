# gtm_projects

Projects for all GTM (go-to-market) purposes.

## Structure

- `work/` — active project files
- `temporary/` — local scratch space, git-ignored (never pushed)
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

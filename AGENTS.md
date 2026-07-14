# TradingAgents Agent Guide

## Scope And Precedence

- This file applies to the entire repository.
- A nearer `AGENTS.md` or `AGENTS.override.md` may override it for its subtree.
- Explicit user instructions take precedence over repository guidance.
- Keep this file below Codex's default 32 KiB project-document limit.

## Project Overview

TradingAgents is a Python multi-agent financial research framework. The local fork is configured for Windows 11, PowerShell, A-share research, an OpenAI-compatible Grok relay, retry handling, and checkpoint recovery.

Key areas:

- `cli/main.py`: Typer CLI, interactive selections, environment overrides, and run orchestration.
- `tradingagents/graph/`: LangGraph workflow, state, propagation, and SQLite checkpoints.
- `tradingagents/agents/`: analyst, researcher, trader, risk, and portfolio-manager agents.
- `tradingagents/dataflows/`: market, fundamentals, news, Reddit, and vendor data access.
- `tradingagents/llm_clients/`: provider registry, API keys, and chat-client construction.
- `tradingagents/default_config.py`: defaults and `TRADINGAGENTS_*` environment mapping.
- `tests/`: unit, smoke, integration, and regression tests.
- `Start-TradingAgents.ps1`: supported local launcher and E-drive runtime boundary.

Data flow:

```text
CLI input -> runtime config -> TradingAgentsGraph -> data vendors + LLM provider
          -> agent state/checkpoint -> reports, cache, and memory under .tradingagents
```

## Quick Commands

Run commands from `E:\development\TradingAgents` in PowerShell 7. Use `;` between commands.

```powershell
# Supported interactive launch
.\Start-TradingAgents.ps1

# CLI help without a live analysis
.\Start-TradingAgents.ps1 --help

# Lint
.\.venv\Scripts\python.exe -m ruff check .

# Full tests with temporary files kept on E:
New-Item -ItemType Directory -Force E:\development\_agent_tmp | Out-Null
$env:TEMP='E:\development\_agent_tmp'; $env:TMP='E:\development\_agent_tmp'
$env:DEEPSEEK_API_KEY='placeholder'; .\.venv\Scripts\python.exe -m pytest

# Focused tests
.\.venv\Scripts\python.exe -m pytest tests\test_openai_compatible_provider.py -q
```

Do not run a live paid analysis as an automated test. Use mocked unit tests unless the user explicitly requests an external-service test.

## Runtime Configuration

Local secrets belong only in the ignored `.env`. Never print, commit, paste into docs, or place a real key in a test fixture.

Current local relay settings use these variable names:

```dotenv
OPENAI_COMPATIBLE_API_KEY=<secret>
TRADINGAGENTS_LLM_PROVIDER=openai_compatible
TRADINGAGENTS_LLM_BACKEND_URL=https://api-slb.krill-ai.com/codex/v1
TRADINGAGENTS_DEEP_THINK_LLM=grok-4.5
TRADINGAGENTS_QUICK_THINK_LLM=grok-4.5
TRADINGAGENTS_OUTPUT_LANGUAGE=Chinese
TRADINGAGENTS_LLM_MAX_RETRIES=6
TRADINGAGENTS_CHECKPOINT_ENABLED=true
```

The base URL stops at `/v1`; the client appends the chat-completions route. Keep model identifiers explicit. Do not silently replace `grok-4.5` with another model.

Always launch through `Start-TradingAgents.ps1` for local manual runs. It redirects `HOME`, `USERPROFILE`, `APPDATA`, `LOCALAPPDATA`, uv/pip caches, temp files, and TradingAgents state into the project on E drive. Runtime data belongs in `.tradingagents`, not in tracked `reports/` or a real user profile.

## Network And Recovery

- The local proxy is `http://127.0.0.1:7897`; the launcher supplies it only when proxy variables are absent.
- `RemoteProtocolError`, `incomplete chunked read`, connection resets, and transient 429/5xx responses usually indicate proxy, relay, or upstream instability. Preserve the original exception and retry only transient failures.
- The configured LLM retry budget is 6 attempts. Do not add nested unbounded retries or parallelize agent calls without checking relay concurrency limits.
- Checkpoint recovery is enabled. A failed run should be retried with the same ticker, date, analyst selection, and graph-shaping settings so it can resume.
- Never clear checkpoints automatically. `--clear-checkpoints` is an explicit destructive fresh-start action.

## Code Style

- Support Python 3.10+ and follow `pyproject.toml` as the source of truth.
- Use 4 spaces, LF line endings, `snake_case` functions/files, `PascalCase` classes, and `UPPER_SNAKE_CASE` constants.
- Keep imports ordered as standard library, third party, then local; Ruff owns lint and import ordering.
- Ruff line length is 100; `E501` is intentionally ignored.
- Prefer small focused functions and explicit configuration over hidden global state.
- Preserve public SDK and CLI behavior unless the requested change explicitly alters it.

## Testing Strategy

- Add or update tests for every behavior change, including fixes not explicitly requesting tests.
- Start with the narrowest relevant test, then run `ruff check .` and the full test suite before commit.
- Tests must not depend on a real `.env`, live API key, current market result, or mutable external service.
- Use `tmp_path`, mocks, and deterministic dates for unit tests. Mark real external-service coverage as integration tests and keep it opt-in.
- Keep pytest temporary files on E drive. A test process must not write caches or fixtures to C or D.
- A `BUY`, `SELL`, or `HOLD` answer is not a correctness assertion. Validate the pipeline, data identity, state transitions, and output structure.

## Safety And Repository Rules

- `origin` is `https://github.com/lemonhall/TradingAgents.git`; normal pushes go to this personal fork.
- `upstream` is `https://github.com/TauricResearch/TradingAgents.git`; fetch from it, but do not push to it.
- Never commit `.env`, API keys, `error.txt`, reports, caches, checkpoints, logs, `.home`, `.tmp`, `.uv-cache`, or `.tradingagents` runtime state.
- Inspect `git status` and `git diff` before staging. Do not overwrite or revert unrelated user changes.
- Do not delete caches, reports, checkpoints, or virtual environments without explicit user approval.
- Avoid global pip/uv installs and global environment-variable changes. Keep Python dependencies in `.venv` and caches on E drive.
- This software produces research output, not investment advice. Do not present generated conclusions as guaranteed facts or execute trades.

## Documentation And Encoding

- Update `README.zh-cn.md` when installation/runtime behavior changes and `TESTING.zh-cn.md` when the manual test flow changes.
- Write repository text as UTF-8. For Chinese or other non-ASCII edits, use `apply_patch` or another explicitly UTF-8-safe method.
- After a Chinese text edit, run `git diff --text -- <file>` and scan for known mojibake markers, Unicode replacement characters, repeated question marks, and NUL bytes before continuing.

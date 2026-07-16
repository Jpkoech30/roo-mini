# Changelog

All notable changes to **Roo-Mini** are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/) and the project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2025-04-01

### Added

- **Multi-agent orchestration** — Planner, Scheduler, Delegator, Reporter agents collaborate on complex tasks
- **MCP (Model Context Protocol) support** — Connect to GitHub, Google Workspace, Jira, Slack, Docker, and Postgres
- **35+ built-in tools** — File operations, shell commands, browser automation, web search, diff generation, and more
- **Persistent memory** — SQLite-backed with full-text search across conversations and sessions
- **Cost tracking** — Track AI usage costs per session (`npm run costs`)
- **Interactive CLI** — Beautiful terminal UI with boxen/chalk styling, tab completion, command history
- **Danger detection** — Blocks destructive commands; user must confirm with `--danger` flag
- **Agent modes** — `code`, `architect`, `ask` modes with different behaviors
- **Task DAG** — Create task dependency graphs and execute them in topological order
- **Conversation history** — All interactions persisted to `.roo-memory/` for continuity
- **Configuration** — `roo.config.json` and `.env` for model/server/memory settings
- **CI/CD** — GitHub Actions workflows for lint, test, and coverage

### Changed

- Initial release — no prior versions

### Fixed

- Initial release — no prior versions

---

## [Unreleased]

### Planned

- User authentication and session management
- Web dashboard for cost and memory visualization
- Plugin system for custom MCP servers
- Multi-user collaboration support

---

[1.0.0]: https://github.com/Jpkoech30/roo-mini/releases/tag/v1.0.0

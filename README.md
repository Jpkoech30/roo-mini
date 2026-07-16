# Roo-Mini

[![Node.js Version](https://img.shields.io/badge/node-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![CI](https://github.com/Jpkoech30/roo-mini/actions/workflows/test.yml/badge.svg)](https://github.com/Jpkoech30/roo-mini/actions/workflows/test.yml)

**Roo-Mini** is an open-source, autonomous AI coding agent that runs in your terminal. It reads, writes, refactors, and executes code from natural language prompts. Powered by your choice of LLM provider — no vendor lock-in.

Built with a **planner-orchestrator-delegate** architecture, Roo-Mini tackles complex multi-step tasks by decomposing them into sub-tasks, delegating execution to specialized agents, and reporting results — all through a slick interactive REPL.

---

## Features

### Core Agent
- **Autonomous code generation** — describe what you want, Roo-Mini builds it
- **Multi-provider AI support** — works with DeepSeek, OpenAI, and any OpenAI-compatible API
- **Planner-Orchestrator-Delegate** architecture — breaks complex tasks into sub-tasks and parallelizes execution
- **4 operating modes** — `code`, `architect`, `ask`, `orchestrator` — switch anytime with `:m:code`
- **Interactive REPL** — multi-line input, command history, tab completion, persistent mode, alias commands (`:q`, `:h`, `:c`)
- **Stdin piping** — `echo "refactor this" | npm start`

### File System
- Read, write, search (regex/glob), refactor, and diff files
- Full project awareness — auto-detects project structure and config

### Shell Execution
- Run commands and scripts directly from the agent
- Capture stdout, stderr, and exit codes

### Memory System
- Persistent project context across sessions (stored in `.roo-memory/`)
- Conversation history search, fact retention, task tracking
- Survives agent restarts

### Browser Automation
- Playwright-based web scraping and browser control

### MCP Integration (Model Context Protocol)
Extensible tool server architecture. Each service runs as its own MCP server:

| MCP Server       | Capabilities                                      |
|------------------|---------------------------------------------------|
| **GitHub**       | Create repos, push files, manage issues, browse repos |
| **Google**       | Google Search, Gmail (send/list/search), Calendar, Drive |
| **Jira**         | Query issues, search JQL, create issues           |
| **Docker**       | List containers, inspect, stream logs, manage images |
| **Slack**        | List channels, read messages, send messages       |
| **PostgreSQL**   | List tables, describe schema, run SQL queries     |

### Quality
- **ESLint** — configured with flat config (`eslint.config.mjs`)
- **Test runner** — built-in Node.js test suite at `tests/`

---

## Project Structure

```
roo-mini/
├── src/
│   ├── index.mjs              # CLI entry point (REPL)
│   ├── agent/
│   │   ├── loop.mjs           # Agent loop — prompt → tool calls → response
│   │   └── modes.mjs          # Code / Architect / Ask / Orchestrator modes
│   ├── config/
│   │   ├── index.mjs          # Config loader
│   │   ├── setup.mjs          # First-run setup wizard
│   │   ├── deepseek.mjs       # DeepSeek API client
│   │   └── projectDetect.mjs  # Auto-detect project type
│   ├── memory/
│   │   ├── conversationMemory.mjs
│   │   ├── database.mjs
│   │   ├── memoryBank.mjs
│   │   └── search.mjs
│   ├── mcp/
│   │   ├── client.mjs         # MCP client — connects to all servers
│   │   └── servers/           # Individual MCP server implementations
│   │       ├── github.mjs
│   │       ├── google.mjs
│   │       ├── jira.mjs
│   │       ├── docker.mjs
│   │       ├── slack.mjs
│   │       └── postgres.mjs
│   ├── orchestration/
│   │   ├── planner.mjs        # Task planner — decomposes goals into sub-tasks
│   │   ├── scheduler.mjs      # Schedules and parallelizes tasks
│   │   ├── delegate.mjs       # Delegates sub-tasks to agents
│   │   └── reporter.mjs       # Aggregates results and reports
│   ├── tools/
│   │   ├── definitions.mjs    # Tool schemas for the LLM
│   │   ├── executor.mjs       # Tool dispatch and execution
│   │   └── impl/              # Tool implementations
│   │       ├── fs.mjs         # File system tools
│   │       ├── search.mjs     # Search tools
│   │       ├── shell.mjs      # Shell execution
│   │       ├── browser.mjs    # Playwright browser controls
│   │       ├── memory.mjs     # Memory read/write/search
│   │       ├── tasks.mjs      # Task management
│   │       ├── files.mjs      # File read/write operations
│   │       ├── diffutil.mjs   # Diff generation
│   │       ├── orchestrate.mjs# Orchestrator tool
│   │       └── index.mjs      # Tool registry
│   └── ui/
│       └── printer.mjs        # Terminal UI — spinner, colors, formatting
├── scripts/
│   └── costs.mjs              # API cost tracking script
├── tests/                     # Test files
├── .env.example               # Environment configuration template
├── roo.config.json            # MCP server registry
├── eslint.config.mjs          # ESLint flat config
└── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) **v18 or later**
- An API key from a supported AI provider

### Installation

```bash
git clone https://github.com/Jpkoech30/roo-mini.git
cd roo-mini
npm install
```

### Configuration

```bash
cp .env.example .env
```

Edit `.env` with your API key:

```ini
# Required: your AI API key (DeepSeek, OpenAI, etc.)
API_KEY=sk-your-key-here

# Optional: change provider
# API_BASE_URL=https://api.openai.com/v1
# MODEL_NAME=gpt-4o
```

### Usage

```bash
npm start
```

You'll be greeted by an interactive prompt. Just type what you want — Roo-Mini will figure out the rest.

#### Commands in the REPL

| Command              | Alias | Action                |
|----------------------|-------|-----------------------|
| `mode:code`          | `:m:code` | Switch to Code mode   |
| `mode:architect`     | `:m:architect` | Switch to Architect mode |
| `mode:ask`           | `:m:ask` | Switch to Ask mode    |
| `clear`              | `:c`  | Clear screen          |
| `help`               | `:h`  | Show help             |
| `exit` or `quit`     | `:q`  | Exit                  |

#### Other scripts

```bash
npm run dev       # Start with verbose logging
npm run setup     # First-run configuration wizard
npm test          # Run test suite
npm run lint      # Lint the codebase
npm run check     # Lint + test
npm run costs     # Show API cost report
```

---

## Configuration

### AI Provider

Roo-Mini is provider-agnostic. Set these in `.env`:

| Variable        | Default                        | Description                         |
|-----------------|--------------------------------|-------------------------------------|
| `API_KEY`       | _(required)_                   | Your AI provider API key            |
| `API_BASE_URL`  | `https://api.deepseek.com/v1`  | Base URL for the API                |
| `MODEL_NAME`    | `deepseek-chat`                | Model identifier                    |
| `API_TIMEOUT`   | `60000`                        | API request timeout (ms)            |
| `MAX_ITERATIONS`| `50`                           | Max agent loop iterations           |
| `MAX_RETRIES`   | `5`                            | Max retries on API failure          |

### MCP Services

Each MCP server needs its own credentials in `.env`:

| Service        | Required Env Vars                                        |
|----------------|----------------------------------------------------------|
| **GitHub**     | `GITHUB_TOKEN`                                           |
| **Google**     | `GOOGLE_API_KEY`, `GOOGLE_CSE_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Jira**       | `JIRA_HOST`, `JIRA_EMAIL`, `JIRA_API_TOKEN`              |
| **Slack**      | `SLACK_TOKEN`                                            |
| **PostgreSQL** | `PG_URL`                                                 |
| **Docker**     | _(none — uses local Docker socket)_                      |

Services are registered in `roo.config.json`. They start automatically when the agent needs them.

---

## Operating Modes

Roo-Mini has 4 modes, each with a distinct personality:

| Mode           | What it does                                              |
|----------------|-----------------------------------------------------------|
| **code**       | Writes and edits code directly — the default mode         |
| **architect**  | Plans, researches, and proposes — never writes files      |
| **ask**        | Answers questions using tools (search, read, etc.)        |
| **orchestrator** | Coordinates sub-agents for complex multi-step tasks    |

Switch modes mid-session with `mode:code` or `:m:code`.

---

## Architecture

Roo-Mini uses a three-layer architecture:

1. **Agent Loop** — reads your prompt, calls the LLM, executes tool calls, repeats until done
2. **Orchestration Layer** — for complex tasks, the planner breaks them into sub-tasks, the scheduler parallelizes them, and the delegate assigns them to agents
3. **MCP Layer** — each external service (GitHub, Google, Jira, etc.) runs as a standalone MCP server, communicating via stdin/stdout JSON-RPC

The memory system persists facts, conversation history, and task state across sessions, so Roo-Mini remembers your project context even after restart.

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Security

See [SECURITY.md](SECURITY.md) for our security policy and vulnerability disclosure process.

---

## License

[MIT](LICENSE) © Joshua Koech

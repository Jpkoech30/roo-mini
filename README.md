# Roo-Mini

[![Node.js Version](https://img.shields.io/badge/node-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![CI](https://github.com/Jpkoech30/roo-mini/actions/workflows/test.yml/badge.svg)](https://github.com/Jpkoech30/roo-mini/actions/workflows/test.yml)

**Roo-Mini** is an open-source, autonomous AI coding agent that runs in your terminal. It reads, writes, refactors, and executes code from natural language prompts. Powered by your choice of LLM provider — no vendor lock-in.

---

## Features

- **Autonomous code generation** — describe what you want, Roo-Mini builds it
- **Multi-provider AI support** — works with DeepSeek, OpenAI, and any OpenAI-compatible API
- **MCP (Model Context Protocol) integration** — extensible tool system for GitHub, Google Workspace, Jira, Docker, Slack, PostgreSQL, and more
- **File system operations** — read, write, search, refactor, and diff files
- **Shell execution** — run commands and scripts directly from the agent
- **Memory system** — persistent project context across sessions
- **ESLint + tests** — built-in linting and test runner

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- An API key from a supported AI provider (see below)

### Installation

```bash
git clone https://github.com/Jpkoech30/roo-mini.git
cd roo-mini
npm install
```

### Configuration

Copy the environment file and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` with your preferred AI provider:

```ini
# Required: your AI API key
API_KEY=sk-your-key-here

# Optional: change provider (defaults to DeepSeek)
# API_BASE_URL=https://api.openai.com/v1
# MODEL_NAME=gpt-4o
```

### Usage

```bash
npm start
```

Interactive mode — type your requests in natural language:

```
🦘 Roo-Mini — Autonomous AI Coding Agent

Model: deepseek-chat
Working directory: /path/to/project

  Type your request (or 'help' for commands, 'exit' to quit)
  ───────────────────────────────────────────────

  → Create a REST API server with Express
```

### CLI Options

| Flag | Description |
|------|-------------|
| `-v` | Verbose mode — shows full AI responses |
| `-h` | Show help |

### Commands

| Command | Description |
|---------|-------------|
| `help` | Show available commands |
| `status` | Show current configuration and MCP status |
| `exit` / `quit` | Exit Roo-Mini |

## MCP Servers

Roo-Mini uses the **Model Context Protocol** to connect to external services. Configured via `roo.config.json`.

| Server | Purpose | Environment Variables |
|--------|---------|----------------------|
| **GitHub** | Repository management, file pushing, issues | `GITHUB_TOKEN` |
| **Google** | Search, Gmail, Calendar, Drive | `GOOGLE_API_KEY`, `GOOGLE_CSE_ID`, OAuth credentials |
| **Jira** | Issue tracking and project management | `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_HOST` |
| **Docker** | Container and image management | (uses local Docker socket) |
| **Slack** | Channel reading and messaging | `SLACK_BOT_TOKEN` |
| **PostgreSQL** | Database querying and inspection | `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` |

## AI Providers

Roo-Mini is provider-agnostic. Set any OpenAI-compatible endpoint in `.env`:

- **[DeepSeek](https://deepseek.com)** — default (chat mode)
- **[OpenAI](https://openai.com)** — set `API_BASE_URL` to `https://api.openai.com/v1`
- **Any OpenAI-compatible API** — set custom `API_BASE_URL` and `MODEL_NAME`

## Project Structure

```
roo-mini/
├── src/
│   ├── index.mjs          # CLI entry point
│   ├── agent.mjs           # Core AI agent logic
│   ├── config/
│   │   └── setup.mjs       # First-time configuration
│   ├── mcp/
│   │   ├── client.mjs      # MCP client implementation
│   │   └── servers/        # MCP server adapters
│   └── server.mjs          # Express test server
├── tests/                  # Test files (*.test.mjs)
├── .env.example            # Environment variable template
├── roo.config.json         # MCP server configuration
├── eslint.config.mjs       # ESLint configuration
└── package.json
```

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Full Check

```bash
npm run check    # lint + test
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

In short:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## Security

See [SECURITY.md](SECURITY.md) for our security policy and reporting process.

## License

[MIT](LICENSE) © 2025 Roo-Mini

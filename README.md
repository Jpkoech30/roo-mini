# Roo-Mini

[![Node.js Version](https://img.shields.io/badge/node-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

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

Interactive mode — type your requests in natural language.

## Supported AI Providers

| Provider | Base URL | Model |
|----------|----------|-------|
| **DeepSeek** (default) | `https://api.deepseek.com` | `deepseek-chat` |
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o`, `gpt-4-turbo` |
| **Any OpenAI-compatible API** | your custom URL | your model |

Set via environment variables in `.env`:

```ini
API_BASE_URL=https://api.openai.com/v1
MODEL_NAME=gpt-4o
```

## MCP Servers

Roo-Mini communicates with external services through MCP (Model Context Protocol) servers. The following servers are pre-configured in `mcp-servers.json`:

| Server | Tools |
|--------|-------|
| **GitHub** | Create repos, push files, manage issues, list repos |
| **Google Workspace** | Search Gmail, send email, list calendar events, manage Drive |
| **Jira** | Search and create issues |
| **Docker** | List containers, view logs, inspect containers |
| **Slack** | Read and send messages to channels |
| **PostgreSQL** | Query databases, describe tables |

Each server requires its own credentials or configuration. See the `mcp-servers/` directory for setup instructions for each server.

## Project Structure

```
roo-mini/
├── src/
│   ├── index.mjs          # Entry point — interactive REPL
│   ├── config/            # Environment and setup
│   ├── mcp/               # MCP server definitions
│   └── ...                # Core agent logic
├── mcp-servers.json       # MCP server configuration
├── tests/                 # Test suite
├── scripts/               # Utility scripts
└── .env.example           # Environment template
```

## License

MIT

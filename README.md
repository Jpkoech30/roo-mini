# Roo-Mini

Lightweight AI coding assistant with **MCP (Model Context Protocol)** support and multi-agent orchestration. Built for local development with flexible tool execution.

## Features

- 🤖 **Multi-agent orchestration** — Planner, Scheduler, Delegator, Reporter agents work together
- 🔧 **MCP Server support** — Connect to Google Workspace, GitHub, Jira, Slack, Docker, Postgres
- 🧠 **Persistent memory** — Conversation history, task graphs, and memory bank with FTS search
- 🛠️ **Tool ecosystem** — File ops, shell commands, browser automation, web search, diffs
- 💰 **Cost tracking** — Track and report AI usage costs per session
- 🖥️ **Interactive CLI** — Colorful output with boxen/chalk formatting

## Quick Start

```bash
# Install dependencies
npm install

# Run setup (creates .env from .env.example)
npm run setup

# Start the assistant
npm start
```

## Requirements

- Node.js 18+
- OpenAI API key (or DeepSeek/other compatible provider)
- Optional: API keys for MCP services you want to use

## Configuration

Copy `.env.example` to `.env` and fill in your API keys:

```
OPENAI_API_KEY=sk-...
# Optional MCP services
GITHUB_TOKEN=ghp_...
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=...
JIRA_DOMAIN=your-domain.atlassian.net
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
GOOGLE_CLIENT_EMAIL=...@...iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
POSTGRES_URL=postgresql://user:pass@localhost:5432/db
```

## MCP Servers

| Server | Tools Provided |
|--------|---------------|
| **GitHub** | Create repos, push files, manage issues |
| **Google Workspace** | Gmail, Calendar, Drive |
| **Jira** | Search, create, get issues |
| **Slack** | Read/send messages to channels |
| **Docker** | List containers, inspect, view logs |
| **Postgres** | List tables, describe schema, run queries |

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run the assistant |
| `npm run setup` | Interactive setup |
| `npm run costs` | View cost report |
| `npm test` | Run test suite |
| `npm run lint` | Lint source code |
| `npm run check` | Lint + test |

## Project Structure

```
├── src/
│   ├── index.mjs          # Entry point
│   ├── agent/             # Agent loop & modes
│   ├── config/            # Configuration & setup
│   ├── mcp/               # MCP server integrations
│   ├── memory/            # Persistent memory system
│   ├── orchestration/     # Multi-agent orchestration
│   ├── tools/             # Tool definitions + implementations
│   └── ui/                # CLI output formatting
├── scripts/
│   └── costs.mjs          # Cost reporting
├── tests/                 # Test suite
├── .github/workflows/     # CI config
├── .env.example           # Environment template
├── eslint.config.mjs      # ESLint config
└── roo.config.json        # Assistant configuration
```

## License

MIT

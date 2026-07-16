<div align="center">

# 🤖 Roo-Mini

**Lightweight AI coding assistant** with **MCP (Model Context Protocol)** support and multi-agent orchestration.

![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-purple)

<p>
  <a href="vscode://file/Users/jpkoech/roo-mini">
    <img src="https://img.shields.io/badge/Open%20in%20VS%20Code-007ACC?logo=visualstudiocode&style=for-the-badge" alt="Open in VS Code"/>
  </a>
  <a href="https://github.com/Jpkoech30/roo-mini">
    <img src="https://img.shields.io/badge/View%20on%20GitHub-181717?logo=github&style=for-the-badge" alt="View on GitHub"/>
  </a>
  <a href=".">
    <img src="https://img.shields.io/badge/📂%20Open%20Folder-%23000?style=for-the-badge" alt="Open Folder"/>
  </a>
</p>

[Quick Start](#-quick-start) •
[Features](#-features) •
[Tools](#-tools-overview) •
[Configuration](#-configuration) •
[Usage](#-usage)

</div>

---

## ✨ Quick Start

```bash
git clone https://github.com/Jpkoech30/roo-mini.git
cd roo-mini
npm install
npm run setup     # Creates .env from .env.example
npm start         # Fire up the assistant!
```

**One-shot mode:**
```bash
npm start "list files in src/"
echo "hello" | npm start   # Piped input
```

---

## 🎯 Features

| Feature | Description |
|---------|-------------|
| 🤖 **Multi-agent orchestration** | Planner, Scheduler, Delegator, Reporter agents collaborate |
| 🔧 **MCP Server support** | Connect to GitHub, Google Workspace, Jira, Slack, Docker, Postgres |
| 🧠 **Persistent memory** | SQLite-backed memory with FTS search across conversations |
| 🛠️ **35+ built-in tools** | File ops, shell commands, browser automation, web search, diffs |
| 💰 **Cost tracking** | Track AI usage costs per session — `npm run costs` |
| 🖥️ **Interactive CLI** | Beautiful terminal UI with boxen/chalk, tab completion, history |
| 🔒 **Danger detection** | Blocks destructive commands automatically |

---

## 🔧 Tools Overview

Roo-Mini ships with **35+ tools** across 5 categories:

### 📁 File System
| Tool | Description |
|------|-------------|
| `read_file` | Read file contents |
| `write_file` | Create or overwrite files |
| `replace_in_file` | Find-and-replace in files |
| `append_to_file` | Append content to files |
| `search_in_file` | Search within a file |
| `search_files_glob` | Find files by pattern + text |
| `list_files` | List directory contents |
| `move_file` | Move/rename files |
| `delete_file` | Delete files |
| `create_directory` | Create directories |
| `apply_diff` | Apply SEARCH/REPLACE diffs |

### 🖥️ Shell & Execution
| Tool | Description |
|------|-------------|
| `execute_shell` | Run commands with timeout + CWD control |
| `execute_task` | Run a specific task via sub-agent |
| `execute_plan` | Run all ready tasks in a DAG |

### 🧠 Task Orchestration
| Tool | Description |
|------|-------------|
| `create_task` | Create a new task |
| `update_task` | Update status/title/priority |
| `list_tasks` | List/filter tasks |
| `create_subtask` | Create child tasks |
| `create_task_dag` | Create dependency graphs |
| `get_task_status` | Inspect a task |
| `list_task_dag` | View task dependency tree |
| `abort_task` | Cancel a task + dependents |

### 💾 Memory & Context
| Tool | Description |
|------|-------------|
| `store_memory` | Persist facts and decisions |
| `get_memory` | Retrieve stored context |
| `search_memory` | Full-text search across past sessions |
| `clear_memory` | Reset conversation history |
| `show_memory` | View recent conversation |
| `update_project_memory` | Save project-level context |

### 🌐 Browser & External
| Tool | Description |
|------|-------------|
| `browser_open` | Launch headless Chromium |
| `browser_navigate` | Navigate to URL |
| `browser_click` | Click elements |
| `browser_fill` | Fill input fields |
| `browser_screenshot` | Capture page screenshots |
| `browser_get_text` | Get page text |
| `browser_get_html` | Get page HTML |
| `browser_evaluate` | Run JS in page context |
| `browser_get_url` | Get current URL |
| `browser_close` | Close browser |

---

## 🔌 MCP Servers

### Built-in
| Server | Tools Provided |
|--------|---------------|
| **Roo-Mini** | All 35+ file/shell/task/memory/browser tools |
| **OpenAI** | LLM completions & embeddings |

### External (configurable via `.env`)
| Server | Tools | Auth Required |
|--------|-------|---------------|
| **GitHub** | Create repos, push files, manage issues | `GITHUB_TOKEN` |
| **Google Workspace** | Gmail, Calendar, Drive | Service account JSON |
| **Jira** | Search, create, get issues | `JIRA_*` credentials |
| **Slack** | Read/send messages | `SLACK_*` tokens |
| **Docker** | List containers, inspect, logs | Docker socket |
| **Postgres** | List tables, describe, query | `POSTGRES_URL` |
| **DeepSeek** | Alternative LLM provider | `DEEPSEEK_API_KEY` |

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and populate:

```env
# Required
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
DEEPSEEK_API_KEY=...
```

### Config file (`roo.config.json`)
```json
{
  "version": "1.0.0",
  "model": "gpt-4o",
  "mode": "auto",
  "mcpServers": ["github", "google", "jira", "slack", "docker", "postgres"],
  "memory": { "enabled": true, "maxConversations": 50 },
  "costTracking": { "enabled": true, "budget": 10.00 }
}
```

---

## 🎮 Usage

### Interactive REPL
```
npm start
```
```
┌─────────────────────────────────────────┐
│  🤖 ROO-MINI v1.0.0 · 35 tools · mode: code │
│  :h help · :q exit · :c clear · Tab ↑↓       │
└─────────────────────────────────────────┘
```

### Modes
| Command | Mode | Access Level |
|---------|------|-------------|
| `mode:code` | **Code** | Full — read, write, execute |
| `mode:architect` | **Architect** | Read + search only (planning) |
| `mode:ask` | **Ask** | Read only (questions) |
| `mode:orchestrator` | **Orchestrator** | Full + task delegation |

### Commands
| Command | Action |
|---------|--------|
| `:h` / `:help` | Show help |
| `:q` / `exit` | Quit |
| `:c` / `clear` | Clear screen |
| `mode:<name>` | Switch mode |
| `↑` / `↓` | History navigation |
| `Tab` | Autocomplete |

### Cost Report
```bash
npm run costs
```
Shows session usage, token counts, and estimated API costs.

### Testing & Linting
```bash
npm test        # Run tests
npm run lint    # ESLint
npm run check   # Lint + test
```

---

## 🏗️ Project Structure

```
roo-mini/
├── src/
│   ├── agent/          # AI agent loop & modes
│   ├── config/         # Configuration loading
│   ├── core/           # Agent core logic
│   ├── memory/         # SQLite database, FTS search
│   ├── mcp/            # MCP protocol servers & registry
│   ├── orchestration/  # Multi-agent orchestration
│   ├── tools/          # 35+ tool implementations
│   └── ui/             # CLI interface (boxen/chalk)
├── scripts/
│   └── costs.mjs       # Cost reporting script
├── tests/              # Test suite
├── .env.example        # Environment template
├── roo.config.json     # Project configuration
└── package.json
```

---

## 📖 Documentation

| Resource | Description |
|----------|-------------|
| [USAGE.md](USAGE.md) | Detailed usage guide & examples |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [SECURITY.md](SECURITY.md) | Security policy & reporting |
| [LICENSE](LICENSE) | MIT License |

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Quick steps:**
1. Fork & clone
2. `npm install && npm run setup`
3. Make changes
4. `npm run check` — lint + test
5. Open a PR

---

## 📄 License

MIT © [Jpkoech30](https://github.com/Jpkoech30)

---

<div align="center">
Made with ❤️ for AI-powered development
</div>

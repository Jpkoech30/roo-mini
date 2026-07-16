# 🤖 Roo-Mini

> **Your terminal-native AI engineering partner.**  
> Not a chatbot. Not a toy. A full-stack, tool-calling, multi-agent coding engine that lives in your terminal and ships real software.

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&style=flat-square" alt="Node"/>
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"/>
  <img src="https://img.shields.io/badge/version-1.0.0-8A2BE2?style=flat-square" alt="Version"/>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/changelog-latest-orange?style=flat-square" alt="Changelog"/></a>
  <a href="https://github.com/Jpkoech30/roo-mini"><img src="https://img.shields.io/badge/github-Jpkoech30%2Froo--mini-181717?logo=github&style=flat-square" alt="GitHub"/></a>
</p>

---

## ✨ What Makes Roo-Mini Different

Most AI coding tools are **walled gardens** — you chat, it replies, end of story.  
Roo-Mini is the opposite: **it builds.** From scratch. Line by line. File by file.

| Capability | Roo-Mini | Other tools |
|---|---|---|
| Full project scaffolding | ✅ Creates dirs, files, configs | ❌ Just suggests code |
| File system read/write | ✅ 40+ tools | ❌ Clipboard-only |
| Multi-mode planning | ✅ Plan → Code → Shell → Test | ❌ Single mode |
| MCP-native architecture | ✅ Built-in MCP server/client | ❌ Requires plugins |
| PostgreSQL toolkit | ✅ Direct DB querying | ❌ External only |
| Web search & fetch | ✅ Built-in | ❌ External only |
| Sound effects | ✅ Audio feedback per mode | ❌ Silent |

---

## 🧠 Architecture at a Glance

```
┌─────────────────────────────────────┐
│         🧑 User (CLI / MCP)          │
└──────────────┬──────────────────────┘
               │
       ┌───────▼───────┐
       │   Agent Core   │  ← Loop, intent detection, mode routing
       └───────┬───────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐┌────────┐┌────────┐
│  Code   ││  Plan  ││ Shell   │  ← Execution modes
│ Builder ││Architect││Runner  │
└───┬─────┘└───┬─────┘└───┬────┘
    │          │          │
    └──────────┴──────────┘
               │
       ┌───────▼───────┐
       │   Tool Layer   │  ← 40+ tools: files, shell, DB, web
       └───────┬───────┘
               │
       ┌───────▼───────┐
       │  MCP Server   │  ← Model Context Protocol bridge
       └───────────────┘
```

---

## 🚀 Quick Start (30 seconds)

```bash
# 1. Clone & install
git clone https://github.com/Jpkoech30/roo-mini.git
cd roo-mini
npm install

# 2. Configure your API key
cp .env.example .env
# Edit .env — add your AI provider key

# 3. Launch
npm start
```

That's it. You're now talking to an AI that can **write files, run commands, query databases, search the web, and orchestrate multi-step software projects** — all from your terminal.

---

## 🎯 What You Can Do

### 🏗️ Build a full project from scratch
```
> build a Node.js + React todo app with PostgreSQL
```
Roo-Mini will plan the architecture, scaffold directories, write every file, install dependencies, and verify it runs.

### 🗄️ Query databases directly
```
> show me all users who signed up this week
```
Roo-Mini connects to your PostgreSQL, runs the query, and shows results — no GUI needed.

### 🌐 Search & fetch the web
```
> fetch the latest docs for Express 5 and summarize them
```
Roo-Mini searches Google, fetches pages, and extracts what you need.

### 🔄 Multi-step automation
```
> Plan → Code → Test → Deploy
```
Switch between modes mid-conversation. Plan the architecture, write code, test with shell, push to production.

---

## 🧩 Tool Reference (40+)

| Category | Tools |
|---|---|
| **📁 Files** | `read_file`, `write_file`, `append_to_file`, `replace_in_file`, `search_in_file`, `list_files`, `search_files_glob` |
| **💻 Shell** | `execute_shell` |
| **🗄️ Database** | `pg_tables`, `pg_describe`, `pg_query` |
| **🌍 Web** | `web_search`, `web_fetch` |
| **🧠 Memory** | `store_memory`, `get_memory`, `search_memory`, `clear_memory`, `show_memory` |
| **📋 Tasks** | `create_task`, `update_task`, `list_tasks`, `create_subtask`, `create_task_dag`, `get_task_status`, `list_task_dag`, `execute_task`, `abort_task`, `execute_plan` |
| **🐙 GitHub** | `github_create_repo`, `github_push_files`, `github_list_repos`, `github_get_repo`, `github_create_issue` |
| **🎵 Audio** | `play_sound` |

---

## 🎮 Modes

Roo-Mini adapts its behavior to what you're doing:

| Mode | Icon | Purpose |
|---|---|---|
| **Code** | 💻 | Build, write, implement |
| **Plan** | 📋 | Architect, design, whiteboard |
| **Shell** | ⌨️ | Run commands, automate |
| **Test** | ✅ | Verify, validate, QA |
| **Normal** | 💬 | Chat, search, general |

Each mode has its own **sound signature** — you'll hear when Roo-Mini switches gears.

---

## 🔊 Sound Effects

Roo-Mini plays distinct sounds for each mode so you can keep working while it runs:

| Sound | When |
|---|---|
| 🎵 *chime* | Normal mode activated |
| 💻 *keyboard click* | Code mode |
| 📋 *paper rustle* | Plan mode |
| ⌨️ *terminal beep* | Shell mode |
| ✅ *success ding* | Test mode |
| 🛑 *error buzz* | Task failed |

---

## 📦 Project Structure

```
roo-mini/
├── src/
│   ├── index.mjs          # Entry point
│   ├── core/              # Agent loop, orchestrator
│   ├── agent/             # Mode routing, intent detection
│   ├── tools/             # File, shell, DB, web implementations
│   ├── config/            # AI provider config (DeepSeek, OpenAI, etc.)
│   ├── memory/            # persistent memory & task engine
│   ├── mcp/               # MCP server & client
│   └── ui/                # CLI, printer, sound effects
├── .env.example           # API key template
├── package.json
└── README.md
```

---

## 🔧 Configuration

Edit `.env` to set your preferences:

```env
# Required
DEEPSEEK_API_KEY=sk-your-key-here

# Optional
DEEPSEEK_MODEL=deepseek-chat
OPENAI_API_KEY=sk-...
OLLAMA_HOST=http://localhost:11434
```

---

## 🧪 Running Tests

```bash
npm test
```

---

## 🤝 Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📜 License

MIT © [Jpkoech30](https://github.com/Jpkoech30)

---

<p align="center">
  <strong>Built with ☕ and 🎧 in the terminal.</strong><br/>
  <sub>Roo-Mini — your AI that doesn't just talk, it <em>builds</em>.</sub>
</p>

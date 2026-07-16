<div align="center">

# 🦘 Roo-Mini

### An Autonomous AI Coding Agent · Powered by DeepSeek

[![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/your-org/roo-mini/pulls)

**Roo-Mini** is an intelligent CLI agent that reads, writes, refactors, and executes code — all from natural language prompts. It runs in a streaming loop, autonomously choosing the right tool for each task, and stops when the job is done.

</div>

---

## ✨ Features

| Capability | Description |
|---|---|
| **🧠 AI Agent Loop** | The LLM decides which tool to call next — no hardcoded logic |
| **🔧 14+ Tools** | Read, write, edit, regex search, diff patching, shell commands, and more |
| **💾 Persistent Memory** | Remembers facts, decisions, and preferences across sessions |
| **🔍 Smart Search** | Full-text search across conversations & files with glob support |
| **🎯 Precision Edits** | Apply diff-based patches with fuzzy matching fallback |
| **🛡️ Safe Execution** | Runs shell commands with full output capture & error handling |

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure your API key
cp .env.example .env
# Edit .env → add your DEEPSEEK_API_KEY or OPENAI_API_KEY

# Launch the agent
npm start
```

## 📦 Requirements

- **Node.js 18+**
- An OpenAI-compatible API key (DeepSeek, OpenAI, etc.)

## 🧰 Available Tools

| Tool | Purpose |
|---|---|
| `read_file` | Read any file in the project |
| `write_file` | Write or overwrite a file |
| `replace_in_file` | Find & replace specific blocks |
| `apply_diff` | Apply SEARCH/REPLACE diffs with fuzzy fallback |
| `append_to_file` | Append content to a file |
| `search_in_file` | Search by text or regex |
| `search_files_glob` | Glob patterns + content search |
| `execute_shell` | Run terminal commands |
| `list_files` | List directory contents |
| `create_directory` | Create new directories |
| `delete_file` | Delete files safely |
| `move_file` | Move or rename files |
| `update_project_memory` | Save persistent project context |
| `create_task` / `update_task` / `list_tasks` | Task management |
| `search_memory` / `store_memory` / `get_memory` | Cross-session memory |

## 🗂️ Project Structure

```
roo-mini/
├── src/                 # Source code
│   ├── server.mjs       # Express web server (optional)
│   └── ...
├── .env                 # Environment variables
├── package.json
└── README.md
```

## 🧪 Running as a Server

This machine (ThinkPad 20NYS3L70N — Intel i7-8665U, 16GB RAM) can run as a web server on the LAN:

```bash
npm run serve
```

Access at `http://192.168.1.180:3000`

> **Note:** Firewall is currently disabled on all profiles.

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

## 📄 License

[MIT](LICENSE)

---

<div align="center">
  <sub>Built with ❤️ by an autonomous agent</sub>
</div>

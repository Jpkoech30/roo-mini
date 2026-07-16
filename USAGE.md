# ROO-MINI Usage Guide

## Quick Start

```bash
cd roo-mini
cp .env.example .env    # Set your API key
npm start               # Interactive REPL
npm start "list files"  # One-shot mode
echo "hello" | npm start # Piped input
```

---

## Features

### 1. Welcome Banner

Shown automatically on startup:

```
┌─────────────────────────────────────────┐
│  🤖 ROO-MINI v1.0.0 · 35 tools · mode: code │
│  :h help · :q exit · :c clear · Tab ↑↓       │
└─────────────────────────────────────────┘
```

### 2. Cost Report

```bash
npm run costs
```

Shows session usage, token counts, and estimated API costs from all past sessions stored in SQLite.

### 3. Modes

Switch modes with `mode:<name>` or `:m:<name>`:

| Command | Mode | Access |
|---------|------|--------|
| `mode:code` | Code | Full access — read, write, execute |
| `mode:architect` | Architect | Read + search only (planning) |
| `mode:ask` | Ask | Read only (questions) |
| `mode:orchestrator` | Orchestrator | Full access + task delegation |

### 4. Shell Commands

Use `execute_shell` with enhanced parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `command` | string | **Required.** The command to run |
| `cwd` | string | Working directory (relative to project root) |
| `timeout` | integer | Timeout in ms (default: 30000, configurable via `SHELL_TIMEOUT`) |
| `description` | string | Optional description for logging |

**Danger detection blocks:** `rm -rf`, `del /f`, `rmdir /s`, `format`, `diskpart`, `reg delete`, `takeown`, `icacls`, `net user`, `sc delete`, base64-piped execution, `sudo` destructive commands, and more.

**Cross-platform:** Windows dangerous patterns are auto-enabled on Windows. PowerShell `Remove-Item` is also blocked.

### 5. Task Orchestration

Create and execute multi-step task plans:

```
# Create a DAG of tasks with dependencies
create_task_dag tasks=[
  {title: "Design API", mode: "architect", depends_on: []},
  {title: "Implement routes", mode: "code", depends_on: ["Design API"]},
  {title: "Add tests", mode: "code", depends_on: ["Implement routes"]}
]

# View the plan
list_task_dag

# Check task status
get_task_status task_id=1

# Execute a single task
execute_task task_id=1

# Execute all ready tasks in order
execute_plan parent_id=1

# Cancel a task and all dependents
abort_task task_id=1 reason="Scope changed"
```

### 6. Browser Automation

Headless Chromium web automation:

```
# Open browser (auto-opens if not already running)
browser_open

# Navigate to a URL
browser_navigate url="https://example.com"

# Interact with the page
browser_fill selector="#search" value="hello world"
browser_click selector="button[type=submit]"

# Extract content
browser_get_text selector=".result"
browser_get_html selector="main"
browser_evaluate code="document.title"

# Take screenshot
browser_screenshot full_page=true

# Get current URL
browser_get_url

# Close when done
browser_close
```

The browser persists across calls — you can navigate, click, fill, screenshot, and extract in separate steps.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEY` | — | API key for LLM provider |
| `API_BASE_URL` | `https://api.deepseek.com/v1` | API endpoint |
| `API_MODEL` | `deepseek-chat` | Model name |
| `SHELL_TIMEOUT` | `30000` | Default shell timeout (ms) |
| `TOOL_RESULT_MAX_CHARS` | `2000` | Max chars returned per tool call |
| `MAX_ITERATIONS` | `50` | Max agent loop iterations |
| `TYPEWRITER_SPEED` | `12` | Typewriter effect speed (ms) |
| `PRICE_PER_M_INPUT` | `0.14` | Input token price ($/M tokens) |
| `PRICE_PER_M_OUTPUT` | `0.28` | Output token price ($/M tokens) |

---

## Architecture

```
src/
├── index.mjs              # CLI entry point (REPL, piping, one-shot)
├── agent/
│   ├── loop.mjs           # Main agent loop (streaming, tool execution)
│   └── modes.mjs          # Mode definitions (code, architect, ask, orchestrator)
├── config/
│   ├── index.mjs          # Central config from env vars
│   ├── deepseek.mjs       # OpenAI-compatible API client
│   ├── projectDetect.mjs  # Auto-detect project type
│   └── setup.mjs          # First-run setup
├── tools/
│   ├── definitions.mjs    # Tool schemas (OpenAI function calling format)
│   ├── executor.mjs       # Tool dispatcher (built-in → MCP fallback)
│   └── impl/              # Tool implementations
│       ├── files.mjs      # read/write/replace/append/apply_diff
│       ├── search.mjs     # search_in_file/search_files_glob
│       ├── fs.mjs         # list/move/delete/create_directory
│       ├── shell.mjs      # execute_shell with danger detection
│       ├── tasks.mjs      # CRUD + orchestration tasks
│       ├── orchestrate.mjs # getTaskStatus/abortTask/executeTask/executePlan
│       ├── browser.mjs    # 10 browser automation tools (Playwright)
│       └── diffutil.mjs   # Diff generation utility
├── orchestration/
│   ├── scheduler.mjs      # Topological sort, DAG validation, ready tasks
│   ├── delegate.mjs       # Sub-agent spawning for task execution
│   ├── reporter.mjs       # Result aggregation and reporting
│   └── planner.mjs        # LLM-based task breakdown
├── memory/
│   ├── database.mjs       # SQLite layer (conversations, memory, tasks, projects, deps)
│   ├── conversationMemory.mjs # Session persistence
│   ├── memoryBank.mjs     # Key-value project memory
│   └── search.mjs         # FTS5 full-text search
├── mcp/
│   ├── client.mjs         # MCP server management
│   └── servers/           # Built-in MCP servers
├── ui/
│   └── printer.mjs        # Terminal UI (boxes, cards, typewriter)
└── scripts/
    └── costs.mjs          # Cost report generator
```

## Tool Inventory (35 tools)

| Category | Tools |
|----------|-------|
| **File** (5) | read, write, replace, append, apply_diff |
| **Search** (2) | search_in_file, search_files_glob |
| **Filesystem** (4) | list_files, move, delete, create_directory |
| **Shell** (1) | execute_shell |
| **Memory** (6) | clear, show, update, store, get, search |
| **Tasks** (3) | create, update, list |
| **Orchestration** (7) | create_subtask, create_task_dag, list_task_dag, get_task_status, abort_task, execute_task, execute_plan |
| **Browser** (10) | open, navigate, click, fill, screenshot, get_text, get_html, evaluate, get_url, close |

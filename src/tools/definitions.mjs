export const tools = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the content of a file.",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Relative path to the file." },
        },
        required: ["file_path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write new content to a file (overwrites).",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Relative path." },
          content: { type: "string", description: "The full content to write." },
        },
        required: ["file_path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "replace_in_file",
      description: "Replace a specific block of text in a file.",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Relative path." },
          old_str: { type: "string", description: "The exact text to replace." },
          new_str: { type: "string", description: "The new text." },
        },
        required: ["file_path", "old_str", "new_str"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "append_to_file",
      description: "Append text to the end of a file.",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Relative path." },
          content: { type: "string", description: "Text to append." },
        },
        required: ["file_path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List all files and folders in a directory. Supports optional recursive listing.",
      parameters: {
        type: "object",
        properties: {
          dir_path: { type: "string", description: "Relative path to the directory." },
          recursive: { type: "boolean", description: "If true, list all files recursively (default: false)." },
        },
        required: ["dir_path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_in_file",
      description: "Search for text or regex pattern inside a specific file. Returns matching line numbers and context.",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Relative path to the file." },
          search_term: { type: "string", description: "Text or regex pattern to search for." },
          regex: { type: "boolean", description: "If true, treat search_term as a regex pattern (default: false)." },
        },
        required: ["file_path", "search_term"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_files_glob",
      description: "Find files matching a pattern that contain specific text.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "File pattern like '*.js'." },
          search_term: { type: "string", description: "Text to search for." },
        },
        required: ["pattern", "search_term"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_shell",
      description: "Execute a shell command with optional working directory, timeout, and shell selection.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to run." },
          cwd: { type: "string", description: "Working directory relative to project root (default: project root)." },
          timeout: { type: "integer", description: "Timeout in milliseconds (default: 30000, configurable via SHELL_TIMEOUT env var)." },
          description: { type: "string", description: "Optional description of what the command does (for readability/logging)." },
        },
        required: ["command"],
      },
    },
  },
  // Self-Restructuring Tools
  {
    type: "function",
    function: {
      name: "move_file",
      description: "Move or rename a file or directory.",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string", description: "Current path (relative to project root)." },
          destination: { type: "string", description: "New path (relative to project root)." },
        },
        required: ["source", "destination"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Delete a file or empty directory. Use with caution.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Path to delete (relative to project root)." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_directory",
      description: "Create a new directory (and any parent directories if needed).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path to create (relative to project root)." },
        },
        required: ["path"],
      },
    },
  },
  // Diff / Edit Tools
  {
    type: "function",
    function: {
      name: "apply_diff",
      description: "Apply a SEARCH/REPLACE block to a file. Searches for exact content and replaces it. Falls back to fuzzy matching (whitespace-normalized) if exact match fails.",
      parameters: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Relative path to the file." },
          search_str: { type: "string", description: "The exact text to search for (SEARCH block)." },
          replace_str: { type: "string", description: "The new text to replace it with (REPLACE block)." },
        },
        required: ["file_path", "search_str", "replace_str"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project_memory",
      description: "Save or update the project-level memory (persistent context about the project).",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The project memory content to save. Overwrites any existing content." },
        },
        required: ["content"],
      },
    },
  },
  // Memory Tools
  {
    type: "function",
    function: {
      name: "clear_memory",
      description: "Clear the conversation history. Use this when the user wants to start fresh.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_memory",
      description: "Show the recent conversation history.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  // Task Management
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task with optional priority, tags, and description. Tasks are persisted across sessions.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title (required)." },
          description: { type: "string", description: "Optional detailed description." },
          priority: { type: "integer", description: "Priority 0-5 (default: 0)." },
          tags: { type: "array", items: { type: "string" }, description: "Optional tags for filtering." },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update a task's status, title, or priority.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "integer", description: "The task ID to update." },
          status: { type: "string", enum: ["pending", "in_progress", "done", "blocked", "cancelled"], description: "New status." },
          title: { type: "string", description: "New title." },
          priority: { type: "integer", description: "New priority 0-5." },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List tasks, optionally filtered by status or tag.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "in_progress", "done", "blocked", "cancelled"], description: "Filter by status." },
          tag: { type: "string", description: "Filter by tag." },
        },
        required: [],
      },
    },
  },
  // Memory & Search
  {
    type: "function",
    function: {
      name: "search_memory",
      description: "Search past conversations using full-text search. Finds relevant context from previous sessions.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (natural language or keywords)." },
          limit: { type: "integer", description: "Max results (default: 5)." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "store_memory",
      description: "Store a fact, decision, or preference in persistent project memory.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Unique key (e.g., 'decision:use-sqlite')." },
          value: { type: "string", description: "The value to store." },
          category: { type: "string", enum: ["fact", "decision", "user_pref", "general"], description: "Category (default: general)." },
        },
        required: ["key", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_memory",
      description: "Retrieve a stored memory entry by key. Use this to read back facts, decisions, or preferences you previously stored.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "The memory key to retrieve (e.g., 'decision:use-sqlite')." },
        },
        required: ["key"],
      },
    },
  },
  // User Interaction
  {
    type: "function",
    function: {
      name: "ask_user",
      description: "Ask the user a question and wait for their response. Use this when you need clarification, confirmation, or additional input.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "The question to ask the user." }
        },
        required: ["question"]
      }
    }
  },
  // ═══════════════════════════════════════════
  //  Orchestration Tools
  // ═══════════════════════════════════════════
  {
    type: "function",
    function: {
      name: "create_subtask",
      description: "Create a sub-task under an existing parent task, with optional dependencies on sibling tasks.",
      parameters: {
        type: "object",
        properties: {
          parent_id: { type: "integer", description: "ID of the parent task." },
          title: { type: "string", description: "Title of the sub-task." },
          description: { type: "string", description: "Optional detailed description." },
          mode: { type: "string", enum: ["code", "architect", "ask"], description: "Mode to execute this task in (default: code)." },
          depends_on: { type: "array", items: { type: "integer" }, description: "IDs of sibling tasks this depends on." },
          priority: { type: "integer", description: "Priority 0-5 (default: 0)." },
          tags: { type: "array", items: { type: "string" }, description: "Optional tags." },
        },
        required: ["parent_id", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task_dag",
      description: "Create multiple tasks with dependency edges in a single call. Each task can specify which other tasks it depends on by title.",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Task title (unique within this set)." },
                description: { type: "string", description: "Optional description." },
                mode: { type: "string", enum: ["code", "architect", "ask"], description: "Execution mode (default: code)." },
                depends_on: { type: "array", items: { type: "string" }, description: "Titles of tasks this depends on (must be in the same call)." },
                priority: { type: "integer", description: "Priority 0-5 (default: 0)." },
                tags: { type: "array", items: { type: "string" }, description: "Optional tags." },
              },
              required: ["title"],
            },
          },
          parent_id: { type: "integer", description: "Optional parent task ID to nest under." },
        },
        required: ["tasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_task_dag",
      description: "Show the task dependency graph as an indented tree for a project or parent task.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "integer", description: "Filter by project ID." },
          parent_id: { type: "integer", description: "Filter by parent task ID." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_task_status",
      description: "Show detailed status of a specific task including its dependencies and dependents.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "integer", description: "ID of the task to inspect." },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "abort_task",
      description: "Cancel a task and all its dependent tasks. Marks them as cancelled.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "integer", description: "ID of the task to abort." },
          reason: { type: "string", description: "Optional reason for aborting." },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_task",
      description: "Execute a single task by spawning a sub-agent in the task's assigned mode. The task must be ready (all dependencies done).",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "integer", description: "ID of the task to execute." },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_plan",
      description: "Execute all ready tasks in a project or parent task's DAG. Automatically finds ready tasks, executes them, and continues until all tasks are done or blocked.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "integer", description: "ID of the project whose plan to execute." },
          parent_id: { type: "integer", description: "ID of the parent task whose sub-tasks to execute." },
        },
        required: [],
      },
    },
  },
  // ═══════════════════════════════════════════
  //  Browser Automation Tools
  // ═══════════════════════════════════════════
  {
    type: "function",
    function: {
      name: "browser_open",
      description: "Launch a headless Chromium browser instance for web automation. No-op if already open.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_navigate",
      description: "Navigate to a URL and wait for the page to fully load.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The full URL to navigate to (including https://)." },
          timeout: { type: "integer", description: "Navigation timeout in ms (default: 30000)." },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_click",
      description: "Click an element on the page by CSS selector. Waits for the element to be visible.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for the element to click." },
          timeout: { type: "integer", description: "Wait timeout in ms (default: 5000)." },
        },
        required: ["selector"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_fill",
      description: "Fill an input field on the page by CSS selector.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for the input field." },
          value: { type: "string", description: "Text to type into the field." },
          timeout: { type: "integer", description: "Wait timeout in ms (default: 5000)." },
        },
        required: ["selector", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_screenshot",
      description: "Take a screenshot of the current page. Returns a base64 data URI.",
      parameters: {
        type: "object",
        properties: {
          full_page: { type: "boolean", description: "If true, capture the full scrollable page (default: false)." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_get_text",
      description: "Get the visible text content from a CSS selector or the whole page.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "Optional CSS selector. Omit to get all page text." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_get_html",
      description: "Get the inner HTML of an element by CSS selector, or the full page HTML.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "Optional CSS selector. Omit to get full page HTML." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_evaluate",
      description: "Run JavaScript code in the browser page context and return the result.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "JavaScript code to execute in the page." },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_get_url",
      description: "Get the current page URL.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_close",
      description: "Close the browser instance and free resources.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];
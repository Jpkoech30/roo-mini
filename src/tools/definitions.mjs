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
      description: "Run a terminal command.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to run." },
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
  }
];
import { toolImplementations } from "./impl/index.mjs";

/**
 * Tool definitions describe each tool's name, description, and expected parameters.
 * These are exposed to the LLM so it knows what tools are available and how to call them.
 */

const toolDefinitions = [
  {
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
  {
    name: "write_file",
    description: "Create or overwrite a file with new content.",
    parameters: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Relative path to the file." },
        content: { type: "string", description: "Full content to write." },
      },
      required: ["file_path", "content"],
    },
  },
  {
    name: "replace_in_file",
    description: "Replace a specific string in a file.",
    parameters: {
      type: "object",
      properties: {
        file_path: { type: "string" },
        old_str: { type: "string", description: "Exact string to replace." },
        new_str: { type: "string", description: "Replacement string." },
      },
      required: ["file_path", "old_str", "new_str"],
    },
  },
  {
    name: "append_to_file",
    description: "Append content to an existing file.",
    parameters: {
      type: "object",
      properties: {
        file_path: { type: "string" },
        content: { type: "string" },
      },
      required: ["file_path", "content"],
    },
  },
  {
    name: "search_in_file",
    description: "Search for a string in a file and show matching lines.",
    parameters: {
      type: "object",
      properties: {
        file_path: { type: "string" },
        search_term: { type: "string" },
      },
      required: ["file_path", "search_term"],
    },
  },
  {
    name: "search_files_glob",
    description: "Find files matching a pattern that contain specific text.",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "File pattern like '*.js'." },
        search_term: { type: "string", description: "Optional text to search for within matching files." },
      },
      required: ["pattern"],
    },
  },
  {
    name: "list_files",
    description: "List files and directories.",
    parameters: {
      type: "object",
      properties: {
        dir_path: { type: "string", description: "Directory to list (default: root)." },
        recursive: { type: "boolean", description: "Recursive listing." },
      },
    },
  },
  {
    name: "execute_shell",
    description: "Execute a shell command (blocked if dangerous).",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to run." },
      },
      required: ["command"],
    },
  },
  {
    name: "create_task",
    description: "Create a new task.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "number" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "Update a task's status, title, or priority.",
    parameters: {
      type: "object",
      properties: {
        task_id: { type: "number" },
        status: { type: "string", enum: ["pending", "in_progress", "done", "blocked", "cancelled"] },
        title: { type: "string" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "list_tasks",
    description: "List tasks with optional filtering.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string" },
        tag: { type: "string" },
      },
    },
  },
  {
    name: "create_subtask",
    description: "Create a sub-task under a parent task.",
    parameters: {
      type: "object",
      properties: {
        parent_id: { type: "number" },
        title: { type: "string" },
        description: { type: "string" },
        mode: { type: "string", enum: ["code", "plan", "shell"] },
      },
      required: ["parent_id", "title"],
    },
  },
  {
    name: "create_task_dag",
    description: "Create multiple tasks with dependencies (DAG).",
    parameters: {
      type: "object",
      properties: {
        project_id: { type: "number" },
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              mode: { type: "string" },
              depends_on: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
      required: ["tasks"],
    },
  },
  {
    name: "get_task_status",
    description: "Get detailed status of a task.",
    parameters: {
      type: "object",
      properties: {
        task_id: { type: "number" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "list_task_dag",
    description: "Show the task dependency tree.",
    parameters: {
      type: "object",
      properties: {
        project_id: { type: "number" },
        parent_id: { type: "number" },
      },
    },
  },
  {
    name: "store_memory",
    description: "Store a key-value pair in persistent memory.",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string" },
        value: { type: "string" },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "get_memory",
    description: "Retrieve a value by key from memory.",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string" },
      },
      required: ["key"],
    },
  },
  {
    name: "search_memory",
    description: "Search past conversation history.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "clear_memory",
    description: "Clear the conversation history.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "show_memory",
    description: "Show recent conversation history.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "update_project_memory",
    description: "Save persistent project context that persists across sessions.",
    parameters: {
      type: "object",
      properties: {
        context: { type: "string", description: "Project context to save." },
      },
      required: ["context"],
    },
  },
  {
    name: "execute_task",
    description: "Execute a task by ID.",
    parameters: {
      type: "object",
      properties: {
        task_id: { type: "number" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "abort_task",
    description: "Cancel a task.",
    parameters: {
      type: "object",
      properties: {
        task_id: { type: "number" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "execute_plan",
    description: "Execute all pending tasks in a project plan.",
    parameters: {
      type: "object",
      properties: {
        project_id: { type: "number" },
      },
      required: ["project_id"],
    },
  },
];

/**
 * Get tool definitions as a formatted string for the LLM.
 */
export function getToolDefinition(name) {
  return toolDefinitions.find(t => t.name === name) || null;
}

export function getAllToolDefinitions() {
  return toolDefinitions;
}

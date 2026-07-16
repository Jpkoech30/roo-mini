export const tools = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the content of a file.",
      parameters: { type: "object", properties: { file_path: { type: "string", description: "Relative path to the file." } }, required: ["file_path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write new content to a file (overwrites).",
      parameters: { type: "object", properties: { file_path: { type: "string", description: "Relative path." }, content: { type: "string", description: "The full content to write." } }, required: ["file_path", "content"] },
    },
  },
  {
    type: "function",
    function: {
      name: "replace_in_file",
      description: "Replace a specific block of text in a file.",
      parameters: { type: "object", properties: { file_path: { type: "string", description: "Relative path." }, old_str: { type: "string", description: "The exact text to replace." }, new_str: { type: "string", description: "The new text." } }, required: ["file_path", "old_str", "new_str"] },
    },
  },
  {
    type: "function",
    function: {
      name: "append_to_file",
      description: "Append text to the end of a file.",
      parameters: { type: "object", properties: { file_path: { type: "string", description: "Relative path." }, content: { type: "string", description: "Text to append." } }, required: ["file_path", "content"] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List all files and folders in a directory. Supports optional recursive listing.",
      parameters: { type: "object", properties: { dir_path: { type: "string", description: "Relative path to the directory." }, recursive: { type: "boolean", description: "If true, list all files recursively (default: false)." } } },
    },
  },
  {
    type: "function",
    function: {
      name: "search_in_file",
      description: "Search for text or regex pattern inside a specific file.",
      parameters: { type: "object", properties: { file_path: { type: "string", description: "Relative path to the file." }, search_term: { type: "string", description: "Text or regex pattern to search for." }, regex: { type: "boolean", description: "If true, treat search_term as a regex pattern (default: false)." } }, required: ["file_path", "search_term"] },
    },
  },
  {
    type: "function",
    function: {
      name: "search_files_glob",
      description: "Find files matching a pattern that contain specific text.",
      parameters: { type: "object", properties: { pattern: { type: "string", description: "File pattern like '*.js'." }, search_term: { type: "string", description: "Text to search for." } } },
    },
  },
  {
    type: "function",
    function: {
      name: "move_file",
      description: "Move or rename a file.",
      parameters: { type: "object", properties: { source: { type: "string", description: "Current file path." }, destination: { type: "string", description: "New file path." } }, required: ["source", "destination"] },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Delete a file.",
      parameters: { type: "object", properties: { file_path: { type: "string", description: "Relative path to the file." } }, required: ["file_path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "create_directory",
      description: "Create a new directory (including parent directories).",
      parameters: { type: "object", properties: { dir_path: { type: "string", description: "Relative path to the directory." } }, required: ["dir_path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_shell",
      description: "Execute a shell command and return its output.",
      parameters: { type: "object", properties: { command: { type: "string", description: "Shell command to execute." } }, required: ["command"] },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_diff",
      description: "Apply a diff/patch to a file. Uses GNU patch-style unified diffs.",
      parameters: { type: "object", properties: { file_path: { type: "string", description: "Relative path to the file." }, diff_content: { type: "string", description: "Unified diff content to apply." } }, required: ["file_path", "diff_content"] },
    },
  },
  {
    type: "function",
    function: {
      name: "store_memory",
      description: "Store a fact or decision in the project memory bank.",
      parameters: { type: "object", properties: { key: { type: "string", description: "Memory key (e.g., 'decision:use-sqlite')." }, value: { type: "string", description: "Memory value." } }, required: ["key", "value"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_memory",
      description: "Retrieve a stored memory entry by key.",
      parameters: { type: "object", properties: { key: { type: "string", description: "The memory key to retrieve." } }, required: ["key"] },
    },
  },
  {
    type: "function",
    function: {
      name: "search_memory",
      description: "Search past conversations using full-text search.",
      parameters: { type: "object", properties: { query: { type: "string", description: "Search query (natural language or keywords)." }, limit: { type: "integer", description: "Max results (default: 5)." } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project_memory",
      description: "Update the project memory context.",
      parameters: { type: "object", properties: { context: { type: "string", description: "Updated project context." } }, required: ["context"] },
    },
  },
  {
    type: "function",
    function: {
      name: "show_memory",
      description: "Show the recent conversation history.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_memory",
      description: "Clear the conversation history.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List tasks, optionally filtered by status or tag.",
      parameters: { type: "object", properties: { status: { type: "string", enum: ["pending", "in_progress", "done", "blocked", "cancelled"], description: "Filter by status." }, tag: { type: "string", description: "Filter by tag." } } },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task.",
      parameters: { type: "object", properties: { title: { type: "string", description: "Task title." }, description: { type: "string", description: "Task description." }, status: { type: "string", enum: ["pending", "in_progress", "done"], description: "Initial status." }, priority: { type: "integer", description: "Priority 0-5." } }, required: ["title"] },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update a task's status, priority, or other fields.",
      parameters: { type: "object", properties: { task_id: { type: "integer", description: "Task ID." }, status: { type: "string", enum: ["pending", "in_progress", "done", "blocked", "cancelled"] }, priority: { type: "integer", description: "Priority 0-5." } }, required: ["task_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "create_subtask",
      description: "Create a sub-task under a parent task.",
      parameters: { type: "object", properties: { parent_id: { type: "integer", description: "Parent task ID." }, title: { type: "string", description: "Sub-task title." }, description: { type: "string", description: "Sub-task description." }, mode: { type: "string", enum: ["code", "architect", "ask"], description: "Agent mode for the sub-task." } }, required: ["parent_id", "title"] },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task_dag",
      description: "Create a structured task plan (DAG) with dependencies.",
      parameters: { type: "object", properties: { project_id: { type: "integer", description: "Project ID." }, tasks: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, mode: { type: "string", enum: ["code", "architect", "ask"] }, depends_on: { type: "array", items: { type: "string" }, description: "Titles of tasks this depends on." }, priority: { type: "integer" } } }, description: "Array of task objects." } }, required: ["tasks"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_task_status",
      description: "Show detailed status of a specific task.",
      parameters: { type: "object", properties: { task_id: { type: "integer", description: "ID of the task to inspect." } }, required: ["task_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_task_dag",
      description: "Show the task dependency graph as an indented tree.",
      parameters: { type: "object", properties: { project_id: { type: "integer", description: "Filter by project ID." }, parent_id: { type: "integer", description: "Filter by parent task ID." } } },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_task",
      description: "Execute a specific task by spawning a sub-agent.",
      parameters: { type: "object", properties: { task_id: { type: "integer", description: "Task ID to execute." } }, required: ["task_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_plan",
      description: "Execute all ready tasks in a project's DAG.",
      parameters: { type: "object", properties: { project_id: { type: "integer", description: "Project ID." } }, required: ["project_id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "abort_task",
      description: "Cancel a task that is in progress.",
      parameters: { type: "object", properties: { task_id: { type: "integer", description: "Task ID to cancel." } }, required: ["task_id"] },
    },
  },
  // Browser tools
  {
    type: "function",
    function: {
      name: "browser_open",
      description: "Open a browser window.",
      parameters: { type: "object", properties: { url: { type: "string", description: "URL to navigate to." } } },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_navigate",
      description: "Navigate to a URL in the current browser window.",
      parameters: { type: "object", properties: { url: { type: "string", description: "URL to navigate to." } }, required: ["url"] },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_click",
      description: "Click an element on the page.",
      parameters: { type: "object", properties: { selector: { type: "string", description: "CSS selector for the element." } }, required: ["selector"] },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_fill",
      description: "Fill a form field on the page.",
      parameters: { type: "object", properties: { selector: { type: "string", description: "CSS selector." }, value: { type: "string", description: "Text to type." } }, required: ["selector", "value"] },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_screenshot",
      description: "Take a screenshot of the current page.",
      parameters: { type: "object", properties: { path: { type: "string", description: "Output path." } } },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_get_text",
      description: "Get the text content of an element.",
      parameters: { type: "object", properties: { selector: { type: "string", description: "CSS selector." } }, required: ["selector"] },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_get_html",
      description: "Get the inner HTML of an element.",
      parameters: { type: "object", properties: { selector: { type: "string", description: "CSS selector." } }, required: ["selector"] },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_evaluate",
      description: "Execute JavaScript in the browser and get the result.",
      parameters: { type: "object", properties: { script: { type: "string", description: "JavaScript code to run." } }, required: ["script"] },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_get_url",
      description: "Get the current URL.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "browser_close",
      description: "Close the browser window.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  // Google tools
  {
    type: "function",
    function: {
      name: "google_search",
      description: "Search the web using Google Custom Search.",
      parameters: { type: "object", properties: { query: { type: "string", description: "Search query." }, num: { type: "integer", description: "Number of results." } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_list",
      description: "List recent Gmail messages.",
      parameters: { type: "object", properties: { maxResults: { type: "integer", description: "Max results." } } },
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_send",
      description: "Send an email via Gmail.",
      parameters: { type: "object", properties: { to: { type: "string", description: "Recipient email." }, subject: { type: "string", description: "Email subject." }, body: { type: "string", description: "Email body." } }, required: ["to", "subject", "body"] },
    },
  },
  {
    type: "function",
    function: {
      name: "gmail_search",
      description: "Search Gmail messages.",
      parameters: { type: "object", properties: { query: { type: "string", description: "Search query." }, maxResults: { type: "integer" } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "calendar_list",
      description: "List upcoming calendar events.",
      parameters: { type: "object", properties: { maxResults: { type: "integer" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "calendar_create",
      description: "Create a calendar event.",
      parameters: { type: "object", properties: { summary: { type: "string", description: "Event title." }, start: { type: "string", description: "Start time (ISO 8601)." }, end: { type: "string", description: "End time (ISO 8601)." }, description: { type: "string" } }, required: ["summary", "start", "end"] },
    },
  },
  {
    type: "function",
    function: {
      name: "drive_list",
      description: "List files in Google Drive.",
      parameters: { type: "object", properties: { pageSize: { type: "integer" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "drive_search",
      description: "Search files in Google Drive.",
      parameters: { type: "object", properties: { query: { type: "string", description: "Search query." }, pageSize: { type: "integer" } }, required: ["query"] },
    },
  },
  // Jira tools
  {
    type: "function",
    function: {
      name: "jira_search",
      description: "Search Jira issues using JQL.",
      parameters: { type: "object", properties: { jql: { type: "string", description: "JQL query." }, maxResults: { type: "integer" } }, required: ["jql"] },
    },
  },
  {
    type: "function",
    function: {
      name: "jira_get_issue",
      description: "Get a Jira issue by key.",
      parameters: { type: "object", properties: { issueKey: { type: "string", description: "Issue key (e.g., PROJ-123)." } }, required: ["issueKey"] },
    },
  },
  {
    type: "function",
    function: {
      name: "jira_create_issue",
      description: "Create a Jira issue.",
      parameters: { type: "object", properties: { project: { type: "string" }, summary: { type: "string" }, issueType: { type: "string" }, description: { type: "string" } }, required: ["project", "summary"] },
    },
  },
  // Docker tools
  {
    type: "function",
    function: {
      name: "docker_ps",
      description: "List Docker containers.",
      parameters: { type: "object", properties: { all: { type: "boolean", description: "Include stopped containers." } } },
    },
  },
  {
    type: "function",
    function: {
      name: "docker_logs",
      description: "View Docker container logs.",
      parameters: { type: "object", properties: { container: { type: "string" }, tail: { type: "integer" } }, required: ["container"] },
    },
  },
  {
    type: "function",
    function: {
      name: "docker_inspect",
      description: "Inspect a Docker container.",
      parameters: { type: "object", properties: { container: { type: "string" } }, required: ["container"] },
    },
  },
  {
    type: "function",
    function: {
      name: "docker_images",
      description: "List Docker images.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  // Slack tools
  {
    type: "function",
    function: {
      name: "slack_channels",
      description: "List Slack channels.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "slack_read",
      description: "Read messages from a Slack channel.",
      parameters: { type: "object", properties: { channel: { type: "string" }, limit: { type: "integer" } }, required: ["channel"] },
    },
  },
  {
    type: "function",
    function: {
      name: "slack_send",
      description: "Send a message to a Slack channel.",
      parameters: { type: "object", properties: { channel: { type: "string" }, text: { type: "string" } }, required: ["channel", "text"] },
    },
  },
  // Postgres tools
  {
    type: "function",
    function: {
      name: "pg_tables",
      description: "List PostgreSQL tables in a schema.",
      parameters: { type: "object", properties: { schema: { type: "string", default: "public" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "pg_describe",
      description: "Describe a PostgreSQL table schema.",
      parameters: { type: "object", properties: { table: { type: "string" }, schema: { type: "string", default: "public" } }, required: ["table"] },
    },
  },
  {
    type: "function",
    function: {
      name: "pg_query",
      description: "Execute a PostgreSQL query.",
      parameters: { type: "object", properties: { sql: { type: "string" }, params: { type: "array", items: { type: "string" } } }, required: ["sql"] },
    },
  },
];

export const toolMap = {};
for (const t of tools) {
  toolMap[t.function.name] = t;
}

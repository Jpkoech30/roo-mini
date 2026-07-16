/**
 * Tool registry — maps tool names to their implementations.
 * Each tool function receives (cwd, args) and returns a string result.
 */

import * as files from "./files.mjs";
import * as search from "./search.mjs";
import * as fsops from "./fs.mjs";
import * as shell from "./shell.mjs";
import * as memory from "./memory.mjs";
import * as tasks from "./tasks.mjs";
import * as orchestrate from "./orchestrate.mjs";
import * as browser from "./browser.mjs";

/** Map of tool name → implementation function */
export const toolImplementations = {
  // File operations
  read_file: files.readFile,
  write_file: files.writeFile,
  replace_in_file: files.replaceInFile,
  append_to_file: files.appendToFile,
  apply_diff: files.applyDiff,

  // Search
  search_in_file: search.searchInFile,
  search_files_glob: search.searchFilesGlob,

  // Filesystem operations
  list_files: fsops.listFiles,
  move_file: fsops.moveFile,
  delete_file: fsops.deleteFile,
  create_directory: fsops.createDirectory,

  // Shell
  execute_shell: shell.executeShell,

  // Memory
  clear_memory: memory.clearMemory,
  show_memory: memory.showMemory,
  update_project_memory: memory.updateProjectMemory,

  // Tasks & Search
  create_task: tasks.createTask,
  update_task: tasks.updateTask,
  list_tasks: tasks.listTasks,
  search_memory: tasks.searchMemory,
  store_memory: tasks.storeMemory,
  get_memory: tasks.getMemory,

  // Orchestration
  create_subtask: tasks.createSubTask,
  create_task_dag: tasks.createTaskDAG,
  list_task_dag: tasks.listTaskDAG,
  get_task_status: orchestrate.getTaskStatus,
  abort_task: orchestrate.abortTask,
  execute_task: orchestrate.executeTask,
  execute_plan: orchestrate.executePlan,

  // Browser automation
  browser_open: browser.browserOpen,
  browser_navigate: browser.browserNavigate,
  browser_click: browser.browserClick,
  browser_fill: browser.browserFill,
  browser_screenshot: browser.browserScreenshot,
  browser_get_text: browser.browserGetText,
  browser_get_html: browser.browserGetHtml,
  browser_evaluate: browser.browserEvaluate,
  browser_get_url: browser.browserGetUrl,
  browser_close: browser.browserClose,
};

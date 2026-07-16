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
};

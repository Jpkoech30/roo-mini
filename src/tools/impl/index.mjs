import * as files from "./files.mjs";
import * as search from "./search.mjs";
import * as fsops from "./fs.mjs";
import * as shell from "./shell.mjs";
import * as memory from "./memory.mjs";
import * as tasks from "./tasks.mjs";
import * as orchestrate from "./orchestrate.mjs";
import * as browser from "./browser.mjs";
import * as pg from "./pg.mjs";
import * as web from "./web.mjs";

export const toolImplementations = {
  read_file: files.readFile,
  write_file: files.writeFile,
  replace_in_file: files.replaceInFile,
  append_to_file: files.appendToFile,
  apply_diff: files.applyDiff,
  search_in_file: search.searchInFile,
  search_files_glob: search.searchFilesGlob,
  list_files: fsops.listFiles,
  move_file: fsops.moveFile,
  delete_file: fsops.deleteFile,
  create_directory: fsops.createDirectory,
  execute_shell: shell.executeShell,
  clear_memory: memory.clearMemory,
  show_memory: memory.showMemory,
  update_project_memory: memory.updateProjectMemory,
  create_task: tasks.createTask,
  update_task: tasks.updateTask,
  list_tasks: tasks.listTasks,
  search_memory: tasks.searchMemory,
  store_memory: tasks.storeMemory,
  get_memory: tasks.getMemory,
  create_subtask: tasks.createSubTask,
  create_task_dag: tasks.createTaskDAG,
  list_task_dag: tasks.listTaskDAG,
  get_task_status: orchestrate.getTaskStatus,
  abort_task: orchestrate.abortTask,
  execute_task: orchestrate.executeTask,
  execute_plan: orchestrate.executePlan,
  browser_open: browser.browserOpen,
  browser_navigate: browser.browserNavigate,
  browser_click: browser.browserClick,
  browser_fill: browser.browserFill,
  browser_screenshot: browser.browserScreenshot,
  browser_get_text: browser.browserGetText,
  browser_get_html: browser.browserGetHTML,
  browser_evaluate: browser.browserEvaluate,
  browser_get_url: browser.browserGetURL,
  browser_close: browser.browserClose,
  pg_tables: pg.pgTables,
  pg_describe: pg.pgDescribe,
  pg_query: pg.pgQuery,
  web_fetch: web.webFetch,
  web_search: web.webSearch,
};

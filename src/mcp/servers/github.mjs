#!/usr/bin/env node

/**
 * GitHub MCP Server — provides GitHub API tools via stdio JSON-RPC.
 *
 * Run as a child process. Communicates via stdin/stdout.
 * Tools: create_repo, push_files, list_repos, create_issue, get_repo
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_... node src/mcp/servers/github.mjs
 */

import { createInterface } from "readline";

const GITHUB_API = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const HEADERS = {
  "Authorization": `Bearer ${TOKEN}`,
  "Accept": "application/vnd.github.v3+json",
  "User-Agent": "roo-mini-mcp",
};

// ─── JSON-RPC over stdio ───

const rl = createInterface({ input: process.stdin });

rl.on("line", async (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }

  try {
    const result = await handleMethod(msg.method, msg.params);
    respond(msg.id, { result });
  } catch (err) {
    respond(msg.id, { error: { message: err.message } });
  }
});

function respond(id, body) {
  process.stdout.write(JSON.stringify({ ...body, id, jsonrpc: "2.0" }) + "\n");
}

// ─── GitHub API helper ───

async function gh(method, path, body) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

// ─── Tool handlers ───

const TOOLS = {
  /**
   * Create a new GitHub repository.
   * Params: { name, description?, private?, autoInit? }
   */
  github_create_repo: async (args) => {
    if (!args.name) {throw new Error("Missing required: name");}
    const repo = await gh("POST", "/user/repos", {
      name: args.name,
      description: args.description || "",
      private: args.private !== false,
      auto_init: args.autoInit !== false,
    });
    return `✅ Created repo: ${repo.full_name} (${repo.html_url})`;
  },

  /**
   * Create or update a file in a repository.
   * Params: { owner, repo, path, content, message? }
   */
  github_push_files: async (args) => {
    if (!args.owner || !args.repo || !args.path || !args.content)
      {throw new Error("Missing required: owner, repo, path, content");}

    // Try to get the existing file's SHA (for updates)
    let sha;
    try {
      const existing = await gh("GET", `/repos/${args.owner}/${args.repo}/contents/${args.path}`);
      sha = existing.sha;
    } catch { /* file doesn't exist */ }

    const result = await gh("PUT", `/repos/${args.owner}/${args.repo}/contents/${args.path}`, {
      message: args.message || `Update ${args.path}`,
      content: Buffer.from(args.content).toString("base64"),
      sha,
    });

    return `✅ ${sha ? "Updated" : "Created"} ${args.path} in ${args.owner}/${args.repo}`;
  },

  /**
   * List repositories for the authenticated user.
   * Params: { per_page?, sort? }
   */
  github_list_repos: async (args) => {
    const repos = await gh("GET", `/user/repos?per_page=${args.per_page || 10}&sort=${args.sort || "updated"}`);
    if (!repos.length) {return "📭 No repositories found.";}
    return repos.map(r => `  • ${r.full_name} (${r.private ? "🔒" : "🌍"}) ${r.html_url}`).join("\n");
  },

  /**
   * Create an issue on a repository.
   * Params: { owner, repo, title, body?, labels? }
   */
  github_create_issue: async (args) => {
    if (!args.owner || !args.repo || !args.title)
      {throw new Error("Missing required: owner, repo, title");}
    const issue = await gh("POST", `/repos/${args.owner}/${args.repo}/issues`, {
      title: args.title,
      body: args.body || "",
      labels: args.labels || [],
    });
    return `✅ Created issue #${issue.number}: ${issue.title} (${issue.html_url})`;
  },

  /**
   * Get repository details.
   * Params: { owner, repo }
   */
  github_get_repo: async (args) => {
    if (!args.owner || !args.repo) {throw new Error("Missing required: owner, repo");}
    const repo = await gh("GET", `/repos/${args.owner}/${args.repo}`);
    return [
      `📦 ${repo.full_name}`,
      `  Description: ${repo.description || "(none)"}`,
      `  Stars: ${repo.stargazers_count} · Forks: ${repo.forks_count}`,
      `  Language: ${repo.language || "N/A"}`,
      `  URL: ${repo.html_url}`,
      `  Default branch: ${repo.default_branch}`,
    ].join("\n");
  },
};

// ─── Method dispatcher ───

async function handleMethod(method, params) {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: "0.1.0",
        capabilities: { tools: {} },
        serverInfo: { name: "github-mcp", version: "1.0.0" },
      };

    case "tools/list":
      return {
        tools: Object.entries(TOOLS).map(([name, fn]) => ({
          name,
          description: fn.description || `${name} GitHub API tool`,
          inputSchema: fn.schema || { type: "object", properties: {} },
        })),
      };

    case "tools/call":
      const tool = TOOLS[params.name];
      if (!tool) {throw new Error(`Unknown tool: ${params.name}`);}
      const text = await tool(params.arguments || {});
      return { content: [{ type: "text", text }] };

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

// ─── Tool schemas ───

TOOLS.github_create_repo.description = "Create a new GitHub repository";
TOOLS.github_create_repo.schema = {
  type: "object",
  properties: {
    name: { type: "string", description: "Repository name" },
    description: { type: "string", description: "Repository description" },
    private: { type: "boolean", description: "Private repo (default: true)" },
    autoInit: { type: "boolean", description: "Auto-init with README (default: true)" },
  },
  required: ["name"],
};

TOOLS.github_push_files.description = "Create or update a file in a GitHub repository";
TOOLS.github_push_files.schema = {
  type: "object",
  properties: {
    owner: { type: "string", description: "Repository owner (user or org)" },
    repo: { type: "string", description: "Repository name" },
    path: { type: "string", description: "File path in the repo" },
    content: { type: "string", description: "File content" },
    message: { type: "string", description: "Commit message" },
  },
  required: ["owner", "repo", "path", "content"],
};

TOOLS.github_list_repos.description = "List GitHub repositories for the authenticated user";
TOOLS.github_list_repos.schema = {
  type: "object",
  properties: {
    per_page: { type: "integer", description: "Results per page (default: 10)" },
    sort: { type: "string", enum: ["created", "updated", "pushed", "full_name"], description: "Sort order" },
  },
};

TOOLS.github_create_issue.description = "Create an issue on a GitHub repository";
TOOLS.github_create_issue.schema = {
  type: "object",
  properties: {
    owner: { type: "string", description: "Repository owner" },
    repo: { type: "string", description: "Repository name" },
    title: { type: "string", description: "Issue title" },
    body: { type: "string", description: "Issue body" },
    labels: { type: "array", items: { type: "string" }, description: "Issue labels" },
  },
  required: ["owner", "repo", "title"],
};

TOOLS.github_get_repo.description = "Get details about a GitHub repository";
TOOLS.github_get_repo.schema = {
  type: "object",
  properties: {
    owner: { type: "string", description: "Repository owner" },
    repo: { type: "string", description: "Repository name" },
  },
  required: ["owner", "repo"],
};

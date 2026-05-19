"use strict";

const fs = require("node:fs");
const path = require("node:path");

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(""));
  });
}

function parseJson(text) {
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function getToolName(payload) {
  return (
    payload.toolName ||
    payload.tool_name ||
    payload.name ||
    payload.tool?.name ||
    payload.toolCall?.name ||
    payload.data?.toolName ||
    payload.input?.toolName ||
    ""
  );
}

function getToolInput(payload) {
  return (
    payload.toolInput ||
    payload.tool_input ||
    payload.input ||
    payload.tool?.input ||
    payload.toolCall?.input ||
    payload.arguments ||
    {}
  );
}

function hasPhaseToken() {
  const tokenFile = process.env.PHASE_TOKEN_FILE || path.join(process.cwd(), "logs", "phase-token.txt");
  if (!fs.existsSync(tokenFile)) return false;

  const raw = fs.readFileSync(tokenFile, "utf8");
  const match = raw.match(/^\s*APPROVED_PHASE\s*=\s*(.+)\s*$/m);
  return Boolean(match && match[1] && match[1].trim());
}

function isReadOnlyExecuteCommand(command) {
  const cmd = (command || "").trim().toLowerCase();
  if (!cmd) return false;

  const writeIndicators = [
    /\b(set-content|add-content|out-file|new-item|remove-item|move-item|copy-item|rename-item)\b/,
    /\b(del|erase|rd|rmdir|mkdir|md|touch)\b/,
    />\s*\S|>>\s*\S/,
    /\bnpm\s+(install|update|uninstall)\b/,
    /\bpnpm\s+(add|update|remove|install)\b/,
    /\byarn\s+(add|remove|upgrade|install)\b/,
    /\bpip\s+install\b/,
    /\bgit\s+(add|commit|push|merge|rebase|reset|checkout|clean|stash)\b/
  ];

  if (writeIndicators.some((rx) => rx.test(cmd))) {
    return false;
  }

  const readOnlyIndicators = [
    /\b(get-childitem|get-content|get-location|test-path|select-string)\b/,
    /\b(cat|type|ls|dir|pwd|where|which|echo|whoami|date)\b/,
    /\bgit\s+(status|log|show|diff|branch)\b/,
    /\bnpm\s+(test|run\s+test|run\s+lint|run\s+build)\b/,
    /\bnode\s+-v\b|\bpython\s+--version\b/
  ];

  return readOnlyIndicators.some((rx) => rx.test(cmd));
}

function isWriteCapableTool(toolName, toolInput) {
  const name = (toolName || "").toLowerCase();

  const alwaysWrite = [
    "apply_patch",
    "create_file",
    "create_directory",
    "edit_notebook_file",
    "vscode_renamesymbol",
    "run_vscode_command",
    "install_extension",
    "create_new_workspace",
    "create_and_run_task"
  ];

  if (alwaysWrite.some((t) => name.includes(t))) return true;

  if (name.includes("run_in_terminal") || name.includes("execute")) {
    const command = typeof toolInput === "string" ? toolInput : toolInput.command;
    return !isReadOnlyExecuteCommand(command);
  }

  const likelyReadOnly = [
    "read",
    "search",
    "grep",
    "list",
    "view",
    "fetch",
    "get_",
    "semantic",
    "await_terminal",
    "get_terminal_output",
    "terminal_last_command",
    "terminal_selection",
    "test_failure",
    "copilot_getnotebooksummary"
  ];

  if (likelyReadOnly.some((t) => name.includes(t))) return false;

  return true;
}

function respondAllow() {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        permissionDecisionReason: "Read-only action or approved phase token present."
      }
    })
  );
}

function respondDeny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason
      },
      systemMessage: reason
    })
  );
}

async function main() {
  const raw = await readStdin();
  const payload = parseJson(raw);
  const toolName = getToolName(payload);
  const toolInput = getToolInput(payload);

  const writeCapable = isWriteCapableTool(toolName, toolInput);
  if (!writeCapable) {
    respondAllow();
    return;
  }

  if (hasPhaseToken()) {
    respondAllow();
    return;
  }

  respondDeny(
    "Write-capable tool blocked: missing phase token. Add APPROVED_PHASE=<phase> to logs/phase-token.txt, then retry."
  );
}

main().catch(() => {
  respondDeny("Write-capable tool blocked: hook guard failed safely. Add APPROVED_PHASE=<phase> to logs/phase-token.txt, then retry.");
});

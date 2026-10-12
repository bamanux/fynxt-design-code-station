import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import { identity, settings, studio, studioPageUrl } from "./studio";

const panels = new Map<string, vscode.WebviewPanel>();

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Opens (or reveals) an editor tab showing a Studio page, e.g. "/cases/DCF-0003". */
export function openStudioPage(path: string, title: string): void {
  const existing = panels.get(path);
  if (existing) {
    existing.reveal();
    return;
  }
  const { studioUrl } = settings();
  const origin = new URL(studioUrl).origin;
  const panel = vscode.window.createWebviewPanel("fdi.studio", title, vscode.ViewColumn.Active, {
    enableScripts: true,
    retainContextWhenHidden: true,
  });
  panel.iconPath = vscode.Uri.joinPath(vscode.extensions.getExtension("fynxt.fdi-vscode")!.extensionUri, "media", "fdi.svg");
  const src = studioPageUrl(path);
  panel.webview.html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${origin}; style-src 'unsafe-inline';">
<style>
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: var(--vscode-editor-background); }
  iframe { border: 0; width: 100%; height: 100%; display: block; }
</style>
</head>
<body><iframe src="${escapeAttr(src)}" title="${escapeAttr(title)}" allow="clipboard-write"></iframe></body>
</html>`;
  panel.onDidDispose(() => panels.delete(path));
  panels.set(path, panel);
}

/** Sidebar webview with big buttons for people who don't live in the command palette. */
export class QuickActionsView implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | undefined;

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.onDidReceiveMessage((msg: { command?: string }) => {
      const allowed = ["fdi.newRequest", "fdi.openStudio", "fdi.openLibrary", "fdi.startStudio", "fdi.setIdentity", "fdi.openCase"];
      if (msg.command && allowed.includes(msg.command)) void vscode.commands.executeCommand(msg.command);
    });
    void this.render();
  }

  async render(): Promise<void> {
    if (!this.view) return;
    const nonce = randomBytes(16).toString("base64");
    const user = identity();
    let status = "";
    try {
      const meta = await studio.meta();
      status = meta.agentReady ? "Studio connected · FDI ready" : `Studio connected · FDI not ready: ${meta.agentProblem ?? ""}`;
    } catch {
      status = `Studio not reachable at ${settings().studioUrl}`;
    }
    const button = (command: string, label: string, primary = false) =>
      `<button class="${primary ? "primary" : ""}" data-command="${command}">${label}</button>`;
    this.view.webview.html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); padding: 4px 8px 12px; }
  .who { margin: 0 0 8px; } .muted { color: var(--vscode-descriptionForeground); margin: 0 0 10px; }
  button { display: block; width: 100%; margin: 0 0 6px; padding: 6px 10px; text-align: left; cursor: pointer;
    border: 1px solid var(--vscode-button-border, transparent); border-radius: 2px;
    background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); font: inherit; }
  button:hover { background: var(--vscode-button-secondaryHoverBackground); }
  button.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  button.primary:hover { background: var(--vscode-button-hoverBackground); }
  button:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 1px; }
</style></head>
<body>
  <p class="who">${user ? `Signed in as <strong>${escapeAttr(user.name)}</strong> · ${escapeAttr(user.role)}` : "Not signed in"}</p>
  <p class="muted">${escapeAttr(status)}</p>
  ${button("fdi.newRequest", "＋ New design request", true)}
  ${button("fdi.openCase", "Open a case…")}
  ${button("fdi.openStudio", "Open FDI Studio dashboard")}
  ${button("fdi.openLibrary", "Tokens & components library")}
  ${button("fdi.startStudio", "Start Studio server (local)")}
  ${button("fdi.setIdentity", user ? "Change name / role" : "Set your name & role")}
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.querySelectorAll("button[data-command]").forEach((b) =>
      b.addEventListener("click", () => vscode.postMessage({ command: b.dataset.command })));
  </script>
</body></html>`;
  }
}

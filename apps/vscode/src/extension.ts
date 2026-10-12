import { existsSync } from "node:fs";
import { join } from "node:path";
import * as vscode from "vscode";
import { CasesView, type Node } from "./casesView";
import { openStudioPage, QuickActionsView } from "./panels";
import { claudeCommandFor, identity, settings, studio, type CaseSummary } from "./studio";

/** Finds a workspace folder (or configured path) containing `marker`. */
function locate(configured: string, marker: string): string | null {
  if (configured && existsSync(join(configured, marker))) return configured;
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const base = folder.uri.fsPath;
    for (const candidate of [base, join(base, "..", "fynxt-design-code-station"), join(base, "..", "fynxt-product-experience-engine")]) {
      if (existsSync(join(candidate, marker))) return candidate;
    }
  }
  return null;
}

async function waitForStudio(timeoutMs: number): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      await studio.meta();
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return false;
}

export function activate(context: vscode.ExtensionContext): void {
  const cases = new CasesView();
  const quick = new QuickActionsView();
  const tree = vscode.window.createTreeView("fdi.cases", { treeDataProvider: cases, showCollapseAll: true });
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  status.command = "fdi.cases.focus";
  status.name = "FDI";

  cases.onDidCount.event((n) => {
    status.text = n === null ? "$(circle-slash) FDI" : `$(bell) FDI: ${n}`;
    status.tooltip = n === null ? "FDI Studio not connected" : `${n} case(s) waiting on your role`;
    tree.badge = n ? { value: n, tooltip: `${n} case(s) need you` } : undefined;
    status.show();
  });

  const refreshAll = async () => {
    await cases.refresh();
    await quick.render();
  };

  let timer: NodeJS.Timeout | undefined;
  const schedule = () => {
    if (timer) clearInterval(timer);
    timer = setInterval(() => void cases.refresh(), settings().refreshSeconds * 1000);
  };

  async function pickCase(): Promise<CaseSummary | undefined> {
    if (!cases.allCases().length) await cases.refresh();
    const pick = await vscode.window.showQuickPick(
      cases.allCases().map((c) => ({ label: `${c.id} · ${c.title}`, description: c.waitingOn.text, c })),
      { placeHolder: "Choose a case" }
    );
    return pick?.c;
  }

  context.subscriptions.push(
    tree,
    status,
    vscode.window.registerWebviewViewProvider("fdi.actions", quick),
    { dispose: () => timer && clearInterval(timer) },

    vscode.commands.registerCommand("fdi.refresh", refreshAll),
    vscode.commands.registerCommand("fdi.openStudio", () => openStudioPage("/", "FDI Studio")),
    vscode.commands.registerCommand("fdi.newRequest", () => openStudioPage("/new", "FDI · New request")),
    vscode.commands.registerCommand("fdi.openLibrary", () => openStudioPage("/library", "FDI · Library")),
    vscode.commands.registerCommand("fdi.openSettings", () => vscode.commands.executeCommand("workbench.action.openSettings", "fdi.")),

    vscode.commands.registerCommand("fdi.openCase", async (id?: string) => {
      const caseId = typeof id === "string" ? id : (await pickCase())?.id;
      if (caseId) openStudioPage(`/cases/${caseId}`, `FDI · ${caseId}`);
    }),

    vscode.commands.registerCommand("fdi.setIdentity", async () => {
      let roles: string[] = [];
      try {
        roles = (await studio.meta()).roles;
      } catch {
        roles = ["Product Designer", "UI Code Reviewer", "Product Manager", "Project Manager", "Business Analyst", "Developer", "QA / Tester", "Stakeholder"];
      }
      const name = await vscode.window.showInputBox({
        title: "FDI — your name",
        prompt: "Recorded on your requests, feedback and approvals",
        value: settings().name,
        validateInput: (v) => (v.trim() ? undefined : "Enter your name"),
      });
      if (!name) return;
      const role = await vscode.window.showQuickPick(roles, { title: "FDI — your role", placeHolder: settings().role || "Choose your role" });
      if (!role) return;
      const config = vscode.workspace.getConfiguration("fdi");
      await config.update("userName", name.trim(), vscode.ConfigurationTarget.Global);
      await config.update("userRole", role, vscode.ConfigurationTarget.Global);
      await refreshAll();
    }),

    vscode.commands.registerCommand("fdi.startStudio", async () => {
      try {
        await studio.meta();
        void vscode.window.showInformationMessage("FDI Studio is already running.");
        return refreshAll();
      } catch {
        /* not running — start it */
      }
      let station = locate(settings().stationPath, "apps/studio/package.json");
      if (!station) {
        const picked = await vscode.window.showOpenDialog({ canSelectFolders: true, openLabel: "Use as Design Code Station", title: "Where is fynxt-design-code-station?" });
        station = picked?.[0]?.fsPath ?? null;
        if (!station || !existsSync(join(station, "apps/studio/package.json"))) {
          void vscode.window.showErrorMessage("That folder isn't the Design Code Station (apps/studio not found).");
          return;
        }
        await vscode.workspace.getConfiguration("fdi").update("stationPath", station, vscode.ConfigurationTarget.Global);
      }
      const terminal = vscode.window.terminals.find((t) => t.name === "FDI Studio") ?? vscode.window.createTerminal({ name: "FDI Studio", cwd: station });
      terminal.show(true);
      terminal.sendText("npm run dev");
      await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Starting FDI Studio…" }, async () => {
        const ok = await waitForStudio(60_000);
        if (!ok) void vscode.window.showWarningMessage("FDI Studio didn't respond within 60s — check the 'FDI Studio' terminal.");
      });
      await refreshAll();
    }),

    vscode.commands.registerCommand("fdi.openCaseFile", async (node?: Node) => {
      const c = node && node.kind === "case" ? node.data : await pickCase();
      if (!c) return;
      const engine = locate(settings().enginePath, "agent/fdi/README.md");
      if (!engine) {
        void vscode.window.showWarningMessage("Engine repo not found. Add it to the workspace or set fdi.enginePath.");
        return;
      }
      const file = join(engine, "design-cases", c.folder, existsSync(join(engine, "design-cases", c.folder, "case-file.md")) ? "case-file.md" : "inputs/request.md");
      await vscode.window.showTextDocument(vscode.Uri.file(file), { preview: false });
    }),

    vscode.commands.registerCommand("fdi.copyClaudeCommand", async (node?: Node) => {
      const c = node && node.kind === "case" ? node.data : await pickCase();
      if (!c) return;
      const command = claudeCommandFor(c);
      await vscode.env.clipboard.writeText(command);
      const hasClaude = Boolean(vscode.extensions.getExtension("anthropic.claude-code"));
      const action = await vscode.window.showInformationMessage(
        `Copied "${command}". Paste it into Claude Code (opened on the engine repo) to run it.`,
        hasClaude ? "OK" : "Get Claude Code extension"
      );
      if (action === "Get Claude Code extension") void vscode.commands.executeCommand("workbench.extensions.search", "anthropic.claude-code");
    }),

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("fdi")) {
        schedule();
        void refreshAll();
      }
    })
  );

  schedule();
  void refreshAll();
  if (!identity()) {
    void vscode.window.showInformationMessage("FDI: set your name and role to see the cases that need you.", "Set now").then((a) => {
      if (a) void vscode.commands.executeCommand("fdi.setIdentity");
    });
  }
}

export function deactivate(): void {
  /* disposables are released via context.subscriptions */
}

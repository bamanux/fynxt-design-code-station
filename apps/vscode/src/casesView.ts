import * as vscode from "vscode";
import { identity, STATUS_LABEL, studio, StudioError, type CaseSummary } from "./studio";

type Group = { kind: "group"; id: "mine" | "working" | "all"; label: string; cases: CaseSummary[] };
type Item = { kind: "case"; data: CaseSummary } | { kind: "message"; label: string; command?: vscode.Command };
export type Node = Group | Item;

const ICON: Record<string, string> = {
  NEW: "inbox",
  "IN-REVIEW": "eye",
  "DESIGN-REVIEW": "eye",
  "CODE-REVIEW": "eye",
  "CHANGES-REQUESTED": "request-changes",
  "DESIGN-CHANGES-REQUESTED": "request-changes",
  "CODE-CHANGES-REQUESTED": "request-changes",
  APPROVED: "pass",
  "DESIGN-APPROVED": "pass",
  "CODE-APPROVED": "pass",
  PUBLISHED: "rocket",
  BLOCKED: "error",
};

export class CasesView implements vscode.TreeDataProvider<Node> {
  private readonly changed = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.changed.event;
  private cases: CaseSummary[] = [];
  private problem: { message: string; command?: vscode.Command } | null = null;

  /** Fires with the number of cases waiting on the current user's role. */
  readonly onDidCount = new vscode.EventEmitter<number | null>();

  async refresh(): Promise<void> {
    const user = identity();
    if (!user) {
      this.cases = [];
      this.problem = { message: "Set your name and role to see cases", command: { command: "fdi.setIdentity", title: "Set identity" } };
    } else {
      try {
        this.cases = await studio.cases(user);
        this.problem = null;
      } catch (error) {
        this.cases = [];
        const unreachable = error instanceof StudioError && error.status === 0;
        this.problem = {
          message: error instanceof Error ? error.message : String(error),
          command: unreachable
            ? { command: "fdi.startStudio", title: "Start FDI Studio" }
            : { command: "fdi.setIdentity", title: "Set identity" },
        };
      }
    }
    this.onDidCount.fire(this.problem ? null : this.mine().length);
    this.changed.fire(undefined);
  }

  allCases(): CaseSummary[] {
    return this.cases;
  }

  private mine(): CaseSummary[] {
    const user = identity();
    return user ? this.cases.filter((c) => c.waitingOn.roles.includes(user.role)) : [];
  }

  getChildren(node?: Node): Node[] {
    if (!node) {
      if (this.problem) return [{ kind: "message", label: this.problem.message, command: this.problem.command }];
      return [
        { kind: "group", id: "mine", label: "Needs you", cases: this.mine() },
        { kind: "group", id: "working", label: "FDI is working", cases: this.cases.filter((c) => c.activeRun) },
        { kind: "group", id: "all", label: "All cases", cases: this.cases },
      ];
    }
    if (node.kind === "group") {
      return node.cases.length ? node.cases.map((data) => ({ kind: "case", data })) : [{ kind: "message", label: "Nothing here" }];
    }
    return [];
  }

  getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === "group") {
      const item = new vscode.TreeItem(
        `${node.label} (${node.cases.length})`,
        node.id === "all" && node.cases.length > 8 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.Expanded
      );
      item.iconPath = new vscode.ThemeIcon(node.id === "mine" ? "bell" : node.id === "working" ? "sync" : "list-unordered");
      return item;
    }
    if (node.kind === "message") {
      const item = new vscode.TreeItem(node.label);
      item.iconPath = new vscode.ThemeIcon(node.command ? "info" : "dash");
      if (node.command) item.command = node.command;
      return item;
    }
    const c = node.data;
    const item = new vscode.TreeItem(`${c.id} · ${c.title}`);
    item.description = c.activeRun ? `FDI: ${c.activeRun.stage}…` : STATUS_LABEL[c.status] ?? c.status;
    item.iconPath = new vscode.ThemeIcon(c.activeRun ? "loading~spin" : ICON[c.status] ?? "circle-outline");
    item.contextValue = "case";
    item.tooltip = new vscode.MarkdownString(
      [
        `**${c.id} — ${c.title}**`,
        c.module ? `Module: ${c.module}` : "",
        `Status: ${STATUS_LABEL[c.status] ?? c.status}`,
        `Next: ${c.waitingOn.text}${c.waitingOn.roles.length ? ` (${c.waitingOn.roles.join(", ")})` : ""}`,
        `Open feedback: ${c.openFeedback} · Open questions: ${c.openQuestions}`,
        c.requestedBy ? `Requested by ${c.requestedBy}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    );
    item.command = { command: "fdi.openCase", title: "Open case", arguments: [c.id] };
    return item;
  }
}

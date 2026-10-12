# FDI for VS Code

Use FDI (FYNXT Design Inspector) without leaving VS Code. It is a thin client over **FDI
Studio** (`apps/studio`), so permissions, gates and case files are exactly the same as in the web UI.

- **FDI sidebar → Cases:** *Needs you*, *FDI is working*, *All cases*, with status and next step.
- **Open a case:** Studio's case page opens in an editor tab, where you can read the case file, add feedback,
  approve or request changes, and start FDI runs.
- **New Design Request:** the request form opens in a tab, with PRD/FRD/wireframe uploads.
- **Case file (Markdown):** opens `case-file.md` from the engine repo in the editor.
- **Copy Claude Code command:** copies e.g. `/fdi-figma DCF-0003` for steps that run in the Claude
  Code extension (Figma generation).
- **Status bar:** a count of cases waiting on your role.

## Install

```bash
cd apps/vscode && npm install && npm run package
```

Then in VS Code: **Extensions → ⋯ → Install from VSIX…** and pick `fdi-vscode-0.1.0.vsix`.

## Configure

`FDI: Set Your Name & Role` (or Settings → FDI). `fdi.studioUrl` defaults to the local Studio
(`http://127.0.0.1:5190`). Point it at the deployed Studio once it is live. `FDI: Start FDI Studio
Server` runs `npm run dev` in the Station in a VS Code terminal.

Identity is self-declared, as in Studio's local mode. It is not authentication.

# FYNXT Design Code Station

The code half of the FYNXT design pipeline. Governance, case files and token sources live in
[`fynxt-product-experience-engine`](../fynxt-product-experience-engine/) ("the engine"). This
repo holds what gets built from them:

| Workspace | What it is |
|---|---|
| `packages/tokens` (`@fynxt/tokens`) | **Generated** CSS variables + TS map from the engine's `design-system/tokens/tokens.json`. Never hand-edited |
| `packages/ui` (`@fynxt/ui`) | **The** component library. Every surface imports components from here, never copies them |
| `packages/templates` (`@fynxt/templates`) | Config-driven page templates (empty until the first one is approved in) |
| `apps/studio` (`@fynxt/studio`) | **FDI Studio**: the product team's interface to FDI, plus the page gallery |

Status: **local, pre-production (v0.1.0)**. Tokens and components are DRAFT pending Product
Designer approval. See the engine's `agent/fdi/README.md`.

## Run it locally

Requires Node ≥ 20.12.

```bash
cp .env.example .env        # then set ANTHROPIC_API_KEY (needed only for FDI runs)
npm install
npm run dev                 # FDI Studio at http://127.0.0.1:5190
```

Without an API key, Studio still works for requests, feedback and approvals. FDI runs wait
until a key is set.

| Command | Does |
|---|---|
| `npm run dev` | Sync tokens from the engine, start Studio (API + UI in one process) |
| `npm run build` / `npm start` | Production build, then serve on `PORT` (default 5191, bound to 127.0.0.1) |
| `npm run tokens:build` | Regenerate `@fynxt/tokens` from the engine's `tokens.json` |
| `npm run typecheck` / `npm test` | TypeScript and Vitest (components, permissions, case-file parser, command guard) |
| `npm run lint` | Token-literal check: no raw hex/px in component, template or Studio CSS |

## How FDI Studio works

1. **Anyone** picks a name and role and submits a request (title, requirement, PRD/FRD/wireframes, links).
   Studio creates `design-cases/DCF-NNNN-…/inputs/` in the engine and starts `/fdi-intake`.
2. FDI writes the Design Case File. Everyone can read it and **add feedback** (written to §11).
3. The **gate owners** (from the engine's `agent/fdi/fdi.config.json`) approve or request changes. A
   designer who requests changes can then **run FDI revise**.
4. Figma generation runs in Claude Code (`/fdi-figma`) for now, because the Figma write connector needs
   interactive sign-in. Design and code reviews are then decided in Studio, and **build**/**publish**
   run from Studio.
5. Published pages appear in **Gallery**. **Library** shows the live tokens, components (with demos)
   and template registry.

Default roles: Product Designer, UI Code Reviewer, Product Manager, Project Manager, Business Analyst,
Developer, QA / Tester, Stakeholder. Who can decide or run what is configured in `fdi.config.json →
studio.permissions` (proposed in the engine's DL-0002).

### Guardrails on FDI runs started from Studio

- Runs use `claude-opus-5-5` with a per-run spend cap (`FDI_MAX_BUDGET_USD`).
- File writes are limited to the engine and Station repos. Shell commands must match the allowlist in
  `fdi.config.json → studio.headlessRuns.bashAllowlist`. Push, PR, network and MCP tools are refused.
- Uploaded documents are treated as data, not instructions.
- One run per case at a time. Humans can't edit a case while FDI is writing it.

## Going live: checklist

Nothing here should be exposed beyond localhost until these are done:

- [ ] **Authentication:** replace local self-declared identity with SSO (identity and role from the IdP).
      Local mode is not authentication.
- [ ] **Hosting:** deploy `npm start` behind HTTPS, with the engine repo checked out next to it (or
      mounted) and `ENGINE_PATH` set.
- [ ] **Secrets:** `ANTHROPIC_API_KEY` from the host's secret store, never in the repo.
- [ ] **Git remote + CI:** push this repo, and protect `main` with `typecheck`, `test`, `lint` and code-owner review
      on `packages/ui` and `packages/templates`. This is what actually enforces the code gate.
- [ ] **Figma from the server:** a Figma connection that works headlessly, so `/fdi-figma` can run from Studio.
- [ ] **Governance sign-off:** tokens v0.2.0 (D1–D12), the `@fynxt/ui` 0.1.0 specs, and DL-0002 role permissions.

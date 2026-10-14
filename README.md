# QuickSave

A local Windows capture pad for AI-assisted work — the useful parts of a **to-do list**, a **clipboard**, and a **scratchpad** in one small app.

Inspired by [Copper](https://shadcn.com/copper) by shadcn. QuickSave is an independent Windows-first implementation. It is not affiliated with shadcn.

Select something worth keeping. Double-tap **Left Shift**. Keep working. Queue the next prompts in the panel, copy them back into ChatGPT, Claude, or Cursor, and check them off as you go.

Your notes are a file on this machine. No account. No sync. No telemetry.

## Run on Windows from this repo

You need [Node.js 20+](https://nodejs.org) (LTS is fine).

```bat
git clone <this-repo>
cd QuickSave
start.bat
```

Or in PowerShell:

```powershell
.\start.ps1
```

The first launch runs `npm install` and then opens the floating panel. Later launches are the same command.

If Node is already installed:

```bat
npm install
npm start
```

Browser-only UI (no global hotkeys):

```bat
npm run web
```

Then open `http://127.0.0.1:5173`.

## What it does

Researched from Copper’s public description, privacy/terms, and the workflow shadcn has written about:

| Workflow | How |
| --- | --- |
| Capture selected text from any app | **Left Shift ×2** (Windows hook). Fallback: `Ctrl+Shift+C` |
| Show / hide the panel | **Right Shift ×2**. Fallback: `Ctrl+Shift+Space` |
| Queue prompts | Type in the composer, Enter to save |
| Send work back to an AI app | Select notes, `Ctrl+C` or **Copy as list** (`Ctrl+Shift+C`) |
| Check items off | Space, or the circle checkbox |
| Group by project | Type `# Name` in the composer. `## Name` starts a fresh section and collapses the rest |
| Switch sections | `Ctrl+K` |
| Attach images and files | Drop onto the panel, or paste in the browser preview |
| Sketch | `Ctrl+Shift+D` — pen, shapes, text, colors; save into QuickSave |
| Search | `Ctrl+F` |
| Logbook | Clear done archives instead of deleting |
| Stay out of the way | Closes to the tray, optional always-on-top |

Notes live in `%APPDATA%\QuickSave\workspace.json`. Attachments sit beside that file. Nothing is sent anywhere.

## Shortcuts

| Action | Keys |
| --- | --- |
| Capture selection | Left Shift ×2 · `Ctrl+Shift+C` |
| Toggle panel | Right Shift ×2 · `Ctrl+Shift+Space` |
| Command palette | `Ctrl+K` |
| Search | `Ctrl+F` |
| Composer | `Ctrl+N` |
| Copy / copy as list | `Ctrl+C` · `Ctrl+Shift+C` |
| Toggle done | `Space` |
| Edit | `Enter` |
| Delete / logbook | `Delete` · `Ctrl+Backspace` |
| Next / previous section | `Ctrl+Shift+]` · `Ctrl+Shift+[` |
| Sketch | `Ctrl+Shift+D` |
| Shortcuts / settings | `Ctrl+/` · `Ctrl+,` |
| Undo / redo | `Ctrl+Z` · `Ctrl+Shift+Z` |

The Shift detector only watches Shift. It does not record other keystrokes.

## Architecture

Hexagonal / ports-and-adapters:

- `src/core` — pure domain: notes, sections, capture policy, composer (`#` / `##`), markdown, search, export, undo, reducer
- `src/persist` — JSON file store with atomic writes + corrupt-file recovery; localStorage adapter for the browser preview
- `src/ui` — React panel (shadcn-like, copper palette)
- `desktop` — Electron shell: tray, global shortcuts, Windows Shift hook, selection capture via a copy chord

The UI talks to a `QuickSaveBridge`. Electron implements it over IPC (`contextIsolation`, no `nodeIntegration`, sandboxed renderer). The browser preview implements the same port so the panel can be developed and tested without Windows.

## Tests

```bat
npm test
npm run typecheck
```

Domain logic is covered with Vitest. The panel is covered with Testing Library (compose, sections, done, search, sample workflow).

## Privacy

- Notes never leave the machine
- No analytics, crash reports, or accounts
- Capture restores your previous clipboard by default
- Attachments are size-capped and stored under a sanitized name inside the data folder

## License

MIT. If you are on a Mac and want the original, buy [Copper](https://shadcn.com/copper).

# QuickSave

A local Windows capture pad for AI-assisted work — the useful parts of a **to-do list**, a **clipboard**, and a **scratchpad** in one small app.

Inspired by [Copper](https://shadcn.com/copper) by shadcn. QuickSave is an independent Windows-first implementation. It is not affiliated with shadcn.

Select something worth keeping. Double-tap **Left Shift**. Keep working. Queue the next prompts in the panel, copy them back into ChatGPT, Claude, or Cursor, and check them off as you go.

Your notes are a file on this machine. No account. No sync. No telemetry.

## Disclaimer

QuickSave is **generic open-source software**, provided **as is**, with **no warranty**.

You are solely responsible for how you use it. The authors and contributors are **not responsible** for what it does, for data you capture, or for anything that happens on your machine. See [DISCLAIMER.md](DISCLAIMER.md) and [LICENSE](LICENSE). If you do not accept that, do not install it.

## Install on Windows (re-run from the Start menu)

1. Open **[Releases](https://github.com/SethVanderZanden/QuickSave/releases)** and download **`QuickSave-Setup-*.exe`**.
2. Run the installer. SmartScreen may warn because the file is unsigned — **More info → Run anyway**.
3. Finish the installer (per-user, no admin required). It creates **Start menu** and **desktop** shortcuts.
4. Open **QuickSave** from the Start menu whenever you want it. You do not need Git or Node after that.

Optional: **Settings → Start with Windows** so it comes back at login.

A portable build (`QuickSave-Portable-*.exe`) is on the same Releases page if you do not want an install.

The Windows installer is built and published only when changes land on `main`.

## Use it

- The panel floats. Closing it hides it to the **tray**; Quit from the tray to exit.
- **Left Shift twice** captures selected text in any app. Fallback: `Ctrl+Shift+C`.
- **Right Shift twice** shows or hides the panel. Fallback: `Ctrl+Shift+Space`.
- Type prompts at the bottom, Enter to save. `Ctrl+C` copies a note back into ChatGPT / Claude / Cursor. Space checks it off.
- `# ProjectName` creates a section. `Ctrl+K` switches sections.

Notes: `%APPDATA%\QuickSave\workspace.json`.

## Run from source (developers)

You need [Node.js 20+](https://nodejs.org).

```bat
git clone https://github.com/SethVanderZanden/QuickSave.git
cd QuickSave
start.bat
```

Build a Windows installer locally (on Windows):

```bat
npm ci
npm run dist:win
```

Output is `release\QuickSave-Setup-*.exe`.

Browser-only UI (no global hotkeys): `npm run web` then open `http://127.0.0.1:5173`.

## What it does

| Workflow | How |
| --- | --- |
| Capture selected text from any app | **Left Shift ×2**. Fallback: `Ctrl+Shift+C` |
| Show / hide the panel | **Right Shift ×2**. Fallback: `Ctrl+Shift+Space` |
| Queue prompts | Type in the composer, Enter to save |
| Send work back to an AI app | Select notes, `Ctrl+C` or **Copy as list** (`Ctrl+Shift+C`) |
| Check items off | Space, or the circle checkbox |
| Group by project | Type `# Name` in the composer. `## Name` starts a fresh section and collapses the rest |
| Switch sections | `Ctrl+K` |
| Attach images and files | Drop onto the panel |
| Sketch | `Ctrl+Shift+D` |
| Search | `Ctrl+F` |
| Logbook | Clear done archives instead of deleting |
| Stay out of the way | Closes to the tray, optional always-on-top |

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
- `src/persist` — JSON file store with atomic writes + corrupt-file recovery
- `src/ui` — React panel
- `desktop` — Electron shell: tray, global shortcuts, Windows Shift hook, NSIS installer

## Tests

```bat
npm test
npm run typecheck
```

## Privacy

- Notes never leave the machine
- No analytics, crash reports, or accounts
- Capture restores your previous clipboard by default
- Attachments are size-capped and stored under a sanitized name inside the data folder

## License

MIT. See [DISCLAIMER.md](DISCLAIMER.md). If you are on a Mac and want the original, buy [Copper](https://shadcn.com/copper).

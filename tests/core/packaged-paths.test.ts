import { hookScriptCandidates, iconCandidates } from "../../desktop/packaged-paths";

describe("packaged resource paths", () => {
  const roots = {
    resourcesPath: "C:\\installed\\resources",
    appPath: "C:\\installed\\resources\\app.asar",
    cwd: "C:\\dev\\QuickSave",
    moduleDir: "C:\\installed\\resources\\app.asar\\out\\main",
  };

  it("prefers extraResources next to the installed app", () => {
    const hooks = hookScriptCandidates(roots);
    expect(hooks[0]).toMatch(/resources[\\/]scripts[\\/]windows-shift-hook\.ps1$/);
    expect(iconCandidates(roots)[0]).toMatch(/resources[\\/]icon\.png$/);
  });

  it("still looks in the git checkout for development", () => {
    expect(hookScriptCandidates(roots).some((path) => path.includes("QuickSave"))).toBe(true);
  });
});

import { App } from "@/ui/App";
import { AppController } from "@/ui/controller";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

function renderApp() {
  const controller = AppController.demo();
  render(<App controller={controller} />);
  return controller;
}

describe("QuickSave panel", () => {
  it("does not show window chrome in the browser preview", () => {
    renderApp();
    expect(screen.queryByTestId("window-close")).not.toBeInTheDocument();
    expect(screen.queryByTestId("window-minimize")).not.toBeInTheDocument();
  });

  it("composes a note from the scratchpad", async () => {
    const user = userEvent.setup();
    renderApp();
    const composer = screen.getByTestId("composer");
    await user.type(composer, "Follow up on the API review");
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Follow up on the API review")).toBeInTheDocument();
  });

  it("creates a section with # Name and switches to it", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByTestId("composer"), "# Docs");
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(screen.getByTestId("active-section")).toHaveTextContent("Docs");
    });
    await user.type(screen.getByTestId("composer"), "Write the install steps");
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Write the install steps")).toBeInTheDocument();
  });

  it("toggles a note done from the checkbox", async () => {
    const user = userEvent.setup();
    const controller = renderApp();
    act(() => {
      controller.session.addNote("Ship the README");
    });
    const checkbox = await screen.findByLabelText("Mark done");
    await user.click(checkbox);
    expect(controller.getWorkspace().notes[0]?.done).toBe(true);
  });

  it("filters notes from search", async () => {
    const user = userEvent.setup();
    const controller = renderApp();
    act(() => {
      controller.session.addNote("keep the copper workflow");
      controller.session.addNote("unrelated snippet");
    });
    await user.type(screen.getByTestId("search"), "copper");
    expect(await screen.findByText("keep the copper workflow")).toBeInTheDocument();
    expect(screen.queryByText("unrelated snippet")).not.toBeInTheDocument();
  });

  it("shows minimize and close controls in the desktop shell", () => {
    const quit = vi.fn();
    const hide = vi.fn();
    const controller = AppController.demo({ isDesktop: true });
    controller.bridge.quit = quit;
    controller.bridge.hide = hide;
    render(<App controller={controller} />);
    expect(screen.getByTestId("window-close")).toBeInTheDocument();
    expect(screen.getByTestId("window-minimize")).toBeInTheDocument();
  });

  it("quits from the desktop close control", async () => {
    const user = userEvent.setup();
    const quit = vi.fn(async () => undefined);
    const controller = AppController.demo({ isDesktop: true });
    controller.bridge.quit = quit;
    render(<App controller={controller} />);
    await user.click(screen.getByTestId("window-close"));
    expect(quit).toHaveBeenCalled();
  });

  it("hides to the tray from the desktop minimize control", async () => {
    const user = userEvent.setup();
    const hide = vi.fn(async () => undefined);
    const controller = AppController.demo({ isDesktop: true });
    controller.bridge.hide = hide;
    render(<App controller={controller} />);
    await user.click(screen.getByTestId("window-minimize"));
    expect(hide).toHaveBeenCalled();
  });

  it("keeps caption buttons outside the drag region", () => {
    const controller = AppController.demo({ isDesktop: true });
    render(<App controller={controller} />);
    const close = screen.getByTestId("window-close");
    const minimize = screen.getByTestId("window-minimize");
    expect(close.closest("[data-testid=titlebar-drag]")).toBeNull();
    expect(minimize.closest("[data-testid=titlebar-drag]")).toBeNull();
    expect(close.closest(".drag-region")).toBeNull();
    expect(minimize.closest(".drag-region")).toBeNull();
  });

  it("copies the selected note with Ctrl+C even when the composer is focused", async () => {
    const user = userEvent.setup();
    const writeClipboard = vi.fn(async () => undefined);
    const controller = AppController.demo({ isDesktop: true });
    controller.bridge.writeClipboard = writeClipboard;
    render(<App controller={controller} />);
    act(() => {
      controller.session.addNote("Send this back to Cursor");
    });
    await user.click(await screen.findByText("Send this back to Cursor"));
    await user.click(screen.getByTestId("composer"));
    await user.keyboard("{Control>}c{/Control}");
    await waitFor(() => {
      expect(writeClipboard).toHaveBeenCalledWith("Send this back to Cursor");
    });
  });

  it("loads a sample workflow from the empty state", async () => {
    const user = userEvent.setup();
    renderApp();
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    await user.click(screen.getByTestId("load-sample"));
    expect(await screen.findByText(/Draft Windows install steps/)).toBeInTheDocument();
    expect(screen.getByTestId("active-section")).toHaveTextContent("All");
  });

  it("does not turn a normal prompt into a section", async () => {
    const user = userEvent.setup();
    const controller = renderApp();
    await user.type(screen.getByTestId("composer"), "Follow up: extract the Windows hook");
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Follow up: extract the Windows hook")).toBeInTheDocument();
    expect(controller.getWorkspace().sections).toHaveLength(0);
    expect(screen.getByTestId("active-section")).toHaveTextContent("All");
  });
});

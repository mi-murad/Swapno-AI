import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { App } from "./App";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("Swapno AI account experience", () => {
  it("starts in a clear sign-in state and switches all interface copy to Bangla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Sign in to continue." }),
    }));

    render(<App />);
    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "বাং" }));
    expect(screen.getByRole("heading", { name: "আবার স্বাগতম" })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("bn");
  });

  it("shows account creation fields and a strong password hint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Sign in to continue." }),
    }));

    render(<App />);
    await screen.findByRole("heading", { name: "Welcome back" });
    fireEvent.click(screen.getByRole("button", { name: "New to Swapno AI? Create an account" }));
    expect(screen.getByLabelText(/Your name/)).toBeInTheDocument();
    expect(screen.getByText("Use at least 12 characters.")).toBeInTheDocument();
  });
});

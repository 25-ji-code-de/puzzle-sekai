/**
 * Auth config pure helpers (redirect URI / configured flag).
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import {
  isAuthConfigured,
  redirectUri,
  stripTrailingSlash,
  webRedirectUriFromLocation,
} from "./config";

describe("isAuthConfigured", () => {
  it("is a boolean reflecting client id presence", () => {
    expect(typeof isAuthConfigured()).toBe("boolean");
  });
});

describe("stripTrailingSlash / webRedirectUriFromLocation", () => {
  it("strips one trailing slash", () => {
    expect(stripTrailingSlash("https://a/")).toBe("https://a");
    expect(stripTrailingSlash("https://a")).toBe("https://a");
  });

  it("strips .html filename to its directory", () => {
    expect(
      webRedirectUriFromLocation("https://example.com", "/game/index.html"),
    ).toBe("https://example.com/game/");
  });

  it("ensures trailing slash for directory paths", () => {
    expect(webRedirectUriFromLocation("http://localhost:7426", "/play")).toBe(
      "http://localhost:7426/",
    );
  });

  it("keeps trailing slash paths", () => {
    expect(webRedirectUriFromLocation("https://game.example", "/app/")).toBe(
      "https://game.example/app/",
    );
  });
});

describe("redirectUri", () => {
  const g = globalThis as { window?: unknown };
  const prevWindow = g.window;

  afterEach(() => {
    g.window = prevWindow;
    vi.unstubAllEnvs();
  });

  it("strips .html filename to its directory", () => {
    g.window = {
      location: {
        origin: "https://example.com",
        pathname: "/game/index.html",
      },
    } as unknown as Window;
    expect(redirectUri()).toBe("https://example.com/game/");
  });

  it("ensures trailing slash for directory paths", () => {
    g.window = {
      location: {
        origin: "http://localhost:7426",
        pathname: "/play",
      },
    } as unknown as Window;
    // "/play" without trailing slash → directory "/"
    expect(redirectUri()).toBe("http://localhost:7426/");
  });

  it("keeps trailing slash paths", () => {
    g.window = {
      location: {
        origin: "https://game.example",
        pathname: "/app/",
      },
    } as unknown as Window;
    expect(redirectUri()).toBe("https://game.example/app/");
  });

  it("returns a non-empty string with a trailing slash for root", () => {
    g.window = {
      location: {
        origin: "http://localhost:7426",
        pathname: "/",
      },
    } as unknown as Window;
    expect(redirectUri()).toBe("http://localhost:7426/");
  });

  it("uses fixed custom scheme when VITE_NATIVE=1", () => {
    vi.stubEnv("VITE_NATIVE", "1");
    vi.stubEnv("VITE_NATIVE_REDIRECT_URI", "puzzlesekai://auth/callback");
    g.window = {
      location: {
        origin: "https://tauri.localhost",
        pathname: "/",
      },
    } as unknown as Window;
    expect(redirectUri()).toBe("puzzlesekai://auth/callback");
  });
});

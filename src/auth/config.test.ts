/**
 * Auth config pure helpers (redirect URI / configured flag).
 */
import { describe, it, expect, afterEach } from "vitest";
import { isAuthConfigured, redirectUri } from "./config";

describe("isAuthConfigured", () => {
  it("is a boolean reflecting client id presence", () => {
    expect(typeof isAuthConfigured()).toBe("boolean");
  });
});

describe("redirectUri", () => {
  const g = globalThis as { window?: unknown };
  const prevWindow = g.window;

  afterEach(() => {
    g.window = prevWindow;
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
});

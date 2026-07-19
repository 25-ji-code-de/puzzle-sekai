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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
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
    };
    expect(redirectUri()).toBe("https://example.com/game/");
  });

  it("ensures trailing slash for directory paths", () => {
    g.window = {
      location: {
        origin: "http://localhost:7426",
        pathname: "/play",
      },
    };
    // "/play" without trailing slash → directory "/"
    expect(redirectUri()).toBe("http://localhost:7426/");
  });

  it("keeps trailing slash paths", () => {
    g.window = {
      location: {
        origin: "https://game.example",
        pathname: "/app/",
      },
    };
    expect(redirectUri()).toBe("https://game.example/app/");
  });

  it("returns a non-empty string with a trailing slash for root", () => {
    g.window = {
      location: {
        origin: "http://localhost:7426",
        pathname: "/",
      },
    };
    expect(redirectUri()).toBe("http://localhost:7426/");
  });
});

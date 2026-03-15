import { describe, it, expect, vi, beforeEach } from "vitest";
import { hasServer, exportDiagram, _resetCache } from "../api";

beforeEach(() => {
  _resetCache();
  vi.restoreAllMocks();
});

describe("hasServer", () => {
  it("returns true when /api/health responds 200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    expect(await hasServer()).toBe(true);
  });

  it("returns false when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await hasServer()).toBe(false);
  });

  it("caches the result", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    await hasServer();
    await hasServer();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("exportDiagram", () => {
  it("returns blob on success", async () => {
    const fakeBlob = new Blob(["png data"], { type: "image/png" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(fakeBlob) }),
    );
    const result = await exportDiagram("graph LR; A-->B", "png");
    expect(result).toBe(fakeBlob);
  });

  it("throws on error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("mmdc failed") }),
    );
    await expect(exportDiagram("bad", "png")).rejects.toThrow("mmdc failed");
  });
});

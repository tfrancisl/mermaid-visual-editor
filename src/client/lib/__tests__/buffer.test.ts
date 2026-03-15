import { describe, it, expect, vi } from "vitest";
import { ChangeBuffer } from "../buffer";

describe("ChangeBuffer", () => {
  it("starts empty", () => {
    const buf = new ChangeBuffer();
    expect(buf.isEmpty).toBe(true);
    expect(buf.size).toBe(0);
  });

  it("tracks size after push", () => {
    const buf = new ChangeBuffer();
    buf.push({ type: "node:add", targetId: "A", payload: {} });
    expect(buf.isEmpty).toBe(false);
    expect(buf.size).toBe(1);
    buf.push({ type: "node:move", targetId: "A", payload: { x: 10, y: 20 } });
    expect(buf.size).toBe(2);
  });

  it("flush returns all mutations and clears buffer", () => {
    const buf = new ChangeBuffer();
    buf.push({ type: "node:add", targetId: "A", payload: {} });
    buf.push({ type: "edge:add", targetId: "e1", payload: {} });
    const flushed = buf.flush();
    expect(flushed).toHaveLength(2);
    expect(flushed[0].type).toBe("node:add");
    expect(flushed[0].timestamp).toBeGreaterThan(0);
    expect(buf.isEmpty).toBe(true);
  });

  it("flush of empty buffer returns empty array", () => {
    const buf = new ChangeBuffer();
    expect(buf.flush()).toEqual([]);
  });

  it("onFlush listener is called on flush", () => {
    const buf = new ChangeBuffer();
    const listener = vi.fn();
    buf.onFlush(listener);
    buf.push({ type: "node:label", targetId: "A", payload: { label: "X" } });
    buf.flush();
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ type: "node:label" }),
    ]));
  });

  it("unsubscribe removes listener", () => {
    const buf = new ChangeBuffer();
    const listener = vi.fn();
    const unsub = buf.onFlush(listener);
    unsub();
    buf.push({ type: "node:add", targetId: "A", payload: {} });
    buf.flush();
    expect(listener).not.toHaveBeenCalled();
  });

  it("supports multiple listeners", () => {
    const buf = new ChangeBuffer();
    const l1 = vi.fn();
    const l2 = vi.fn();
    buf.onFlush(l1);
    buf.onFlush(l2);
    buf.push({ type: "node:delete", targetId: "A", payload: {} });
    buf.flush();
    expect(l1).toHaveBeenCalledOnce();
    expect(l2).toHaveBeenCalledOnce();
  });
});

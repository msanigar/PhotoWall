import { describe, it, expect, beforeEach, vi } from "vitest"
import { getOrCreateDeviceId, getSoftFingerprint } from "./device"

describe("getOrCreateDeviceId", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    })
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = 1
        return arr
      },
      randomUUID: undefined,
    })
  })

  it("returns new id and stores it when localStorage is empty", () => {
    const storage = globalThis.localStorage as { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> }
    storage.getItem.mockReturnValue(null)
    const id = getOrCreateDeviceId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    expect(storage.setItem).toHaveBeenCalledWith("pw_device_id", id)
  })

  it("returns existing id from localStorage", () => {
    const storage = globalThis.localStorage as { getItem: ReturnType<typeof vi.fn> }
    storage.getItem.mockReturnValue("existing-uuid")
    expect(getOrCreateDeviceId()).toBe("existing-uuid")
  })
})

describe("getSoftFingerprint", () => {
  it("returns string with ua, screen, timezone", () => {
    const fp = getSoftFingerprint()
    expect(fp).toContain("|")
    expect(fp.split("|").length).toBe(3)
  })
})

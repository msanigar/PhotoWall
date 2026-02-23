import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { access_token: "test-token" } } }),
    },
  },
}))

import { fetchGallery, fetchPhoto, fetchAdminSettings, updateAdminSettings } from "./api"

describe("fetchGallery", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  it("returns items and nextCursor on 200", async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [{ id: "1", caption: "x", created_at: "", thumb_url: "" }], nextCursor: null }),
    } as Response)
    const out = await fetchGallery()
    expect(out.items).toHaveLength(1)
    expect(out.nextCursor).toBeNull()
    expect(mockFetch).toHaveBeenCalledWith("/.netlify/functions/gallery")
  })

  it("passes cursor in query when provided", async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) } as Response)
    await fetchGallery("abc")
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("cursor=abc"))
  })

  it("throws on !res.ok", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response)
    await expect(fetchGallery()).rejects.toThrow("Failed to load gallery")
  })
})

describe("fetchPhoto", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  it("returns photo detail on 200", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "1",
          caption: "c",
          created_at: "",
          thumb_url: "",
          image_url: "https://example.com/img",
          width: 800,
          height: 600,
        }),
    } as Response)
    const out = await fetchPhoto("1")
    expect(out.id).toBe("1")
    expect(out.image_url).toBe("https://example.com/img")
    expect(fetch).toHaveBeenCalledWith("/.netlify/functions/photo/1")
  })

  it("throws on 404", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response)
    await expect(fetchPhoto("x")).rejects.toThrow("Photo not found")
  })
})

describe("fetchAdminSettings", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  it("returns approvalsEnabled from GET /admin-settings", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ approvalsEnabled: false }),
    } as Response)
    const out = await fetchAdminSettings()
    expect(out.approvalsEnabled).toBe(false)
    expect(fetch).toHaveBeenCalledWith(
      "/.netlify/functions/admin-settings",
      expect.objectContaining({ headers: expect.any(Object) })
    )
  })
})

describe("updateAdminSettings", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  it("sends PATCH with approvalsEnabled and returns result", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ approvalsEnabled: true }),
    } as Response)
    const out = await updateAdminSettings({ approvalsEnabled: true })
    expect(out.approvalsEnabled).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      "/.netlify/functions/admin-settings",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ approvalsEnabled: true }),
      })
    )
  })
})

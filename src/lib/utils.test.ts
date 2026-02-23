import { describe, it, expect } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b")
  })

  it("handles tailwind conflict with last winning", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })

  it("handles undefined and false", () => {
    expect(cn("a", undefined, false, "b")).toBe("a b")
  })
})

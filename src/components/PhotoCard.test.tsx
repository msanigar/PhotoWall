import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PhotoCard } from "./PhotoCard"

const mockItem = {
  id: "1",
  caption: "Test caption",
  created_at: "2024-01-01T00:00:00Z",
  thumb_url: "https://example.com/thumb.jpg",
}

describe("PhotoCard", () => {
  it("renders image with thumb_url and caption", () => {
    render(<PhotoCard item={mockItem} />)
    const img = screen.getByRole("img", { name: /test caption/i })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute("src", mockItem.thumb_url)
    expect(screen.getByText("Test caption")).toBeInTheDocument()
  })

  it("uses default alt when caption is empty", () => {
    render(<PhotoCard item={{ ...mockItem, caption: "" }} />)
    expect(screen.getByRole("img", { name: /wedding photo/i })).toBeInTheDocument()
  })
})

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { TopNav } from "./TopNav"

function renderWithRouter() {
  const result = render(
    <MemoryRouter>
      <TopNav />
    </MemoryRouter>
  )
  return { ...result, container: result.container }
}

describe("TopNav", () => {
  it("renders Photo Wall link, Upload and Admin links with correct hrefs", () => {
    const { container } = renderWithRouter()
    const link = screen.getByRole("link", { name: /photo wall/i })
    expect(link).toHaveAttribute("href", "/")
    const upload = container.querySelector('a[href="/upload"]')
    expect(upload).toBeInTheDocument()
    expect(upload).toHaveAttribute("aria-label", "Upload a photo")
    const admin = container.querySelector('a[href="/admin"]')
    expect(admin).toBeInTheDocument()
    expect(admin).toHaveAttribute("aria-label", "Admin moderation")
  })
})

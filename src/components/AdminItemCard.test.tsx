import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { AdminItemCard } from "./AdminItemCard"

const mockItem = {
  id: "1",
  caption: "Test",
  created_at: "2024-01-01T00:00:00Z",
  thumb_url: "https://example.com/thumb.jpg",
  status: "pending",
}

const noop = () => Promise.resolve()

const defaultProps = {
  item: mockItem,
  tab: "pending" as const,
  busy: false,
  onBusy: () => {},
  onApprove: noop,
  onReject: noop,
  onEditCaption: noop,
  onDelete: noop,
  onRemove: () => {},
  onUpdateCaption: () => {},
}

describe("AdminItemCard", () => {
  it("disables Approve and Reject when approvalsEnabled is false", () => {
    const { container } = render(<AdminItemCard {...defaultProps} approvalsEnabled={false} />)
    const approve = container.querySelector('button[title="Approvals are disabled"]')
    expect(approve).toBeInTheDocument()
    expect(approve).toBeDisabled()
    const buttons = container.querySelectorAll('button[title="Approvals are disabled"]')
    expect(buttons).toHaveLength(2)
    buttons.forEach((btn) => expect(btn).toBeDisabled())
  })

  it("enables Approve and Reject when approvalsEnabled is true", () => {
    const { container } = render(<AdminItemCard {...defaultProps} approvalsEnabled={true} />)
    const approveBtn = container.querySelectorAll('button')[0]
    const rejectBtn = container.querySelectorAll('button')[1]
    expect(approveBtn?.textContent).toMatch(/approve/i)
    expect(rejectBtn?.textContent).toMatch(/reject/i)
    expect(approveBtn).not.toBeDisabled()
    expect(rejectBtn).not.toBeDisabled()
  })
})

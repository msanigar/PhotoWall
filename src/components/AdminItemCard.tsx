import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AdminSubmission } from "@/lib/api"
import { Check, X, Pencil, Trash2 } from "lucide-react"

type Tab = "pending" | "approved" | "rejected"

type Props = {
  item: AdminSubmission
  tab: Tab
  busy: boolean
  onBusy: (id: string | null) => void
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onEditCaption: (id: string, caption: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRemove: () => void
  onUpdateCaption: (caption: string) => void
  approvalsEnabled?: boolean
}

export function AdminItemCard({
  item,
  tab,
  busy,
  onBusy,
  onApprove,
  onReject,
  onEditCaption,
  onDelete,
  onRemove,
  onUpdateCaption,
  approvalsEnabled = true,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.caption)

  const run = async (fn: () => Promise<void>) => {
    onBusy(item.id)
    try {
      await fn()
    } finally {
      onBusy(null)
    }
  }

  const handleApprove = () =>
    run(async () => {
      await onApprove(item.id)
      onRemove()
    })

  const handleReject = () =>
    run(async () => {
      await onReject(item.id)
      onRemove()
    })

  const handleSaveCaption = () =>
    run(async () => {
      const trimmed = editValue.trim().replace(/\s+/g, " ").slice(0, 140)
      await onEditCaption(item.id, trimmed)
      onUpdateCaption(trimmed)
      setEditing(false)
    })

  const handleDelete = () =>
    run(async () => {
      await onDelete(item.id)
      onRemove()
    })

  const created = item.created_at
    ? new Date(item.created_at).toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      })
    : ""

  return (
    <li className="flex gap-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
        <img
          src={item.thumb_url}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-2">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value.slice(0, 140))}
              maxLength={140}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveCaption} disabled={busy}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{created}</p>
            <p className="mt-1 line-clamp-2 text-sm">{item.caption || "(no caption)"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tab === "pending" && (
                <>
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={busy || !approvalsEnabled}
                    className="gap-1"
                    title={!approvalsEnabled ? "Approvals are disabled" : undefined}
                  >
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleReject}
                    disabled={busy || !approvalsEnabled}
                    className="gap-1"
                    title={!approvalsEnabled ? "Approvals are disabled" : undefined}
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={busy} className="gap-1">
                <Pencil className="h-4 w-4" /> Edit caption
              </Button>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={busy} className="gap-1">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </>
        )}
      </div>
    </li>
  )
}

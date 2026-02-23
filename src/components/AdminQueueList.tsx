import { useCallback, useEffect, useState } from "react"
import type { AdminSubmission } from "@/lib/api"
import { AdminItemCard } from "./AdminItemCard"

type Tab = "pending" | "approved" | "rejected"

type FetchFn = (cursor?: string) => Promise<{ items: AdminSubmission[]; nextCursor: string | null }>

type Props = {
  tab: Tab
  fetchItems: FetchFn
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onEditCaption: (id: string, caption: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  approvalsEnabled?: boolean
}

export function AdminQueueList({
  tab,
  fetchItems,
  onApprove,
  onReject,
  onEditCaption,
  onDelete,
  approvalsEnabled = true,
}: Props) {
  const [items, setItems] = useState<AdminSubmission[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadPage = useCallback(
    async (cursor?: string) => {
      if (cursor) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      try {
        const res = await fetchItems(cursor)
        if (cursor) {
          setItems((prev) => [...prev, ...res.items])
        } else {
          setItems(res.items)
        }
        setNextCursor(res.nextCursor)
      } catch (e) {
        setError((e as Error).message)
        if (!cursor) setItems([])
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [fetchItems]
  )

  useEffect(() => {
    loadPage()
  }, [tab, loadPage])

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const updateCaption = (id: string, caption: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, caption } : i)))
  }

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2">
        <p className="text-destructive">{error}</p>
        <button
          type="button"
          className="text-sm text-primary underline"
          onClick={() => loadPage()}
        >
          Try again
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <p className="text-muted-foreground">No items in this tab.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {items.map((item) => (
          <AdminItemCard
            key={item.id}
            item={item}
            tab={tab}
            busy={busyId === item.id}
            onBusy={setBusyId}
            onApprove={onApprove}
            onReject={onReject}
            onEditCaption={onEditCaption}
            onDelete={onDelete}
            onRemove={() => removeItem(item.id)}
            onUpdateCaption={(caption) => updateCaption(item.id, caption)}
            approvalsEnabled={approvalsEnabled}
          />
        ))}
      </ul>
      {nextCursor && (
        <div className="flex justify-center">
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => loadPage(nextCursor)}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  )
}

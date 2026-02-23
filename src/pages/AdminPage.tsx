import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  fetchAdminPending,
  fetchAdminApproved,
  fetchAdminRejected,
  adminApprove,
  adminReject,
  adminEditCaption,
  adminDelete,
  adminExport,
  fetchAdminSettings,
  updateAdminSettings,
} from "@/lib/api"
import { getAccessToken } from "@/lib/api"
import { AdminQueueList } from "@/components/AdminQueueList"

type Tab = "pending" | "approved" | "rejected"

export function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>("pending")
  const [exporting, setExporting] = useState(false)
  const [approvalsEnabled, setApprovalsEnabled] = useState<boolean>(true)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getAccessToken()
      .then((t) => {
        setAuthed(!!t)
        if (!t) navigate("/admin/login", { replace: true })
      })
      .catch(() => setAuthed(false))
  }, [navigate])

  useEffect(() => {
    if (!authed) return
    fetchAdminSettings()
      .then((s) => setApprovalsEnabled(s.approvalsEnabled))
      .catch(() => {})
      .finally(() => setSettingsLoading(false))
  }, [authed])

  const handleApprovalsToggle = async () => {
    const next = !approvalsEnabled
    setApprovalsEnabled(next)
    try {
      await updateAdminSettings({ approvalsEnabled: next })
    } catch {
      setApprovalsEnabled(approvalsEnabled)
    }
  }

  const fetchItems = (cursor?: string) => {
    if (tab === "pending") return fetchAdminPending(cursor)
    if (tab === "approved") return fetchAdminApproved(cursor)
    return fetchAdminRejected(cursor)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await adminExport()
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = "wedding-photos-export.csv"
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      // toast or inline error
    } finally {
      setExporting(false)
    }
  }

  if (authed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!authed) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Link to="/" className="text-lg font-semibold">
            Photo Wall – Admin
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={approvalsEnabled}
                onChange={handleApprovalsToggle}
                disabled={settingsLoading}
                className="h-4 w-4 rounded border-input"
                aria-label="Approvals enabled"
              />
              Approvals on
            </label>
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Gallery</Link>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          </div>
        </div>
        {!approvalsEnabled && (
          <p className="mx-auto mt-2 max-w-4xl text-sm text-muted-foreground" role="status">
            Approvals are off — Approve/Reject are disabled until you turn them back on.
          </p>
        )}
        <div className="mx-auto mt-4 flex max-w-4xl gap-1" role="tablist">
          {(["pending", "approved", "rejected"] as const).map((t) => (
            <Button
              key={t}
              variant={tab === t ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab(t)}
              role="tab"
              aria-selected={tab === t}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <AdminQueueList
          tab={tab}
          fetchItems={fetchItems}
          onApprove={adminApprove}
          onReject={adminReject}
          onEditCaption={adminEditCaption}
          onDelete={adminDelete}
          approvalsEnabled={approvalsEnabled}
        />
      </main>
    </div>
  )
}

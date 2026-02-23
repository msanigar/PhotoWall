import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { fetchGallery, type SubmissionPreview } from "@/lib/api"
import { PhotoCard } from "./PhotoCard"
import { useToast } from "@/hooks/useToast"

export function GalleryGrid() {
  const [items, setItems] = useState<SubmissionPreview[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const loadPage = useCallback(async (cursor?: string) => {
    if (cursor) setLoadingMore(true)
    else setLoading(true)
    try {
      const res = await fetchGallery(cursor)
      if (cursor) {
        setItems((prev) => [...prev, ...res.items])
      } else {
        setItems(res.items)
      }
      setNextCursor(res.nextCursor)
    } catch {
      toast({ title: "Could not load gallery", variant: "default" })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [toast])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  useEffect(() => {
    if (!nextCursor || loadingMore) return
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadPage(nextCursor)
      },
      { rootMargin: "200px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [nextCursor, loadPage, loadingMore])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
        <p className="text-muted-foreground">Loading photos…</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground">No photos yet. Be the first to add one!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-4">
      {items.map((item) => (
        <Link
          key={item.id}
          to={`/p/${item.id}`}
          className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
        >
          <PhotoCard item={item} />
        </Link>
      ))}
      <div ref={sentinelRef} className="col-span-full h-4" aria-hidden />
      {loadingMore && (
        <div className="col-span-full py-4 text-center text-sm text-muted-foreground">
          Loading more…
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { fetchPhoto } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { TopNav } from "@/components/TopNav"
import { ArrowLeft } from "lucide-react"

export function PhotoPage() {
  const { id } = useParams<{ id: string }>()
  const [photo, setPhoto] = useState<Awaited<ReturnType<typeof fetchPhoto>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setError(true)
      return
    }
    let cancelled = false
    fetchPhoto(id)
      .then((data) => {
        if (!cancelled) setPhoto(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  if (error || !photo) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
          <p className="text-muted-foreground">Photo not found.</p>
          <Button asChild variant="outline">
            <Link to="/">Back to gallery</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-4xl px-4 py-4">
        <Button asChild variant="ghost" size="sm" className="mb-4 gap-1">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to gallery
          </Link>
        </Button>
        <article className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="flex justify-center bg-muted">
            <img
              src={photo.image_url}
              alt={photo.caption || "Wedding photo"}
              className="max-h-[80vh] w-full object-contain"
              width={photo.width}
              height={photo.height}
            />
          </div>
          {photo.caption ? (
            <p className="p-4 text-base text-muted-foreground">{photo.caption}</p>
          ) : null}
        </article>
      </main>
    </div>
  )
}

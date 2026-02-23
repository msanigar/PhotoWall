import type { SubmissionPreview } from "@/lib/api"
import { cn } from "@/lib/utils"

type Props = { item: SubmissionPreview; className?: string }

export function PhotoCard({ item, className }: Props) {
  return (
    <article
      className={cn(
        "group overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="aspect-[4/5] w-full overflow-hidden bg-muted">
        <img
          src={item.thumb_url}
          alt={item.caption || "Wedding photo"}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
      {item.caption ? (
        <p className="line-clamp-2 p-2 text-sm text-muted-foreground">{item.caption}</p>
      ) : null}
    </article>
  )
}

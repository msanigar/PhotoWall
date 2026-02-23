import { TopNav } from "@/components/TopNav"
import { GalleryGrid } from "@/components/GalleryGrid"
import { RealtimeGallery } from "@/components/RealtimeGallery"

export function GalleryPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <RealtimeGallery />
      <GalleryGrid />
    </div>
  )
}

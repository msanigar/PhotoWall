import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Camera, Shield } from "lucide-react"

export function TopNav() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Link to="/" className="text-lg font-semibold tracking-tight">
        Photo Wall
      </Link>
      <div className="flex items-center gap-2">
        <Button asChild size="lg" className="gap-2" aria-label="Upload a photo">
          <Link to="/upload">
            <Camera className="h-5 w-5" aria-hidden />
            Upload
          </Link>
        </Button>
        <Button asChild variant="ghost" size="default" aria-label="Admin moderation">
          <Link to="/admin">
            <Shield className="h-4 w-4" aria-hidden />
            Admin
          </Link>
        </Button>
      </div>
    </nav>
  )
}

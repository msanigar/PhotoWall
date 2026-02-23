import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/useToast"

export function RealtimeGallery() {
  const [newCount, setNewCount] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      channel = supabase
        .channel("submissions-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "submissions",
            filter: "status=eq.approved",
          },
          () => {
            setNewCount((c) => c + 1)
          }
        )
        .subscribe()
    } catch {
      // Supabase not configured or realtime unavailable (e.g. E2E / dev without backend)
    }
    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (newCount > 0) {
      toast({
        title: "New photos",
        description: `${newCount} new photo${newCount > 1 ? "s" : ""} added. Scroll up to see.`,
        variant: "success",
      })
    }
  }, [newCount, toast])

  return null
}

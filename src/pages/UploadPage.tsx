import { useState, useRef } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { submitPhoto } from "@/lib/api"
import { getOrCreateDeviceId, getSoftFingerprint } from "@/lib/device"
import { TopNav } from "@/components/TopNav"

const CAPTION_MAX = 140

type Step = "capture" | "preview" | "submitting" | "success" | "error"

export function UploadPage() {
  const [step, setStep] = useState<Step>("capture")
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith("image/")) {
      setErrorMessage("Please choose an image (JPEG, PNG, WebP or HEIC).")
      return
    }
    if (f.size > 6 * 1024 * 1024) {
      setErrorMessage("Image must be under 6 MB.")
      return
    }
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setErrorMessage("")
    setStep("preview")
  }

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setCaption("")
    setStep("capture")
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleSubmit = async () => {
    if (!file) return
    const trimmed = caption.trim().replace(/\s+/g, " ").slice(0, CAPTION_MAX)
    setStep("submitting")
    setErrorMessage("")
    try {
      const formData = new FormData()
      formData.append("photo", file)
      formData.append("caption", trimmed)
      formData.append("device_id", getOrCreateDeviceId())
      formData.append("fingerprint", getSoftFingerprint())

      await submitPhoto(formData)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setStep("success")
    } catch (e) {
      setErrorMessage((e as Error).message || "Upload failed. Please try again.")
      setStep("error")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-lg px-4 py-6">
        {step === "capture" && (
          <section className="space-y-6" aria-label="Take a photo">
            <h1 className="text-xl font-semibold">Take a photo</h1>
            <p className="text-muted-foreground">
              Use your camera to take a new photo. It will be reviewed before appearing in the
              gallery.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCapture}
              className="sr-only"
              id="camera-input"
              aria-label="Capture photo from camera"
            />
            <Button
              size="xl"
              className="w-full gap-2"
              onClick={() => inputRef.current?.click()}
              aria-describedby={errorMessage ? "capture-error" : undefined}
            >
              Take a photo
            </Button>
            {errorMessage ? (
              <p id="capture-error" className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </section>
        )}

        {step === "preview" && previewUrl && (
          <section className="space-y-3" aria-label="Review and submit">
            <h1 className="text-xl font-semibold">Review</h1>
            <div className="mx-auto max-h-[26vh] w-full max-w-xs overflow-hidden rounded-lg border bg-muted">
              <img
                src={previewUrl}
                alt="Preview"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="caption" className="text-sm font-medium text-muted-foreground">
                Caption (optional)
              </label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))}
                placeholder="Add a caption (optional)"
                maxLength={CAPTION_MAX}
                className="text-base"
                aria-describedby="caption-count"
              />
              <p id="caption-count" className="text-right text-xs text-muted-foreground">
                {caption.length}/{CAPTION_MAX}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleRetake}>
                Retake
              </Button>
              <Button className="flex-1" onClick={handleSubmit}>
                Submit
              </Button>
            </div>
            {errorMessage ? (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            ) : null}
          </section>
        )}

        {step === "submitting" && (
          <section className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground">Uploading…</p>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </section>
        )}

        {step === "success" && (
          <section
            className="flex min-h-[40vh] flex-col items-center justify-center gap-6 text-center"
            role="status"
            aria-live="polite"
          >
            <p className="text-lg font-medium">Submitted for approval</p>
            <p className="text-muted-foreground">
              Your photo will appear in the gallery once an admin approves it.
            </p>
            <Button asChild size="lg">
              <Link to="/">Back to gallery</Link>
            </Button>
          </section>
        )}

        {step === "error" && (
          <section className="space-y-6">
            <p className="text-destructive" role="alert">
              {errorMessage}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleRetake}>
                Try again
              </Button>
              <Button asChild>
                <Link to="/">Back to gallery</Link>
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

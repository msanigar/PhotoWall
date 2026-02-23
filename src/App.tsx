import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/components/ui/toaster"
import { GalleryPage } from "@/pages/GalleryPage"
import { UploadPage } from "@/pages/UploadPage"
import { PhotoPage } from "@/pages/PhotoPage"
import { AdminPage } from "@/pages/AdminPage"
import { AdminLoginPage } from "@/pages/AdminLoginPage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GalleryPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/p/:id" element={<PhotoPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App

"use client"

import type React from "react"
import uploadPDF from './lib/uploadPDF';
import savePDFData from './lib/savePDFData';
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Upload,
  X,
  Edit2,
  Download,
  GripVertical,
  FileText,
  FolderOpen,
  Plus,
  Tag,
  Filter,
  Eye,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Menu,
  Home,
  SkipForward,
  SkipBack,
  Save,
  Trash2,
  AlertCircle,
} from "lucide-react"

interface Category {
  id: string
  name: string
  color: string
}

const PageOrganizer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpload = async () => {
    if (!file) return alert("Please select a file");

    setLoading(true);
    setMessage('');

    try {
      const url = await uploadPDF(file);
      await savePDFData({
        name: file.name,
        url,
        tags: tags.split(',').map((tag) => tag.trim()),
      });
      setMessage('✅ Upload successful!');
      setFile(null);
      setTags('');
    } catch (err: any) {
      console.error(err);
      setMessage('❌ Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: 600, margin: '0 auto' }}>
      <h1>📄 PDF Organizer</h1>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ marginBottom: '1rem' }}
      />
      <input
        type="text"
        placeholder="Enter tags (comma separated)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        style={{ display: 'block', marginBottom: '1rem', width: '100%' }}
      />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? 'Uploading...' : 'Upload PDF'}
      </button>
      {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
    </div>
  );
};

export default PageOrganizer;

interface PDFFile {
  id: string
  name: string
  size: number
  file: File
  dataUrl?: string
  categoryId?: string
}

interface StoredPDFFile {
  id: string
  name: string
  size: number
  dataUrl: string
  fileName: string
  categoryId?: string
}

const defaultCategories: Category[] = [
  { id: "uncategorized", name: "Uncategorized", color: "bg-gray-100 text-gray-700" },
  { id: "work", name: "Work", color: "bg-red-100 text-red-700" },
  { id: "personal", name: "Personal", color: "bg-blue-100 text-blue-700" },
  { id: "finance", name: "Finance", color: "bg-green-100 text-green-700" },
]

export default function Component() {
  const [files, setFiles] = useState<PDFFile[]>([])
  const [categories, setCategories] = useState<Category[]>(defaultCategories)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [dragOver, setDragOver] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editCategoryName, setEditCategoryName] = useState("")
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ categoryId: string; categoryName: string } | null>(
    null,
  )
  const [viewingPDF, setViewingPDF] = useState<PDFFile | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.0)
  const [rotation, setRotation] = useState(0)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [isLoadingPDF, setIsLoadingPDF] = useState(false)
  const [showMobileCategories, setShowMobileCategories] = useState(false)
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false)
  const [pdfJsError, setPdfJsError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)

  const categoryColors = [
    "bg-red-100 text-red-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-yellow-100 text-yellow-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-orange-100 text-orange-700",
  ]

  // Load PDF.js with better error handling
  useEffect(() => {
    const loadPDFJS = async () => {
      try {
        if (typeof window !== "undefined") {
          // Check if PDF.js is already loaded
          if (window.pdfjsLib) {
            setPdfJsLoaded(true)
            return
          }

          // Load PDF.js from CDN
          const script = document.createElement("script")
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"

          script.onload = () => {
            try {
              if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
                setPdfJsLoaded(true)
                setPdfJsError(false)
              } else {
                throw new Error("PDF.js failed to load properly")
              }
            } catch (err) {
              console.error("Error setting up PDF.js:", err)
              setPdfJsError(true)
            }
          }

          script.onerror = () => {
            console.error("Failed to load PDF.js from CDN")
            setPdfJsError(true)
          }

          document.head.appendChild(script)

          // Cleanup function
          return () => {
            try {
              document.head.removeChild(script)
            } catch (e) {
              // Script might already be removed
            }
          }
        }
      } catch (err) {
        console.error("Error loading PDF.js:", err)
        setPdfJsError(true)
      }
    }

    loadPDFJS()
  }, [])

  // Load files and categories from localStorage on component mount
  useEffect(() => {
    const loadDataFromStorage = async () => {
      try {
        // Load categories
        const storedCategories = localStorage.getItem("pdf-organizer-categories")
        if (storedCategories) {
          const parsedCategories = JSON.parse(storedCategories)
          setCategories(parsedCategories)
        }

        // Load files
        const storedFiles = localStorage.getItem("pdf-organizer-files")
        if (storedFiles) {
          const parsedFiles: StoredPDFFile[] = JSON.parse(storedFiles)
          const restoredFiles: PDFFile[] = await Promise.all(
            parsedFiles.map(async (storedFile) => {
              try {
                const response = await fetch(storedFile.dataUrl)
                const blob = await response.blob()
                const file = new File([blob], storedFile.fileName, { type: "application/pdf" })

                return {
                  id: storedFile.id,
                  name: storedFile.name,
                  size: storedFile.size,
                  file: file,
                  dataUrl: storedFile.dataUrl,
                  categoryId: storedFile.categoryId || "uncategorized",
                }
              } catch (err) {
                console.error("Error restoring file:", storedFile.name, err)
                return null
              }
            }),
          )

          // Filter out any null values from failed restorations
          const validFiles = restoredFiles.filter((file): file is PDFFile => file !== null)
          setFiles(validFiles)
        }
      } catch (error) {
        console.error("Error loading data from localStorage:", error)
        setError("Failed to load saved files. Please refresh the page.")
      } finally {
        setIsLoading(false)
      }
    }

    loadDataFromStorage()
  }, [])

  // Save files to localStorage whenever files change
  useEffect(() => {
    if (!isLoading && files.length >= 0) {
      try {
        const filesToStore: StoredPDFFile[] = files.map((file) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          dataUrl: file.dataUrl || "",
          fileName: file.file.name,
          categoryId: file.categoryId,
        }))
        localStorage.setItem("pdf-organizer-files", JSON.stringify(filesToStore))
      } catch (err) {
        console.error("Error saving files to localStorage:", err)
        setError("Failed to save files. Storage might be full.")
      }
    }
  }, [files, isLoading])

  // Save categories to localStorage whenever categories change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem("pdf-organizer-categories", JSON.stringify(categories))
      } catch (err) {
        console.error("Error saving categories to localStorage:", err)
      }
    }
  }, [categories, isLoading])

  // Render PDF page
  const renderPage = async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return

    try {
      const page = await pdfDoc.getPage(pageNum)
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      const viewport = page.getViewport({ scale, rotation })
      canvas.height = viewport.height
      canvas.width = viewport.width

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      }

      await page.render(renderContext).promise
    } catch (error) {
      console.error("Error rendering page:", error)
      setError("Failed to render PDF page")
    }
  }

  // Load and display PDF
  const openPDF = async (file: PDFFile) => {
    try {
      if (!pdfJsLoaded || !window.pdfjsLib) {
        setError("PDF viewer is not available. Please refresh the page and try again.")
        return
      }

      setIsLoadingPDF(true)
      setViewingPDF(file)
      setError(null)

      const arrayBuffer = await file.file.arrayBuffer()
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise

      setPdfDoc(pdf)
      setTotalPages(pdf.numPages)
      setCurrentPage(1)
      setScale(1.0)
      setRotation(0)

      // Render first page
      setTimeout(() => renderPage(1), 100)
    } catch (error) {
      console.error("Error loading PDF:", error)
      setError("Failed to load PDF. The file might be corrupted or invalid.")
      setViewingPDF(null)
    } finally {
      setIsLoadingPDF(false)
    }
  }

  // Close PDF viewer
  const closePDF = () => {
    setViewingPDF(null)
    setPdfDoc(null)
    setCurrentPage(1)
    setTotalPages(0)
    setScale(1.0)
    setRotation(0)
    setError(null)
  }

  // Navigate pages
  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum)
      renderPage(pageNum)
    }
  }

  // Zoom functions
  const zoomIn = () => {
    const newScale = Math.min(scale + 0.25, 3.0)
    setScale(newScale)
    renderPage(currentPage)
  }

  const zoomOut = () => {
    const newScale = Math.max(scale - 0.25, 0.5)
    setScale(newScale)
    renderPage(currentPage)
  }

  // Rotate function
  const rotatePDF = () => {
    const newRotation = (rotation + 90) % 360
    setRotation(newRotation)
    renderPage(currentPage)
  }

  // Swipe handling functions
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    })
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > 50
    const isRightSwipe = distanceX < -50
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX)

    if (!isVerticalSwipe) {
      if (isLeftSwipe && currentPage < totalPages) {
        goToPage(currentPage + 1)
      }
      if (isRightSwipe && currentPage > 1) {
        goToPage(currentPage - 1)
      }
    }
  }

  // Mouse drag handling for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.clientX,
      y: e.clientY,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (touchStart) {
      setTouchEnd({
        x: e.clientX,
        y: e.clientY,
      })
    }
  }

  const handleMouseUp = () => {
    if (!touchStart || !touchEnd) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > 100
    const isRightSwipe = distanceX < -100
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX)

    if (!isVerticalSwipe) {
      if (isLeftSwipe && currentPage < totalPages) {
        goToPage(currentPage + 1)
      }
      if (isRightSwipe && currentPage > 1) {
        goToPage(currentPage - 1)
      }
    }

    setTouchStart(null)
    setTouchEnd(null)
  }

  // Re-render when scale or rotation changes
  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(currentPage)
    }
  }, [scale, rotation])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    try {
      const droppedFiles = Array.from(e.dataTransfer.files)
      const pdfFiles = droppedFiles.filter((file) => file.type === "application/pdf")

      if (pdfFiles.length === 0) {
        setError("Please drop only PDF files.")
        return
      }

      addFiles(pdfFiles)
    } catch (err) {
      console.error("Error handling dropped files:", err)
      setError("Failed to process dropped files.")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files)
        const pdfFiles = selectedFiles.filter((file) => file.type === "application/pdf")

        if (pdfFiles.length === 0) {
          setError("Please select only PDF files.")
          return
        }

        addFiles(pdfFiles)
      }
    } catch (err) {
      console.error("Error handling selected files:", err)
      setError("Failed to process selected files.")
    }
  }

  const addFiles = async (newFiles: File[]) => {
    try {
      setError(null)
      const pdfFiles: PDFFile[] = await Promise.all(
        newFiles.map(async (file) => {
          try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = () => reject(new Error("Failed to read file"))
              reader.readAsDataURL(file)
            })

            return {
              id: Math.random().toString(36).substr(2, 9),
              name: file.name.replace(".pdf", ""),
              size: file.size,
              file,
              dataUrl,
              categoryId: "uncategorized",
            }
          } catch (err) {
            console.error("Error processing file:", file.name, err)
            throw err
          }
        }),
      )

      setFiles((prev) => [...prev, ...pdfFiles])
    } catch (err) {
      console.error("Error adding files:", err)
      setError("Failed to add some files. Please try again.")
    }
  }

  const deleteFile = (id: string) => {
    try {
      setFiles((prev) => prev.filter((file) => file.id !== id))
    } catch (err) {
      console.error("Error deleting file:", err)
      setError("Failed to delete file.")
    }
  }

  const startRename = (id: string, currentName: string) => {
    setEditingId(id)
    setEditName(currentName)
  }

  const saveRename = (id: string) => {
    try {
      if (editName.trim()) {
        setFiles((prev) => prev.map((file) => (file.id === id ? { ...file, name: editName.trim() } : file)))
      }
      setEditingId(null)
      setEditName("")
    } catch (err) {
      console.error("Error renaming file:", err)
      setError("Failed to rename file.")
    }
  }

  const cancelRename = () => {
    setEditingId(null)
    setEditName("")
  }

  const updateFileCategory = (fileId: string, categoryId: string) => {
    try {
      setFiles((prev) => prev.map((file) => (file.id === fileId ? { ...file, categoryId } : file)))
    } catch (err) {
      console.error("Error updating file category:", err)
      setError("Failed to update file category.")
    }
  }

  const addCategory = () => {
    try {
      if (newCategoryName.trim()) {
        const newCategory: Category = {
          id: Math.random().toString(36).substr(2, 9),
          name: newCategoryName.trim(),
          color: categoryColors[Math.floor(Math.random() * categoryColors.length)],
        }
        setCategories((prev) => [...prev, newCategory])
        setNewCategoryName("")
        setShowNewCategory(false)
      }
    } catch (err) {
      console.error("Error adding category:", err)
      setError("Failed to add category.")
    }
  }

  const confirmDeleteCategory = (categoryId: string, categoryName: string) => {
    setDeleteConfirmation({ categoryId, categoryName })
  }

  const deleteCategory = (categoryId: string) => {
    try {
      if (categoryId === "uncategorized") return

      setFiles((prev) =>
        prev.map((file) => (file.categoryId === categoryId ? { ...file, categoryId: "uncategorized" } : file)),
      )

      setCategories((prev) => prev.filter((cat) => cat.id !== categoryId))

      if (selectedCategory === categoryId) {
        setSelectedCategory("all")
      }

      setDeleteConfirmation(null)
    } catch (err) {
      console.error("Error deleting category:", err)
      setError("Failed to delete category.")
    }
  }

  const cancelDeleteCategory = () => {
    setDeleteConfirmation(null)
  }

  const startEditCategory = (categoryId: string, currentName: string) => {
    setEditingCategory(categoryId)
    setEditCategoryName(currentName)
  }

  const saveEditCategory = (categoryId: string) => {
    try {
      if (editCategoryName.trim()) {
        setCategories((prev) =>
          prev.map((cat) => (cat.id === categoryId ? { ...cat, name: editCategoryName.trim() } : cat)),
        )
      }
      setEditingCategory(null)
      setEditCategoryName("")
    } catch (err) {
      console.error("Error editing category:", err)
      setError("Failed to edit category.")
    }
  }

  const cancelEditCategory = () => {
    setEditingCategory(null)
    setEditCategoryName("")
  }

  const downloadFile = (file: PDFFile) => {
    try {
      const url = URL.createObjectURL(file.file)
      const a = document.createElement("a")
      a.href = url
      a.download = `${file.name}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Error downloading file:", err)
      setError("Failed to download file.")
    }
  }

  const downloadAll = () => {
    try {
      files.forEach((file) => downloadFile(file))
    } catch (err) {
      console.error("Error downloading all files:", err)
      setError("Failed to download all files.")
    }
  }

  const clearAllFiles = () => {
    try {
      setFiles([])
      localStorage.removeItem("pdf-organizer-files")
    } catch (err) {
      console.error("Error clearing files:", err)
      setError("Failed to clear files.")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const filteredFiles = files.filter((file) => {
    if (selectedCategory === "all") return true
    return file.categoryId === selectedCategory
  })

  const getCategoryById = (id: string) => categories.find((cat) => cat.id === id)

  const getFilesCountByCategory = (categoryId: string) => {
    return files.filter((file) => file.categoryId === categoryId).length
  }

  const dismissError = () => {
    setError(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading your files...</p>
        </div>
      </div>
    )
  }

  // PDF Viewer Modal - Mobile Optimized
  if (viewingPDF) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
        {/* Error Display in PDF Viewer */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="text-sm">{error}</span>
              </div>
              <button onClick={dismissError} className="text-red-700 hover:text-red-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PDF Viewer Header - Mobile Optimized */}
        <div className="bg-white border-b border-gray-200 p-2 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-0">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Button onClick={closePDF} variant="outline" size="sm" className="flex-shrink-0 bg-transparent">
                <X className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Close</span>
              </Button>
              <h2 className="text-sm sm:text-lg font-semibold text-gray-800 truncate">{viewingPDF.name}</h2>
            </div>
          </div>

          {/* PDF Controls - Mobile Optimized */}
          <div className="flex items-center justify-between space-x-1 sm:space-x-2 overflow-x-auto">
            <div className="flex items-center space-x-1">
              <Button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} variant="outline" size="sm">
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <span className="text-xs sm:text-sm text-gray-600 px-1 sm:px-3 whitespace-nowrap">
                {currentPage}/{totalPages}
              </span>

              <Button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                variant="outline"
                size="sm"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center space-x-1">
              <Button onClick={zoomOut} disabled={scale <= 0.5} variant="outline" size="sm">
                <ZoomOut className="w-4 h-4" />
              </Button>

              <span className="text-xs sm:text-sm text-gray-600 px-1 sm:px-2 whitespace-nowrap">
                {Math.round(scale * 100)}%
              </span>

              <Button onClick={zoomIn} disabled={scale >= 3.0} variant="outline" size="sm">
                <ZoomIn className="w-4 h-4" />
              </Button>

              <Button onClick={rotatePDF} variant="outline" size="sm">
                <RotateCw className="w-4 h-4" />
              </Button>

              <Button onClick={() => downloadFile(viewingPDF)} variant="outline" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* PDF Content - Mobile Optimized */}
        <div className="flex-1 overflow-auto bg-gray-100 p-2 sm:p-4">
          {isLoadingPDF ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 text-sm">Loading PDF...</p>
              </div>
            </div>
          ) : pdfJsError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-600">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                <p className="text-lg mb-2">PDF Viewer Unavailable</p>
                <p className="text-sm">The PDF viewer failed to load. You can still download the file.</p>
                <Button
                  onClick={() => downloadFile(viewingPDF)}
                  className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div
                className="relative select-none w-full max-w-full"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                  setTouchStart(null)
                  setTouchEnd(null)
                }}
                style={{ cursor: touchStart ? "grabbing" : "grab" }}
              >
                <canvas
                  ref={canvasRef}
                  className="shadow-lg bg-white max-w-full h-auto mx-auto block"
                  style={{ maxHeight: "calc(100vh - 160px)" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Page Navigation Footer - Mobile Optimized */}
        {!pdfJsError && (
          <div className="bg-white border-t border-gray-200 p-2 sm:p-4">
            <div className="flex items-center justify-center space-x-2 sm:space-x-4 overflow-x-auto">
              <Button onClick={() => goToPage(1)} disabled={currentPage <= 1} variant="outline" size="sm">
                <Home className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">First</span>
              </Button>
              <Button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} variant="outline" size="sm">
                <SkipBack className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Prev</span>
              </Button>

              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="text-xs sm:text-sm text-gray-600">Page</span>
                <Input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = Number.parseInt(e.target.value)
                    if (page >= 1 && page <= totalPages) {
                      goToPage(page)
                    }
                  }}
                  className="w-12 sm:w-16 text-center text-xs sm:text-sm"
                />
                <span className="text-xs sm:text-sm text-gray-600">of {totalPages}</span>
              </div>

              <Button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                variant="outline"
                size="sm"
              >
                <span className="hidden sm:inline">Next</span>
                <SkipForward className="w-4 h-4 sm:ml-1" />
              </Button>
              <Button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage >= totalPages}
                variant="outline"
                size="sm"
              >
                <span className="hidden sm:inline">Last</span>
                <SkipForward className="w-4 h-4 sm:ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
        {/* Error Display */}
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="text-sm">{error}</span>
              </div>
              <button onClick={dismissError} className="text-red-700 hover:text-red-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PDF.js Loading Status */}
        {!pdfJsLoaded && !pdfJsError && (
          <div className="mb-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-sm">Loading PDF viewer...</span>
            </div>
          </div>
        )}

        {pdfJsError && (
          <div className="mb-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span className="text-sm">PDF viewer failed to load. You can still upload and download files.</span>
            </div>
          </div>
        )}

        {/* Hero Section - Mobile Optimized */}
        <div className="text-center mb-6 sm:mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full mb-4 sm:mb-6">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-2 sm:mb-4">Organize Your PDFs</h1>
          <p className="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
            Upload, organize, and manage your PDF files with ease. Create categories and keep everything organized.
          </p>
        </div>

        {/* Mobile Categories Toggle */}
        <div className="lg:hidden mb-4">
          <Button
            onClick={() => setShowMobileCategories(!showMobileCategories)}
            className="w-full hover:bg-red-700 flex items-center justify-center text-rose-800 bg-pink-200"
          >
            <Menu className="w-4 h-4 mr-2" />
            Categories ({selectedCategory === "all" ? "All Files" : getCategoryById(selectedCategory)?.name})
          </Button>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-8">
          {/* Categories Sidebar - Mobile Optimized */}
          <div className={`lg:col-span-1 ${showMobileCategories ? "block" : "hidden lg:block"}`}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center">
                  <Tag className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-red-600" />
                  <span className="hidden sm:inline">Categories</span>
                </h3>
                <Button
                  size="sm"
                  onClick={() => setShowNewCategory(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Add New Category - Mobile Optimized */}
              {showNewCategory && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCategory()
                      if (e.key === "Escape") {
                        setShowNewCategory(false)
                        setNewCategoryName("")
                      }
                    }}
                    className="mb-2 text-sm"
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={addCategory} className="bg-gray-600 hover:bg-gray-700 text-white">
                      <Save className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Add</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNewCategory(false)
                        setNewCategoryName("")
                      }}
                    >
                      <X className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Cancel</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* All Files Filter - Mobile Optimized */}
              <button
                onClick={() => {
                  setSelectedCategory("all")
                  setShowMobileCategories(false)
                }}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                  selectedCategory === "all" ? "bg-red-100 text-red-700" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <Filter className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="font-medium text-sm sm:text-base truncate">All Files</span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-500 ml-2">{files.length}</span>
                </div>
              </button>

              {/* Category List - Mobile Optimized */}
              <div className="space-y-2 max-h-64 sm:max-h-none overflow-y-auto">
                {categories.map((category) => (
                  <div key={category.id}>
                    {editingCategory === category.id ? (
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <Input
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditCategory(category.id)
                            if (e.key === "Escape") cancelEditCategory()
                          }}
                          className="mb-2 text-sm"
                          autoFocus
                        />
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => saveEditCategory(category.id)}
                            className="bg-gray-600 hover:bg-gray-700 text-white"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditCategory}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedCategory(category.id)
                          setShowMobileCategories(false)
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedCategory === category.id ? "bg-red-100 text-red-700" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center min-w-0">
                            <span
                              className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${category.color.split(" ")[0]}`}
                            ></span>
                            <span className="font-medium text-sm sm:text-base truncate">{category.name}</span>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <span className="text-xs sm:text-sm text-gray-500">
                              {getFilesCountByCategory(category.id)}
                            </span>
                            {category.id !== "uncategorized" && (
                              <div className="flex space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    startEditCategory(category.id, category.name)
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded text-gray-600"
                                  title="Edit category"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    confirmDeleteCategory(category.id, category.name)
                                  }}
                                  className="p-1 hover:bg-red-200 rounded text-red-600"
                                  title="Delete category"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Mobile Optimized */}
          <div className="lg:col-span-3">
            {/* Upload Area - Mobile Optimized */}
            <div className="mb-6 sm:mb-8">
              <div
                className={`relative border-2 border-dashed rounded-xl p-4 sm:p-8 text-center transition-all duration-200 ${
                  dragOver
                    ? "border-red-400 bg-red-50"
                    : "border-gray-300 bg-white hover:border-red-300 hover:bg-gray-50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-medium text-gray-700 mb-1 sm:mb-2">
                      Drop your PDF files here
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">or click to browse your files</p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm sm:text-base"
                    >
                      Choose Files
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* File List - Mobile Optimized */}
            {filteredFiles.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2 sm:mb-0">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center min-w-0">
                      <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-red-600 flex-shrink-0" />
                      <span className="truncate">
                        {selectedCategory === "all"
                          ? `All Files (${filteredFiles.length})`
                          : `${getCategoryById(selectedCategory)?.name} (${filteredFiles.length})`}
                      </span>
                    </h2>
                  </div>
                  <div className="flex items-center space-x-2 overflow-x-auto">
                    {filteredFiles.length > 1 && (
                      <Button
                        onClick={downloadAll}
                        size="sm"
                        className="bg-gray-600 hover:bg-gray-700 text-white whitespace-nowrap"
                      >
                        <Download className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Download All</span>
                      </Button>
                    )}
                    <Button
                      onClick={clearAllFiles}
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent whitespace-nowrap"
                    >
                      <Trash2 className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Clear All</span>
                    </Button>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {filteredFiles.map((file, index) => {
                    const fileCategory = getCategoryById(file.categoryId || "uncategorized")
                    return (
                      <div key={file.id} className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors">
                        {editingId === file.id ? (
                          <div className="space-y-3">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveRename(file.id)
                                if (e.key === "Escape") cancelRename()
                              }}
                              className="text-sm"
                              autoFocus
                            />
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => saveRename(file.id)}
                                className="bg-gray-600 hover:bg-gray-700 text-white"
                              >
                                <Save className="w-4 h-4 sm:mr-1" />
                                <span className="hidden sm:inline">Save</span>
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelRename}>
                                <X className="w-4 h-4 sm:mr-1" />
                                <span className="hidden sm:inline">Cancel</span>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start space-x-3 sm:space-x-4">
                            <div className="cursor-move text-gray-400 hover:text-gray-600 mt-1 hidden sm:block">
                              <GripVertical className="w-5 h-5" />
                            </div>

                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 truncate text-sm sm:text-base">{file.name}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <p className="text-xs sm:text-sm text-gray-500">{formatFileSize(file.size)}</p>
                                {fileCategory && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${fileCategory.color}`}>
                                    {fileCategory.name}
                                  </span>
                                )}
                              </div>

                              {/* Mobile Category Selector */}
                              <div className="mt-2 sm:hidden">
                                <select
                                  value={file.categoryId || "uncategorized"}
                                  onChange={(e) => updateFileCategory(file.id, e.target.value)}
                                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white w-full"
                                >
                                  {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Mobile Action Buttons */}
                              <div className="flex items-center space-x-2 mt-3 sm:hidden">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPDF(file)}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50 flex-1"
                                  disabled={pdfJsError}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startRename(file.id, file.name)}
                                  className="text-gray-600 border-gray-200 hover:bg-gray-50"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadFile(file)}
                                  className="text-gray-600 border-gray-200 hover:bg-gray-50"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteFile(file.id)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Desktop Actions */}
                            <div className="hidden sm:flex items-center space-x-2">
                              <select
                                value={file.categoryId || "uncategorized"}
                                onChange={(e) => updateFileCategory(file.id, e.target.value)}
                                className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
                              >
                                {categories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPDF(file)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                title="View PDF"
                                disabled={pdfJsError}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startRename(file.id, file.name)}
                                className="text-gray-600 border-gray-200 hover:bg-gray-50"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadFile(file)}
                                className="text-gray-600 border-gray-200 hover:bg-gray-50"
                              >
                                <Download className="w-4 h-4" />
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteFile(file.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty States - Mobile Optimized */}
            {filteredFiles.length === 0 && files.length > 0 && (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Tag className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-base sm:text-lg">No files in this category</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-2">
                  Try selecting a different category or upload some files
                </p>
              </div>
            )}

            {filteredFiles.length === 0 && files.length === 0 && (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-base sm:text-lg">No PDF files uploaded yet</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-2">Upload some files to get started organizing</p>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog - Mobile Optimized */}
        {deleteConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">Delete Category</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Are you sure you want to delete the category "{deleteConfirmation.categoryName}"? All files in this
                category will be moved to "Uncategorized".
              </p>
              <div className="flex space-x-3 justify-end">
                <Button variant="outline" onClick={cancelDeleteCategory} size="sm">
                  Cancel
                </Button>
                <Button
                  onClick={() => deleteCategory(deleteConfirmation.categoryId)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

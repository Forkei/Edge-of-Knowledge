'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Image as ImageIcon, X, Sparkles } from 'lucide-react'

interface ImageUploadProps {
  onImageSelect: (imageData: { base64: string; mimeType: string; preview: string }) => void
  onAnalyze: (context?: string) => void
  isLoading: boolean
  selectedImage: string | null
}

export default function ImageUpload({
  onImageSelect,
  onAnalyze,
  isLoading,
  selectedImage,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [context, setContext] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Compress and resize image to stay under Vercel's 4.5MB limit
  const compressImage = useCallback(
    (file: File): Promise<{ base64: string; mimeType: string; preview: string }> => {
      return new Promise((resolve, reject) => {
        const img = new window.Image()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        img.onload = () => {
          // Max dimensions - keeps quality while reducing size
          const MAX_WIDTH = 1920
          const MAX_HEIGHT = 1920

          let { width, height } = img

          // Scale down if needed
          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
            width = Math.round(width * ratio)
            height = Math.round(height * ratio)
          }

          canvas.width = width
          canvas.height = height
          ctx?.drawImage(img, 0, 0, width, height)

          // Compress as JPEG with quality adjustment
          let quality = 0.85
          let dataUrl = canvas.toDataURL('image/jpeg', quality)

          // If still too large, reduce quality further
          while (dataUrl.length > 3 * 1024 * 1024 && quality > 0.3) {
            quality -= 0.1
            dataUrl = canvas.toDataURL('image/jpeg', quality)
          }

          const base64 = dataUrl.split(',')[1]
          resolve({
            base64,
            mimeType: 'image/jpeg',
            preview: dataUrl,
          })
        }

        img.onerror = () => reject(new Error('Failed to load image'))

        // Load the image
        const reader = new FileReader()
        reader.onload = (e) => {
          img.src = e.target?.result as string
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })
    },
    []
  )

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file')
        return
      }

      try {
        // Compress image to avoid 413 errors
        const compressed = await compressImage(file)
        onImageSelect(compressed)
      } catch (error) {
        console.error('Failed to process image:', error)
        alert('Failed to process image. Please try again.')
      }
    },
    [onImageSelect, compressImage]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleClear = () => {
    onImageSelect({ base64: '', mimeType: '', preview: '' })
    setContext('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {!selectedImage ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`upload-zone relative rounded-2xl p-12 cursor-pointer transition-all duration-300 ${
              isDragging ? 'dragging border-accent bg-accent/5' : 'border-border hover:border-muted'
            }`}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <motion.div
                animate={{ y: isDragging ? -10 : 0 }}
                className="w-16 h-16 rounded-full bg-surface flex items-center justify-center"
              >
                <Upload className="w-8 h-8 text-muted" />
              </motion.div>
              <div>
                <p className="text-lg font-medium text-white">
                  Drop an image here or click to upload
                </p>
                <p className="text-sm text-muted mt-1">
                  Point at anything curious — a bug, a cloud, a crystal, a shadow
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            {/* Image Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-surface border border-border">
              <button
                onClick={handleClear}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-void/80 hover:bg-void transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <img
                src={selectedImage}
                alt="Selected"
                className="w-full h-64 object-contain bg-deep"
              />
            </div>

            {/* Context Input */}
            <div className="space-y-2">
              <label className="text-sm text-muted">
                Add context (optional) — What caught your attention?
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g., 'I noticed this pattern on the leaf' or 'Why does this crystal have these colors?'"
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none text-white placeholder-muted transition-all"
                rows={2}
              />
            </div>

            {/* Analyze Button */}
            <motion.button
              onClick={() => onAnalyze(context)}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 px-6 rounded-xl bg-accent hover:bg-accent-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 glow-accent flex items-center justify-center gap-3 font-medium text-white"
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                  Exploring the edge of knowledge...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Explore the Edge of Knowledge
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

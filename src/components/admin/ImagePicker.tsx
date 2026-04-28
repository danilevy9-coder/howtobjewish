'use client'

import { useState, useRef } from 'react'
import { Upload, Search, X, Image as ImageIcon, Loader2 } from 'lucide-react'

interface ImagePickerProps {
  value: string
  onChange: (url: string) => void
  onClose?: () => void
  inline?: boolean
}

interface UnsplashResult {
  id: string
  urls: { small: string; regular: string }
  alt_description: string | null
  user: { name: string }
}

export default function ImagePicker({ value, onChange, onClose, inline = false }: ImagePickerProps) {
  const [tab, setTab] = useState<'upload' | 'unsplash' | 'url'>('unsplash')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UnsplashResult[]>([])
  const [searching, setSearching] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState(value || '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function searchUnsplash() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/unsplash/search?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    }
    setSearching(false)
  }

  function selectUnsplashImage(photo: UnsplashResult) {
    setUploading(true)
    // Upload to Cloudinary via our API
    fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: photo.urls.regular }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          onChange(data.url)
        } else {
          // Fallback to Unsplash URL directly
          onChange(photo.urls.regular)
        }
      })
      .catch(() => {
        onChange(photo.urls.regular)
      })
      .finally(() => setUploading(false))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.url) {
        onChange(data.url)
      }
    } catch (err) {
      console.error('Upload failed:', err)
    }
    setUploading(false)
  }

  const content = (
    <div className={inline ? '' : 'bg-white rounded-lg border border-gray-200 shadow-xl w-full max-w-lg'}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-sm">Choose Featured Image</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['unsplash', 'upload', 'url'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              tab === t
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'unsplash' ? 'Unsplash' : t === 'upload' ? 'Upload' : 'URL'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Unsplash Search */}
        {tab === 'unsplash' && (
          <div>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUnsplash()}
                  placeholder="Search Unsplash photos..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <button
                onClick={searchUnsplash}
                disabled={searching || !query.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </button>
            </div>

            {uploading && (
              <div className="flex items-center justify-center gap-2 py-8 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading to Cloudinary...
              </div>
            )}

            {!uploading && results.length > 0 && (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {results.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => selectUnsplashImage(photo)}
                    className="relative aspect-square rounded overflow-hidden group"
                  >
                    <img
                      src={photo.urls.small}
                      alt={photo.alt_description || ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                      <span className="text-white text-[10px] p-1 opacity-0 group-hover:opacity-100 truncate w-full">
                        {photo.user.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!uploading && results.length === 0 && !searching && (
              <div className="text-center py-8 text-gray-400 text-sm">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Search for free photos on Unsplash
              </div>
            )}
          </div>
        )}

        {/* File Upload */}
        {tab === 'upload' && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center gap-3 py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )}
              <span className="text-sm text-gray-500">
                {uploading ? 'Uploading...' : 'Click to upload an image'}
              </span>
            </button>
          </div>
        )}

        {/* URL Input */}
        {tab === 'url' && (
          <div className="space-y-3">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Paste image URL..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <button
              onClick={() => { if (urlInput.trim()) onChange(urlInput.trim()) }}
              disabled={!urlInput.trim()}
              className="w-full py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Use This Image
            </button>
            {urlInput && (
              <img src={urlInput} alt="Preview" className="w-full rounded-md mt-2" onError={(e) => (e.currentTarget.style.display = 'none')} />
            )}
          </div>
        )}
      </div>

      {/* Current Image Preview */}
      {value && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Current image</span>
            <button
              onClick={() => onChange('')}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
          <img src={value} alt="Current" className="w-full rounded-md" />
        </div>
      )}
    </div>
  )

  return content
}

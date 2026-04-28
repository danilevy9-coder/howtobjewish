'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message?: string
    stats?: Record<string, number>
    error?: string
  } | null>(null)

  const supabase = createClient()

  async function handleImport() {
    if (!file) return
    setImporting(true)
    setResult(null)

    const { data: { session } } = await supabase.auth.getSession()

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      })

      const data = await res.json()
      if (data.success) {
        setResult({
          success: true,
          message: data.message,
          stats: data.stats,
        })
      } else {
        setResult({ success: false, error: data.error || 'Import failed' })
      }
    } catch (err) {
      setResult({ success: false, error: String(err) })
    }

    setImporting(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Upload className="w-6 h-6" />
        WordPress Import
      </h1>

      <div className="max-w-xl">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-6">
            Upload your WordPress XML export file (.wxr / .xml) to import all posts, pages,
            categories, and tags. Slugs and hierarchy will be preserved for SEO continuity.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WordPress XML File
            </label>
            <input
              type="file"
              accept=".xml,.wxr"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm border border-gray-300 rounded-md p-2 file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 file:cursor-pointer"
            />
          </div>

          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {importing ? 'Importing... (this may take a minute)' : 'Import WordPress Data'}
          </button>

          {/* Result */}
          {result && (
            <div
              className={`mt-4 p-4 rounded-md text-sm ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                    {result.success ? result.message : result.error}
                  </p>
                  {result.stats && (
                    <ul className="mt-2 space-y-1 text-green-600">
                      <li>Categories: {result.stats.categories}</li>
                      <li>Tags: {result.stats.tags}</li>
                      <li>Posts: {result.stats.posts}</li>
                      <li>Pages: {result.stats.pages}</li>
                      <li>Skipped: {result.stats.skipped}</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <strong>Note:</strong> This is a one-time import. Running it again will update existing
          entries (matched by slug) rather than creating duplicates.
        </div>
      </div>
    </div>
  )
}

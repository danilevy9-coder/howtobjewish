'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Wand2, Sparkles } from 'lucide-react'

interface Prompt {
  id: string
  name: string
  prompt_type: string
}

interface Category {
  id: string
  name: string
  slug: string
}

export default function GeneratePage() {
  const [topic, setTopic] = useState('')
  const [promptId, setPromptId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [autoInterlink, setAutoInterlink] = useState(true)
  const [mode, setMode] = useState<'article' | 'pillar'>('article')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('ai_prompts').select('id, name, prompt_type').order('name'),
      supabase.from('categories').select('id, name, slug').order('name'),
    ])
    setPrompts(p || [])
    setCategories(c || [])
  }

  async function handleGenerate() {
    if (!topic.trim()) return
    setGenerating(true)
    setResult(null)

    const endpoint = mode === 'pillar' ? '/api/ai/pillar' : '/api/ai/generate'

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          promptId: promptId || undefined,
          categoryId: categoryId || undefined,
          autoInterlink,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setResult({
          success: true,
          message: `Article "${data.post?.title}" created successfully as a draft.`,
        })
        setTopic('')
      } else {
        setResult({ success: false, error: data.error || 'Generation failed' })
      }
    } catch (err) {
      setResult({ success: false, error: String(err) })
    }

    setGenerating(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Wand2 className="w-6 h-6" />
        AI Content Generator
      </h1>

      <div className="max-w-2xl">
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('article')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'article' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Standard Article
          </button>
          <button
            onClick={() => setMode('pillar')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'pillar' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Pillar / Master Guide
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {mode === 'pillar' ? 'Master Guide Topic' : 'Article Topic'}
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={
                mode === 'pillar'
                  ? 'e.g., Complete Guide to Shabbat'
                  : 'e.g., Lighting Shabbat Candles'
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* AI Prompt Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AI Prompt</label>
            <select
              value={promptId}
              onChange={(e) => setPromptId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">Default ({mode === 'pillar' ? 'Pillar' : 'Article'} Prompt)</option>
              {prompts
                .filter((p) => (mode === 'pillar' ? p.prompt_type === 'pillar' : p.prompt_type !== 'pillar'))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {mode === 'pillar' && !categoryId && (
              <p className="text-xs text-orange-600 mt-1">
                Category is required for pillar articles (it pulls existing articles from this category).
              </p>
            )}
          </div>

          {/* Auto Interlink */}
          {mode === 'article' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoInterlink}
                onChange={(e) => setAutoInterlink(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">
                Auto-add internal links to existing articles
              </span>
            </label>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !topic.trim() || (mode === 'pillar' && !categoryId)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {generating ? 'Generating with Gemini...' : `Generate ${mode === 'pillar' ? 'Pillar' : 'Article'}`}
          </button>

          {/* Result */}
          {result && (
            <div
              className={`p-4 rounded-md text-sm ${
                result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {result.success ? result.message : result.error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

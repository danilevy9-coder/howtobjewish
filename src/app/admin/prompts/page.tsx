'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Save, Trash2, Sparkles } from 'lucide-react'

interface Prompt {
  id: string
  name: string
  description: string | null
  prompt_text: string
  prompt_type: string
  updated_at: string
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selected, setSelected] = useState<Prompt | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadPrompts()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPrompts() {
    const { data } = await supabase
      .from('ai_prompts')
      .select('*')
      .order('prompt_type')
      .order('name')

    setPrompts(data || [])
    setLoading(false)
  }

  function handleNew() {
    setSelected({
      id: '',
      name: '',
      description: '',
      prompt_text: '',
      prompt_type: 'article',
      updated_at: '',
    })
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)

    if (selected.id) {
      await supabase
        .from('ai_prompts')
        .update({
          name: selected.name,
          description: selected.description,
          prompt_text: selected.prompt_text,
          prompt_type: selected.prompt_type,
        })
        .eq('id', selected.id)
    } else {
      await supabase.from('ai_prompts').insert({
        name: selected.name,
        description: selected.description,
        prompt_text: selected.prompt_text,
        prompt_type: selected.prompt_type,
      })
    }

    await loadPrompts()
    setSelected(null)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this prompt?')) return
    await supabase.from('ai_prompts').delete().eq('id', id)
    setSelected(null)
    await loadPrompts()
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6" />
          AI Prompts
        </h1>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Prompt
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prompt List */}
        <div className="space-y-2">
          {prompts.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => setSelected(prompt)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selected?.id === prompt.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{prompt.name}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {prompt.prompt_type}
                </span>
              </div>
              {prompt.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{prompt.description}</p>
              )}
            </button>
          ))}
        </div>

        {/* Editor */}
        {selected && (
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={selected.name}
                  onChange={(e) => setSelected({ ...selected, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={selected.prompt_type}
                  onChange={(e) => setSelected({ ...selected, prompt_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                >
                  <option value="article">Article</option>
                  <option value="pillar">Pillar</option>
                  <option value="interlinking">Interlinking</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={selected.description || ''}
                onChange={(e) => setSelected({ ...selected, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompt Text
                <span className="text-xs text-gray-400 ml-2">
                  Use {'{{TOPIC}}'}, {'{{ARTICLES}}'}, {'{{ARTICLE_CONTENT}}'}, {'{{URL_LIST}}'} as placeholders
                </span>
              </label>
              <textarea
                value={selected.prompt_text}
                onChange={(e) => setSelected({ ...selected, prompt_text: e.target.value })}
                rows={16}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
              {selected.id && (
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-md text-sm hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

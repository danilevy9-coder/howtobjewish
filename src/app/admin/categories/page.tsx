'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FolderTree, Plus, Save, Trash2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  sort_order: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadCategories()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order')
      .order('name')
    setCategories(data || [])
    setLoading(false)
  }

  function handleNew() {
    setEditing({
      id: '',
      name: '',
      slug: '',
      description: '',
      parent_id: null,
      sort_order: 0,
    })
  }

  async function handleSave() {
    if (!editing) return

    const payload = {
      name: editing.name,
      slug: editing.slug,
      description: editing.description || null,
      parent_id: editing.parent_id || null,
      sort_order: editing.sort_order,
    }

    if (editing.id) {
      await supabase.from('categories').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('categories').insert(payload)
    }

    setEditing(null)
    await loadCategories()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Posts won\'t be deleted.')) return
    await supabase.from('categories').delete().eq('id', id)
    setEditing(null)
    await loadCategories()
  }

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
  }

  const rootCategories = categories.filter((c) => !c.parent_id)
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId)

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderTree className="w-6 h-6" />
          Categories
        </h1>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Tree */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold mb-3 text-sm text-gray-600">Category Hierarchy</h2>
          <div className="space-y-1">
            {rootCategories.map((cat) => (
              <div key={cat.id}>
                <button
                  onClick={() => setEditing(cat)}
                  className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${
                    editing?.id === cat.id ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  {cat.name}
                  <span className="text-gray-400 text-xs ml-2">/{cat.slug}/</span>
                </button>
                {getChildren(cat.id).map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setEditing(child)}
                    className={`w-full text-left pl-8 pr-3 py-2 rounded text-sm hover:bg-gray-100 ${
                      editing?.id === child.id ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                  >
                    {child.name}
                    <span className="text-gray-400 text-xs ml-2">/{child.slug}/</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        {editing && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold">{editing.id ? 'Edit' : 'New'} Category</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    name: e.target.value,
                    slug: editing.id ? editing.slug : autoSlug(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent</label>
              <select
                value={editing.parent_id || ''}
                onChange={(e) => setEditing({ ...editing, parent_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="">None (Root)</option>
                {rootCategories
                  .filter((c) => c.id !== editing.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              {editing.id && (
                <button
                  onClick={() => handleDelete(editing.id)}
                  className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-md text-sm hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

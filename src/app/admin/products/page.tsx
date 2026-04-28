'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, Plus, Save, Trash2 } from 'lucide-react'

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  image_url: string | null
  category: string | null
  in_stock: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [editing, setEditing] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadProducts()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  function handleNew() {
    setEditing({
      id: '',
      name: '',
      slug: '',
      description: '',
      price: 0,
      image_url: '',
      category: '',
      in_stock: true,
    })
  }

  async function handleSave() {
    if (!editing) return

    const payload = {
      name: editing.name,
      slug: editing.slug || editing.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: editing.description || null,
      price: editing.price,
      image_url: editing.image_url || null,
      category: editing.category || null,
      in_stock: editing.in_stock,
    }

    if (editing.id) {
      await supabase.from('products').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('products').insert(payload)
    }

    setEditing(null)
    await loadProducts()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    setEditing(null)
    await loadProducts()
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="w-6 h-6" />
          Products
        </h1>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product List */}
        <div className="bg-white rounded-lg border border-gray-200">
          {products.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No products yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setEditing(product)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    editing?.id === product.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{product.name}</span>
                    <span className="text-sm font-bold">${Number(product.price).toFixed(2)}</span>
                  </div>
                  {product.category && (
                    <span className="text-xs text-gray-400">{product.category}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Editor */}
        {editing && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold">{editing.id ? 'Edit' : 'New'} Product</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input
                type="number"
                step="0.01"
                value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={editing.category || ''}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="e.g., Sefarim, Torah Books"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input
                type="text"
                value={editing.image_url || ''}
                onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
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

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editing.in_stock}
                onChange={(e) => setEditing({ ...editing, in_stock: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">In Stock</span>
            </label>

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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shop - Jewish Books & Sefarim',
  description: 'Browse our collection of Jewish books, Sefarim, and Torah literature.',
}

export default async function ShopPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('in_stock', true)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1
        className="text-3xl md:text-4xl font-bold mb-4"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Shop
      </h1>
      <p className="text-gray-600 mb-10 max-w-2xl">
        Browse our curated collection of Jewish books, Sefarim, and Torah literature to deepen your learning.
      </p>

      {products && products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-square bg-gray-100">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                    <span className="text-5xl">&#x1F4D6;</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                {product.category && (
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                    {product.category}
                  </p>
                )}
                {product.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900">
                    ${Number(product.price).toFixed(2)}
                  </span>
                  <button
                    className="px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
                    disabled
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">Shop coming soon!</p>
          <p className="text-sm">
            We&apos;re preparing a curated collection of Jewish books and Sefarim.
          </p>
        </div>
      )}
    </div>
  )
}

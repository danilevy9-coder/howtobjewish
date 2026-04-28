import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      // Upload from URL (Unsplash)
      const { imageUrl } = await request.json()
      if (!imageUrl) {
        return NextResponse.json({ error: 'No imageUrl provided' }, { status: 400 })
      }

      const result = await cloudinary.uploader.upload(imageUrl, {
        folder: 'howtobjewish',
        transformation: [
          { width: 1200, height: 630, crop: 'fill', gravity: 'auto' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      })

      return NextResponse.json({ url: result.secure_url })
    } else {
      // Upload from file
      const formData = await request.formData()
      const file = formData.get('file') as File
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

      const result = await cloudinary.uploader.upload(base64, {
        folder: 'howtobjewish',
        transformation: [
          { width: 1200, height: 630, crop: 'fill', gravity: 'auto' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      })

      return NextResponse.json({ url: result.secure_url })
    }
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed', details: String(error) },
      { status: 500 }
    )
  }
}

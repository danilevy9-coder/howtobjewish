import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadFromUrl(
  imageUrl: string,
  folder: string = 'howtobjewish'
): Promise<string> {
  const result = await cloudinary.uploader.upload(imageUrl, {
    folder,
    transformation: [
      { width: 1200, height: 630, crop: 'fill', gravity: 'auto' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  })

  return result.secure_url
}

export { cloudinary }

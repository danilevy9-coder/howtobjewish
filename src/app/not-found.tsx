import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <h1
        className="text-6xl font-bold mb-4 text-gray-300"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        404
      </h1>
      <h2
        className="text-2xl font-bold mb-4"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Page Not Found
      </h2>
      <p className="text-gray-500 mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/"
          className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/where-to-begin-your-jewish-journey/"
          className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Start Here
        </Link>
      </div>
    </div>
  )
}

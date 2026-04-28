import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function generateContent(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (err: unknown) {
      const status = (err as { status?: number }).status
      if (status === 429 && attempt < 3) {
        const delay = attempt * 15000 // 15s, 30s
        console.warn(`[gemini] Rate limited, retrying in ${delay / 1000}s (attempt ${attempt}/3)`)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }

  throw new Error('Gemini: max retries exceeded')
}

export async function generateArticle(
  topic: string,
  systemPrompt: string
): Promise<{ title: string; content: string; excerpt: string; slug: string }> {
  const prompt = systemPrompt.replace('{{TOPIC}}', topic)
  const content = await generateContent(prompt)

  // Extract title from first H1 or H2, or generate one
  const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^##\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1].trim() : topic

  // Generate slug from title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)

  // Generate excerpt
  const plainText = content.replace(/[#*_\[\]()]/g, '').replace(/\n+/g, ' ')
  const excerpt = plainText.slice(0, 200).trim() + '...'

  return { title, content, excerpt, slug }
}

export async function addInternalLinks(
  articleContent: string,
  urlList: { title: string; slug: string }[],
  systemPrompt: string
): Promise<string> {
  const urlListStr = urlList
    .map((u) => `- ${u.title}: /${u.slug}/`)
    .join('\n')

  const prompt = systemPrompt
    .replace('{{ARTICLE_CONTENT}}', articleContent)
    .replace('{{URL_LIST}}', urlListStr)

  return await generateContent(prompt)
}

export async function generatePillarArticle(
  topic: string,
  articles: { title: string; slug: string; excerpt: string }[],
  systemPrompt: string
): Promise<string> {
  const articlesStr = articles
    .map((a) => `- "${a.title}" (/${a.slug}/): ${a.excerpt || 'No excerpt'}`)
    .join('\n')

  const prompt = systemPrompt
    .replace('{{TOPIC}}', topic)
    .replace('{{ARTICLES}}', articlesStr)

  return await generateContent(prompt)
}

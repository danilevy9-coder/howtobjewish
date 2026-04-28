/**
 * Jewish calendar integration using HebCal API.
 * Returns upcoming holidays so the auto-blog system can write timely content.
 */

export interface JewishHoliday {
  title: string
  date: string // ISO date
  hebrew: string
  category: 'major' | 'minor' | 'fast' | 'modern' | 'shabbat'
  daysUntil: number
}

/**
 * Fetch upcoming Jewish holidays from the HebCal API.
 * Returns holidays within the next `daysAhead` days.
 */
export async function getUpcomingHolidays(
  daysAhead: number = 45
): Promise<JewishHoliday[]> {
  const now = new Date()
  const end = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  const params = new URLSearchParams({
    v: '1',
    cfg: 'json',
    maj: 'on',
    min: 'on',
    mod: 'on',
    nx: 'on',
    start: now.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    ss: 'on', // special shabbatot
  })

  const res = await fetch(`https://www.hebcal.com/hebcal?${params}`)
  if (!res.ok) {
    console.error('HebCal API error:', res.status)
    return []
  }

  const data = await res.json()

  return (data.items || [])
    .filter(
      (item: { category: string }) =>
        item.category === 'holiday' || item.category === 'fast'
    )
    .map(
      (item: {
        title: string
        date: string
        hebrew?: string
        subcat?: string
      }) => {
        const holidayDate = new Date(item.date + 'T00:00:00')
        const daysUntil = Math.ceil(
          (holidayDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        let category: JewishHoliday['category'] = 'minor'
        const title = item.title.replace(/ \(observed\)/, '')

        // Classify holidays
        const majorHolidays = [
          'Rosh Hashana',
          'Yom Kippur',
          'Sukkot',
          'Shmini Atzeret',
          'Simchat Torah',
          'Pesach',
          'Shavuot',
        ]
        const fastDays = [
          "Tzom Gedaliah",
          "Ta'anit Esther",
          "Tzom Tammuz",
          "Tish'a B'Av",
          "Ta'anit Bechorot",
          "Asara B'Tevet",
        ]

        if (majorHolidays.some((h) => title.includes(h))) {
          category = 'major'
        } else if (
          title.includes('Chanukah') ||
          title.includes('Purim') ||
          title.includes("Tu B'Shvat") ||
          title.includes('Lag B')
        ) {
          category = 'minor'
        } else if (fastDays.some((h) => title.includes(h))) {
          category = 'fast'
        } else if (
          title.includes('Yom Ha') ||
          title.includes('Yom Yerushalayim')
        ) {
          category = 'modern'
        }

        return {
          title,
          date: item.date,
          hebrew: item.hebrew || '',
          category,
          daysUntil,
        }
      }
    )
    .sort(
      (a: JewishHoliday, b: JewishHoliday) => a.daysUntil - b.daysUntil
    )
}

/**
 * Get the next significant holiday for blog topic inspiration.
 * Prioritizes major holidays, then minor, then fasts.
 */
export async function getNextSignificantHoliday(): Promise<JewishHoliday | null> {
  const holidays = await getUpcomingHolidays(45)

  // Priority: major > minor > fast > modern
  const priority = ['major', 'minor', 'fast', 'modern']

  for (const cat of priority) {
    const match = holidays.find((h) => h.category === cat)
    if (match) return match
  }

  return holidays[0] || null
}

// ═══════════════════════ Shabbat Times ═══════════════════════

interface ShabbatWindow {
  start: Date // Friday candle-lighting
  end: Date // Saturday Havdalah
}

/**
 * Check if the current time falls within Shabbat.
 * Uses HebCal Shabbat API for accurate times based on location.
 * Falls back to a conservative estimate if API fails.
 */
export async function isShabbat(timezone: string = 'Asia/Jerusalem'): Promise<boolean> {
  const window = await getShabbatWindow(timezone)
  if (!window) return isShabbatFallback(timezone)

  const now = new Date()
  return now >= window.start && now <= window.end
}

/**
 * Get the current or upcoming Shabbat start/end times from HebCal.
 */
async function getShabbatWindow(
  timezone: string
): Promise<ShabbatWindow | null> {
  try {
    // Map timezone to approximate geo coordinates for HebCal
    const geoMap: Record<string, { geonameid: string }> = {
      'Asia/Jerusalem': { geonameid: '281184' }, // Jerusalem
      'America/New_York': { geonameid: '5128581' }, // New York
      'America/Chicago': { geonameid: '4887398' }, // Chicago
      'America/Los_Angeles': { geonameid: '5368361' }, // Los Angeles
      'Europe/London': { geonameid: '2643743' }, // London
      'UTC': { geonameid: '281184' }, // Default to Jerusalem
    }

    const geo = geoMap[timezone] || geoMap['Asia/Jerusalem']

    const params = new URLSearchParams({
      cfg: 'json',
      geonameid: geo.geonameid,
      M: 'on', // Havdalah minutes after sunset (default 50 for Rabbeinu Tam is too long, this uses standard)
    })

    const res = await fetch(
      `https://www.hebcal.com/shabbat?${params}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )

    if (!res.ok) return null

    const data = await res.json()
    const items = data.items || []

    const candles = items.find(
      (i: { category: string }) => i.category === 'candles'
    )
    const havdalah = items.find(
      (i: { category: string }) => i.category === 'havdalah'
    )

    if (!candles?.date || !havdalah?.date) return null

    return {
      start: new Date(candles.date),
      end: new Date(havdalah.date),
    }
  } catch {
    return null
  }
}

/**
 * Conservative fallback: Friday 14:00 → Saturday 22:00 local time.
 * Used if HebCal API is unavailable.
 */
function isShabbatFallback(timezone: string): boolean {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  const weekday = parts.find((p) => p.type === 'weekday')?.value
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10)

  // Friday after 14:00 (well before earliest candle-lighting)
  if (weekday === 'Fri' && hour >= 14) return true

  // All of Saturday until 22:00 (well after latest Havdalah)
  if (weekday === 'Sat' && hour < 22) return true

  return false
}

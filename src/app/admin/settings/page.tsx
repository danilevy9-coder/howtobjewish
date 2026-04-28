'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, Save, Sparkles, Loader2, CheckCircle, AlertCircle, Calendar } from 'lucide-react'

export default function SettingsPage() {
  // ═══════ Drip Publishing State ═══════
  const [postsPerDay, setPostsPerDay] = useState(1)
  const [publishTime, setPublishTime] = useState('09:00')
  const [timezone, setTimezone] = useState('Asia/Jerusalem')
  const [isActive, setIsActive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settingsId, setSettingsId] = useState<string | null>(null)

  // ═══════ Auto Blog State ═══════
  const [autoBlogActive, setAutoBlogActive] = useState(true)
  const [minHours, setMinHours] = useState(20)
  const [maxHours, setMaxHours] = useState(28)
  const [autoPublish, setAutoPublish] = useState(true)
  const [lastGenerated, setLastGenerated] = useState<string | null>(null)
  const [nextGenerate, setNextGenerate] = useState<string | null>(null)
  const [lastTopicType, setLastTopicType] = useState<string | null>(null)
  const [savingAuto, setSavingAuto] = useState(false)
  const [savedAuto, setSavedAuto] = useState(false)

  // ═══════ Generate Now State ═══════
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadDripSettings()
    loadAutoBlogSettings()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════ Drip Settings ═══════

  async function loadDripSettings() {
    const { data } = await supabase
      .from('drip_settings')
      .select('*')
      .limit(1)
      .single()

    if (data) {
      setSettingsId(data.id)
      setPostsPerDay(data.posts_per_day)
      setPublishTime(data.publish_time)
      setTimezone(data.timezone)
      setIsActive(data.is_active)
    }
  }

  async function handleSaveDrip() {
    setSaving(true)
    setSaved(false)

    const payload = {
      posts_per_day: postsPerDay,
      publish_time: publishTime,
      timezone,
      is_active: isActive,
    }

    if (settingsId) {
      await supabase.from('drip_settings').update(payload).eq('id', settingsId)
    } else {
      await supabase.from('drip_settings').insert(payload)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // ═══════ Auto Blog Settings ═══════

  async function loadAutoBlogSettings() {
    try {
      const res = await fetch('/api/auto-blog/settings')
      if (res.ok) {
        const data = await res.json()
        setAutoBlogActive(data.is_active)
        setMinHours(data.min_hours_between)
        setMaxHours(data.max_hours_between)
        setAutoPublish(data.auto_publish)
        setLastGenerated(data.last_generated_at)
        setNextGenerate(data.next_generate_after)
        setLastTopicType(data.last_topic_type)
      }
    } catch {
      // Settings may not exist yet
    }
  }

  async function handleSaveAutoBlog() {
    setSavingAuto(true)
    setSavedAuto(false)

    await fetch('/api/auto-blog/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_active: autoBlogActive,
        min_hours_between: minHours,
        max_hours_between: maxHours,
        auto_publish: autoPublish,
      }),
    })

    setSavingAuto(false)
    setSavedAuto(true)
    setTimeout(() => setSavedAuto(false), 3000)
  }

  // ═══════ Generate Now ═══════

  async function handleGenerateNow() {
    setGenerating(true)
    setGenerateResult(null)

    try {
      const res = await fetch('/api/auto-blog/generate', { method: 'POST' })
      const data = await res.json()

      if (res.ok && data.success) {
        setGenerateResult({
          type: 'success',
          message: `Created: "${data.post.title}" — /${data.post.slug}/`,
        })
        loadAutoBlogSettings() // Refresh timestamps
      } else {
        setGenerateResult({
          type: 'error',
          message: data.error || 'Generation failed',
        })
      }
    } catch (err) {
      setGenerateResult({
        type: 'error',
        message: String(err),
      })
    }

    setGenerating(false)
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  // ═══════ Toggle Component ═══════

  function Toggle({
    value,
    onChange,
  }: {
    value: boolean
    onChange: (v: boolean) => void
  }) {
    return (
      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          value ? 'bg-green-500' : 'bg-gray-300'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </button>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Settings className="w-6 h-6" />
        Settings
      </h1>

      <div className="max-w-xl space-y-8">
        {/* ═══════════════════════════════════════════════
            AUTO BLOG GENERATION
            ═══════════════════════════════════════════════ */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Auto Blog Generation
          </h2>

          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Auto Generation
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automatically create new blog posts on a schedule
                </p>
              </div>
              <Toggle value={autoBlogActive} onChange={setAutoBlogActive} />
            </div>

            {/* Interval */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Hours Between
                </label>
                <select
                  value={minHours}
                  onChange={(e) => setMinHours(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                >
                  {[6, 8, 12, 16, 18, 20, 24, 36, 48].map((n) => (
                    <option key={n} value={n}>
                      {n} hours
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Hours Between
                </label>
                <select
                  value={maxHours}
                  onChange={(e) => setMaxHours(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                >
                  {[12, 18, 24, 28, 36, 48, 72].map((n) => (
                    <option key={n} value={n}>
                      {n} hours
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Auto Publish */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Auto Publish
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Publish immediately or save as draft for review
                </p>
              </div>
              <Toggle value={autoPublish} onChange={setAutoPublish} />
            </div>

            {/* Status Info */}
            <div className="bg-gray-50 rounded-md p-3 text-xs text-gray-600 space-y-1.5">
              <div className="flex justify-between">
                <span>Last generated:</span>
                <span className="font-medium">{formatDate(lastGenerated)}</span>
              </div>
              <div className="flex justify-between">
                <span>Next scheduled:</span>
                <span className="font-medium">{formatDate(nextGenerate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Last topic type:</span>
                <span className="font-medium capitalize">
                  {lastTopicType || '—'}
                  {lastTopicType && (
                    <span className="text-gray-400 ml-1">
                      → next: {lastTopicType === 'festival' ? 'general' : 'festival'}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Shabbat Note */}
            <div className="flex items-start gap-2 bg-amber-50 rounded-md p-3 text-xs text-amber-800">
              <Calendar className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Posts are <strong>never generated or published on Shabbat</strong> (Friday
                candle-lighting through Saturday Havdalah). Times are calculated automatically
                for Jerusalem.
              </span>
            </div>

            {/* Save */}
            <button
              onClick={handleSaveAutoBlog}
              disabled={savingAuto}
              className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {savingAuto ? 'Saving...' : savedAuto ? 'Saved!' : 'Save Auto Blog Settings'}
            </button>
          </div>

          {/* Generate Now */}
          <div className="mt-4 bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Generate Now</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manually trigger a new AI blog post right now
                </p>
              </div>
              <button
                onClick={handleGenerateNow}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Post
                  </>
                )}
              </button>
            </div>

            {generateResult && (
              <div
                className={`flex items-start gap-2 p-3 rounded-md text-sm ${
                  generateResult.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {generateResult.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <span>{generateResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            DRIP PUBLISHING
            ═══════════════════════════════════════════════ */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Drip Publishing
          </h2>

          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Drip Publishing
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automatically publish queued posts on schedule
                </p>
              </div>
              <Toggle value={isActive} onChange={setIsActive} />
            </div>

            {/* Posts Per Day */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Posts Per Day
              </label>
              <select
                value={postsPerDay}
                onChange={(e) => setPostsPerDay(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                {[1, 2, 3, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} post{n > 1 ? 's' : ''} per day
                  </option>
                ))}
              </select>
            </div>

            {/* Publish Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publish Time
              </label>
              <input
                type="time"
                value={publishTime}
                onChange={(e) => setPublishTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="Asia/Jerusalem">Israel (IDT) - Asia/Jerusalem</option>
                <option value="America/New_York">Eastern - America/New_York</option>
                <option value="America/Chicago">Central - America/Chicago</option>
                <option value="America/Los_Angeles">Pacific - America/Los_Angeles</option>
                <option value="Europe/London">London - Europe/London</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            {/* Save */}
            <button
              onClick={handleSaveDrip}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Drip Settings'}
            </button>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600">
            <strong>How it works:</strong> A Vercel Cron job runs daily at 06:00 UTC. It checks
            these settings and publishes the configured number of queued posts. Posts are published
            in order of their scheduled date, then creation date.
          </div>
        </div>
      </div>
    </div>
  )
}

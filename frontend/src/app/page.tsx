'use client'

import { useEffect, useState } from 'react'
import { mockFoodEntries, mockHealthOutcomes, calculateCorrelations } from '@/lib/mockData'
import type { MockFoodEntry, MockHealthOutcome, MockCorrelation } from '@/lib/mockData'

type TimelineEntry = (MockFoodEntry & { _type: 'food' }) | (MockHealthOutcome & { _type: 'outcome' })

// ─── Stats Cards ────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
  }
  return (
    <div className={`rounded-xl p-4 ${colorMap[color] || colorMap.blue}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  )
}

// ─── Timeline ────────────────────────────────────────────────
function Timeline() {
  const [entries, setEntries] = useState<TimelineEntry[]>([])

  useEffect(() => {
    const merged: TimelineEntry[] = [
      ...mockFoodEntries.map(e => ({ ...e, _type: 'food' as const })),
      ...mockHealthOutcomes.map(e => ({ ...e, _type: 'outcome' as const })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setEntries(merged)
  }, [])

  const isFood = (e: TimelineEntry): e is MockFoodEntry & { _type: 'food' } => e._type === 'food'
  const isOutcome = (e: TimelineEntry): e is MockHealthOutcome & { _type: 'outcome' } => e._type === 'outcome'

  const severityLabel = (s: number) => ['None', 'Mild', 'Moderate', 'Significant', 'Severe'][s] || 'Unknown'
  const bmType = (t: string) => t === 'bm' ? '🚽 Bowel' : t === 'energy' ? '⚡ Energy' : t === 'symptom' ? '🤢 Symptom' : '😊 Mood'

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => {
        const time = new Date(entry.timestamp).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })

        if (isFood(entry)) {
          return (
            <div key={i} className="flex gap-3 bg-white rounded-lg p-3 shadow-sm border-l-4 border-green-400">
              <div className="flex-shrink-0 text-2xl">🍽️</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{entry.description}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {entry.ingredients.map((ing, j) => (
                    <span key={j} className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">{ing}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">{time} · ~{entry.estimatedCalories} cal · {(entry.confidence * 100).toFixed(0)}% confidence</p>
              </div>
            </div>
          )
        }

        if (isOutcome(entry)) {
          const sevColors: Record<number, string> = { 1: 'border-green-400', 2: 'border-lime-400', 3: 'border-amber-400', 4: 'border-orange-400', 5: 'border-red-400' }
          return (
            <div key={i} className={`flex gap-3 bg-white rounded-lg p-3 shadow-sm border-l-4 ${sevColors[entry.severity] || 'border-gray-400'}`}>
              <div className="flex-shrink-0 text-2xl">{entry.type === 'bm' ? '🚽' : entry.type === 'energy' ? '⚡' : entry.type === 'symptom' ? '🤢' : '😊'}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{bmType(entry.type)} — {severityLabel(entry.severity)}</p>
                {entry.notes && <p className="text-sm text-gray-600 mt-0.5">{entry.notes}</p>}
                {entry.details?.bristolScale && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full mt-1 inline-block">
                    Bristol {entry.details.bristolScale}
                  </span>
                )}
                <p className="text-xs text-gray-400 mt-1">{time}</p>
              </div>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

// ─── Trigger Analysis ───────────────────────────────────────
function TriggerAnalysis() {
  const [correlations, setCorrelations] = useState<MockCorrelation[]>([])

  useEffect(() => {
    setCorrelations(calculateCorrelations())
  }, [])

  const severityBar = (avg: number) => {
    const pct = (avg / 5) * 100
    const color = avg >= 4 ? 'bg-red-500' : avg >= 3 ? 'bg-amber-500' : 'bg-green-500'
    return (
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    )
  }

  const bmCorrelations = correlations.filter(c => c.outcomeType === 'bm').sort((a, b) => b.avgSeverity - a.avgSeverity)
  const symptomCorrelations = correlations.filter(c => c.outcomeType === 'symptom').sort((a, b) => b.avgSeverity - a.avgSeverity)

  return (
    <div className="space-y-6">
      {/* BM Triggers */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-lg mb-3">🚽 Bowel Movement Triggers</h3>
        {bmCorrelations.length === 0 ? (
          <p className="text-gray-400 text-sm">Not enough data yet. Log more meals and outcomes.</p>
        ) : (
          <div className="space-y-3">
            {bmCorrelations.map(c => (
              <div key={c.ingredient} className="flex items-center gap-3">
                <span className="w-28 capitalize font-medium text-sm">{c.ingredient}</span>
                <div className="flex-1">{severityBar(c.avgSeverity)}</div>
                <span className="text-xs text-gray-500 w-20 text-right">{c.avgSeverity.toFixed(1)} avg ({c.count}x)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Symptom Triggers */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-lg mb-3">🤢 Symptom Triggers</h3>
        {symptomCorrelations.length === 0 ? (
          <p className="text-gray-400 text-sm">No symptom correlations found.</p>
        ) : (
          <div className="space-y-3">
            {symptomCorrelations.map(c => (
              <div key={c.ingredient} className="flex items-center gap-3">
                <span className="w-28 capitalize font-medium text-sm">{c.ingredient}</span>
                <div className="flex-1">{severityBar(c.avgSeverity)}</div>
                <span className="text-xs text-gray-500 w-20 text-right">{c.avgSeverity.toFixed(1)} avg ({c.count}x)</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Food Gallery ────────────────────────────────────────────
function FoodGallery() {
  const emoji = ['🥗', '🍝', '🥤', '🥪', '🐟', '🍦']
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {mockFoodEntries.map((entry, i) => (
        <div key={entry.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="h-32 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center text-5xl">
            {emoji[i % emoji.length]}
          </div>
          <div className="p-3">
            <p className="text-sm font-medium text-gray-900 truncate">{entry.description}</p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' · '}{entry.estimatedCalories} cal
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.ingredients.slice(0, 3).map((ing, j) => (
                <span key={j} className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5 rounded-full">{ing}</span>
              ))}
              {entry.ingredients.length > 3 && (
                <span className="text-[10px] text-gray-400">+{entry.ingredients.length - 3} more</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────
export default function Dashboard() {
  const [tab, setTab] = useState<'timeline' | 'analysis' | 'gallery' | 'roadmap'>('timeline')
  const [correlations, setCorrelations] = useState<MockCorrelation[]>([])

  useEffect(() => {
    setCorrelations(calculateCorrelations())
  }, [])

  const totalMeals = mockFoodEntries.length
  const totalOutcomes = mockHealthOutcomes.length
  const linkedMeals = mockHealthOutcomes.filter(o => o.entryId).length
  const highTriggers = correlations.filter(c => c.avgSeverity >= 3.5).length

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-4 md:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🫧 Gut Health Tracker</h1>
            <p className="text-sm text-gray-500">V0 — Mock Data Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full">V0 Mock Mode</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Meals Logged" value={totalMeals} color="green" />
          <StatCard label="Health Outcomes" value={totalOutcomes} color="blue" />
          <StatCard label="Linked Events" value={linkedMeals} color="amber" />
          <StatCard label="High Triggers" value={highTriggers} color="red" />
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1 bg-white rounded-lg shadow-sm p-1 mb-6">
          {(['timeline', 'analysis', 'gallery', 'roadmap'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${
                tab === t
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t === 'timeline' ? '📅 Timeline' : t === 'analysis' ? '🔍 Analysis' : t === 'gallery' ? '📷 Gallery' : '🗺️ Roadmap'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'timeline' && <Timeline />}
        {tab === 'analysis' && <TriggerAnalysis />}
        {tab === 'gallery' && <FoodGallery />}
        {tab === 'roadmap' && <Roadmap />}

        {/* Bristol Scale Reference */}
        {tab !== 'roadmap' && (
          <div className="mt-6 bg-white rounded-xl p-4 shadow-sm">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Bristol Scale Reference</h4>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {[
                { n: 1, label: 'Hard lumps', color: 'bg-red-400' },
                { n: 2, label: 'Lumpy', color: 'bg-orange-400' },
                { n: 3, label: 'Cracked', color: 'bg-yellow-400' },
                { n: 4, label: 'Smooth ✓', color: 'bg-green-500' },
                { n: 5, label: 'Soft blobs', color: 'bg-yellow-400' },
                { n: 6, label: 'Fluffy', color: 'bg-orange-400' },
                { n: 7, label: 'Watery', color: 'bg-red-400' },
              ].map(b => (
                <div key={b.n} className="rounded-lg overflow-hidden">
                  <div className={`${b.color} text-white py-1 font-bold`}>{b.n}</div>
                  <div className="bg-gray-50 py-1 text-gray-600">{b.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

// ─── Roadmap ─────────────────────────────────────────────────
function Roadmap() {
  const phases = [
    {
      version: 'V0',
      title: 'Mock Dashboard',
      status: '✅ Current',
      color: 'bg-green-100 border-green-300',
      items: [
        'Next.js 14 app with mock data',
        'Timeline of meals + health outcomes',
        'Ingredient trigger analysis (BM, symptoms)',
        'Photo gallery with placeholder images',
        'Bristol scale reference',
        'No backend needed — all client-side',
      ]
    },
    {
      version: 'V1',
      title: 'Manual Entry + Real DB',
      status: '🔲 Next',
      color: 'bg-blue-100 border-blue-300',
      items: [
        'Real SQLite → Postgres database',
        'Authentication (NextAuth / OAuth)',
        'Manual ingredient entry with autocomplete',
        'AI-assisted food descriptions (text → meal parsing)',
        'Photo upload to local/S3 storage',
        'Health outcome logging (BM, energy, mood, symptoms)',
        '24h correlation window analysis',
        'User accounts and data isolation',
      ]
    },
    {
      version: 'V2',
      title: 'AI Ingredient Prediction',
      status: '🔲 Future',
      color: 'bg-purple-100 border-purple-300',
      items: [
        'Open-source food recognition model (hosted locally)',
        'Candidate models: Food101, Nutrition5k, FoodLogAthl-218',
        'Auto-extract ingredients from food photos',
        'Human-in-the-loop confirmation (confirm/correct)',
        'Nutrition estimation from USDA FoodData Central API',
        'Batch processing for existing photo folders',
        'Confidence scoring and manual override',
      ]
    },
    {
      version: 'V3',
      title: 'Personalized Learning',
      status: '🔲 Future',
      color: 'bg-amber-100 border-amber-300',
      items: [
        'Fine-tune model on personal food + outcome data',
        'Personalized trigger detection (your gut, your rules)',
        'Predictive alerts ("ate garlic 4h ago — watch for symptoms")',
        'Long-term trend analysis and visualization',
        'Export data for healthcare provider',
        'Multi-user support with per-person models',
        'Mobile-optimized PWA',
      ]
    }
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h2 className="text-xl font-bold mb-1">🗺️ Product Roadmap</h2>
        <p className="text-sm text-gray-500 mb-4">From mock dashboard to personalized gut health intelligence</p>
        
        <div className="space-y-4">
          {phases.map(p => (
            <div key={p.version} className={`rounded-xl border-2 p-4 ${p.color}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold">{p.version}</span>
                <span className="font-semibold">{p.title}</span>
                <span className="text-sm ml-auto opacity-70">{p.status}</span>
              </div>
              <ul className="space-y-1 text-sm">
                {p.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 text-xs">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Open Models for V2 */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-lg mb-3">🤖 Open Models for V2 (Self-Hosted)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Model</th>
                <th className="pb-2">Task</th>
                <th className="pb-2">Size</th>
                <th className="pb-2">Host</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="py-2 font-medium">Food-101</td>
                <td className="py-2">101 dish classification</td>
                <td className="py-2">~30MB</td>
                <td className="py-2">Ollama / local</td>
              </tr>
              <tr>
                <td className="py-2 font-medium">FoodLogAthl-218</td>
                <td className="py-2">218 real-world meal categories</td>
                <td className="py-2">~50MB</td>
                <td className="py-2">HuggingFace</td>
              </tr>
              <tr>
                <td className="py-2 font-medium">openfoodfacts/ingredient-detection</td>
                <td className="py-2">OCR ingredient extraction</td>
                <td className="py-2">~600MB</td>
                <td className="py-2">HuggingFace</td>
              </tr>
              <tr>
                <td className="py-2 font-medium">Nutrition5k (transfer)</td>
                <td className="py-2">Portion + calorie estimation</td>
                <td className="py-2">Varies</td>
                <td className="py-2">TensorFlow Hub</td>
              </tr>
              <tr>
                <td className="py-2 font-medium">LLaVA / LlavaFood</td>
                <td className="py-2">Vision-language food description</td>
                <td className="py-2">~7GB</td>
                <td className="py-2">Ollama</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">All models run locally — no paid vendor APIs required.</p>
      </div>
    </div>
  )
}
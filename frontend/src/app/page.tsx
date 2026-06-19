'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { IS_MOCK, getTimeline, getCorrelations, getFoodEntries, getHealthOutcomes, createFoodEntry, createHealthOutcome, getPredictions, getTrends, exportData, runAnalysis } from '@/lib/api'
import type { MockFoodEntry, MockHealthOutcome, MockCorrelation } from '@/lib/mockData'
import FoodForm from '@/components/FoodForm'
import HealthOutcomeForm from '@/components/HealthOutcomeForm'
import Stats from '@/components/Stats'
import Timeline from '@/components/Timeline'
import BMForm from '@/components/BMForm'

type TimelineEntry = (MockFoodEntry & { _type: 'food' }) | (MockHealthOutcome & { _type: 'outcome' })

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

function TimelineView() {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getTimeline()
        setEntries(data as TimelineEntry[])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const isFood = (e: TimelineEntry): e is MockFoodEntry & { _type: 'food' } => e._type === 'food'
  const isOutcome = (e: TimelineEntry): e is MockHealthOutcome & { _type: 'outcome' } => e._type === 'outcome'

  const severityLabel = (s: number) => ['None', 'Mild', 'Moderate', 'Significant', 'Severe'][s] || 'Unknown'
  const bmType = (t: string) => t === 'bm' ? '🚽 Bowel' : t === 'energy' ? '⚡ Energy' : t === 'symptom' ? '🤢 Symptom' : '😊 Mood'

  if (loading) return <div className="p-4">Loading timeline...</div>

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

function TriggerAnalysis() {
  const [correlations, setCorrelations] = useState<MockCorrelation[]>([])
  const [running, setRunning] = useState(false)

  useEffect(() => {
    async function fetchCorrelations() {
      try {
        const data = await getCorrelations()
        if (data.ingredient_correlations) {
          const mockCorrs: MockCorrelation[] = data.ingredient_correlations.map((c: any) => ({
            ingredient: c.ingredient,
            outcomeType: 'bm' as const,
            avgSeverity: c.avg_bristol,
            count: c.event_count,
            severityDistribution: c.bristol_distribution
          }))
          setCorrelations(mockCorrs)
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchCorrelations()
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

  const confidenceBadge = (c: MockCorrelation) => {
    if (c.count >= 5) return <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">High</span>
    if (c.count >= 3) return <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Trending</span>
    return null
  }

  const bmCorrelations = correlations.filter(c => c.outcomeType === 'bm').sort((a, b) => b.avgSeverity - a.avgSeverity)
  const symptomCorrelations = correlations.filter(c => c.outcomeType === 'symptom').sort((a, b) => b.avgSeverity - a.avgSeverity)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">🚽 Bowel Movement Triggers</h3>
        </div>
        {bmCorrelations.length === 0 ? (
          <p className="text-gray-400 text-sm">Not enough data yet. Log more meals and outcomes.</p>
        ) : (
          <div className="space-y-3">
            {bmCorrelations.map(c => (
              <div key={c.ingredient} className="flex items-center gap-3">
                <span className="w-28 capitalize font-medium text-sm">{c.ingredient}</span>
                <div className="flex-1">{severityBar(c.avgSeverity)}</div>
                {confidenceBadge(c)}
                <span className="text-xs text-gray-500 w-20 text-right">{c.avgSeverity.toFixed(1)} avg ({c.count}x)</span>
              </div>
            ))}
          </div>
        )}
      </div>

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
                {confidenceBadge(c)}
                <span className="text-xs text-gray-500 w-20 text-right">{c.avgSeverity.toFixed(1)} avg ({c.count}x)</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PredictionsView() {
  const { user } = useAuth()
  const [warnings, setWarnings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchPredictions()
    }
  }, [user?.id])

  async function fetchPredictions() {
    if (!user?.id) return
    try {
      const data = await getPredictions(user!.id)
      setWarnings(data.warnings || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRunAnalysis() {
    if (!user?.id) return
    setRunning(true)
    try {
      await runAnalysis(user!.id)
      await fetchPredictions()
    } catch (err) {
      console.error(err)
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <div className="p-4">Loading predictions...</div>

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">⚠️ Personalized Trigger Warnings</h3>
            <p className="text-sm text-gray-500 mt-1">Based on your own food-outcome patterns</p>
          </div>
          <button
            onClick={handleRunAnalysis}
            disabled={running}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {running ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>

        {warnings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-3">No trigger warnings yet.</p>
            <p className="text-sm text-gray-400">Run the analysis to find your personalized food triggers.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-3 bg-amber-50 rounded-lg p-3 border border-amber-200">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <p className="font-medium text-amber-900">{w.ingredient}</p>
                  <p className="text-sm text-amber-700">{w.message}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  w.confidence === 'high' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {w.confidence}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-lg mb-3">🎯 Prediction Confidence Levels</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs">High</span>
            <span className="text-gray-600">p &lt; 0.01 — Statistically significant</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs">Moderate</span>
            <span className="text-gray-600">p &lt; 0.05 — Likely related</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">Trending</span>
            <span className="text-gray-600">Pattern detected, more data needed</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function TrendsView() {
  const { user } = useAuth()
  const [trends, setTrends] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      fetchTrends()
    }
  }, [user?.id])

  async function fetchTrends() {
    if (!user?.id) return
    try {
      const data = await getTrends(user!.id, 30)
      setTrends(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-4">Loading trends...</div>

  const weeklyData = trends?.weeklyTrends || []

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-lg mb-4">📊 Weekly Average Severity</h3>
        {weeklyData.length === 0 ? (
          <p className="text-gray-400 text-sm">Not enough data for trends yet.</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {weeklyData.map((w: any, i: number) => {
              const maxSeverity = Math.max(...weeklyData.filter((x: any) => x.avgSeverity).map((x: any) => x.avgSeverity))
              const height = w.avgSeverity ? (w.avgSeverity / 5) * 100 : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-blue-100 rounded-t" style={{ height: `${height}%` }} />
                  <span className="text-xs text-gray-400">{w.week?.slice(5)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-lg mb-3">🍽️ Top Ingredients (30 days)</h3>
        {trends?.topIngredients?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {trends.topIngredients.map((ing: any, i: number) => (
              <span key={i} className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                {ing.name} ({ing.count}x)
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No ingredient data yet.</p>
        )}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-lg mb-3">📈 Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-900">{trends?.summary?.totalFoodEntries || 0}</p>
            <p className="text-xs text-gray-500">Food Entries</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-900">{trends?.summary?.totalHealthOutcomes || 0}</p>
            <p className="text-xs text-gray-500">Health Outcomes</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-900">{trends?.summary?.avgDailyBmSeverity || '—'}</p>
            <p className="text-xs text-gray-500">Avg Severity</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FoodGallery() {
  const [entries, setEntries] = useState<MockFoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const emoji = ['🥗', '🍝', '🥤', '🥪', '🐟', '🍦']

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getFoodEntries()
        setEntries(data as MockFoodEntry[])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div className="p-4">Loading gallery...</div>

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {entries.map((entry, i) => (
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

function LogView() {
  const [tab, setTab] = useState<'food' | 'bm' | 'outcome'>('food')

  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-white rounded-lg shadow-sm p-1">
        {(['food', 'bm', 'outcome'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${
              tab === t
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t === 'food' ? '🍽️ Food' : t === 'bm' ? '🚽 Bowel' : '💊 Outcome'}
          </button>
        ))}
      </div>

      {tab === 'food' && (
        <div className="max-w-xl mx-auto">
          <FoodForm onSuccess={() => {}} />
        </div>
      )}
      {tab === 'bm' && (
        <div className="max-w-xl mx-auto">
          <BMForm onSuccess={() => {}} />
        </div>
      )}
      {tab === 'outcome' && (
        <div className="max-w-xl mx-auto">
          <HealthOutcomeForm onSuccess={() => {}} />
        </div>
      )}
    </div>
  )
}

function Roadmap() {
  const phases = [
    {
      version: 'V0',
      title: 'Mock Dashboard',
      status: '✅ Done',
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
      status: '✅ Current',
      color: 'bg-blue-100 border-blue-300',
      items: [
        'Real SQLite → Postgres database',
        'Authentication (JWT + CGI backend)',
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

function SignInPrompt() {
  return (
    <div className="bg-white rounded-xl p-8 shadow-sm text-center">
      <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
      <p className="text-gray-500 mb-4">Please sign in to access your gut health data.</p>
      <a href="/auth/signin" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
        Sign In
      </a>
    </div>
  )
}

function DashboardContent() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<'timeline' | 'analysis' | 'predictions' | 'trends' | 'gallery' | 'log' | 'roadmap'>('timeline')
  const [stats, setStats] = useState({ meals: 0, outcomes: 0, linked: 0, triggers: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [food, outcomes, correlations] = await Promise.all([
          getFoodEntries(),
          getHealthOutcomes(),
          getCorrelations()
        ])
        setStats({
          meals: Array.isArray(food) ? food.length : 0,
          outcomes: Array.isArray(outcomes) ? outcomes.length : 0,
          linked: Array.isArray(outcomes) ? outcomes.filter((o: any) => o.entryId).length : 0,
          triggers: correlations.ingredient_correlations?.filter((c: any) => c.avg_bristol >= 3.5).length || 0
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const handleExport = async () => {
    if (!user?.id) return
    try {
      const blob = await exportData(user!.id, 'csv')
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gut-health-export-${user!.id}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-white rounded-lg shadow-sm p-1">
          {(['timeline', 'analysis', 'predictions', 'trends', 'gallery', 'log', 'roadmap'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === t
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t === 'timeline' ? '📅' : t === 'analysis' ? '🔍' : t === 'predictions' ? '⚠️' : t === 'trends' ? '📊' : t === 'gallery' ? '📷' : t === 'log' ? '✏️' : '🗺️'}
            </button>
          ))}
        </div>
        {user && (
          <button
            onClick={handleExport}
            className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            📥 Export
          </button>
        )}
      </div>

      {tab === 'timeline' && <TimelineView />}
      {tab === 'analysis' && <TriggerAnalysis />}
      {tab === 'predictions' && <PredictionsView />}
      {tab === 'trends' && <TrendsView />}
      {tab === 'gallery' && <FoodGallery />}
      {tab === 'log' && <LogView />}
      {tab === 'roadmap' && <Roadmap />}

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
    </>
  )
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-4 md:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🫧 Gut Health Tracker</h1>
            <p className="text-sm text-gray-500">
              {IS_MOCK ? 'V0 — Mock Data' : 'V1 — Real Backend'}
              {user?.name ? ` · ${user.name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {IS_MOCK ? (
              <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full">Mock Mode</span>
            ) : (
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">Live</span>
            )}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{user?.email}</span>
                <button
                  onClick={() => logout()}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <a href="/auth/signin" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Sign In
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {isAuthenticated ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Meals Logged" value={0} color="green" />
              <StatCard label="Health Outcomes" value={0} color="blue" />
              <StatCard label="Linked Events" value={0} color="amber" />
              <StatCard label="High Triggers" value={0} color="red" />
            </div>
            <DashboardContent />
          </>
        ) : (
          <SignInPrompt />
        )}
      </div>
    </main>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { createHealthOutcome, getFoodEntries } from '@/lib/api'

const BRISTOL_DESCRIPTIONS = [
  'Type 1: Separate hard lumps',
  'Type 2: Lumpy, sausage-shaped',
  'Type 3: Sausage with cracks',
  'Type 4: Smooth, soft sausage',
  'Type 5: Soft blobs',
  'Type 6: Fluffy pieces',
  'Type 7: Watery, no solid'
]

const COLORS = [
  { name: 'brown', hex: '#8B4513' },
  { name: 'dark brown', hex: '#4A2C00' },
  { name: 'light brown', hex: '#CD853F' },
  { name: 'green', hex: '#228B22' },
  { name: 'yellow', hex: '#FFD700' },
  { name: 'black', hex: '#000000' },
  { name: 'red', hex: '#DC143C' },
  { name: 'pale', hex: '#F5DEB3' }
]

const OUTCOME_TYPES = [
  { value: 'bm', label: 'Bowel Movement' },
  { value: 'energy', label: 'Energy Level' },
  { value: 'symptom', label: 'Symptom' },
  { value: 'mood', label: 'Mood' }
]

interface FoodEntryOption {
  id: string
  description: string
  timestamp: string
}

interface HealthOutcomeFormProps {
  onSuccess?: () => void
}

export default function HealthOutcomeForm({ onSuccess }: HealthOutcomeFormProps) {
  const [type, setType] = useState<'bm' | 'energy' | 'symptom' | 'mood'>('bm')
  const [severity, setSeverity] = useState(3)
  const [bristolScale, setBristolScale] = useState(4)
  const [color, setColor] = useState('brown')
  const [notes, setNotes] = useState('')
  const [linkedFoodEntryId, setLinkedFoodEntryId] = useState<string>('')
  const [recentFoodEntries, setRecentFoodEntries] = useState<FoodEntryOption[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(false)

  useEffect(() => {
    const fetchRecentFoodEntries = async () => {
      setLoadingEntries(true)
      try {
        const entries = await getFoodEntries()
        const now = Date.now()
        const recent = (entries as any[])
          .filter((e: any) => {
            const entryTime = new Date(e.timestamp).getTime()
            const hoursDiff = (now - entryTime) / (1000 * 60 * 60)
            return hoursDiff <= 24
          })
          .map((e: any) => ({
            id: e.id,
            description: e.description || 'Food entry',
            timestamp: e.timestamp
          }))
        setRecentFoodEntries(recent)
      } catch (err) {
        console.error('Error fetching food entries:', err)
      } finally {
        setLoadingEntries(false)
      }
    }

    fetchRecentFoodEntries()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data: any = {
        timestamp: new Date().toISOString(),
        type,
        severity,
        notes: notes || undefined
      }

      if (type === 'bm') {
        data.bristolScale = bristolScale
        data.color = color
      }

      if (linkedFoodEntryId) {
        data.foodEntryId = linkedFoodEntryId
      }

      await createHealthOutcome(data)
      
      setType('bm')
      setSeverity(3)
      setBristolScale(4)
      setColor('brown')
      setNotes('')
      setLinkedFoodEntryId('')
      onSuccess?.()
    } catch (err) {
      console.error(err)
      alert('Error logging health outcome')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Log Health Outcome</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Type</label>
        <div className="grid grid-cols-2 gap-2">
          {OUTCOME_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value as any)}
              className={`p-2 rounded border ${
                type === t.value
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Severity: {severity}/5
        </label>
        <input
          type="range"
          min="1"
          max="5"
          value={severity}
          onChange={(e) => setSeverity(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      {type === 'bm' && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Bristol Scale</label>
            <div className="bristol-scale flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => setBristolScale(scale)}
                  className={`flex-1 p-2 rounded border text-center ${
                    bristolScale === scale
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white border-gray-300 hover:border-blue-500'
                  }`}
                >
                  <div className="font-bold text-sm">{scale}</div>
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {BRISTOL_DESCRIPTIONS[bristolScale - 1]}
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Color</label>
            <div className="color-picker flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  className={`color-option w-8 h-8 rounded-full border-2 ${
                    color === c.name ? 'border-blue-500 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Link to Food Entry (optional, within 24h)
        </label>
        <select
          value={linkedFoodEntryId}
          onChange={(e) => setLinkedFoodEntryId(e.target.value)}
          className="w-full p-2 border rounded"
          disabled={loadingEntries}
        >
          <option value="">No linked food entry</option>
          {recentFoodEntries.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.description} - {new Date(entry.timestamp).toLocaleString()}
            </option>
          ))}
        </select>
        {recentFoodEntries.length === 0 && !loadingEntries && (
          <p className="text-sm text-gray-500 mt-1">No recent food entries found</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-2 border rounded"
          rows={2}
          placeholder="Any additional notes..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? 'Logging...' : 'Log Health Outcome'}
      </button>
    </form>
  )
}
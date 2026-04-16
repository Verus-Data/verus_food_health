'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { api } from '@/lib/api'

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
  { name: 'dark_brown', hex: '#4A2C00' },
  { name: 'light_brown', hex: '#CD853F' },
  { name: 'green', hex: '#228B22' },
  { name: 'yellow', hex: '#FFD700' },
  { name: 'black', hex: '#000000' },
  { name: 'red', hex: '#DC143C' },
  { name: 'pale', hex: '#F5DEB3' }
]

interface BMFormProps {
  onSuccess?: () => void
}

export default function BMForm({ onSuccess }: BMFormProps) {
  const { data: session } = useSession()
  const [bristolScale, setBristolScale] = useState<number>(4)
  const [color, setColor] = useState<string>('brown')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) {
      alert('Please sign in to log bowel movements')
      return
    }
    setLoading(true)
    try {
      await api.post('/bm/', {
        user_id: session.user.id,
        bristol_scale: bristolScale,
        color,
        notes: notes || null
      })
      setNotes('')
      onSuccess?.()
    } catch (err) {
      console.error(err)
      alert('Error logging BM event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Log Bowel Movement</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Bristol Scale</label>
        <div className="bristol-scale">
          {[1, 2, 3, 4, 5, 6, 7].map((scale) => (
            <div
              key={scale}
              className={`bristol-option ${bristolScale === scale ? 'selected' : ''}`}
              onClick={() => setBristolScale(scale)}
            >
              <div className="font-bold">{scale}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {BRISTOL_DESCRIPTIONS[bristolScale - 1]}
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Color</label>
        <div className="color-picker">
          {COLORS.map((c) => (
            <div
              key={c.name}
              className={`color-option ${color === c.name ? 'selected' : ''}`}
              style={{ backgroundColor: c.hex }}
              onClick={() => setColor(c.name)}
              title={c.name}
            />
          ))}
        </div>
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
        {loading ? 'Logging...' : 'Log Bowel Movement'}
      </button>
    </form>
  )
}
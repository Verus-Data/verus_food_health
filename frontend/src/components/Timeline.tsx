'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { api } from '@/lib/api'
import { TimelineEvent } from '@/types'

export default function Timeline() {
  const { user } = useAuth()
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTimeline = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    try {
      const response = await api.get(`/analysis/timeline/${user.id}?days=30`)
      setEvents(response.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimeline()
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) return <div className="p-4">Loading timeline...</div>

  if (events.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Timeline</h2>
        <p className="text-gray-500">No events logged yet. Start by logging food or a bowel movement!</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Timeline</h2>
      <div className="space-y-4">
        {events.map((event) => (
          <div
            key={`${event.type}-${event.id}`}
            className={`p-4 rounded-lg border-l-4 ${
              event.type === 'food'
                ? 'bg-green-50 border-green-500'
                : 'bg-blue-50 border-blue-500'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span
                  className={`font-semibold ${
                    event.type === 'food' ? 'text-green-700' : 'text-blue-700'
                  }`}
                >
                  {event.type === 'food' ? '🍽️ Food' : '💩 Bowel Movement'}
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDate(event.timestamp)}
                </p>
              </div>
            </div>

            {event.type === 'food' && (
              <div className="mt-2">
                <p className="text-sm">
                  <strong>Ingredients:</strong>{' '}
                  {event.data.ingredients?.join(', ') || 'None'}
                </p>
                {event.data.notes && (
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Notes:</strong> {event.data.notes}
                  </p>
                )}
              </div>
            )}

            {event.type === 'bm' && (
              <div className="mt-2">
                <p className="text-sm">
                  <strong>Bristol Scale:</strong> {event.data.bristol_scale}
                </p>
                {event.data.color && (
                  <p className="text-sm">
                    <strong>Color:</strong> {event.data.color}
                  </p>
                )}
                {event.data.notes && (
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Notes:</strong> {event.data.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
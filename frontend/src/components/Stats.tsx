'use client'

import { useEffect, useState } from 'react'
import { api, ensureUser } from '@/lib/api'
import { StatsResponse, IngredientCorrelation } from '@/types'

export default function Stats() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      const userId = await ensureUser()
      const response = await api.get(`/analysis/correlations/${userId}`)
      setStats(response.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const getBristolColor = (avg: number) => {
    if (avg <= 2) return 'bg-red-500'
    if (avg <= 3) return 'bg-orange-500'
    if (avg <= 4) return 'bg-green-500'
    if (avg <= 5) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) return <div className="p-4">Loading stats...</div>

  if (!stats) return null

  if (stats.ingredient_correlations.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Ingredient Correlations</h2>
        <p className="text-gray-500">
          Log more food and BM events to see ingredient correlations!
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-2xl font-bold text-green-700">{stats.total_food_events}</p>
            <p className="text-sm text-gray-600">Food Events</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">{stats.total_bm_events}</p>
            <p className="text-sm text-gray-600">BM Events</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Ingredient Correlations</h2>
      
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-2xl font-bold text-green-700">{stats.total_food_events}</p>
          <p className="text-sm text-gray-600">Food Events</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-2xl font-bold text-blue-700">{stats.total_bm_events}</p>
          <p className="text-sm text-gray-600">BM Events</p>
        </div>
      </div>

      <h3 className="font-semibold mb-3">Top Ingredients (24h correlation window)</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-600">
              <th className="pb-2">Ingredient</th>
              <th className="pb-2">Events</th>
              <th className="pb-2">Avg Bristol</th>
              <th className="pb-2">Distribution</th>
            </tr>
          </thead>
          <tbody>
            {stats.ingredient_correlations.map((corr) => (
              <tr key={corr.ingredient} className="border-t">
                <td className="py-2 capitalize font-medium">{corr.ingredient}</td>
                <td className="py-2">{corr.event_count}</td>
                <td className="py-2">
                  <span
                    className={`px-2 py-1 rounded text-white text-sm ${getBristolColor(
                      corr.avg_bristol
                    )}`}
                  >
                    {corr.avg_bristol.toFixed(1)}
                  </span>
                </td>
                <td className="py-2">
                  <div className="flex gap-1">
                    {Object.entries(corr.bristol_distribution)
                      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                      .map(([scale, count]) => (
                        <div
                          key={scale}
                          className="text-xs bg-gray-100 px-1 rounded"
                          title={`Type ${scale}: ${count} times`}
                        >
                          {scale}x{count}
                        </div>
                      ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">Bristol Scale Guide</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>1-2:</strong> Constipation (hard, lumpy)</p>
          <p><strong>3-4:</strong> Normal (smooth, optimal)</p>
          <p><strong>5-7:</strong> Diarrhea (soft to watery)</p>
        </div>
      </div>
    </div>
  )
}
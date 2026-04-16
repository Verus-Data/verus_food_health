'use client'

import { useEffect, useState } from 'react'
import { ensureUser } from '@/lib/api'
import BMForm from '@/components/BMForm'
import FoodForm from '@/components/FoodForm'
import Timeline from '@/components/Timeline'
import Stats from '@/components/Stats'
import { getUserId } from '@/lib/api'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'log' | 'timeline' | 'stats'>('log')
  const [userId, setUserIdState] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const init = async () => {
      const uid = getUserId()
      if (!uid) {
        const newUid = await ensureUser()
        setUserIdState(newUid)
      } else {
        setUserIdState(uid)
      }
    }
    init()
  }, [])

  const handleSuccess = () => {
    setRefreshKey((k) => k + 1)
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Gut Health Tracker</h1>
          {userId && (
            <p className="text-sm text-gray-500 mt-1">
              User ID: {userId.substring(0, 8)}...
            </p>
          )}
        </div>

        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-lg shadow inline-flex">
            <button
              onClick={() => setActiveTab('log')}
              className={`px-6 py-2 rounded-l-lg ${
                activeTab === 'log'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Log
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-6 py-2 ${
                activeTab === 'timeline'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-2 rounded-r-lg ${
                activeTab === 'stats'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Stats
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {activeTab === 'log' && (
            <div className="grid md:grid-cols-2 gap-6">
              <FoodForm onSuccess={handleSuccess} />
              <BMForm onSuccess={handleSuccess} />
            </div>
          )}

          {activeTab === 'timeline' && <Timeline key={refreshKey} />}

          {activeTab === 'stats' && <Stats key={`stats-${refreshKey}`} />}
        </div>
      </div>
    </main>
  )
}
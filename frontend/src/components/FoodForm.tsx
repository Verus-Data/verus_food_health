'use client'

import { useState, useRef } from 'react'
import { api, ensureUser } from '@/lib/api'

interface FoodFormProps {
  onSuccess?: () => void
}

export default function FoodForm({ onSuccess }: FoodFormProps) {
  const [ingredients, setIngredients] = useState('')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const userId = await ensureUser()
      const formData = new FormData()
      formData.append('user_id', userId)
      formData.append('ingredients', ingredients)
      if (notes) formData.append('notes', notes)
      if (photo) formData.append('photo', photo)

      await api.post(`/users/${userId}/food`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setIngredients('')
      setNotes('')
      setPhoto(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onSuccess?.()
    } catch (err) {
      console.error(err)
      alert('Error logging food event')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0])
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Log Food</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Photo (optional)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="w-full p-2 border rounded"
        />
        {photo && (
          <p className="text-sm text-gray-600 mt-1">Selected: {photo.name}</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Ingredients (comma-separated) *
        </label>
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          className="w-full p-2 border rounded"
          rows={3}
          placeholder="e.g., chicken, rice, broccoli, garlic"
          required
        />
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
        disabled={loading || !ingredients.trim()}
        className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-400"
      >
        {loading ? 'Logging...' : 'Log Food'}
      </button>
    </form>
  )
}
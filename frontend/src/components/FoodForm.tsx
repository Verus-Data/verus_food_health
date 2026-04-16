'use client'

import { useState, useRef } from 'react'
import { createFoodEntry, uploadPhoto } from '@/lib/api'

interface FoodFormProps {
  onSuccess?: () => void
}

export default function FoodForm({ onSuccess }: FoodFormProps) {
  const [description, setDescription] = useState('')
  const [ingredientInput, setIngredientInput] = useState('')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [estimatedCalories, setEstimatedCalories] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddIngredient = () => {
    const trimmed = ingredientInput.trim()
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed])
      setIngredientInput('')
    }
  }

  const handleRemoveIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter(i => i !== ingredient))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddIngredient()
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearPhoto = () => {
    setPhoto(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let photoUrl: string | undefined

      if (photo) {
        const uploadResult = await uploadPhoto(photo)
        photoUrl = uploadResult.photoUrl
      }

      await createFoodEntry({
        timestamp: new Date().toISOString(),
        photoUrl,
        description: description || undefined,
        estimatedCalories: estimatedCalories ? parseInt(estimatedCalories) : undefined,
        confidence: 0.8,
        ingredients
      })
      
      setDescription('')
      setIngredients([])
      setEstimatedCalories('')
      clearPhoto()
      onSuccess?.()
    } catch (err) {
      console.error(err)
      alert('Error logging food entry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Log Food Entry</h2>

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
        {photoPreview && (
          <div className="mt-2 relative">
            <img src={photoPreview} alt="Preview" className="h-32 w-32 object-cover rounded" />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded"
          rows={2}
          placeholder="e.g., Grilled chicken salad with mixed greens..."
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Estimated Calories (optional)
        </label>
        <input
          type="number"
          value={estimatedCalories}
          onChange={(e) => setEstimatedCalories(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="e.g., 450"
          min="0"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Ingredients (add tags)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={ingredientInput}
            onChange={(e) => setIngredientInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 p-2 border rounded"
            placeholder="e.g., chicken"
          />
          <button
            type="button"
            onClick={handleAddIngredient}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Add
          </button>
        </div>
        {ingredients.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {ingredients.map((ingredient) => (
              <span
                key={ingredient}
                className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full flex items-center gap-1"
              >
                {ingredient}
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(ingredient)}
                  className="hover:text-red-600"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || ingredients.length === 0}
        className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-400"
      >
        {loading ? 'Logging...' : 'Log Food Entry'}
      </button>
    </form>
  )
}
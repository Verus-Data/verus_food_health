'use client'

import { useState, useRef } from 'react'
import { createFoodEntry, uploadPhoto } from '@/lib/api'

interface SuggestedIngredient {
  name: string
  confidence: number
  source: 'ai' | 'manual'
  confirmed: boolean
}

interface FoodFormProps {
  onSuccess?: () => void
}

export default function FoodForm({ onSuccess }: FoodFormProps) {
  const [description, setDescription] = useState('')
  const [ingredientInput, setIngredientInput] = useState('')
  const [ingredients, setIngredients] = useState<SuggestedIngredient[]>([])
  const [estimatedCalories, setEstimatedCalories] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDish, setAiDish] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const FOOD_CLASSIFIER_URL = process.env.NEXT_PUBLIC_FOOD_CLASSIFIER_URL || 'http://localhost:8001'

  const handleAddIngredient = () => {
    const trimmed = ingredientInput.trim()
    if (trimmed && !ingredients.some(i => i.name.toLowerCase() === trimmed.toLowerCase())) {
      setIngredients([...ingredients, { name: trimmed, confidence: 1.0, source: 'manual', confirmed: true }])
      setIngredientInput('')
    }
  }

  const handleRemoveIngredient = (ingredientName: string) => {
    setIngredients(ingredients.filter(i => i.name !== ingredientName))
  }

  const handleToggleConfirm = (ingredientName: string) => {
    setIngredients(ingredients.map(i => 
      i.name === ingredientName ? { ...i, confirmed: !i.confirmed } : i
    ))
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
    setAiDish(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAISuggest = async () => {
    if (!photo) {
      alert('Please upload a photo first')
      return
    }

    setAiLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', photo)

      const response = await fetch(`${FOOD_CLASSIFIER_URL}/ingredients`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        if (response.status === 503) {
          alert('AI service is currently unavailable. Please enter ingredients manually.')
          return
        }
        throw new Error('AI classification failed')
      }

      const data = await response.json()
      
      setAiDish(data.dish)
      
      const newIngredients = data.ingredients.map((ing: { name: string; confidence: number }) => ({
        name: ing.name,
        confidence: ing.confidence,
        source: 'ai' as const,
        confirmed: true
      }))
      
      setIngredients(prev => {
        const existing = prev.map(i => i.name.toLowerCase())
        const filtered = newIngredients.filter((ni: { name: string }) => 
          !existing.includes(ni.name.toLowerCase())
        )
        return [...prev, ...filtered]
      })

    } catch (err) {
      console.error('AI suggestion error:', err)
      alert('Failed to get AI suggestions. Please enter ingredients manually.')
    } finally {
      setAiLoading(false)
    }
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

      const confirmedIngredients = ingredients
        .filter(i => i.confirmed)
        .map(i => i.name)

      const aiConfidence = aiDish ? 
        ingredients.length > 0 ? 
          ingredients.filter(i => i.source === 'ai').reduce((sum, i) => sum + i.confidence, 0) / ingredients.filter(i => i.source === 'ai').length 
          : null 
        : null

      await createFoodEntry({
        timestamp: new Date().toISOString(),
        photoUrl,
        description: description || undefined,
        estimatedCalories: estimatedCalories ? parseInt(estimatedCalories) : undefined,
        confidence: aiConfidence,
        aiConfidence: aiConfidence,
        ingredientsConfirmed: true,
        ingredients: confirmedIngredients.map(name => ({
          name,
          source: ingredients.find(i => i.name === name)?.source || 'manual'
        }))
      })
      
      setDescription('')
      setIngredients([])
      setEstimatedCalories('')
      setAiDish(null)
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

      {photo && (
        <div className="mb-4">
          <button
            type="button"
            onClick={handleAISuggest}
            disabled={aiLoading}
            className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {aiLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Analyzing photo...
              </>
            ) : (
              <>
                <span>✨</span>
                AI Suggest Ingredients
              </>
            )}
          </button>
          {aiDish && (
            <p className="text-sm text-purple-600 mt-1">
              Detected dish: <strong>{aiDish}</strong>
            </p>
          )}
        </div>
      )}

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
                key={ingredient.name}
                className={`text-sm px-2 py-1 rounded-full flex items-center gap-1 ${
                  ingredient.source === 'ai' 
                    ? ingredient.confirmed 
                      ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                      : 'bg-gray-100 text-gray-500 line-through border border-gray-300'
                    : 'bg-green-100 text-green-800 border border-green-300'
                }`}
              >
                {ingredient.source === 'ai' && (
                  <span className="text-xs bg-purple-200 px-1 rounded" title="AI predicted">
                    AI
                  </span>
                )}
                {ingredient.name}
                {ingredient.source === 'ai' && ingredient.confirmed && (
                  <span className="text-xs text-purple-600">
                    {Math.round(ingredient.confidence * 100)}%
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(ingredient.name)}
                  className="hover:text-red-600 ml-1"
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
        disabled={loading || ingredients.filter(i => i.confirmed).length === 0}
        className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-400"
      >
        {loading ? 'Logging...' : 'Log Food Entry'}
      </button>
    </form>
  )
}
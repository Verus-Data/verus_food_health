export interface User {
  id: string
  created_at: string
}

export interface Ingredient {
  id: string
  name: string
  created_at: string
}

export interface FoodEvent {
  id: string
  user_id: string
  timestamp: string
  photo_path: string | null
  notes: string | null
  ingredients: Ingredient[]
}

export interface BMEvent {
  id: string
  user_id: string
  timestamp: string
  bristol_scale: number
  color: string | null
  notes: string | null
}

export interface TimelineEvent {
  id: string
  type: 'food' | 'bm'
  timestamp: string
  data: Record<string, any>
}

export interface IngredientCorrelation {
  ingredient: string
  avg_bristol: number
  event_count: number
  bristol_distribution: Record<number, number>
}

export interface StatsResponse {
  total_food_events: number
  total_bm_events: number
  ingredient_correlations: IngredientCorrelation[]
}
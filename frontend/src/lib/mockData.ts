// Mock data for v0 development
// Simulates API responses for food entries, health outcomes, and correlations

export interface MockFoodEntry {
  id: string
  timestamp: string
  photoUrl: string
  description: string
  ingredients: string[]
  confidence: number
  estimatedCalories: number
}

export interface MockHealthOutcome {
  id: string
  entryId?: string
  timestamp: string
  type: 'bm' | 'energy' | 'symptom' | 'mood'
  severity: number // 1-5
  notes?: string
  details?: {
    bristolScale?: number // 1-7
    color?: string
  }
}

export interface MockCorrelation {
  ingredient: string
  count: number
  avgSeverity: number
  maxSeverity: number
  outcomeType: string
}

export const mockUser = {
  id: 'user-mock-001',
  createdAt: '2026-04-01T10:00:00Z',
  name: 'Test User'
}

export const mockFoodEntries: MockFoodEntry[] = [
  {
    id: 'food-001',
    timestamp: '2026-04-15T12:30:00Z',
    photoUrl: '/mock-photos/salad-grilled-chicken.jpg',
    description: 'Grilled chicken salad with mixed greens, cherry tomatoes, cucumber, and balsamic vinaigrette',
    ingredients: ['chicken', 'lettuce', 'tomato', 'cucumber', 'balsamic vinegar', 'olive oil'],
    confidence: 0.92,
    estimatedCalories: 450
  },
  {
    id: 'food-002',
    timestamp: '2026-04-15T19:00:00Z',
    photoUrl: '/mock-photos/pasta-bolognese.jpg',
    description: 'Pasta bolognese with parmesan cheese',
    ingredients: ['pasta', 'ground beef', 'tomato sauce', 'onion', 'garlic', 'parmesan cheese'],
    confidence: 0.88,
    estimatedCalories: 720
  },
  {
    id: 'food-003',
    timestamp: '2026-04-16T08:00:00Z',
    photoUrl: '/mock-photos/breakfast-smoothie.jpg',
    description: 'Morning smoothie with banana, spinach, protein powder, and almond milk',
    ingredients: ['banana', 'spinach', 'protein powder', 'almond milk', 'honey'],
    confidence: 0.85,
    estimatedCalories: 320
  },
  {
    id: 'food-004',
    timestamp: '2026-04-16T13:00:00Z',
    photoUrl: '/mock-photos/turkey-sandwich.jpg',
    description: 'Turkey sandwich on sourdough with lettuce, tomato, and mayo',
    ingredients: ['turkey', 'sourdough bread', 'lettuce', 'tomato', 'mayonnaise'],
    confidence: 0.90,
    estimatedCalories: 480
  },
  {
    id: 'food-005',
    timestamp: '2026-04-16T19:30:00Z',
    photoUrl: '/mock-photos/salmon-rice.jpg',
    description: 'Grilled salmon with rice and steamed broccoli',
    ingredients: ['salmon', 'rice', 'broccoli', 'lemon', 'olive oil', 'garlic'],
    confidence: 0.93,
    estimatedCalories: 580
  },
  {
    id: 'food-006',
    timestamp: '2026-04-16T21:00:00Z',
    photoUrl: '/mock-photos/ice-cream.jpg',
    description: 'Vanilla ice cream with chocolate sauce',
    ingredients: ['ice cream', 'chocolate', 'milk', 'sugar'],
    confidence: 0.95,
    estimatedCalories: 380
  }
]

export const mockHealthOutcomes: MockHealthOutcome[] = [
  {
    id: 'bm-001',
    entryId: 'food-001',
    timestamp: '2026-04-15T14:30:00Z',
    type: 'bm',
    severity: 2,
    notes: 'Normal, felt good',
    details: { bristolScale: 4, color: 'brown' }
  },
  {
    id: 'energy-001',
    entryId: 'food-001',
    timestamp: '2026-04-15T15:00:00Z',
    type: 'energy',
    severity: 4,
    notes: 'Energy good after lunch'
  },
  {
    id: 'bm-002',
    entryId: 'food-002',
    timestamp: '2026-04-15T22:00:00Z',
    type: 'bm',
    severity: 3,
    notes: 'Slightly bloated',
    details: { bristolScale: 3, color: 'brown' }
  },
  {
    id: 'symptom-001',
    entryId: 'food-002',
    timestamp: '2026-04-15T23:00:00Z',
    type: 'symptom',
    severity: 2,
    notes: 'Mild heartburn after pasta'
  },
  {
    id: 'bm-003',
    entryId: 'food-004',
    timestamp: '2026-04-16T16:00:00Z',
    type: 'bm',
    severity: 2,
    notes: 'Regular',
    details: { bristolScale: 4, color: 'brown' }
  },
  {
    id: 'bm-004',
    entryId: 'food-005',
    timestamp: '2026-04-16T22:00:00Z',
    type: 'bm',
    severity: 4,
    notes: 'Urgent, loose stools',
    details: { bristolScale: 6, color: 'light brown' }
  },
  {
    id: 'symptom-002',
    entryId: 'food-006',
    timestamp: '2026-04-16T23:30:00Z',
    type: 'symptom',
    severity: 3,
    notes: 'Stomach gurgling, dairy sensitivity?'
  },
  {
    id: 'bm-005',
    entryId: 'food-006',
    timestamp: '2026-04-17T07:00:00Z',
    type: 'bm',
    severity: 4,
    notes: 'Diarrhea, likely from ice cream',
    details: { bristolScale: 7, color: 'yellow' }
  }
]

// Calculate correlations
export const calculateCorrelations = (): MockCorrelation[] => {
  const correlations: Record<string, { count: number; severities: number[]; type: string }> = {}
  
  // Match food entries with outcomes within 24 hours
  mockFoodEntries.forEach(food => {
    const foodTime = new Date(food.timestamp).getTime()
    
    mockHealthOutcomes.forEach(outcome => {
      if (!outcome.entryId || outcome.entryId !== food.id) return
      
      food.ingredients.forEach(ingredient => {
        const key = `${ingredient.toLowerCase()}_${outcome.type}`
        if (!correlations[key]) {
          correlations[key] = { count: 0, severities: [], type: outcome.type }
        }
        correlations[key].count++
        correlations[key].severities.push(outcome.severity)
      })
    })
  })
  
  // Convert to array format
  return Object.entries(correlations)
    .filter(([_, data]) => data.count >= 1)
    .map(([key, data]) => {
      const [ingredient] = key.split('_')
      const avgSeverity = data.severities.reduce((a, b) => a + b, 0) / data.severities.length
      return {
        ingredient,
        count: data.count,
        avgSeverity: Math.round(avgSeverity * 100) / 100,
        maxSeverity: Math.max(...data.severities),
        outcomeType: data.type
      }
    })
    .sort((a, b) => b.avgSeverity - a.avgSeverity)
}

export const mockCorrelations = calculateCorrelations()

// Mock API functions
export const mockApi = {
  getUser: async () => mockUser,
  
  getFoodEntries: async (): Promise<MockFoodEntry[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    return mockFoodEntries
  },
  
  getHealthOutcomes: async (): Promise<MockHealthOutcome[]> => {
    await new Promise(resolve => setTimeout(resolve, 200))
    return mockHealthOutcomes
  },
  
  getCorrelations: async (): Promise<MockCorrelation[]> => {
    await new Promise(resolve => setTimeout(resolve, 400))
    return calculateCorrelations()
  },
  
  createFoodEntry: async (data: Partial<MockFoodEntry>): Promise<MockFoodEntry> => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      id: `food-${Date.now()}`,
      timestamp: new Date().toISOString(),
      photoUrl: data.photoUrl || '/mock-photos/placeholder.jpg',
      description: data.description || 'New entry',
      ingredients: data.ingredients || [],
      confidence: data.confidence || 0.8,
      estimatedCalories: data.estimatedCalories || 400
    }
  },
  
  createHealthOutcome: async (data: Partial<MockHealthOutcome>): Promise<MockHealthOutcome> => {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      id: `outcome-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: data.type || 'bm',
      severity: data.severity || 3,
      notes: data.notes,
      details: data.details
    }
  }
}

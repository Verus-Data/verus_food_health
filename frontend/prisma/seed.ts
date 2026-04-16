import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const hashedPassword = await bcrypt.hash('password123', 10)

  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
    },
  })

  const foodEntries = [
    {
      id: 'food-001',
      userId: user.id,
      timestamp: new Date('2026-04-15T12:30:00Z'),
      photoUrl: '/mock-photos/salad-grilled-chicken.jpg',
      description: 'Grilled chicken salad with mixed greens, cherry tomatoes, cucumber, and balsamic vinaigrette',
      estimatedCalories: 450,
      confidence: 0.92,
      ingredients: {
        create: [
          { name: 'chicken' },
          { name: 'lettuce' },
          { name: 'tomato' },
          { name: 'cucumber' },
          { name: 'balsamic vinegar' },
          { name: 'olive oil' },
        ],
      },
    },
    {
      id: 'food-002',
      userId: user.id,
      timestamp: new Date('2026-04-15T19:00:00Z'),
      photoUrl: '/mock-photos/pasta-bolognese.jpg',
      description: 'Pasta bolognese with parmesan cheese',
      estimatedCalories: 720,
      confidence: 0.88,
      ingredients: {
        create: [
          { name: 'pasta' },
          { name: 'ground beef' },
          { name: 'tomato sauce' },
          { name: 'onion' },
          { name: 'garlic' },
          { name: 'parmesan cheese' },
        ],
      },
    },
    {
      id: 'food-003',
      userId: user.id,
      timestamp: new Date('2026-04-16T08:00:00Z'),
      photoUrl: '/mock-photos/breakfast-smoothie.jpg',
      description: 'Morning smoothie with banana, spinach, protein powder, and almond milk',
      estimatedCalories: 320,
      confidence: 0.85,
      ingredients: {
        create: [
          { name: 'banana' },
          { name: 'spinach' },
          { name: 'protein powder' },
          { name: 'almond milk' },
          { name: 'honey' },
        ],
      },
    },
    {
      id: 'food-004',
      userId: user.id,
      timestamp: new Date('2026-04-16T13:00:00Z'),
      photoUrl: '/mock-photos/turkey-sandwich.jpg',
      description: 'Turkey sandwich on sourdough with lettuce, tomato, and mayo',
      estimatedCalories: 480,
      confidence: 0.90,
      ingredients: {
        create: [
          { name: 'turkey' },
          { name: 'sourdough bread' },
          { name: 'lettuce' },
          { name: 'tomato' },
          { name: 'mayonnaise' },
        ],
      },
    },
    {
      id: 'food-005',
      userId: user.id,
      timestamp: new Date('2026-04-16T19:30:00Z'),
      photoUrl: '/mock-photos/salmon-rice.jpg',
      description: 'Grilled salmon with rice and steamed broccoli',
      estimatedCalories: 580,
      confidence: 0.93,
      ingredients: {
        create: [
          { name: 'salmon' },
          { name: 'rice' },
          { name: 'broccoli' },
          { name: 'lemon' },
          { name: 'olive oil' },
          { name: 'garlic' },
        ],
      },
    },
    {
      id: 'food-006',
      userId: user.id,
      timestamp: new Date('2026-04-16T21:00:00Z'),
      photoUrl: '/mock-photos/ice-cream.jpg',
      description: 'Vanilla ice cream with chocolate sauce',
      estimatedCalories: 380,
      confidence: 0.95,
      ingredients: {
        create: [
          { name: 'ice cream' },
          { name: 'chocolate' },
          { name: 'milk' },
          { name: 'sugar' },
        ],
      },
    },
  ]

  for (const entry of foodEntries) {
    await prisma.foodEntry.create({ data: entry })
  }

  const healthOutcomes = [
    {
      id: 'bm-001',
      userId: user.id,
      foodEntryId: 'food-001',
      timestamp: new Date('2026-04-15T14:30:00Z'),
      type: 'bm',
      severity: 2,
      notes: 'Normal, felt good',
      bristolScale: 4,
      color: 'brown',
    },
    {
      id: 'energy-001',
      userId: user.id,
      foodEntryId: 'food-001',
      timestamp: new Date('2026-04-15T15:00:00Z'),
      type: 'energy',
      severity: 4,
      notes: 'Energy good after lunch',
    },
    {
      id: 'bm-002',
      userId: user.id,
      foodEntryId: 'food-002',
      timestamp: new Date('2026-04-15T22:00:00Z'),
      type: 'bm',
      severity: 3,
      notes: 'Slightly bloated',
      bristolScale: 3,
      color: 'brown',
    },
    {
      id: 'symptom-001',
      userId: user.id,
      foodEntryId: 'food-002',
      timestamp: new Date('2026-04-15T23:00:00Z'),
      type: 'symptom',
      severity: 2,
      notes: 'Mild heartburn after pasta',
    },
    {
      id: 'bm-003',
      userId: user.id,
      foodEntryId: 'food-004',
      timestamp: new Date('2026-04-16T16:00:00Z'),
      type: 'bm',
      severity: 2,
      notes: 'Regular',
      bristolScale: 4,
      color: 'brown',
    },
    {
      id: 'bm-004',
      userId: user.id,
      foodEntryId: 'food-005',
      timestamp: new Date('2026-04-16T22:00:00Z'),
      type: 'bm',
      severity: 4,
      notes: 'Urgent, loose stools',
      bristolScale: 6,
      color: 'light brown',
    },
    {
      id: 'symptom-002',
      userId: user.id,
      foodEntryId: 'food-006',
      timestamp: new Date('2026-04-16T23:30:00Z'),
      type: 'symptom',
      severity: 3,
      notes: 'Stomach gurgling, dairy sensitivity?',
    },
    {
      id: 'bm-005',
      userId: user.id,
      foodEntryId: 'food-006',
      timestamp: new Date('2026-04-17T07:00:00Z'),
      type: 'bm',
      severity: 4,
      notes: 'Diarrhea, likely from ice cream',
      bristolScale: 7,
      color: 'yellow',
    },
  ]

  for (const outcome of healthOutcomes) {
    await prisma.healthOutcome.create({ data: outcome })
  }

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
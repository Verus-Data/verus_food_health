import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const foodEntries = await prisma.foodEntry.findMany({
      where: { userId: session.user.id },
      include: {
        ingredients: true,
        healthOutcomes: true,
      },
    })

    const correlations: Record<
      string,
      { count: number; severities: number[]; type: string }
    > = {}

    foodEntries.forEach((food) => {
      food.healthOutcomes.forEach((outcome) => {
        food.ingredients.forEach((ingredient) => {
          const key = `${ingredient.name.toLowerCase()}_${outcome.type}`
          if (!correlations[key]) {
            correlations[key] = { count: 0, severities: [], type: outcome.type }
          }
          correlations[key].count++
          correlations[key].severities.push(outcome.severity)
        })
      })
    })

    const result = Object.entries(correlations)
      .filter(([_, data]) => data.count >= 1)
      .map(([key, data]) => {
        const [ingredient] = key.split('_')
        const avgSeverity =
          data.severities.reduce((a, b) => a + b, 0) / data.severities.length
        return {
          ingredient,
          count: data.count,
          avgSeverity: Math.round(avgSeverity * 100) / 100,
          maxSeverity: Math.max(...data.severities),
          outcomeType: data.type,
        }
      })
      .sort((a, b) => b.avgSeverity - a.avgSeverity)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to calculate correlations' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '30')

    if (!userId || userId !== session.user.id) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const trends = await prisma.dailyTrend.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    })

    const foodEntries = await prisma.foodEntry.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      include: { ingredients: true },
    })

    const healthOutcomes = await prisma.healthOutcome.findMany({
      where: {
        userId,
        timestamp: { gte: startDate },
      },
    })

    const weeklyData: Record<string, { severity: number[]; count: number }> = {}

    trends.forEach(t => {
      const weekStart = getWeekStart(t.date)
      const key = weekStart.toISOString().split('T')[0]
      if (!weeklyData[key]) {
        weeklyData[key] = { severity: [], count: 0 }
      }
      if (t.avgBmSeverity) {
        weeklyData[key].severity.push(t.avgBmSeverity)
      }
      weeklyData[key].count++
    })

    const weeklyTrends = Object.entries(weeklyData).map(([week, data]) => ({
      week,
      avgSeverity: data.severity.length > 0
        ? Math.round((data.severity.reduce((a, b) => a + b, 0) / data.severity.length) * 100) / 100
        : null,
      dayCount: data.count,
    }))

    const ingredientConsumption: Record<string, number> = {}
    foodEntries.forEach(entry => {
      entry.ingredients.forEach(ing => {
        const name = ing.name.toLowerCase()
        ingredientConsumption[name] = (ingredientConsumption[name] || 0) + 1
      })
    })

    const topIngredients = Object.entries(ingredientConsumption)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    const outcomeTypes: Record<string, number> = {}
    healthOutcomes.forEach(o => {
      outcomeTypes[o.type] = (outcomeTypes[o.type] || 0) + 1
    })
    const mostCommonOutcomes = Object.entries(outcomeTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }))

    return NextResponse.json({
      userId,
      period: { days, startDate: startDate.toISOString() },
      dailyTrends: trends,
      weeklyTrends,
      topIngredients,
      mostCommonOutcomes,
      summary: {
        totalFoodEntries: foodEntries.length,
        totalHealthOutcomes: healthOutcomes.length,
        avgDailyBmSeverity: trends.length > 0
          ? Math.round((trends.reduce((a, t) => a + (t.avgBmSeverity || 0), 0) / trends.length) * 100) / 100
          : null,
      },
    })
  } catch (error) {
    console.error('Trends error:', error)
    return NextResponse.json({ error: 'Failed to get trends' }, { status: 500 })
  }
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

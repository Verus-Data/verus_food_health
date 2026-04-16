import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const TRIGGER_ANALYZER_URL = process.env.TRIGGER_ANALYZER_URL || 'http://localhost:8002'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId || userId !== session.user.id) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
    }

    const foodEntries = await prisma.foodEntry.findMany({
      where: { userId },
      include: { ingredients: true },
      orderBy: { timestamp: 'asc' },
    })

    const healthOutcomes = await prisma.healthOutcome.findMany({
      where: { userId },
      orderBy: { timestamp: 'asc' },
    })

    if (foodEntries.length < 3 || healthOutcomes.length < 3) {
      return NextResponse.json({
        error: 'Need at least 3 food entries and 3 health outcomes',
        foodEntries: foodEntries.length,
        healthOutcomes: healthOutcomes.length,
      }, { status: 400 })
    }

    const analyzeRequest = {
      userId,
      foodEntries: foodEntries.map(fe => ({
        id: fe.id,
        timestamp: fe.timestamp.toISOString(),
        ingredients: fe.ingredients.map(i => i.name),
      })),
      healthOutcomes: healthOutcomes.map(ho => ({
        id: ho.id,
        timestamp: ho.timestamp.toISOString(),
        type: ho.type,
        severity: ho.severity,
      })),
      timeWindowHours: 24,
    }

    let analysisResult
    try {
      const response = await fetch(`${TRIGGER_ANALYZER_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyzeRequest),
      })

      if (!response.ok) {
        throw new Error(`Trigger analyzer returned ${response.status}`)
      }

      analysisResult = await response.json()
    } catch (e) {
      console.error('Trigger analyzer error:', e)
      return NextResponse.json({
        error: 'Trigger analyzer service unavailable. Running basic analysis.',
        details: e instanceof Error ? e.message : 'Unknown error',
      }, { status: 503 })
    }

    await prisma.personalTrigger.deleteMany({ where: { userId } })

    const triggerRecords = analysisResult.triggers.map((t: {
      ingredient: string
      pValue: number
      effectSize: number
      sampleSize: number
      confidence: string
      avgSeverityWith: number
      avgSeverityWithout: number
      countWith: number
      countWithout: number
    }) => ({
      userId,
      ingredient: t.ingredient,
      pValue: t.pValue,
      effectSize: t.effectSize,
      sampleSize: t.sampleSize,
      confidence: t.confidence,
      avgSeverityWith: t.avgSeverityWith,
      avgSeverityWithout: t.avgSeverityWithout,
      countWith: t.countWith,
      countWithout: t.countWithout,
      lastAnalyzed: new Date(),
    }))

    await prisma.personalTrigger.createMany({ data: triggerRecords })

    const significantTriggers = triggerRecords.filter((t: { confidence: string }) =>
      t.confidence === 'high' || t.confidence === 'moderate'
    )

    return NextResponse.json({
      userId,
      triggersAnalyzed: triggerRecords.length,
      significantTriggers: significantTriggers.length,
      triggers: triggerRecords,
      analyzedAt: analysisResult.analyzedAt,
    })
  } catch (error) {
    console.error('Run analysis error:', error)
    return NextResponse.json({ error: 'Failed to run analysis' }, { status: 500 })
  }
}

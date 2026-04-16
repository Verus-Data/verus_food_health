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
    const format = searchParams.get('format') || 'json'

    if (!userId || userId !== session.user.id) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
    }

    const foodEntries = await prisma.foodEntry.findMany({
      where: { userId },
      include: {
        ingredients: true,
        healthOutcomes: true,
      },
      orderBy: { timestamp: 'desc' },
    })

    const healthOutcomes = await prisma.healthOutcome.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    })

    const triggers = await prisma.personalTrigger.findMany({
      where: { userId },
      orderBy: { pValue: 'asc' },
    })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    })

    if (format === 'csv') {
      const csvLines: string[] = []

      csvLines.push('Section: User Info')
      csvLines.push('email,name,createdAt')
      csvLines.push(`${user?.email || ''},${user?.name || ''},${user?.createdAt.toISOString() || ''}`)
      csvLines.push('')

      csvLines.push('Section: Food Entries')
      csvLines.push('entry_id,timestamp,description,calories,ingredient_name,ingredient_source')
      foodEntries.forEach(entry => {
        const ingredients = entry.ingredients.map(i => `${i.name}|${i.source}`).join('; ')
        csvLines.push(
          `${entry.id},${entry.timestamp.toISOString()},${entry.description || ''},${entry.estimatedCalories || ''},${ingredients}`
        )
      })
      csvLines.push('')

      csvLines.push('Section: Health Outcomes')
      csvLines.push('outcome_id,timestamp,type,severity,bristol_scale,color,notes')
      healthOutcomes.forEach(outcome => {
        csvLines.push(
          `${outcome.id},${outcome.timestamp.toISOString()},${outcome.type},${outcome.severity},${outcome.bristolScale || ''},${outcome.color || ''},${(outcome.notes || '').replace(/,/g, ';')}`
        )
      })
      csvLines.push('')

      csvLines.push('Section: Personalized Triggers')
      csvLines.push('ingredient,p_value,effect_size,sample_size,confidence,avg_severity_with,avg_severity_without')
      triggers.forEach(t => {
        csvLines.push(
          `${t.ingredient},${t.pValue},${t.effectSize},${t.sampleSize},${t.confidence},${t.avgSeverityWith},${t.avgSeverityWithout}`
        )
      })

      const csv = csvLines.join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="gut-health-export-${userId}.csv"`,
        },
      })
    }

    return NextResponse.json({
      exportDate: new Date().toISOString(),
      user,
      foodEntries: foodEntries.map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        description: e.description,
        estimatedCalories: e.estimatedCalories,
        ingredients: e.ingredients,
        healthOutcomes: e.healthOutcomes,
      })),
      healthOutcomes,
      personalTriggers: triggers,
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const healthOutcomes = await prisma.healthOutcome.findMany({
      where: { userId: session.user.id },
      include: {
        foodEntry: {
          include: {
            ingredients: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    })

    return NextResponse.json(healthOutcomes)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch health outcomes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { timestamp, type, severity, notes, bristolScale, color, foodEntryId } =
      await request.json()

    if (foodEntryId) {
      const foodEntry = await prisma.foodEntry.findFirst({
        where: {
          id: foodEntryId,
          userId: session.user.id,
        },
      })

      if (!foodEntry) {
        return NextResponse.json(
          { error: 'Food entry not found or does not belong to user' },
          { status: 400 }
        )
      }

      const foodTime = new Date(foodEntry.timestamp).getTime()
      const outcomeTime = new Date(timestamp).getTime()
      const hoursDiff = Math.abs(outcomeTime - foodTime) / (1000 * 60 * 60)

      if (hoursDiff > 24) {
        return NextResponse.json(
          { error: 'Health outcome must be linked to a food entry within 24 hours' },
          { status: 400 }
        )
      }
    }

    const healthOutcome = await prisma.healthOutcome.create({
      data: {
        userId: session.user.id,
        foodEntryId: foodEntryId || null,
        timestamp: new Date(timestamp),
        type,
        severity: parseInt(severity),
        notes: notes || null,
        bristolScale: bristolScale ? parseInt(bristolScale) : null,
        color: color || null,
      },
      include: {
        foodEntry: {
          include: {
            ingredients: true,
          },
        },
      },
    })

    return NextResponse.json(healthOutcome)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create health outcome' },
      { status: 500 }
    )
  }
}
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

    const foodEntries = await prisma.foodEntry.findMany({
      where: { userId: session.user.id },
      include: {
        ingredients: true,
      },
      orderBy: { timestamp: 'desc' },
    })

    return NextResponse.json(foodEntries)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch food entries' },
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

    const { timestamp, photoUrl, description, estimatedCalories, confidence, ingredients } =
      await request.json()

    const foodEntry = await prisma.foodEntry.create({
      data: {
        userId: session.user.id,
        timestamp: new Date(timestamp),
        photoUrl,
        description,
        estimatedCalories: estimatedCalories ? parseInt(estimatedCalories) : null,
        confidence: confidence ? parseFloat(confidence) : null,
        ingredients: ingredients?.length
          ? {
              create: ingredients.map((name: string) => ({ name })),
            }
          : undefined,
      },
      include: {
        ingredients: true,
      },
    })

    return NextResponse.json(foodEntry)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create food entry' },
      { status: 500 }
    )
  }
}
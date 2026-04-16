import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
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

    const triggers = await prisma.personalTrigger.findMany({
      where: { userId },
      orderBy: { pValue: 'asc' },
    })

    const warnings = triggers
      .filter(t => t.confidence !== 'none' && t.confidence !== 'low')
      .map(t => ({
        ingredient: t.ingredient,
        message: `${t.ingredient} is associated with your BM severity (p=${t.pValue.toFixed(2)})`,
        pValue: t.pValue,
        confidence: t.confidence,
        effectSize: t.effectSize,
      }))

    return NextResponse.json({ userId, warnings })
  } catch (error) {
    console.error('Predictions error:', error)
    return NextResponse.json({ error: 'Failed to get predictions' }, { status: 500 })
  }
}

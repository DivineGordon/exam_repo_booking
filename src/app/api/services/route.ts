import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromSession } from '@/lib/auth'
import { z } from 'zod'

const createServiceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  duration: z.number().int().positive('Duration must be a positive integer'),
  price: z.number().positive('Price must be positive'),
})

// GET /api/services - List all services (public)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')

    const services = await prisma.service.findMany({
      where: businessId ? { businessId } : undefined,
      include: {
        business: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ services }, { status: 200 })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/services - Create a service (BUSINESS only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'BUSINESS') {
      return NextResponse.json(
        { error: 'Only businesses can create services' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, duration, price } = createServiceSchema.parse(body)

    const service = await prisma.service.create({
      data: {
        name,
        duration,
        price,
        businessId: user.id,
      },
      include: {
        business: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ service }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating service:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

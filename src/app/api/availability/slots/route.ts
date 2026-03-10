import { NextRequest, NextResponse } from 'next/server'
import { getAvailableSlots } from '@/services/availability'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('businessId')
    const serviceId = searchParams.get('serviceId')
    const date = searchParams.get('date')

    if (!businessId || !serviceId || !date) {
      return NextResponse.json(
        { error: 'businessId, serviceId, and date are required' },
        { status: 400 }
      )
    }

    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    const slots = await getAvailableSlots(businessId, serviceId, dateObj)

    return NextResponse.json(
      {
        slots: slots.map((slot) => ({
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
        })),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching available slots:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

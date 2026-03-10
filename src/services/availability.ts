import { prisma } from '@/lib/prisma'
import { addMinutes, format, parse, isWithinInterval, startOfDay } from 'date-fns'

export interface TimeSlot {
  start: Date
  end: Date
}

/**
 * Generates available time slots for a business service on a given date
 * Filters out slots that overlap with existing bookings
 */
export async function getAvailableSlots(
  businessId: string,
  serviceId: string,
  date: Date
): Promise<TimeSlot[]> {
  // Get the service to know its duration
  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      businessId: businessId,
    },
  })

  if (!service) {
    throw new Error('Service not found')
  }

  // Get the day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = date.getDay()

  // Get business availability for this day
  const availability = await prisma.availability.findUnique({
    where: {
      businessId_dayOfWeek: {
        businessId,
        dayOfWeek,
      },
    },
  })

  if (!availability) {
    return [] // No availability for this day
  }

  // Parse start and end times
  const dayStart = startOfDay(date)
  const startTime = parse(availability.startTime, 'HH:mm', dayStart)
  const endTime = parse(availability.endTime, 'HH:mm', dayStart)

  // Get all existing bookings for this business on this date
  const startOfDate = startOfDay(date)
  const endOfDate = new Date(startOfDate)
  endOfDate.setHours(23, 59, 59, 999)

  const existingBookings = await prisma.booking.findMany({
    where: {
      businessId,
      status: 'CONFIRMED',
      slotStart: {
        gte: startOfDate,
        lte: endOfDate,
      },
    },
    select: {
      slotStart: true,
      slotEnd: true,
    },
  })

  // Generate all possible slots
  const slots: TimeSlot[] = []
  let currentSlotStart = new Date(startTime)

  while (currentSlotStart < endTime) {
    const currentSlotEnd = addMinutes(currentSlotStart, service.duration)

    // Check if this slot would go past the end time
    if (currentSlotEnd > endTime) {
      break
    }

    // Check if this slot overlaps with any existing booking
    const hasOverlap = existingBookings.some((booking) => {
      // Check if slots overlap
      // Two slots overlap if: slotStart < booking.slotEnd && slotEnd > booking.slotStart
      return (
        currentSlotStart < booking.slotEnd &&
        currentSlotEnd > booking.slotStart
      )
    })

    if (!hasOverlap) {
      slots.push({
        start: new Date(currentSlotStart),
        end: new Date(currentSlotEnd),
      })
    }

    // Move to next slot (increment by service duration)
    currentSlotStart = addMinutes(currentSlotStart, service.duration)
  }

  return slots
}

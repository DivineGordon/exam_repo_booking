'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, addDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { X, Calendar, Clock } from 'lucide-react'

interface BookingModalProps {
  service: {
    id: string
    name: string
    duration: number
    price: number
    businessId: string
  }
  onClose: () => void
}

export function BookingModal({ service, onClose }: BookingModalProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null)

  // Fetch available slots for selected date
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', service.businessId, service.id, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null
      const response = await fetch(
        `/api/availability/slots?businessId=${service.businessId}&serviceId=${service.id}&date=${selectedDate.toISOString()}`
      )
      if (!response.ok) throw new Error('Failed to fetch available slots')
      return response.json()
    },
    enabled: !!selectedDate,
  })

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (slotStart: string) => {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          slotStart,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create booking')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      toast({
        title: 'Success',
        description: 'Booking created successfully!',
      })
      onClose()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  const handleBook = () => {
    if (!selectedSlot) return
    createBookingMutation.mutate(selectedSlot.start)
  }

  // Generate next 30 days for date selection
  const availableDates = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Book {service.name}</CardTitle>
              <CardDescription>
                {service.duration} minutes • ${service.price}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Selection */}
          <div>
            <h3 className="font-semibold mb-3">Select a Date</h3>
            <div className="grid grid-cols-5 gap-2">
              {availableDates.map((date) => (
                <Button
                  key={date.toISOString()}
                  variant={selectedDate?.toDateString() === date.toDateString() ? 'default' : 'outline'}
                  onClick={() => handleDateSelect(date)}
                  className="flex flex-col h-auto py-2"
                >
                  <span className="text-xs">{format(date, 'EEE')}</span>
                  <span className="text-sm font-semibold">{format(date, 'd')}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Time Slot Selection */}
          {selectedDate && (
            <div>
              <h3 className="font-semibold mb-3">Select a Time</h3>
              {slotsLoading ? (
                <p className="text-gray-500">Loading available slots...</p>
              ) : slotsData?.slots?.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {slotsData.slots.map((slot: { start: string; end: string }, index: number) => {
                    const start = new Date(slot.start)
                    const end = new Date(slot.end)
                    const isSelected =
                      selectedSlot?.start === slot.start && selectedSlot?.end === slot.end

                    return (
                      <Button
                        key={index}
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={() => setSelectedSlot(slot)}
                        className="flex items-center gap-2"
                      >
                        <Clock className="h-4 w-4" />
                        {format(start, 'HH:mm')}
                      </Button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500">No available slots for this date.</p>
              )}
            </div>
          )}

          {/* Booking Summary */}
          {selectedSlot && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <h3 className="font-semibold">Booking Summary</h3>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                {selectedDate && format(selectedDate, 'EEEE, MMMM dd, yyyy')}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                {format(new Date(selectedSlot.start), 'HH:mm')} -{' '}
                {format(new Date(selectedSlot.end), 'HH:mm')}
              </div>
              <div className="text-sm font-semibold">Total: ${service.price}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleBook}
              disabled={!selectedSlot || createBookingMutation.isPending}
              className="flex-1"
            >
              {createBookingMutation.isPending ? 'Booking...' : 'Confirm Booking'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

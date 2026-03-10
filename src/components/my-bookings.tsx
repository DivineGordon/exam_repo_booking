'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react'

export function MyBookings() {
  const [page, setPage] = useState(1)
  const limit = 10

  const { data, isLoading, error } = useQuery({
    queryKey: ['bookings', 'consumer', page],
    queryFn: async () => {
      const response = await fetch(`/api/bookings?page=${page}&limit=${limit}`)
      if (!response.ok) throw new Error('Failed to fetch bookings')
      return response.json()
    },
  })

  if (isLoading) {
    return <div className="text-center py-8">Loading bookings...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Error loading bookings. Please try again.
      </div>
    )
  }

  const { bookings, pagination } = data || {}

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
        <p className="text-gray-600">View and manage your appointments</p>
      </div>

      {bookings?.length > 0 ? (
        <>
          <div className="space-y-4">
            {bookings.map((booking: any) => (
              <Card key={booking.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">{booking.service.name}</h3>
                      <p className="text-sm text-gray-600">
                        Business: {booking.business.email}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(booking.slotStart), 'EEEE, MMMM dd, yyyy')}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        {format(new Date(booking.slotStart), 'HH:mm')} -{' '}
                        {format(new Date(booking.slotEnd), 'HH:mm')}
                      </div>
                      <div className="text-sm font-semibold">${booking.service.price}</div>
                    </div>
                    <span
                      className={`px-3 py-1 text-sm rounded ${
                        booking.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">You don't have any bookings yet.</p>
            <Button className="mt-4" onClick={() => window.location.href = '/dashboard/consumer'}>
              Explore Services
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

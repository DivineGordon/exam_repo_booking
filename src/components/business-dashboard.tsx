'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Plus, Calendar, Clock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { AvailabilityManager } from './availability-manager'

const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  duration: z.coerce.number().int().positive('Duration must be a positive integer'),
  price: z.coerce.number().positive('Price must be positive'),
})

type ServiceFormData = z.infer<typeof serviceSchema>

export function BusinessDashboard() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showServiceForm, setShowServiceForm] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
  })

  // Fetch user info to get businessId
  const { data: userData } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me')
      if (!response.ok) throw new Error('Failed to fetch user')
      return response.json()
    },
  })

  // Fetch services
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', 'business', userData?.user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/services?businessId=${userData?.user?.id}`)
      if (!response.ok) throw new Error('Failed to fetch services')
      return response.json()
    },
    enabled: !!userData?.user?.id,
  })

  // Fetch bookings
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', 'business'],
    queryFn: async () => {
      const response = await fetch('/api/bookings?page=1&limit=10')
      if (!response.ok) throw new Error('Failed to fetch bookings')
      return response.json()
    },
  })

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create service')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      toast({
        title: 'Success',
        description: 'Service created successfully',
      })
      reset()
      setShowServiceForm(false)
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: ServiceFormData) => {
    createServiceMutation.mutate(data)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Business Dashboard</h1>
        <Button onClick={() => setShowServiceForm(!showServiceForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {showServiceForm ? 'Cancel' : 'Create Service'}
        </Button>
      </div>

      {showServiceForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Service</CardTitle>
            <CardDescription>Add a new service to your business</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name</Label>
                <Input id="name" {...register('name')} placeholder="e.g., Haircut" />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    {...register('duration')}
                    placeholder="30"
                  />
                  {errors.duration && (
                    <p className="text-sm text-destructive">{errors.duration.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    {...register('price')}
                    placeholder="50.00"
                  />
                  {errors.price && (
                    <p className="text-sm text-destructive">{errors.price.message}</p>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={createServiceMutation.isPending}>
                {createServiceMutation.isPending ? 'Creating...' : 'Create Service'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Services</CardTitle>
            <CardDescription>Services you offer</CardDescription>
          </CardHeader>
          <CardContent>
            {servicesLoading ? (
              <p>Loading services...</p>
            ) : servicesData?.services?.length > 0 ? (
              <>
                <div className="space-y-4">
                  {servicesData.services.slice(0, 5).map((service: any) => (
                    <div
                      key={service.id}
                      className="p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <h3 className="font-semibold">{service.name}</h3>
                      <p className="text-sm text-gray-600">
                        {service.duration} min • ${service.price}
                      </p>
                    </div>
                  ))}
                </div>
                {servicesData.services.length > 5 && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.location.href = '/dashboard/business/services'
                      }}
                    >
                      View all services
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500">No services yet. Create your first service!</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bookings</CardTitle>
            <CardDescription>Recent bookings for your services</CardDescription>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <p>Loading bookings...</p>
            ) : bookingsData?.bookings?.length > 0 ? (
              <>
                <div className="space-y-4">
                  {bookingsData.bookings.slice(0, 5).map((booking: any) => (
                    <div
                      key={booking.id}
                      className="p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{booking.service.name}</h3>
                          <p className="text-sm text-gray-600">{booking.consumer.email}</p>
                          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(booking.slotStart), 'MMM dd, yyyy')}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            {format(new Date(booking.slotStart), 'HH:mm')} -{' '}
                            {format(new Date(booking.slotEnd), 'HH:mm')}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            booking.status === 'CONFIRMED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {bookingsData.bookings.length > 5 && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.location.href = '/dashboard/business/bookings'
                      }}
                    >
                      View all bookings
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500">No bookings yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
          <CardDescription>Set your availability for each day of the week</CardDescription>
        </CardHeader>
        <CardContent>
          <AvailabilityManager />
        </CardContent>
      </Card>
    </div>
  )
}

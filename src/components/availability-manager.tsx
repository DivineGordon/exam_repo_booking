'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const availabilitySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
})

type AvailabilityFormData = z.infer<typeof availabilitySchema>

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function AvailabilityManager({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  // Fetch user info
  const { data: userData } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me')
      if (!response.ok) throw new Error('Failed to fetch user')
      return response.json()
    },
  })

  // Fetch existing availability
  const { data: availabilityData } = useQuery({
    queryKey: ['availability', userData?.user?.id],
    queryFn: async () => {
      if (!userData?.user?.id) return null
      const response = await fetch(`/api/availability?businessId=${userData.user.id}`)
      if (!response.ok) throw new Error('Failed to fetch availability')
      return response.json()
    },
    enabled: !!userData?.user?.id,
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AvailabilityFormData>({
    resolver: zodResolver(availabilitySchema),
  })

  const dayOfWeek = watch('dayOfWeek')

  const createAvailabilityMutation = useMutation({
    mutationFn: async (data: AvailabilityFormData) => {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save availability')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      toast({
        title: 'Success',
        description: 'Availability saved successfully',
      })
      if (onSuccess) onSuccess()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: AvailabilityFormData) => {
    createAvailabilityMutation.mutate(data)
  }

  const existingAvailability = availabilityData?.availability || []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((day, index) => {
          const existing = existingAvailability.find((a: any) => a.dayOfWeek === index)
          return (
            <Button
              key={index}
              variant={selectedDay === index ? 'default' : existing ? 'secondary' : 'outline'}
              onClick={() => {
                setSelectedDay(index)
                setValue('dayOfWeek', index)
                if (existing) {
                  setValue('startTime', existing.startTime)
                  setValue('endTime', existing.endTime)
                } else {
                  setValue('startTime', '09:00')
                  setValue('endTime', '17:00')
                }
              }}
              className="flex flex-col h-auto py-2"
            >
              <span className="text-xs">{day.slice(0, 3)}</span>
              {existing && (
                <span className="text-xs mt-1">
                  {existing.startTime}-{existing.endTime}
                </span>
              )}
            </Button>
          )
        })}
      </div>

      {selectedDay !== null && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-semibold">Set hours for {DAYS[selectedDay]}</h3>
          <input type="hidden" {...register('dayOfWeek')} value={selectedDay} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                {...register('startTime')}
                placeholder="09:00"
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                {...register('endTime')}
                placeholder="17:00"
              />
              {errors.endTime && (
                <p className="text-sm text-destructive">{errors.endTime.message}</p>
              )}
            </div>
          </div>
          <Button type="submit" disabled={createAvailabilityMutation.isPending}>
            {createAvailabilityMutation.isPending ? 'Saving...' : 'Save Availability'}
          </Button>
        </form>
      )}
    </div>
  )
}

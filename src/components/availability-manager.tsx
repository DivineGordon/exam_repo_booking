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

const timeStringSchema = z
  .string()
  .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)')

const availabilitySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
})

const blockSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
})

type AvailabilityFormData = z.infer<typeof availabilitySchema>
type BlockFormData = z.infer<typeof blockSchema>

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

  // Fetch blocked times
  const { data: blockedData } = useQuery({
    queryKey: ['availability-blocks', userData?.user?.id],
    queryFn: async () => {
      if (!userData?.user?.id) return null
      const response = await fetch(
        `/api/availability/blocks?businessId=${userData.user.id}`
      )
      if (!response.ok) throw new Error('Failed to fetch blocked hours')
      return response.json()
    },
    enabled: !!userData?.user?.id,
  })

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AvailabilityFormData>({
    resolver: zodResolver(availabilitySchema),
  })

  const {
    register: registerBlock,
    handleSubmit: handleSubmitBlock,
    setValue: setBlockValue,
    formState: { errors: blockErrors },
    reset: resetBlockForm,
  } = useForm<BlockFormData>({
    resolver: zodResolver(blockSchema),
  })

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

  const createBlockMutation = useMutation({
    mutationFn: async (data: BlockFormData) => {
      const response = await fetch('/api/availability/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save blocked hours')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-blocks'] })
      toast({
        title: 'Success',
        description: 'Blocked hours saved successfully',
      })
      resetBlockForm()
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const deleteBlockMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch('/api/availability/blocks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete blocked hours')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability-blocks'] })
      toast({
        title: 'Success',
        description: 'Blocked hours removed',
      })
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

  const onSubmitBlock = (data: BlockFormData) => {
    createBlockMutation.mutate(data)
  }

  const existingAvailability = availabilityData?.availability || []
  const existingBlocks = blockedData?.blocks || []

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
                setBlockValue('dayOfWeek', index)
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
        <div className="space-y-6 p-4 border rounded-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <h3 className="font-semibold">Set opening hours for {DAYS[selectedDay]}</h3>
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

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">
              Block specific hours on {DAYS[selectedDay]}
            </h4>
            <form
              onSubmit={handleSubmitBlock(onSubmitBlock)}
              className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end"
            >
              <input
                type="hidden"
                {...registerBlock('dayOfWeek')}
                value={selectedDay}
              />
              <div className="space-y-1">
                <Label htmlFor="blockStartTime">From</Label>
                <Input
                  id="blockStartTime"
                  type="time"
                  {...registerBlock('startTime')}
                  placeholder="12:00"
                />
                {blockErrors.startTime && (
                  <p className="text-xs text-destructive">
                    {blockErrors.startTime.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="blockEndTime">To</Label>
                <Input
                  id="blockEndTime"
                  type="time"
                  {...registerBlock('endTime')}
                  placeholder="13:00"
                />
                {blockErrors.endTime && (
                  <p className="text-xs text-destructive">
                    {blockErrors.endTime.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                size="sm"
                disabled={createBlockMutation.isPending}
              >
                {createBlockMutation.isPending ? 'Adding...' : 'Add Block'}
              </Button>
            </form>

            <div className="space-y-2">
              {existingBlocks
                .filter((b: any) => b.dayOfWeek === selectedDay)
                .length === 0 ? (
                <p className="text-xs text-gray-500">
                  No blocked hours for this day.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {existingBlocks
                    .filter((b: any) => b.dayOfWeek === selectedDay)
                    .map((block: any) => (
                      <li
                        key={block.id}
                        className="flex items-center justify-between rounded border px-2 py-1"
                      >
                        <span>
                          {block.startTime} - {block.endTime}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => deleteBlockMutation.mutate(block.id)}
                          disabled={deleteBlockMutation.isPending}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

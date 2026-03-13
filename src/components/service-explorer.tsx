'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, DollarSign } from 'lucide-react'
import { BookingModal } from './booking-modal'

export function ServiceExplorer() {
  const [selectedService, setSelectedService] = useState<any>(null)
  const [serviceQuery, setServiceQuery] = useState('')
  const [businessFilter, setBusinessFilter] = useState<string | 'all'>('all')

  const { data, isLoading, error } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await fetch('/api/services')
      if (!response.ok) throw new Error('Failed to fetch services')
      return response.json()
    },
  })

  const services = data?.services ?? []

  const businessOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>()
    services.forEach((service: any) => {
      if (service.business?.id && !map.has(service.business.id)) {
        map.set(service.business.id, {
          id: service.business.id,
          label: service.business.name || service.business.email,
        })
      }
    })
    return Array.from(map.values())
  }, [services])

  const filteredServices = useMemo(() => {
    const q = serviceQuery.toLowerCase().trim()
    return services.filter((service: any) => {
      const matchesService =
        !q ||
        service.name.toLowerCase().includes(q)

      const matchesBusiness =
        businessFilter === 'all' || service.business?.id === businessFilter

      return matchesService && matchesBusiness
    })
  }, [services, serviceQuery, businessFilter])

  if (isLoading) {
    return <div className="text-center py-8">Loading services...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Error loading services. Please try again.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Explore Services</h1>
          <p className="text-gray-600">Book appointments with businesses</p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">Filter by service</label>
            <Input
              placeholder="Search by service name..."
              value={serviceQuery}
              onChange={(e) => setServiceQuery(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64 space-y-1">
            <label className="text-sm font-medium">Filter by business</label>
            <Select
              value={businessFilter}
              onValueChange={(value) => setBusinessFilter(value as string | 'all')}
            >
              <SelectTrigger>
                <SelectValue placeholder="All businesses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All businesses</SelectItem>
                {businessOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredServices.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service: any) => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader>
                <CardTitle>{service.name}</CardTitle>
                <CardDescription>
                  by{' '}
                  <Link
                    href={`/business/${service.business.id}`}
                    className="underline underline-offset-2 hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {service.business.email}
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    {service.duration} minutes
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="h-4 w-4" />
                    ${service.price}
                  </div>
                </div>
                <Button
                  className="w-full mt-auto"
                  onClick={() => setSelectedService(service)}
                >
                  Book Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No services match your filters.
        </div>
      )}

      {selectedService && (
        <BookingModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}
    </div>
  )
}

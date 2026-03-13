'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function BusinessServices() {
  const [page, setPage] = useState(1)
  const limit = 10

  const { data, isLoading, error } = useQuery({
    queryKey: ['services', 'business-all', page],
    queryFn: async () => {
      // Services API is not paginated; fetch all for the business
      const response = await fetch('/api/auth/me')
      if (!response.ok) throw new Error('Failed to fetch user')
      const userData = await response.json()

      const servicesResponse = await fetch(`/api/services?businessId=${userData.user.id}`)
      if (!servicesResponse.ok) throw new Error('Failed to fetch services')
      const servicesJson = await servicesResponse.json()

      const services = servicesJson.services || []
      const total = services.length
      const totalPages = Math.max(1, Math.ceil(total / limit))
      const start = (page - 1) * limit
      const end = start + limit

      return {
        services: services.slice(start, end),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      }
    },
  })

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

  const { services, pagination } = data || {}

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">All Services</h1>
        <p className="text-gray-600">
          Paginated list of all services you offer (10 per page)
        </p>
      </div>

      {services?.length > 0 ? (
        <>
          <div className="space-y-4">
            {services.map((service: any) => (
              <Card key={service.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{service.name}</h3>
                      <p className="text-sm text-gray-600">
                        {service.duration} min • ${service.price}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

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
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">You have not created any services yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


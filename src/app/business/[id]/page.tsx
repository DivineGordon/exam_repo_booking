import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Navbar } from '@/components/navbar'

interface BusinessPageProps {
  params: {
    id: string
  }
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  const business = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      businessServices: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!business || business.role !== 'BUSINESS') {
    notFound()
  }

  const displayName = business.name || business.email

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="w-full">
        {/* Cover section */}
        <div className="relative h-48 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
          {business.coverPhotoUrl && (
            // Use a background image div instead of next/image to avoid config
            <div
              className="absolute inset-0 bg-cover bg-center opacity-75"
              style={{ backgroundImage: `url(${business.coverPhotoUrl})` }}
            />
          )}
          <div className="relative h-full flex items-end">
            <div className="container mx-auto px-4 pb-6">
              <div className="bg-white bg-opacity-90 rounded-lg px-4 py-3 inline-block shadow">
                <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                <p className="text-sm text-gray-600">
                  {business.bio || 'Services offered by this business'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-2">About</h2>
            <p className="text-gray-700">
              {business.bio ||
                'This business has not added a description yet, but you can browse their services below.'}
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Services</h2>
              <span className="text-sm text-gray-500">
                {business.businessServices.length} service
                {business.businessServices.length === 1 ? '' : 's'}
              </span>
            </div>

            {business.businessServices.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {business.businessServices.map((service) => (
                  <Card key={service.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle>{service.name}</CardTitle>
                      <CardDescription>
                        {service.duration} min • ${service.price}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500">
                        To book this service, go back to the consumer dashboard and choose it from
                        the Explore Services page.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">This business has not added any services yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}


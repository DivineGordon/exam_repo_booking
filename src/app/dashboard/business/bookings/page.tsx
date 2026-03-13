import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Navbar } from '@/components/navbar'
import { BusinessBookings } from '@/components/business-bookings'

export default async function BusinessBookingsPage() {
  const session = await getSession()

  if (!session || session.role !== 'BUSINESS') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userRole={session.role} userEmail={session.email} />
      <div className="container mx-auto px-4 py-8">
        <BusinessBookings />
      </div>
    </div>
  )
}


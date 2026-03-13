import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Navbar } from '@/components/navbar'
import { MyBookings } from '@/components/my-bookings'

export default async function MyBookingsPage() {
  const session = await getSession()

  if (!session || session.role !== 'CONSUMER') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userRole={session.role} userEmail={session.email} />
      <div className="container mx-auto px-4 py-8">
        <MyBookings />
      </div>
    </div>
  )
}

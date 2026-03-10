import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Navbar } from '@/components/navbar'
import { BusinessDashboard } from '@/components/business-dashboard'

export default async function BusinessDashboardPage() {
  const session = await getSession()

  if (!session || session.role !== 'BUSINESS') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userRole={session.role} />
      <div className="container mx-auto px-4 py-8">
        <BusinessDashboard />
      </div>
    </div>
  )
}

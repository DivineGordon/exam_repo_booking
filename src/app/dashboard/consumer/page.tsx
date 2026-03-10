import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Navbar } from '@/components/navbar'
import { ServiceExplorer } from '@/components/service-explorer'

export default async function ConsumerDashboardPage() {
  const session = await getSession()

  if (!session || session.role !== 'CONSUMER') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userRole={session.role} />
      <div className="container mx-auto px-4 py-8">
        <ServiceExplorer />
      </div>
    </div>
  )
}

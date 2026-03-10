import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function Home() {
  const session = await getSession()

  if (session) {
    if (session.role === 'BUSINESS') {
      redirect('/dashboard/business')
    } else {
      redirect('/dashboard/consumer')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Booking System
          </h1>
          <p className="text-gray-600">
            Manage your services or book appointments
          </p>
        </div>
        <div className="space-y-4">
          <Link href="/register" className="block">
            <Button className="w-full" size="lg">
              Get Started
            </Button>
          </Link>
          <Link href="/login" className="block">
            <Button variant="outline" className="w-full" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

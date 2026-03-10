'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { LogOut } from 'lucide-react'

export function Navbar({ userRole }: { userRole?: 'BUSINESS' | 'CONSUMER' }) {
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Logged out successfully',
        })
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to logout',
        variant: 'destructive',
      })
    }
  }

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary">
          Booking System
        </Link>
        <div className="flex items-center gap-4">
          {userRole === 'BUSINESS' && (
            <Link href="/dashboard/business">
              <Button variant="ghost">Dashboard</Button>
            </Link>
          )}
          {userRole === 'CONSUMER' && (
            <>
              <Link href="/dashboard/consumer">
                <Button variant="ghost">Explore Services</Button>
              </Link>
              <Link href="/dashboard/consumer/bookings">
                <Button variant="ghost">My Bookings</Button>
              </Link>
            </>
          )}
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  )
}

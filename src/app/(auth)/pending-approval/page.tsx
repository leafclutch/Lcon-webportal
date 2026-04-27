'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'

export default function PendingApprovalPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Poll every 10 seconds for approval
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('users')
        .select('is_approved')
        .eq('id', user.id)
        .single()

      if (profile?.is_approved) {
        clearInterval(interval)
        router.push('/dashboard')
        router.refresh()
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <Clock className="h-7 w-7 text-amber-600" />
        </div>
        <CardTitle className="text-2xl">Awaiting Approval</CardTitle>
        <CardDescription>
          Your account has been created and is pending review by an administrator.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-gray-500">
          You&apos;ll be automatically redirected once your account is approved.
          This page checks for approval every 10 seconds.
        </p>
        <div className="flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          Waiting for administrator approval…
        </div>
        <Button variant="outline" onClick={handleSignOut} className="w-full">
          Sign out
        </Button>
      </CardContent>
    </Card>
  )
}

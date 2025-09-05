import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-6xl font-bold text-red-600">403</h1>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-gray-600">
            You don&apos;t have permission to access this page.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Please contact your administrator if you believe this is an error.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Button asChild className="w-full">
            <Link href="/dashboard">
              Return to Dashboard
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/signin">
              Sign In with Different Account
            </Link>
          </Button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-left">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Role Requirements</h3>
          <div className="text-xs text-blue-600 space-y-1">
            <div><strong>Technician:</strong> Dashboard, Quick Entry, L-J Charts</div>
            <div><strong>Supervisor:</strong> All technician features + Reports + CAPA approval</div>
            <div><strong>QA/QC:</strong> All supervisor features + Test/Unit management</div>
            <div><strong>Administrator:</strong> All features + User/Device management</div>
          </div>
        </div>
      </div>
    </div>
  )
}
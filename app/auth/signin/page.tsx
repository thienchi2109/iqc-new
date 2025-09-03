'use client'

import Image from 'next/image'
import { useState, useCallback } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function SignIn() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    console.log('Attempting to sign in with username:', username)

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      console.log('SignIn result:', result)

      if (result?.error) {
        console.error('SignIn error:', result.error)
        setError('Tên đăng nhập hoặc mật khẩu không hợp lệ')
      } else if (result?.ok) {
        console.log('SignIn successful, checking session...')
        const session = await getSession()
        console.log('Session after signin:', session)
        if (session) {
          console.log('Session found, redirecting to dashboard')
          router.push('/dashboard')
        } else {
          console.error('No session found after successful signin')
          setError('Đăng nhập thành công nhưng không thể tạo phiên. Vui lòng thử lại.')
        }
      }
    } catch (err) {
      console.error('SignIn exception:', err)
      setError('Đã có lỗi xảy ra. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-md border border-gray-200">
        <div className="text-center mb-8">
          <Image src="https://i.postimg.cc/CLD5SNvf/profit-1508216.png" alt="C-Lab IQC Pro Logo" width={80} height={80} className="mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-blue-600">
                C-Lab IQC Pro
            </h1>
            <h2 className="mt-2 text-xl text-gray-600">
                Đăng nhập vào tài khoản của bạn
            </h2>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Tên đăng nhập
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập của bạn"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu của bạn"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Tài khoản demo</h3>
          <div className="text-xs text-blue-600 space-y-1">
            <div><strong>admin</strong> / password123 (Quản trị viên)</div>
            <div><strong>qaqc1</strong> / password123 (Chuyên viên QA/QC)</div>
            <div><strong>supervisor1</strong> / password123 (Giám sát viên)</div>
            <div><strong>tech1</strong> / password123 (Kỹ thuật viên)</div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Phát triển bởi Nguyễn Thiện Chí</p>
        </div>
      </div>
    </div>
  )
}


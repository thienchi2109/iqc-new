'use client'

import Image from 'next/image'
import { useState, useCallback } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { User, Lock, ChevronDown, ChevronUp } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export default function SignIn() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDemoOpen, setIsDemoOpen] = useState(false)
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

  const handleDemoLogin = (demoUsername: string) => {
    setUsername(demoUsername)
    setPassword('password123')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-4xl shadow-2xl overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[600px]">
          {/* Left Column - Branding */}
          <div className="lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-8 lg:p-12 flex flex-col justify-center items-center text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 -left-4 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
              <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-500"></div>
            </div>
            
            <div className="relative z-10 text-center">
              <div className="mb-8">
                <Image 
                  src="https://i.postimg.cc/CLD5SNvf/profit-1508216.png" 
                  alt="C-Lab IQC Pro Logo" 
                  width={120} 
                  height={120} 
                  className="mx-auto mb-6 drop-shadow-lg" 
                />
                <h1 className="text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
                  C-Lab IQC Pro
                </h1>
                <p className="text-xl lg:text-2xl text-blue-100 mb-8 font-light">
                  Clinical Laboratory Internal Quality Control
                </p>
              </div>
              
              <div className="space-y-4 text-blue-100">
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-sm lg:text-base">Real-time Quality Monitoring</span>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-sm lg:text-base">Westgard Rules Evaluation</span>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-sm lg:text-base">ISO 15189 Compliance</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Login Form */}
          <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
            <div className="w-full max-w-sm mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  Đăng nhập
                </h2>
                <p className="text-slate-600">
                  Vui lòng nhập thông tin để tiếp tục
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username" className="text-sm font-medium text-slate-700">
                      Tên đăng nhập
                    </Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Nhập tên đăng nhập"
                        className="pl-10 h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                      Mật khẩu
                    </Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nhập mật khẩu"
                        className="pl-10 h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>
              </form>

              {/* Collapsible Demo Accounts */}
              <div className="mt-8">
                <Collapsible open={isDemoOpen} onOpenChange={setIsDemoOpen}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center justify-between text-slate-600 border-slate-300 hover:bg-slate-50"
                    >
                      <span className="text-sm font-medium">Tài khoản demo</span>
                      {isDemoOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                      <div className="text-xs text-slate-600 mb-3 font-medium">Nhấp để điền tự động:</div>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          type="button"
                          onClick={() => handleDemoLogin('admin')}
                          className="text-left p-2 hover:bg-white rounded text-xs transition-colors duration-150 border border-transparent hover:border-slate-300"
                        >
                          <div className="font-medium text-slate-900">admin</div>
                          <div className="text-slate-600">Quản trị viên</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDemoLogin('qaqc1')}
                          className="text-left p-2 hover:bg-white rounded text-xs transition-colors duration-150 border border-transparent hover:border-slate-300"
                        >
                          <div className="font-medium text-slate-900">qaqc1</div>
                          <div className="text-slate-600">Chuyên viên QA/QC</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDemoLogin('supervisor1')}
                          className="text-left p-2 hover:bg-white rounded text-xs transition-colors duration-150 border border-transparent hover:border-slate-300"
                        >
                          <div className="font-medium text-slate-900">supervisor1</div>
                          <div className="text-slate-600">Giám sát viên</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDemoLogin('tech1')}
                          className="text-left p-2 hover:bg-white rounded text-xs transition-colors duration-150 border border-transparent hover:border-slate-300"
                        >
                          <div className="font-medium text-slate-900">tech1</div>
                          <div className="text-slate-600">Kỹ thuật viên</div>
                        </button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Minimal Footer */}
              <div className="mt-8 text-center">
                <p className="text-xs text-slate-500">
                  © 2024 C-Lab IQC Pro. Phát triển bởi Nguyễn Thiện Chí
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}


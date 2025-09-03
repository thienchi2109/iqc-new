'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

interface User {
  id: string
  name?: string | null
  email?: string | null
  role: string
}

interface HeaderNavProps {
  user: User
}

import { navigation } from '@/lib/navigation'

export default function HeaderNav({ user }: HeaderNavProps) {
  const pathname = usePathname()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  )

  const getRoleDisplayName = (role: string) => {
    const roleMap = {
      tech: 'Kỹ thuật viên',
      supervisor: 'Giám sát viên', 
      qaqc: 'QA/QC',
      admin: 'Quản trị viên'
    }
    return roleMap[role as keyof typeof roleMap] || role
  }

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex-shrink-0 flex items-center space-x-2">
              <Image src="https://i.postimg.cc/CLD5SNvf/profit-1508216.png" alt="C-Lab IQC Pro Logo" width={40} height={40} />
              <span className="text-xl font-bold text-blue-600">C-Lab IQC Pro</span>
            </Link>
          </div>

          {/* Navigation Menu */}
          <div className="flex items-center space-x-8">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href || 
                             (item.href !== '/dashboard' && pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-2xl text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-gray-100 transition-colors duration-150"
            >
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user.name || user.email}
                </div>
                <div className="text-xs text-gray-500">
                  {getRoleDisplayName(user.role)}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-md border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="text-sm font-medium text-gray-900">
                    {user.name || user.email}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getRoleDisplayName(user.role)}
                  </div>
                </div>
                
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  Hồ sơ
                </Link>
                
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    signOut({ callbackUrl: '/auth/signin' })
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {isUserMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </nav>
  )
}
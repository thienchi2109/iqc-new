'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const filteredNavigation = navigation.filter(item => item.roles.includes(user.role))

  const getRoleDisplayName = (role: string) => {
    const roleMap = {
      tech: 'Kỹ thuật viên',
      supervisor: 'Giám sát viên',
      qaqc: 'QA/QC',
      admin: 'Quản trị viên',
    }
    return roleMap[role as keyof typeof roleMap] || role
  }

  return (
    <nav className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo and Title */}
          <div className="flex items-center min-w-0 flex-shrink-0">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Image src="https://i.postimg.cc/CLD5SNvf/profit-1508216.png" alt="C-Lab IQC Pro Logo" width={32} height={32} className="sm:w-10 sm:h-10" />
              <span className="hidden md:block text-lg xl:text-xl font-extrabold text-blue-600">C-Lab IQC Pro</span>
              <span className="md:hidden text-base font-extrabold text-blue-600">C-Lab</span>
            </Link>
          </div>

          {/* Desktop Navigation Menu */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-3 flex-1 justify-center max-w-4xl">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-2 py-2 rounded-xl text-xs xl:text-sm transition-colors duration-150 whitespace-nowrap ${
                    isActive ? 'font-semibold bg-blue-100 text-blue-700' : 'font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Right side: Mobile menu button and User menu */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-2 rounded-2xl hover:bg-gray-100 transition-colors duration-150"
              >
                <div className="hidden xl:block text-right min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-24">{user.name || user.email}</div>
                  <div className="text-xs text-gray-500">{getRoleDisplayName(user.role)}</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-white">
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-md border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="text-sm font-medium text-gray-900">{user.name || user.email}</div>
                    <div className="text-xs text-gray-500">{getRoleDisplayName(user.role)}</div>
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

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`block px-3 py-2 rounded-md text-base transition-colors duration-150 ${
                      isActive ? 'font-semibold bg-blue-100 text-blue-700' : 'font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close dropdowns */}
      {(isUserMenuOpen || isMobileMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsUserMenuOpen(false)
            setIsMobileMenuOpen(false)
          }}
        />
      )}
    </nav>
  )
}

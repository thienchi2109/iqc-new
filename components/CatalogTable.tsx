'use client'

import { useState } from 'react'
import { Search, Plus, Edit, Trash2, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface Column<T = any> {
  key: string
  label: string
  sortable?: boolean
  searchable?: boolean
  render?: (value: any, item: T) => React.ReactNode
  width?: string
}

export interface CatalogTableProps<T = any> {
  data: T[]
  columns: Column<T>[]
  isLoading?: boolean
  searchPlaceholder?: string
  onAdd?: () => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  onSearch?: (query: string) => void
  showActiveFilter?: boolean
  onActiveFilterChange?: (isActive: boolean | null) => void
  activeFilter?: boolean | null
  addButtonLabel?: string
  emptyMessage?: string
  className?: string
}

export default function CatalogTable<T extends { id: string; isActive?: boolean }>({
  data,
  columns,
  isLoading = false,
  searchPlaceholder = 'Search...',
  onAdd,
  onEdit,
  onDelete,
  onSearch,
  showActiveFilter = false,
  onActiveFilterChange,
  activeFilter = null,
  addButtonLabel = 'Add New',
  emptyMessage = 'No data found',
  className = '',
}: CatalogTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleSort = (columnKey: string) => {
    if (columns.find(col => col.key === columnKey)?.sortable) {
      if (sortColumn === columnKey) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
      } else {
        setSortColumn(columnKey)
        setSortDirection('asc')
      }
    }
  }

  const renderCellValue = (column: Column<T>, item: T) => {
    const value = (item as any)[column.key]
    
    if (column.render) {
      return column.render(value, item)
    }

    // Handle special cases
    if (column.key === 'isActive' && typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      )
    }

    return value || '-'
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl shadow-md border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl shadow-md border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 flex gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Active Filter */}
            {showActiveFilter && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Select
                  value={activeFilter === null ? 'all' : activeFilter ? 'active' : 'inactive'}
                  onChange={(e) => {
                    const value = e.target.value
                    onActiveFilterChange?.(
                      value === 'all' ? null : value === 'active'
                    )
                  }}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
            )}
          </div>

          {/* Add Button */}
          {onAdd && (
            <Button onClick={onAdd} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {addButtonLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={`${column.sortable ? 'cursor-pointer hover:bg-gray-50' : ''} ${column.width || ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && (
                      <div className="flex flex-col">
                        <div className={`w-0 h-0 border-l-[3px] border-r-[3px] border-b-[4px] border-l-transparent border-r-transparent ${
                          sortColumn === column.key && sortDirection === 'asc' 
                            ? 'border-b-gray-900' 
                            : 'border-b-gray-300'
                        }`} />
                        <div className={`w-0 h-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent ${
                          sortColumn === column.key && sortDirection === 'desc' 
                            ? 'border-t-gray-900' 
                            : 'border-t-gray-300'
                        }`} />
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
              {(onEdit || onDelete) && (
                <TableHead className="w-24">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="text-center py-8 text-gray-500">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {renderCellValue(column, item)}
                    </TableCell>
                  ))}
                  {(onEdit || onDelete) && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {onEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(item)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(item)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination would go here if needed */}
      {data.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
          Showing {data.length} items
        </div>
      )}
    </div>
  )
}
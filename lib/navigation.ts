export const navigation = [
  { name: 'Bảng điều khiển', href: '/dashboard', roles: ['tech', 'supervisor', 'qaqc', 'admin'] },
  { name: 'Nhập QC', href: '/quick-entry', roles: ['tech', 'supervisor', 'qaqc', 'admin'] },
  { name: 'Duyệt QC', href: '/approval-inbox', roles: ['supervisor', 'qaqc', 'admin'] },
  { name: 'Biểu đồ L-J', href: '/lj-chart', roles: ['tech', 'supervisor', 'qaqc', 'admin'] },
  { name: 'Quy tắc Westgard', href: '/settings/westgard', roles: ['qaqc', 'admin'] },
  { name: 'Danh mục', href: '/settings/catalog', roles: ['qaqc', 'admin'] },
  { name: 'Báo cáo', href: '/reports', roles: ['supervisor', 'qaqc', 'admin'] },
  { name: 'Cài đặt', href: '/settings', roles: ['admin'] },
]

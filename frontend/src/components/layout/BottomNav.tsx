import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Play,
  LineChart,
  History,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '대시보드' },
  { to: '/trading', icon: Play, label: '자동매매' },
  { to: '/strategies', icon: LineChart, label: '전략' },
  { to: '/history', icon: History, label: '이력' },
  { to: '/settings', icon: Settings, label: '설정' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur-lg safe-area-bottom md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-2 pt-3 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-gray-400 active:text-gray-600'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                    isActive && 'bg-primary/10 scale-110'
                  )}
                >
                  <item.icon
                    className={cn('h-5 w-5', isActive && 'stroke-[2.5]')}
                  />
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium',
                    isActive && 'font-semibold'
                  )}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

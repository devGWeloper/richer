import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Play,
  LineChart,
  History,
  Settings,
  TrendingUp,
  X,
  LogOut,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useWSStore } from '@/stores/wsStore'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '대시보드', desc: '자산 현황 및 수익률' },
  { to: '/trading', icon: Play, label: '자동매매', desc: '전략 실행 및 관리' },
  { to: '/strategies', icon: LineChart, label: '전략관리', desc: '전략 생성 및 설정' },
  { to: '/history', icon: History, label: '거래이력', desc: '매매 기록 조회' },
  { to: '/settings', icon: Settings, label: '설정', desc: '계좌 및 API 설정' },
]

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { user, handleLogout } = useAuth()
  const connected = useWSStore((s) => s.connected)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleLogoutClick = () => {
    onClose()
    handleLogout()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-[280px] transform bg-white shadow-2xl transition-transform duration-300 ease-out safe-area-left md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4 safe-area-top">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <span className="text-lg font-bold text-primary">Richer</span>
              <p className="text-[11px] text-gray-500">주식 자동매매</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 transition-colors active:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* User Info */}
        <div className="border-b px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <User className="h-6 w-6 text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{user?.username || '...'}</p>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    connected ? 'animate-pulse bg-green-500' : 'bg-gray-400'
                  )}
                />
                {connected ? (
                  <Wifi className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-gray-400" />
                )}
                <span
                  className={cn(
                    'text-xs',
                    connected ? 'text-green-600' : 'text-gray-500'
                  )}
                >
                  {connected ? '실시간 연결됨' : '연결 끊김'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-3 transition-all active:scale-[0.98]',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 active:bg-gray-100'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                        isActive ? 'bg-primary/20' : 'bg-gray-100'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={cn('font-medium', isActive && 'font-semibold')}>
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t p-4 safe-area-bottom">
          <button
            onClick={handleLogoutClick}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 font-medium text-gray-600 transition-colors active:bg-gray-200"
          >
            <LogOut className="h-5 w-5" />
            로그아웃
          </button>
        </div>
      </div>
    </>
  )
}

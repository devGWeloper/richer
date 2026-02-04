import { Menu, TrendingUp, Wifi, WifiOff } from 'lucide-react'
import { useWSStore } from '@/stores/wsStore'
import { useLocation } from 'react-router-dom'

const pageTitles: Record<string, string> = {
  '/': '대시보드',
  '/trading': '자동매매',
  '/strategies': '전략관리',
  '/history': '거래이력',
  '/settings': '설정',
}

interface MobileHeaderProps {
  onMenuClick: () => void
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const connected = useWSStore((s) => s.connected)
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Richer'

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white/95 px-4 backdrop-blur-lg safe-area-top md:hidden">
      <button
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-colors active:bg-gray-100"
        aria-label="메뉴 열기"
      >
        <Menu className="h-6 w-6" />
      </button>

      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
      </div>

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          connected ? 'bg-green-50' : 'bg-gray-100'
        }`}
      >
        {connected ? (
          <Wifi className="h-5 w-5 text-green-600" />
        ) : (
          <WifiOff className="h-5 w-5 text-gray-400" />
        )}
      </div>
    </header>
  )
}

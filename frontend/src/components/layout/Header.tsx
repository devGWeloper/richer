import { LogOut, User, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useWSStore } from '@/stores/wsStore'

export default function Header() {
  const { user, handleLogout } = useAuth()
  const connected = useWSStore((s) => s.connected)

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div
        className={`flex items-center gap-2 rounded-full px-3 py-1 ${
          connected ? 'bg-green-50' : 'bg-gray-100'
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? 'animate-pulse bg-green-500' : 'bg-gray-400'
          }`}
        />
        {connected ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-gray-400" />
        )}
        <span
          className={`text-xs font-medium ${
            connected ? 'text-green-700' : 'text-gray-500'
          }`}
        >
          {connected ? '실시간' : '연결 끊김'}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          <span>{user?.username || '...'}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </header>
  )
}

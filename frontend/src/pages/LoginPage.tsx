import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { TrendingUp, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const { isAuthenticated, handleLogin, handleRegister } = useAuth()
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await handleRegister(username, password)
      } else {
        await handleLogin(username, password)
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail || '오류가 발생했습니다. 다시 시도해주세요.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gray-50 px-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-6 shadow-lg md:rounded-xl md:p-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 md:h-12 md:w-12 md:rounded-xl">
              <TrendingUp className="h-8 w-8 text-primary md:h-7 md:w-7" />
            </div>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 md:text-3xl">Richer</h1>
          <p className="mt-2 text-sm text-gray-500">
            한국투자증권 주식 자동매매 시스템
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 md:rounded-md md:p-3">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              사용자명
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              className="input-mobile"
              placeholder="사용자명 입력"
              autoComplete="username"
              autoCapitalize="none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              비밀번호
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input-mobile pr-12"
                placeholder="비밀번호 입력"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-primary py-3.5 text-base font-medium text-white shadow-sm active:bg-primary/90 disabled:opacity-50 md:rounded-md md:py-2.5 md:text-sm"
          >
            {loading ? '처리중...' : isRegister ? '회원가입' : '로그인'}
          </button>
        </form>

        {/* Toggle */}
        <div className="text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister)
              setError('')
            }}
            className="rounded-lg px-4 py-2 text-sm font-medium text-primary active:bg-primary/5"
          >
            {isRegister
              ? '이미 계정이 있으신가요? 로그인'
              : '계정이 없으신가요? 회원가입'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-gray-400">
        KIS API를 통한 안전한 자동매매
      </p>
    </div>
  )
}

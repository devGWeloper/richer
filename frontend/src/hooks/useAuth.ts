import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api/auth'

export function useAuth() {
  const { user, isAuthenticated, setUser, login, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && !user) {
      authApi
        .getMe()
        .then((res) => setUser(res.data))
        .catch(() => logout())
    }
  }, [isAuthenticated, user, setUser, logout])

  const handleLogin = async (username: string, password: string) => {
    const { data } = await authApi.login(username, password)
    login(data.access_token, data.refresh_token)
    const me = await authApi.getMe()
    setUser(me.data)
    navigate('/')
  }

  const handleRegister = async (username: string, password: string) => {
    const { data } = await authApi.register(username, password)
    login(data.access_token, data.refresh_token)
    const me = await authApi.getMe()
    setUser(me.data)
    navigate('/')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return { user, isAuthenticated, handleLogin, handleRegister, handleLogout }
}

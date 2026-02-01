import client from './client'
import type { TokenResponse } from '@/lib/types'

export const authApi = {
  register: (username: string, password: string) =>
    client.post<TokenResponse>('/auth/register', { username, password }),

  login: (username: string, password: string) =>
    client.post<TokenResponse>('/auth/login', { username, password }),

  refresh: (refresh_token: string) =>
    client.post<TokenResponse>('/auth/refresh', { refresh_token }),

  getMe: () => client.get('/auth/me'),
}

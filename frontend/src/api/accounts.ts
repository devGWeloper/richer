import client from './client'
import type { Account } from '@/lib/types'

export const accountsApi = {
  list: () => client.get<Account[]>('/accounts'),

  create: (data: {
    label: string
    app_key: string
    app_secret: string
    account_no: string
    account_suffix?: string
    environment?: string
    hts_id?: string
  }) => client.post<Account>('/accounts', data),

  update: (id: number, data: { label?: string; environment?: string; hts_id?: string; is_active?: boolean }) =>
    client.put<Account>(`/accounts/${id}`, data),

  delete: (id: number) => client.delete(`/accounts/${id}`),

  verify: (id: number) =>
    client.post<{ success: boolean; message: string; balance?: any }>(`/accounts/${id}/verify`),
}

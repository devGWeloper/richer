import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tradingApi } from '@/api/trading'
import { toast } from '@/stores/toastStore'

export function useActiveSessions() {
  return useQuery({
    queryKey: ['trading', 'active'],
    queryFn: () => tradingApi.active().then((r) => r.data),
    refetchInterval: 5000,
  })
}

export function useSessions() {
  return useQuery({
    queryKey: ['trading', 'sessions'],
    queryFn: () => tradingApi.sessions().then((r) => r.data),
  })
}

export function useStartTrading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: tradingApi.start,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['trading'] })
      toast.success(`${response.data.stock_name || response.data.stock_code} 자동매매가 시작되었습니다`)
    },
    // Error toast is handled globally by axios interceptor
  })
}

export function useStopTrading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: number) => tradingApi.stop(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading'] })
      toast.success('자동매매가 중지되었습니다')
    },
  })
}

export function usePauseTrading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: number) => tradingApi.pause(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading'] })
      toast.info('자동매매가 일시정지되었습니다')
    },
  })
}

export function useResumeTrading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: number) => tradingApi.resume(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading'] })
      toast.success('자동매매가 재개되었습니다')
    },
  })
}

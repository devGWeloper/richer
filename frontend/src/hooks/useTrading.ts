import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tradingApi } from '@/api/trading'

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading'] })
    },
  })
}

export function useStopTrading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: number) => tradingApi.stop(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading'] })
    },
  })
}

export function usePauseTrading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: number) => tradingApi.pause(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading'] })
    },
  })
}

export function useResumeTrading() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: number) => tradingApi.resume(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading'] })
    },
  })
}

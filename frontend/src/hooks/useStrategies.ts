import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { strategiesApi } from '@/api/strategies'

export function useStrategies() {
  return useQuery({
    queryKey: ['strategies'],
    queryFn: () => strategiesApi.list().then((r) => r.data),
  })
}

export function useStrategyTypes() {
  return useQuery({
    queryKey: ['strategies', 'types'],
    queryFn: () => strategiesApi.types().then((r) => r.data),
  })
}

export function useCreateStrategy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: strategiesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
    },
  })
}

export function useUpdateStrategy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => strategiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
    },
  })
}

export function useDeleteStrategy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => strategiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
    },
  })
}

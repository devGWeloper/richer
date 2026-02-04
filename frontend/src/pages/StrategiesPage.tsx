import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react'
import {
  useStrategies,
  useStrategyTypes,
  useCreateStrategy,
  useDeleteStrategy,
} from '@/hooks/useStrategies'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { formatDateTime } from '@/lib/utils'

export default function StrategiesPage() {
  const { data: strategies, isLoading } = useStrategies()
  const { data: types } = useStrategyTypes()
  const createStrategy = useCreateStrategy()
  const deleteStrategy = useDeleteStrategy()

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [strategyType, setStrategyType] = useState('')
  const [params, setParams] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const selectedType = types?.find((t) => t.type_name === strategyType)

  const handleTypeChange = (type: string) => {
    setStrategyType(type)
    const found = types?.find((t) => t.type_name === type)
    if (found) {
      const defaults: Record<string, string> = {}
      for (const [key, schema] of Object.entries(found.parameter_schema)) {
        defaults[key] = String((schema as any).default || '')
      }
      setParams(defaults)
    }
  }

  const handleCreate = async () => {
    if (!name || !strategyType) return
    const parsed: Record<string, any> = {}
    for (const [key, value] of Object.entries(params)) {
      parsed[key] = Number(value) || value
    }
    await createStrategy.mutateAsync({
      name,
      strategy_type: strategyType,
      parameters: parsed,
    })
    setShowCreate(false)
    setName('')
    setStrategyType('')
    setParams({})
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="hidden text-2xl font-bold md:block">전략 관리</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white active:bg-primary/90 md:w-auto md:rounded-md md:px-4 md:py-2"
        >
          {showCreate ? (
            <>
              <X className="h-4 w-4" />
              취소
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              새 전략
            </>
          )}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-2xl border bg-white p-4 md:rounded-lg md:p-6">
          <h2 className="mb-4 text-lg font-semibold">전략 생성</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  전략 이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-mobile"
                  placeholder="예: 삼성전자 RSI 전략"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  전략 타입
                </label>
                <select
                  value={strategyType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="input-mobile"
                >
                  <option value="">선택</option>
                  {types?.map((t) => (
                    <option key={t.type_name} value={t.type_name}>
                      {t.display_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedType && (
              <>
                <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600 md:rounded-md">
                  {selectedType.description}
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {Object.entries(selectedType.parameter_schema).map(([key, schema]) => (
                    <div key={key}>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        {(schema as any).description || key}
                      </label>
                      <input
                        type="number"
                        value={params[key] || ''}
                        onChange={(e) =>
                          setParams((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="input-mobile"
                        placeholder={String((schema as any).default || '')}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!name || !strategyType || createStrategy.isPending}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-white active:bg-primary/90 disabled:opacity-50 md:flex-none md:rounded-md md:px-6 md:py-2"
              >
                {createStrategy.isPending ? '생성 중...' : '생성'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 rounded-xl border py-3 text-sm font-medium text-gray-700 active:bg-gray-50 md:flex-none md:rounded-md md:px-6 md:py-2"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strategy List */}
      <div className="rounded-2xl border bg-white md:rounded-lg">
        {!strategies?.length ? (
          <p className="p-6 text-center text-sm text-gray-500">등록된 전략이 없습니다</p>
        ) : (
          <>
            {/* Mobile: Card view */}
            <div className="divide-y md:hidden">
              {strategies.map((s) => (
                <div key={s.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-medium">{s.name}</h3>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            s.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {s.is_active ? '활성' : '비활성'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{s.strategy_type}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 active:bg-gray-100"
                      >
                        {expandedId === s.id ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(s.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 active:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {expandedId === s.id && (
                    <div className="mt-3 space-y-2">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs font-medium text-gray-500">파라미터</p>
                        <code className="mt-1 block text-xs text-gray-700">
                          {JSON.stringify(s.parameters, null, 2)}
                        </code>
                      </div>
                      <p className="text-xs text-gray-400">
                        생성일: {formatDateTime(s.created_at)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop: Table view */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="px-6 py-3">이름</th>
                    <th className="px-6 py-3">타입</th>
                    <th className="px-6 py-3">파라미터</th>
                    <th className="px-6 py-3">상태</th>
                    <th className="px-6 py-3">생성일</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {strategies.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-6 py-3 font-medium">{s.name}</td>
                      <td className="px-6 py-3">{s.strategy_type}</td>
                      <td className="px-6 py-3">
                        <code className="text-xs text-gray-600">
                          {JSON.stringify(s.parameters)}
                        </code>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            s.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {s.is_active ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-500">
                        {formatDateTime(s.created_at)}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => setConfirmDelete(s.id)}
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="전략 삭제"
        message="정말 이 전략을 삭제하시겠습니까?"
        confirmLabel="삭제"
        onConfirm={() => {
          if (confirmDelete) deleteStrategy.mutate(confirmDelete)
          setConfirmDelete(null)
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}

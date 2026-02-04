import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react'
import { accountsApi } from '@/api/accounts'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { toast } from '@/stores/toastStore'
import { formatDateTime } from '@/lib/utils'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list().then((r) => r.data),
  })

  const [showAdd, setShowAdd] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState({
    label: '',
    app_key: '',
    app_secret: '',
    account_no: '',
    account_suffix: '01',
    environment: 'vps',
    hts_id: '',
  })
  const [verifyResult, setVerifyResult] = useState<{
    id: number
    success: boolean
    message: string
  } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!form.label.trim()) {
      errors.label = '계좌 별명을 입력해주세요'
    }
    if (!form.app_key.trim()) {
      errors.app_key = 'App Key를 입력해주세요'
    } else if (form.app_key.length < 20) {
      errors.app_key = 'App Key가 너무 짧습니다'
    }
    if (!form.app_secret.trim()) {
      errors.app_secret = 'App Secret을 입력해주세요'
    } else if (form.app_secret.length < 20) {
      errors.app_secret = 'App Secret이 너무 짧습니다'
    }
    if (!form.account_no.trim()) {
      errors.account_no = '계좌번호를 입력해주세요'
    } else if (!/^\d{8}$/.test(form.account_no.replace('-', ''))) {
      errors.account_no = '계좌번호 형식이 올바르지 않습니다 (8자리 숫자)'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      createMutation.mutate()
    }
  }

  const createMutation = useMutation({
    mutationFn: () => accountsApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setShowAdd(false)
      setForm({
        label: '',
        app_key: '',
        app_secret: '',
        account_no: '',
        account_suffix: '01',
        environment: 'vps',
        hts_id: '',
      })
      setFormErrors({})
      toast.success('계좌가 등록되었습니다')
    },
    onError: () => {
      toast.error('계좌 등록에 실패했습니다. 입력 정보를 확인해주세요.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => accountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('계좌가 삭제되었습니다')
    },
  })

  const verifyMutation = useMutation({
    mutationFn: (id: number) => accountsApi.verify(id),
    onSuccess: (res, id) => {
      setVerifyResult({ id, ...res.data })
    },
    onError: (error: any, id) => {
      const message = error?.response?.data?.detail || error?.message || '연결 실패'
      setVerifyResult({ id, success: false, message })
    },
  })

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="hidden text-2xl font-bold md:block">설정</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white active:bg-primary/90 md:w-auto md:rounded-md md:px-4 md:py-2"
        >
          {showAdd ? (
            <>
              <X className="h-4 w-4" />
              취소
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              계좌 추가
            </>
          )}
        </button>
      </div>

      {/* Add Account Form */}
      {showAdd && (
        <div className="rounded-2xl border bg-white p-4 md:rounded-lg md:p-6">
          <h2 className="mb-4 text-lg font-semibold">KIS API 계좌 등록</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  계좌 별명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => {
                    setForm({ ...form, label: e.target.value })
                    if (formErrors.label) setFormErrors({ ...formErrors, label: '' })
                  }}
                  className={`input-mobile ${
                    formErrors.label ? 'border-red-500 bg-red-50' : ''
                  }`}
                  placeholder="예: 내 모의투자 계좌"
                />
                {formErrors.label && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.label}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">환경</label>
                <select
                  value={form.environment}
                  onChange={(e) => setForm({ ...form, environment: e.target.value })}
                  className="input-mobile"
                >
                  <option value="vps">모의투자</option>
                  <option value="prod">실전투자</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  App Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={form.app_key}
                  onChange={(e) => {
                    setForm({ ...form, app_key: e.target.value })
                    if (formErrors.app_key) setFormErrors({ ...formErrors, app_key: '' })
                  }}
                  autoComplete="off"
                  className={`input-mobile ${
                    formErrors.app_key ? 'border-red-500 bg-red-50' : ''
                  }`}
                />
                {formErrors.app_key && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.app_key}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  App Secret <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={form.app_secret}
                  onChange={(e) => {
                    setForm({ ...form, app_secret: e.target.value })
                    if (formErrors.app_secret) setFormErrors({ ...formErrors, app_secret: '' })
                  }}
                  autoComplete="off"
                  className={`input-mobile ${
                    formErrors.app_secret ? 'border-red-500 bg-red-50' : ''
                  }`}
                />
                {formErrors.app_secret && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.app_secret}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="col-span-2 md:col-span-1">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  계좌번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.account_no}
                  onChange={(e) => {
                    setForm({ ...form, account_no: e.target.value })
                    if (formErrors.account_no) setFormErrors({ ...formErrors, account_no: '' })
                  }}
                  className={`input-mobile ${
                    formErrors.account_no ? 'border-red-500 bg-red-50' : ''
                  }`}
                  placeholder="50012345"
                />
                {formErrors.account_no && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.account_no}</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  상품코드
                </label>
                <input
                  type="text"
                  value={form.account_suffix}
                  onChange={(e) => setForm({ ...form, account_suffix: e.target.value })}
                  className="input-mobile"
                  placeholder="01"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  HTS ID
                </label>
                <input
                  type="text"
                  value={form.hts_id}
                  onChange={(e) => setForm({ ...form, hts_id: e.target.value })}
                  className="input-mobile"
                  placeholder="선택 입력"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-medium text-white active:bg-primary/90 disabled:opacity-50 md:flex-none md:rounded-md md:px-6 md:py-2"
              >
                {createMutation.isPending ? '등록 중...' : '등록'}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-xl border py-3 text-sm font-medium text-gray-700 active:bg-gray-50 md:flex-none md:rounded-md md:px-6 md:py-2"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account List */}
      <div className="rounded-2xl border bg-white md:rounded-lg">
        <div className="border-b px-4 py-3 md:px-6 md:py-4">
          <h2 className="font-semibold md:text-lg">등록된 계좌</h2>
        </div>
        {isLoading ? (
          <div className="p-6">
            <LoadingSpinner />
          </div>
        ) : !accounts?.length ? (
          <p className="p-6 text-center text-sm text-gray-500">
            등록된 계좌가 없습니다. 위 버튼을 눌러 계좌를 추가하세요.
          </p>
        ) : (
          <div className="divide-y">
            {accounts.map((a) => (
              <div key={a.id} className="p-4 md:px-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          a.environment === 'prod'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {a.environment === 'prod' ? '실전' : '모의'}
                      </span>
                      {a.is_active ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          활성
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                          비활성
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      계좌: {a.account_no_masked}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 active:bg-gray-100 md:hidden"
                    >
                      {expandedId === a.id ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(a.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 active:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Content (Mobile) / Always visible (Desktop) */}
                <div className={`${expandedId === a.id ? 'block' : 'hidden'} md:block`}>
                  <div className="mt-3 text-xs text-gray-400">
                    등록일: {formatDateTime(a.created_at)}
                  </div>

                  {/* Verify Result */}
                  {verifyResult?.id === a.id && (
                    <div
                      className={`mt-3 flex items-center gap-2 rounded-xl p-3 text-sm md:rounded-md ${
                        verifyResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {verifyResult.success ? (
                        <CheckCircle className="h-5 w-5 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 shrink-0" />
                      )}
                      <span>{verifyResult.message}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => verifyMutation.mutate(a.id)}
                      disabled={verifyMutation.isPending}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium text-gray-700 active:bg-gray-50 disabled:opacity-50 md:flex-none md:rounded-md md:px-4 md:py-2"
                    >
                      {verifyMutation.isPending && verifyMutation.variables === a.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      연결 테스트
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="계좌 삭제"
        message="정말 이 계좌를 삭제하시겠습니까? 관련된 데이터는 유지됩니다."
        confirmLabel="삭제"
        onConfirm={() => {
          if (confirmDelete) deleteMutation.mutate(confirmDelete)
          setConfirmDelete(null)
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}

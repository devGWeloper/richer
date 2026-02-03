import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react'
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">설정</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          계좌 추가
        </button>
      </div>

      {/* Add Account Form */}
      {showAdd && (
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">KIS API 계좌 등록</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                계좌 별명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => {
                  setForm({ ...form, label: e.target.value })
                  if (formErrors.label) setFormErrors({ ...formErrors, label: '' })
                }}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
                  formErrors.label ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="예: 내 모의투자 계좌"
              />
              {formErrors.label && (
                <p className="mt-1 text-xs text-red-500">{formErrors.label}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">환경</label>
              <select
                value={form.environment}
                onChange={(e) => setForm({ ...form, environment: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="vps">모의투자</option>
                <option value="prod">실전투자</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
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
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
                  formErrors.app_key ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {formErrors.app_key && (
                <p className="mt-1 text-xs text-red-500">{formErrors.app_key}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
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
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
                  formErrors.app_secret ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {formErrors.app_secret && (
                <p className="mt-1 text-xs text-red-500">{formErrors.app_secret}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                계좌번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.account_no}
                onChange={(e) => {
                  setForm({ ...form, account_no: e.target.value })
                  if (formErrors.account_no) setFormErrors({ ...formErrors, account_no: '' })
                }}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
                  formErrors.account_no ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="50012345"
              />
              {formErrors.account_no && (
                <p className="mt-1 text-xs text-red-500">{formErrors.account_no}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                상품코드 (기본 01)
              </label>
              <input
                type="text"
                value={form.account_suffix}
                onChange={(e) => setForm({ ...form, account_suffix: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                HTS ID (선택)
              </label>
              <input
                type="text"
                value={form.hts_id}
                onChange={(e) => setForm({ ...form, hts_id: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? '등록 중...' : '등록'}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Account List */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">등록된 계좌</h2>
        </div>
        {isLoading ? (
          <LoadingSpinner />
        ) : !accounts?.length ? (
          <p className="p-6 text-sm text-gray-500">
            등록된 계좌가 없습니다. 위 버튼을 눌러 계좌를 추가하세요.
          </p>
        ) : (
          <div className="divide-y">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div>
                  <div className="flex items-center gap-2">
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
                    계좌: {a.account_no_masked} | 등록:{' '}
                    {formatDateTime(a.created_at)}
                  </div>
                  {verifyResult?.id === a.id && (
                    <div
                      className={`mt-2 flex items-center gap-1 text-sm ${
                        verifyResult.success ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {verifyResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {verifyResult.message}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => verifyMutation.mutate(a.id)}
                    disabled={verifyMutation.isPending}
                    className="rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {verifyMutation.isPending &&
                    verifyMutation.variables === a.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      '연결 테스트'
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(a.id)}
                    className="rounded p-1.5 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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

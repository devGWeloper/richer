import { useState } from 'react'
import { Play, Square, Pause, RotateCcw, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { marketApi } from '@/api/market'
import { accountsApi } from '@/api/accounts'
import {
  useActiveSessions,
  useStartTrading,
  useStopTrading,
  usePauseTrading,
  useResumeTrading,
} from '@/hooks/useTrading'
import { useStrategies } from '@/hooks/useStrategies'
import StatusBadge from '@/components/common/StatusBadge'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { formatNumber, formatDateTime } from '@/lib/utils'
import type { StockSearchResult } from '@/lib/types'

export default function TradingPage() {
  const { data: sessions, isLoading } = useActiveSessions()
  const { data: strategies } = useStrategies()
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list().then((r) => r.data),
  })
  const startTrading = useStartTrading()
  const stopTrading = useStopTrading()
  const pauseTrading = usePauseTrading()
  const resumeTrading = useResumeTrading()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([])
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<number>(0)
  const [selectedStrategy, setSelectedStrategy] = useState<number>(0)
  const [interval, setInterval] = useState(60)
  const [confirmStop, setConfirmStop] = useState<number | null>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    try {
      const { data } = await marketApi.search(searchQuery)
      setSearchResults(data.results)
    } catch {
      setSearchResults([])
    }
  }

  const handleStart = async () => {
    if (!selectedStock || !selectedAccount || !selectedStrategy) return
    await startTrading.mutateAsync({
      data: {
        account_id: selectedAccount,
        strategy_id: selectedStrategy,
        stock_code: selectedStock.stock_code,
        stock_name: selectedStock.stock_name,
        interval_seconds: interval,
      },
    })
    setSelectedStock(null)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">자동매매</h1>

      {/* Start Trading */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">매매 시작</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Stock Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700">종목 검색</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="종목명 또는 코드"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={handleSearch}
                className="rounded-md bg-gray-100 px-3 py-2 hover:bg-gray-200"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-white">
                {searchResults.map((s) => (
                  <button
                    key={s.stock_code}
                    onClick={() => {
                      setSelectedStock(s)
                      setSearchResults([])
                      setSearchQuery(`${s.stock_name} (${s.stock_code})`)
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    {s.stock_name} ({s.stock_code})
                    <span className="ml-2 text-xs text-gray-400">{s.market}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700">계좌</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value={0}>계좌 선택</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} ({a.account_no_masked})
                </option>
              ))}
            </select>
          </div>

          {/* Strategy */}
          <div>
            <label className="block text-sm font-medium text-gray-700">전략</label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value={0}>전략 선택</option>
              {strategies?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.strategy_type})
                </option>
              ))}
            </select>
          </div>

          {/* Interval + Start */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              실행 간격 (초)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                min={10}
                max={3600}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={handleStart}
                disabled={
                  !selectedStock ||
                  !selectedAccount ||
                  !selectedStrategy ||
                  startTrading.isPending
                }
                className="flex items-center gap-1 whitespace-nowrap rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                시작
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">활성 세션</h2>
        {isLoading ? (
          <LoadingSpinner />
        ) : !sessions?.length ? (
          <p className="text-sm text-gray-500">실행 중인 세션이 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2">ID</th>
                  <th className="pb-2">종목</th>
                  <th className="pb-2">전략</th>
                  <th className="pb-2">상태</th>
                  <th className="pb-2 text-right">거래수</th>
                  <th className="pb-2 text-right">손익</th>
                  <th className="pb-2">시작일시</th>
                  <th className="pb-2">제어</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2">{s.id}</td>
                    <td className="py-2">
                      <div className="font-medium">{s.stock_name || s.stock_code}</div>
                      <div className="text-xs text-gray-400">{s.stock_code}</div>
                    </td>
                    <td className="py-2">{s.strategy_id}</td>
                    <td className="py-2">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-2 text-right">{s.total_trades}</td>
                    <td
                      className={`py-2 text-right font-medium ${
                        s.total_pnl >= 0 ? 'text-red-600' : 'text-blue-600'
                      }`}
                    >
                      {formatNumber(s.total_pnl)}
                    </td>
                    <td className="py-2 text-xs text-gray-500">
                      {s.started_at ? formatDateTime(s.started_at) : '-'}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {s.status === 'running' && (
                          <button
                            onClick={() => pauseTrading.mutate(s.id)}
                            className="rounded p-1 text-yellow-600 hover:bg-yellow-50"
                            title="일시정지"
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                        )}
                        {s.status === 'paused' && (
                          <button
                            onClick={() => resumeTrading.mutate(s.id)}
                            className="rounded p-1 text-green-600 hover:bg-green-50"
                            title="재개"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        {['running', 'paused', 'pending'].includes(s.status) && (
                          <button
                            onClick={() => setConfirmStop(s.id)}
                            className="rounded p-1 text-red-600 hover:bg-red-50"
                            title="중지"
                          >
                            <Square className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmStop !== null}
        title="세션 중지"
        message="정말 이 자동매매 세션을 중지하시겠습니까?"
        confirmLabel="중지"
        onConfirm={() => {
          if (confirmStop) stopTrading.mutate(confirmStop)
          setConfirmStop(null)
        }}
        onCancel={() => setConfirmStop(null)}
      />
    </div>
  )
}

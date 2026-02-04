import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { dashboardApi } from '@/api/dashboard'
import { TRADE_SIDE, ORDER_STATUS } from '@/lib/constants'
import { formatNumber, formatDateTime } from '@/lib/utils'
import LoadingSpinner from '@/components/common/LoadingSpinner'

export default function HistoryPage() {
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<'trades' | 'logs'>('trades')
  const [logCategory, setLogCategory] = useState<string>('')

  const { data: trades, isLoading: tradesLoading } = useQuery({
    queryKey: ['trades', page],
    queryFn: () => dashboardApi.trades(page, 20).then((r) => r.data),
    enabled: tab === 'trades',
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['logs', page, logCategory],
    queryFn: () =>
      dashboardApi.logs(page, 50, logCategory || undefined).then((r) => r.data),
    enabled: tab === 'logs',
  })

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="hidden text-2xl font-bold md:block">거래 이력</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 md:rounded-lg">
        <button
          onClick={() => {
            setTab('trades')
            setPage(1)
          }}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all md:flex-none md:px-6 md:py-2 ${
            tab === 'trades'
              ? 'bg-white shadow'
              : 'text-gray-600 active:bg-white/50'
          }`}
        >
          거래 내역
        </button>
        <button
          onClick={() => {
            setTab('logs')
            setPage(1)
          }}
          className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all md:flex-none md:px-6 md:py-2 ${
            tab === 'logs'
              ? 'bg-white shadow'
              : 'text-gray-600 active:bg-white/50'
          }`}
        >
          시스템 로그
        </button>
      </div>

      {tab === 'trades' && (
        <div className="rounded-2xl border bg-white md:rounded-lg">
          {tradesLoading ? (
            <div className="p-6">
              <LoadingSpinner />
            </div>
          ) : !trades?.length ? (
            <p className="p-6 text-center text-sm text-gray-500">거래 이력이 없습니다</p>
          ) : (
            <>
              {/* Mobile: Card view */}
              <div className="divide-y md:hidden">
                {trades.map((t) => (
                  <div key={t.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                            t.side === 'BUY'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          {TRADE_SIDE[t.side as keyof typeof TRADE_SIDE]?.label || t.side}
                        </div>
                        <div>
                          <p className="font-medium">{t.stock_name || t.stock_code}</p>
                          <p className="text-xs text-gray-400">{t.stock_code}</p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          t.status === 'filled'
                            ? 'bg-green-100 text-green-700'
                            : t.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {ORDER_STATUS[t.status as keyof typeof ORDER_STATUS]?.label || t.status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">수량</p>
                        <p className="font-medium">{t.quantity}주</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">체결가</p>
                        <p className="font-medium">
                          {t.filled_price ? `${formatNumber(t.filled_price)}원` : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">유형</p>
                        <p className="font-medium">{t.order_type}</p>
                      </div>
                    </div>
                    {t.signal_reason && (
                      <p className="mt-2 truncate text-xs text-gray-500">
                        사유: {t.signal_reason}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      {formatDateTime(t.created_at)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Desktop: Table view */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="px-4 py-3">일시</th>
                      <th className="px-4 py-3">종목</th>
                      <th className="px-4 py-3">매매</th>
                      <th className="px-4 py-3">유형</th>
                      <th className="px-4 py-3 text-right">수량</th>
                      <th className="px-4 py-3 text-right">체결가</th>
                      <th className="px-4 py-3">상태</th>
                      <th className="px-4 py-3">사유</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {formatDateTime(t.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{t.stock_name || t.stock_code}</div>
                          <div className="text-xs text-gray-400">{t.stock_code}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-bold ${
                              TRADE_SIDE[t.side as keyof typeof TRADE_SIDE]?.color || ''
                            }`}
                          >
                            {TRADE_SIDE[t.side as keyof typeof TRADE_SIDE]?.label || t.side}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{t.order_type}</td>
                        <td className="px-4 py-3 text-right">{t.quantity}</td>
                        <td className="px-4 py-3 text-right">
                          {t.filled_price ? formatNumber(t.filled_price) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-medium ${
                              ORDER_STATUS[t.status as keyof typeof ORDER_STATUS]?.color || ''
                            }`}
                          >
                            {ORDER_STATUS[t.status as keyof typeof ORDER_STATUS]?.label || t.status}
                          </span>
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-xs text-gray-500">
                          {t.signal_reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['', 'engine', 'strategy', 'order', 'system'].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setLogCategory(cat)
                  setPage(1)
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  logCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                }`}
              >
                {cat || '전체'}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border bg-white md:rounded-lg">
            {logsLoading ? (
              <div className="p-6">
                <LoadingSpinner />
              </div>
            ) : !(logs as any[])?.length ? (
              <p className="p-6 text-center text-sm text-gray-500">로그가 없습니다</p>
            ) : (
              <div className="divide-y">
                {(logs as any[]).map((log: any) => (
                  <div key={log.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-lg px-2 py-0.5 text-xs font-mono ${
                          log.level === 'ERROR'
                            ? 'bg-red-100 text-red-700'
                            : log.level === 'WARN'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {log.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        {log.created_at ? formatDateTime(log.created_at) : ''}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="flex h-10 w-10 items-center justify-center rounded-xl border text-gray-600 active:bg-gray-50 disabled:opacity-50 md:h-auto md:w-auto md:rounded-md md:px-4 md:py-2"
        >
          <ChevronLeft className="h-5 w-5 md:hidden" />
          <span className="hidden md:inline">이전</span>
        </button>
        <span className="min-w-[80px] text-center text-sm text-gray-600">
          {page} 페이지
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border text-gray-600 active:bg-gray-50 md:h-auto md:w-auto md:rounded-md md:px-4 md:py-2"
        >
          <ChevronRight className="h-5 w-5 md:hidden" />
          <span className="hidden md:inline">다음</span>
        </button>
      </div>
    </div>
  )
}

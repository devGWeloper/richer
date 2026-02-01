import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">거래 이력</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => { setTab('trades'); setPage(1) }}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            tab === 'trades' ? 'bg-white shadow' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          거래 내역
        </button>
        <button
          onClick={() => { setTab('logs'); setPage(1) }}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            tab === 'logs' ? 'bg-white shadow' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          시스템 로그
        </button>
      </div>

      {tab === 'trades' && (
        <div className="rounded-lg border bg-white">
          {tradesLoading ? (
            <LoadingSpinner />
          ) : !trades?.length ? (
            <p className="p-6 text-sm text-gray-500">거래 이력이 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
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
                        <div className="font-medium">
                          {t.stock_name || t.stock_code}
                        </div>
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
                            ORDER_STATUS[t.status as keyof typeof ORDER_STATUS]?.color ||
                            ''
                          }`}
                        >
                          {ORDER_STATUS[t.status as keyof typeof ORDER_STATUS]?.label ||
                            t.status}
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
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['', 'engine', 'strategy', 'order', 'system'].map((cat) => (
              <button
                key={cat}
                onClick={() => { setLogCategory(cat); setPage(1) }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  logCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat || '전체'}
              </button>
            ))}
          </div>

          <div className="rounded-lg border bg-white">
            {logsLoading ? (
              <LoadingSpinner />
            ) : !(logs as any[])?.length ? (
              <p className="p-6 text-sm text-gray-500">로그가 없습니다</p>
            ) : (
              <div className="divide-y">
                {(logs as any[]).map((log: any) => (
                  <div key={log.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-mono ${
                          log.level === 'ERROR'
                            ? 'bg-red-100 text-red-700'
                            : log.level === 'WARN'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-xs text-gray-400">{log.category}</span>
                      <span className="text-xs text-gray-400">
                        {log.created_at ? formatDateTime(log.created_at) : ''}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          이전
        </button>
        <span className="flex items-center px-3 text-sm text-gray-600">
          {page} 페이지
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          다음
        </button>
      </div>
    </div>
  )
}

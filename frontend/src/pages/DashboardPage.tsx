import { Link } from 'react-router-dom'
import { Wallet, TrendingUp, Activity, BarChart3, Briefcase, Clock } from 'lucide-react'
import { useDashboardSummary, useHoldings, useRecentTrades } from '@/hooks/useDashboard'
import { useWebSocket } from '@/hooks/useWebSocket'
import { formatNumber, formatPercent } from '@/lib/utils'
import { TRADE_SIDE, ORDER_STATUS } from '@/lib/constants'
import LoadingSpinner from '@/components/common/LoadingSpinner'

export default function DashboardPage() {
  useWebSocket()
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: holdingsData, isLoading: holdingsLoading } = useHoldings()
  const { data: recentTrades, isLoading: tradesLoading } = useRecentTrades()

  if (summaryLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Wallet className="h-5 w-5 text-blue-600" />}
          title="총 자산"
          value={`${formatNumber(summary?.total_balance || 0)}원`}
          bg="bg-blue-50"
        />
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          title="총 수익"
          value={`${formatNumber(summary?.total_profit || 0)}원`}
          subtitle={formatPercent(summary?.profit_rate || 0)}
          bg="bg-green-50"
        />
        <SummaryCard
          icon={<Activity className="h-5 w-5 text-purple-600" />}
          title="활성 세션"
          value={`${summary?.active_sessions || 0}개`}
          bg="bg-purple-50"
        />
        <SummaryCard
          icon={<BarChart3 className="h-5 w-5 text-orange-600" />}
          title="오늘 거래"
          value={`${summary?.total_trades_today || 0}건`}
          bg="bg-orange-50"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Holdings */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">보유종목</h2>
          {holdingsLoading ? (
            <LoadingSpinner />
          ) : !holdingsData?.holdings?.length ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Briefcase className="h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">아직 보유 중인 종목이 없습니다</p>
              <Link
                to="/trading"
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                자동매매 시작하기
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2">종목</th>
                    <th className="pb-2 text-right">수량</th>
                    <th className="pb-2 text-right">현재가</th>
                    <th className="pb-2 text-right">수익률</th>
                  </tr>
                </thead>
                <tbody>
                  {holdingsData.holdings.map((h) => (
                    <tr key={h.stock_code} className="border-b last:border-0">
                      <td className="py-2">
                        <div className="font-medium">{h.stock_name}</div>
                        <div className="text-xs text-gray-400">{h.stock_code}</div>
                      </td>
                      <td className="py-2 text-right">{formatNumber(h.quantity)}</td>
                      <td className="py-2 text-right">
                        {formatNumber(h.current_price)}
                      </td>
                      <td
                        className={`py-2 text-right font-medium ${
                          h.profit_rate >= 0 ? 'text-red-600' : 'text-blue-600'
                        }`}
                      >
                        {formatPercent(h.profit_rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Trades */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">최근 거래</h2>
          {tradesLoading ? (
            <LoadingSpinner />
          ) : !recentTrades?.length ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Clock className="h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">아직 거래 내역이 없습니다</p>
              <p className="mt-1 text-xs text-gray-400">
                자동매매가 실행되면 거래 내역이 여기에 표시됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTrades.slice(0, 10).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold ${
                          TRADE_SIDE[t.side as keyof typeof TRADE_SIDE]?.color || ''
                        }`}
                      >
                        {TRADE_SIDE[t.side as keyof typeof TRADE_SIDE]?.label || t.side}
                      </span>
                      <span className="font-medium">{t.stock_name || t.stock_code}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {t.quantity}주 @ {formatNumber(t.filled_price || t.price)}원
                    </div>
                  </div>
                  <span
                    className={`text-xs ${
                      ORDER_STATUS[t.status as keyof typeof ORDER_STATUS]?.color || ''
                    }`}
                  >
                    {ORDER_STATUS[t.status as keyof typeof ORDER_STATUS]?.label || t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  title,
  value,
  subtitle,
  bg,
}: {
  icon: React.ReactNode
  title: string
  value: string
  subtitle?: string
  bg: string
}) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${bg}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}

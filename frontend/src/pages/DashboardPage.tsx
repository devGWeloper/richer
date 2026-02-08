import { Link } from 'react-router-dom'
import { Wallet, TrendingUp, Activity, BarChart3, Briefcase, Clock, ChevronRight } from 'lucide-react'
import { useDashboardSummary, useHoldings, useRecentTrades } from '@/hooks/useDashboard'
import { useWebSocket } from '@/hooks/useWebSocket'
import { formatNumber, formatPercent } from '@/lib/utils'
import { TRADE_SIDE, ORDER_STATUS } from '@/lib/constants'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import MarketOverview from '@/components/dashboard/MarketOverview'
import PopularStocks from '@/components/dashboard/PopularStocks'

export default function DashboardPage() {
  useWebSocket()
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: holdingsData, isLoading: holdingsLoading } = useHoldings()
  const { data: recentTrades, isLoading: tradesLoading } = useRecentTrades()

  if (summaryLoading) return <LoadingSpinner />

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile: Hide title as it's in the header */}
      <h1 className="hidden text-2xl font-bold md:block">대시보드</h1>

      {/* Summary Cards - Mobile optimized grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-4 md:gap-4">
        <SummaryCard
          icon={<Wallet className="h-5 w-5 text-blue-600" />}
          title="총 자산"
          value={formatNumber(summary?.total_balance || 0)}
          unit="원"
          bg="bg-blue-50"
        />
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          title="총 수익"
          value={formatNumber(summary?.total_profit || 0)}
          unit="원"
          subtitle={formatPercent(summary?.profit_rate || 0)}
          bg="bg-green-50"
        />
        <SummaryCard
          icon={<Activity className="h-5 w-5 text-purple-600" />}
          title="활성 세션"
          value={String(summary?.active_sessions || 0)}
          unit="개"
          bg="bg-purple-50"
        />
        <SummaryCard
          icon={<BarChart3 className="h-5 w-5 text-orange-600" />}
          title="오늘 거래"
          value={String(summary?.total_trades_today || 0)}
          unit="건"
          bg="bg-orange-50"
        />
      </div>

      {/* Market Overview Section - KOSPI/KOSDAQ */}
      <MarketOverview />

      {/* Popular Stocks Section */}
      <PopularStocks />

      {/* Holdings Section */}
      <div className="rounded-2xl border bg-white md:rounded-lg">
        <div className="flex items-center justify-between border-b px-4 py-3 md:px-6 md:py-4">
          <h2 className="font-semibold md:text-lg">보유종목</h2>
          {holdingsData?.holdings?.length ? (
            <Link
              to="/trading"
              className="flex items-center text-sm text-primary"
            >
              더보기
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        {holdingsLoading ? (
          <div className="p-6">
            <LoadingSpinner />
          </div>
        ) : !holdingsData?.holdings?.length ? (
          <div className="flex flex-col items-center py-8 text-center px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 md:h-12 md:w-12">
              <Briefcase className="h-8 w-8 text-gray-300 md:h-6 md:w-6" />
            </div>
            <p className="mt-3 text-sm text-gray-500">아직 보유 중인 종목이 없습니다</p>
            <Link
              to="/trading"
              className="mt-3 rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary active:bg-primary/20 md:rounded-md"
            >
              자동매매 시작하기
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile: Card view */}
            <div className="divide-y md:hidden">
              {holdingsData.holdings.map((h) => (
                <div key={h.stock_code} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium">{h.stock_name}</p>
                    <p className="text-xs text-gray-400">{h.stock_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatNumber(h.current_price)}원</p>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-gray-500">{formatNumber(h.quantity)}주</span>
                      <span
                        className={`text-sm font-semibold ${
                          h.profit_rate >= 0 ? 'text-red-600' : 'text-blue-600'
                        }`}
                      >
                        {formatPercent(h.profit_rate)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table view */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="px-6 pb-3 pt-4">종목</th>
                    <th className="px-6 pb-3 pt-4 text-right">수량</th>
                    <th className="px-6 pb-3 pt-4 text-right">현재가</th>
                    <th className="px-6 pb-3 pt-4 text-right">수익률</th>
                  </tr>
                </thead>
                <tbody>
                  {holdingsData.holdings.map((h) => (
                    <tr key={h.stock_code} className="border-b last:border-0">
                      <td className="px-6 py-3">
                        <div className="font-medium">{h.stock_name}</div>
                        <div className="text-xs text-gray-400">{h.stock_code}</div>
                      </td>
                      <td className="px-6 py-3 text-right">{formatNumber(h.quantity)}</td>
                      <td className="px-6 py-3 text-right">{formatNumber(h.current_price)}</td>
                      <td
                        className={`px-6 py-3 text-right font-medium ${
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
          </>
        )}
      </div>

      {/* Recent Trades Section */}
      <div className="rounded-2xl border bg-white md:rounded-lg">
        <div className="flex items-center justify-between border-b px-4 py-3 md:px-6 md:py-4">
          <h2 className="font-semibold md:text-lg">최근 거래</h2>
          {recentTrades?.length ? (
            <Link
              to="/history"
              className="flex items-center text-sm text-primary"
            >
              더보기
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        {tradesLoading ? (
          <div className="p-6">
            <LoadingSpinner />
          </div>
        ) : !recentTrades?.length ? (
          <div className="flex flex-col items-center py-8 text-center px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 md:h-12 md:w-12">
              <Clock className="h-8 w-8 text-gray-300 md:h-6 md:w-6" />
            </div>
            <p className="mt-3 text-sm text-gray-500">아직 거래 내역이 없습니다</p>
            <p className="mt-1 text-xs text-gray-400">
              자동매매가 실행되면 거래 내역이 여기에 표시됩니다
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {recentTrades.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between px-4 py-3 md:px-6"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold md:h-8 md:w-8 md:rounded-lg ${
                      t.side === 'BUY'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {TRADE_SIDE[t.side as keyof typeof TRADE_SIDE]?.label || t.side}
                  </div>
                  <div>
                    <p className="font-medium">{t.stock_name || t.stock_code}</p>
                    <p className="text-xs text-gray-400">
                      {t.quantity}주 @ {formatNumber(t.filled_price || t.price)}원
                    </p>
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  title,
  value,
  unit,
  subtitle,
  bg,
}: {
  icon: React.ReactNode
  title: string
  value: string
  unit: string
  subtitle?: string
  bg: string
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 md:rounded-lg md:p-5">
      <div className="flex items-start gap-3">
        <div className={`rounded-xl p-2.5 md:rounded-lg md:p-2 ${bg}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 md:text-sm">{title}</p>
          <div className="mt-0.5 flex items-baseline gap-1">
            <p className="truncate text-lg font-bold md:text-xl">{value}</p>
            <span className="text-xs text-gray-500 md:text-sm">{unit}</span>
          </div>
          {subtitle && (
            <p className="mt-0.5 text-xs font-medium text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}

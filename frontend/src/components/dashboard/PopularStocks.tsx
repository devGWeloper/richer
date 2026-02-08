import { useState } from 'react'
import { TrendingUp, TrendingDown, BarChart3, Flame, ArrowDown } from 'lucide-react'
import { usePopularStocks } from '@/hooks/useMarket'
import { formatNumber, formatPercent } from '@/lib/utils'
import LoadingSpinner from '@/components/common/LoadingSpinner'

type Category = 'volume' | 'gainers' | 'losers'

const categoryConfig = {
  volume: {
    label: '거래량',
    icon: BarChart3,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    activeBg: 'bg-purple-600',
  },
  gainers: {
    label: '급상승',
    icon: Flame,
    color: 'text-red-600',
    bg: 'bg-red-100',
    activeBg: 'bg-red-600',
  },
  losers: {
    label: '급하락',
    icon: ArrowDown,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    activeBg: 'bg-blue-600',
  },
}

export default function PopularStocks() {
  const [category, setCategory] = useState<Category>('volume')
  const { data, isLoading, isError } = usePopularStocks(category, 'all', 5)

  return (
    <div className="rounded-2xl border bg-white md:rounded-lg">
      {/* Header with tabs */}
      <div className="border-b px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold md:text-lg">인기 종목</h2>
          <div className="flex gap-1">
            {(Object.keys(categoryConfig) as Category[]).map((cat) => {
              const config = categoryConfig[cat]
              const isActive = category === cat
              const Icon = config.icon
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? `${config.activeBg} text-white`
                      : `${config.bg} ${config.color} hover:opacity-80`
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{config.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : isError || !data?.stocks?.length ? (
        <div className="py-12 text-center text-sm text-gray-500">
          데이터를 불러올 수 없습니다
        </div>
      ) : (
        <div className="divide-y">
          {data.stocks.map((stock) => (
            <div
              key={stock.stock_code}
              className="flex items-center justify-between px-4 py-3 md:px-6"
            >
              <div className="flex items-center gap-3">
                {/* Rank Badge */}
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold ${
                    stock.rank === 1
                      ? 'bg-yellow-100 text-yellow-700'
                      : stock.rank === 2
                        ? 'bg-gray-200 text-gray-600'
                        : stock.rank === 3
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {stock.rank}
                </div>

                {/* Stock Info */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{stock.stock_name}</span>
                    <span
                      className={`rounded px-1 py-0.5 text-[10px] font-medium ${
                        stock.market === 'KOSPI'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-purple-50 text-purple-600'
                      }`}
                    >
                      {stock.market}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">
                    {stock.stock_code}
                  </div>
                </div>
              </div>

              {/* Price & Change */}
              <div className="text-right">
                <div className="font-medium">
                  {formatNumber(stock.current_price)}
                  <span className="text-xs text-gray-500">원</span>
                </div>
                <div
                  className={`flex items-center justify-end gap-1 text-sm ${
                    stock.change_rate > 0
                      ? 'text-red-600'
                      : stock.change_rate < 0
                        ? 'text-blue-600'
                        : 'text-gray-500'
                  }`}
                >
                  {stock.change_rate > 0 && <TrendingUp className="h-3.5 w-3.5" />}
                  {stock.change_rate < 0 && <TrendingDown className="h-3.5 w-3.5" />}
                  <span className="font-medium">
                    {formatPercent(stock.change_rate)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer - Volume info for volume category */}
      {category === 'volume' && data?.stocks?.length && (
        <div className="border-t bg-gray-50 px-4 py-2.5 text-xs text-gray-500 md:px-6">
          거래량 기준 상위 종목 (실시간)
        </div>
      )}
      {category === 'gainers' && data?.stocks?.length && (
        <div className="border-t bg-gray-50 px-4 py-2.5 text-xs text-gray-500 md:px-6">
          상승률 기준 상위 종목 (실시간)
        </div>
      )}
      {category === 'losers' && data?.stocks?.length && (
        <div className="border-t bg-gray-50 px-4 py-2.5 text-xs text-gray-500 md:px-6">
          하락률 기준 상위 종목 (실시간)
        </div>
      )}
    </div>
  )
}

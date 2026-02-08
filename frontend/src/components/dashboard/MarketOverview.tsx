import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
import { useMarketIndex } from '@/hooks/useMarket'
import { formatNumber } from '@/lib/utils'

interface IndexCardProps {
  indexType: 'kospi' | 'kosdaq'
}

function IndexCard({ indexType }: IndexCardProps) {
  const { data, isLoading, isRefetching, isError } = useMarketIndex(indexType)

  const isUp = (data?.index.change ?? 0) > 0
  const isDown = (data?.index.change ?? 0) < 0

  const getChangeColor = () => {
    if (isUp) return 'text-red-600'
    if (isDown) return 'text-blue-600'
    return 'text-gray-500'
  }

  const getChartColor = () => {
    if (isUp) return '#dc2626'
    if (isDown) return '#2563eb'
    return '#6b7280'
  }

  const getChartGradient = () => {
    if (isUp) return 'url(#colorUp)'
    if (isDown) return 'url(#colorDown)'
    return 'url(#colorNeutral)'
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-white p-4 md:rounded-lg">
        <div className="flex items-center justify-between">
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-12 animate-pulse rounded bg-gray-100" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border bg-white p-4 md:rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            {indexType.toUpperCase()}
          </span>
        </div>
        <div className="mt-4 text-center text-sm text-gray-400">
          데이터를 불러올 수 없습니다
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-white p-4 md:rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">
            {indexType.toUpperCase()}
          </span>
          {isRefetching && (
            <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />
          )}
        </div>
        <span className="text-xs text-gray-400">
          {data?.index.index_name.split('(')[1]?.replace(')', '') || 'ETF'}
        </span>
      </div>

      {/* Price */}
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold">
          {formatNumber(data?.index.current_value || 0)}
        </span>
        <span className="text-sm text-gray-500">원</span>
      </div>

      {/* Change */}
      <div className={`mt-1 flex items-center gap-1 ${getChangeColor()}`}>
        {isUp && <TrendingUp className="h-4 w-4" />}
        {isDown && <TrendingDown className="h-4 w-4" />}
        {!isUp && !isDown && <Minus className="h-4 w-4" />}
        <span className="text-sm font-medium">
          {isUp && '+'}
          {formatNumber(data?.index.change || 0)}
        </span>
        <span className="text-sm">
          ({isUp && '+'}
          {(data?.index.change_rate || 0).toFixed(2)}%)
        </span>
      </div>

      {/* Mini Chart */}
      {data?.chart && data.chart.length > 0 && (
        <div className="mt-3 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.chart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6b7280" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Area
                type="monotone"
                dataKey="value"
                stroke={getChartColor()}
                strokeWidth={1.5}
                fill={getChartGradient()}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
        <div>
          <span className="text-gray-400">거래량</span>
          <p className="mt-0.5 font-medium">
            {formatNumber(Math.floor((data?.index.volume || 0) / 1000))}K
          </p>
        </div>
        <div>
          <span className="text-gray-400">고가</span>
          <p className="mt-0.5 font-medium text-red-600">
            {formatNumber(data?.index.high || 0)}
          </p>
        </div>
        <div>
          <span className="text-gray-400">저가</span>
          <p className="mt-0.5 font-medium text-blue-600">
            {formatNumber(data?.index.low || 0)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function MarketOverview() {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4">
      <IndexCard indexType="kospi" />
      <IndexCard indexType="kosdaq" />
    </div>
  )
}

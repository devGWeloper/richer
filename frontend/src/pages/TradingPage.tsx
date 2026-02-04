import { useState, useEffect } from 'react'
import {
  Play,
  Square,
  Pause,
  RotateCcw,
  Search,
  Activity,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { marketApi } from '@/api/market'
import { accountsApi } from '@/api/accounts'
import { tradingApi } from '@/api/trading'
import {
  useActiveSessions,
  useStartTrading,
  useStopTrading,
  usePauseTrading,
  useResumeTrading,
} from '@/hooks/useTrading'
import { useStrategies } from '@/hooks/useStrategies'
import { useWSStore } from '@/stores/wsStore'
import { useTradingStore } from '@/stores/tradingStore'
import StatusBadge from '@/components/common/StatusBadge'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { formatNumber } from '@/lib/utils'
import type { StockSearchResult, SessionStatusUpdate, BuyableQuantity } from '@/lib/types'

function getSignalIcon(signal?: string) {
  if (signal === 'BUY') return <TrendingUp className="h-4 w-4 text-red-500" />
  if (signal === 'SELL') return <TrendingDown className="h-4 w-4 text-blue-500" />
  return <Minus className="h-4 w-4 text-gray-400" />
}

function getStatusColor(status?: string) {
  switch (status) {
    case 'running':
    case 'checking':
    case 'evaluating':
    case 'evaluated':
      return 'bg-green-500'
    case 'waiting_market':
      return 'bg-yellow-500'
    case 'paused':
      return 'bg-gray-400'
    case 'ordering':
      return 'bg-blue-500'
    case 'error':
      return 'bg-red-500'
    default:
      return 'bg-gray-300'
  }
}

function SessionCard({
  session,
  status,
  onPause,
  onResume,
  onStop,
}: {
  session: any
  status?: SessionStatusUpdate
  onPause: () => void
  onResume: () => void
  onStop: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isRunning = session.status === 'running'
  const isPaused = session.status === 'paused'
  const canControl = ['running', 'paused', 'pending'].includes(session.status)

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm md:rounded-lg">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{session.stock_name || session.stock_code}</h3>
            <StatusBadge status={session.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
            <span>#{session.id}</span>
            {session.account && (
              <>
                <span className="text-gray-300">|</span>
                <span className="font-medium text-gray-600">
                  {session.account.label}
                </span>
              </>
            )}
            <span className="text-gray-300">|</span>
            <span>{session.quantity}주</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 active:bg-gray-100 md:hidden"
        >
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {/* Live Status - Always visible on desktop, toggle on mobile */}
      <div className={`${expanded ? 'block' : 'hidden'} md:block`}>
        {status && (
          <div className="mt-3 rounded-xl bg-gray-50 p-3 md:rounded-md">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${getStatusColor(status.status)} ${
                  ['running', 'checking', 'evaluating'].includes(status.status)
                    ? 'animate-pulse'
                    : ''
                }`}
              />
              <span className="text-sm font-medium">{status.message}</span>
            </div>

            {/* Market Closed Warning */}
            {status.market_status && !status.market_status.is_open && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-yellow-50 px-2 py-1.5 text-xs text-yellow-700">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  {status.market_status.reason === 'weekend'
                    ? '주말 - 장 휴무'
                    : status.market_status.reason === 'before_open'
                      ? '장 시작 전'
                      : '장 마감'}
                </span>
              </div>
            )}

            {/* Price & Signal */}
            {status.current_price && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">현재가</span>
                  <span className="font-medium">{formatNumber(status.current_price)}원</span>
                </div>
                {status.signal && (
                  <div className="flex items-center gap-1">
                    {getSignalIcon(status.signal)}
                    <span
                      className={
                        status.signal === 'BUY'
                          ? 'font-medium text-red-500'
                          : status.signal === 'SELL'
                            ? 'font-medium text-blue-500'
                            : 'text-gray-500'
                      }
                    >
                      {status.signal === 'BUY'
                        ? '매수'
                        : status.signal === 'SELL'
                          ? '매도'
                          : '관망'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Timing */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              {status.last_checked_at && (
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  <span>
                    마지막: {new Date(status.last_checked_at).toLocaleTimeString('ko-KR')}
                  </span>
                </div>
              )}
              {status.next_check_at && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    다음: {new Date(status.next_check_at).toLocaleTimeString('ko-KR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">거래 수</div>
            <div className="font-medium">{session.total_trades}건</div>
          </div>
          <div>
            <div className="text-gray-500">손익</div>
            <div
              className={`font-medium ${
                session.total_pnl >= 0 ? 'text-red-600' : 'text-blue-600'
              }`}
            >
              {session.total_pnl >= 0 ? '+' : ''}
              {formatNumber(session.total_pnl)}원
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      {canControl && (
        <div className="mt-4 flex gap-2">
          {isRunning && (
            <button
              onClick={onPause}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-yellow-100 px-3 py-2.5 text-sm font-medium text-yellow-700 active:bg-yellow-200 md:rounded-md md:py-2"
            >
              <Pause className="h-4 w-4" />
              일시정지
            </button>
          )}
          {isPaused && (
            <button
              onClick={onResume}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-100 px-3 py-2.5 text-sm font-medium text-green-700 active:bg-green-200 md:rounded-md md:py-2"
            >
              <RotateCcw className="h-4 w-4" />
              재개
            </button>
          )}
          <button
            onClick={onStop}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-100 px-3 py-2.5 text-sm font-medium text-red-700 active:bg-red-200 md:rounded-md md:py-2"
          >
            <Square className="h-4 w-4" />
            중지
          </button>
        </div>
      )}
    </div>
  )
}

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

  const { messages } = useWSStore()
  const { sessionStatuses, updateSessionStatus } = useTradingStore()

  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([])
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<number>(0)
  const [selectedStrategy, setSelectedStrategy] = useState<number>(0)
  const [quantity, setQuantity] = useState(1)
  const [interval, setInterval] = useState(60)
  const [confirmStop, setConfirmStop] = useState<number | null>(null)
  const [buyableInfo, setBuyableInfo] = useState<BuyableQuantity | null>(null)
  const [loadingBuyable, setLoadingBuyable] = useState(false)

  // Handle WebSocket messages for session status updates
  useEffect(() => {
    const latestMessage = messages[0]
    if (latestMessage?.type === 'session.status' && latestMessage.channel === 'trading') {
      updateSessionStatus(latestMessage.payload as SessionStatusUpdate)
    }
  }, [messages, updateSessionStatus])

  // 종목과 계좌 선택 시 매수 가능 수량 조회
  useEffect(() => {
    if (!selectedStock || !selectedAccount) {
      setBuyableInfo(null)
      return
    }

    const fetchBuyable = async () => {
      setLoadingBuyable(true)
      try {
        const { data } = await tradingApi.buyable(selectedAccount, selectedStock.stock_code)
        setBuyableInfo(data)
      } catch {
        setBuyableInfo(null)
      } finally {
        setLoadingBuyable(false)
      }
    }

    fetchBuyable()
  }, [selectedStock, selectedAccount])

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
    if (quantity < 1) return
    try {
      await startTrading.mutateAsync({
        account_id: selectedAccount,
        strategy_id: selectedStrategy,
        stock_code: selectedStock.stock_code,
        stock_name: selectedStock.stock_name,
        interval_seconds: interval,
        quantity,
      })
      setSelectedStock(null)
      setSearchQuery('')
      setQuantity(1)
      setShowForm(false)
    } catch {
      // Error is handled by the mutation's onError
    }
  }

  const resetForm = () => {
    setSelectedStock(null)
    setSearchQuery('')
    setSearchResults([])
    setSelectedAccount(0)
    setSelectedStrategy(0)
    setQuantity(1)
    setInterval(60)
    setBuyableInfo(null)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="hidden text-2xl font-bold md:block">자동매매</h1>
        <button
          onClick={() => {
            setShowForm(!showForm)
            if (showForm) resetForm()
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white active:bg-primary/90 md:w-auto md:rounded-md md:px-4 md:py-2"
        >
          {showForm ? (
            <>
              <X className="h-4 w-4" />
              취소
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              새 매매 시작
            </>
          )}
        </button>
      </div>

      {/* Start Trading Form */}
      {showForm && (
        <div className="rounded-2xl border bg-white p-4 md:rounded-lg md:p-6">
          <h2 className="mb-4 text-lg font-semibold">매매 설정</h2>

          <div className="space-y-4">
            {/* Stock Search */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">종목 검색</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="종목명 또는 코드"
                  className="input-mobile flex-1"
                />
                <button
                  onClick={handleSearch}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 active:bg-gray-200 md:h-auto md:w-auto md:rounded-md md:px-4"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border bg-white md:rounded-md">
                  {searchResults.map((s) => (
                    <button
                      key={s.stock_code}
                      onClick={() => {
                        setSelectedStock(s)
                        setSearchResults([])
                        setSearchQuery(`${s.stock_name} (${s.stock_code})`)
                      }}
                      className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-gray-50 md:py-2"
                    >
                      <div>
                        <span className="font-medium">{s.stock_name}</span>
                        <span className="ml-2 text-gray-500">({s.stock_code})</span>
                      </div>
                      <span className="text-xs text-gray-400">{s.market}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedStock && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  <TrendingUp className="h-4 w-4" />
                  선택됨: {selectedStock.stock_name}
                </div>
              )}
            </div>

            {/* Account & Strategy */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">계좌</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(Number(e.target.value))}
                  className="input-mobile"
                >
                  <option value={0}>계좌 선택</option>
                  {accounts?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} ({a.account_no_masked})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">전략</label>
                <select
                  value={selectedStrategy}
                  onChange={(e) => setSelectedStrategy(Number(e.target.value))}
                  className="input-mobile"
                >
                  <option value={0}>전략 선택</option>
                  {strategies?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.strategy_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quantity & Interval */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">주문 수량</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  min={1}
                  max={buyableInfo?.max_buyable_quantity || undefined}
                  className={`input-mobile ${
                    buyableInfo && quantity > buyableInfo.max_buyable_quantity
                      ? 'border-red-500 bg-red-50'
                      : ''
                  }`}
                />
                {buyableInfo && (
                  <p className="mt-1 text-xs text-gray-500">
                    최대 {buyableInfo.max_buyable_quantity.toLocaleString()}주
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">실행 간격 (초)</label>
                <input
                  type="number"
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  min={10}
                  max={3600}
                  className="input-mobile"
                />
              </div>
            </div>

            {/* Buyable Info */}
            {loadingBuyable && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <LoadingSpinner size="sm" />
                매수 가능 수량 조회 중...
              </div>
            )}
            {buyableInfo && !loadingBuyable && (
              <div className="rounded-xl bg-blue-50 p-4 md:rounded-md">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-medium text-blue-900">
                      {buyableInfo.stock_name}
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 text-blue-800 md:grid-cols-3">
                      <div>
                        <span className="text-blue-600">현재가:</span>{' '}
                        {buyableInfo.current_price.toLocaleString()}원
                      </div>
                      <div>
                        <span className="text-blue-600">예수금:</span>{' '}
                        {buyableInfo.available_cash.toLocaleString()}원
                      </div>
                      <div>
                        <span className="text-blue-600">예상금액:</span>{' '}
                        {(buyableInfo.current_price * quantity).toLocaleString()}원
                      </div>
                    </div>
                    {quantity > buyableInfo.max_buyable_quantity && (
                      <div className="mt-2 font-medium text-red-600">
                        주문 수량이 매수 가능 수량을 초과합니다
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleStart}
              disabled={
                !selectedStock ||
                !selectedAccount ||
                !selectedStrategy ||
                quantity < 1 ||
                (buyableInfo && quantity > buyableInfo.max_buyable_quantity) ||
                startTrading.isPending
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-base font-medium text-white active:bg-green-700 disabled:opacity-50 md:rounded-md md:py-2.5 md:text-sm"
            >
              {startTrading.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              매매 시작
            </button>
          </div>
        </div>
      )}

      {/* Active Sessions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold md:mb-4">
          활성 세션 {sessions?.length ? `(${sessions.length})` : ''}
        </h2>
        {isLoading ? (
          <LoadingSpinner />
        ) : !sessions?.length ? (
          <div className="rounded-2xl border bg-white p-8 text-center md:rounded-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Activity className="h-8 w-8 text-gray-300" />
            </div>
            <p className="mt-3 text-gray-500">실행 중인 세션이 없습니다</p>
            <p className="mt-1 text-sm text-gray-400">
              {showForm ? '위에서 설정을 완료하고 매매를 시작하세요' : '새 매매 시작 버튼을 눌러 시작하세요'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                status={sessionStatuses[s.id]}
                onPause={() => pauseTrading.mutate(s.id)}
                onResume={() => resumeTrading.mutate(s.id)}
                onStop={() => setConfirmStop(s.id)}
              />
            ))}
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

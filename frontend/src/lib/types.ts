export interface User {
  id: number
  username: string
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface Account {
  id: number
  user_id: number
  label: string
  account_no_masked: string
  environment: string
  is_active: boolean
  created_at: string
}

export interface Strategy {
  id: number
  user_id: number
  name: string
  strategy_type: string
  parameters: Record<string, any>
  is_active: boolean
  created_at: string
}

export interface StrategyTypeInfo {
  type_name: string
  display_name: string
  description: string
  parameter_schema: Record<string, any>
}

export interface AccountInfo {
  id: number
  label: string
  account_no_masked: string
}

export interface TradeSession {
  id: number
  user_id: number
  account_id: number
  strategy_id: number
  stock_code: string
  stock_name: string | null
  status: string
  config: Record<string, any> | null
  total_pnl: number
  total_trades: number
  quantity: number
  started_at: string | null
  stopped_at: string | null
  created_at: string
  account: AccountInfo | null
}

export interface Trade {
  id: number
  session_id: number
  user_id: number
  stock_code: string
  stock_name: string | null
  side: string
  order_type: string
  quantity: number
  price: number
  filled_price: number | null
  filled_quantity: number | null
  status: string
  kis_order_no: string | null
  signal_reason: string | null
  created_at: string
}

export interface DashboardSummary {
  total_balance: number
  total_profit: number
  profit_rate: number
  active_sessions: number
  total_trades_today: number
}

export interface HoldingItem {
  stock_code: string
  stock_name: string
  quantity: number
  avg_price: number
  current_price: number
  profit: number
  profit_rate: number
}

export interface PriceData {
  stock_code: string
  stock_name: string
  current_price: number
  change: number
  change_rate: number
  volume: number
  high: number
  low: number
  open_price: number
}

export interface OHLCVItem {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface StockSearchResult {
  stock_code: string
  stock_name: string
  market: string
}

export interface WSMessage {
  type: string
  channel: string
  timestamp: string
  payload: Record<string, any>
}

export interface SessionStatusUpdate {
  session_id: number
  stock_code: string
  stock_name: string
  status: string
  message: string
  timestamp: string
  current_price?: number
  signal?: string
  signal_reason?: string
  last_checked_at?: string
  next_check_at?: string
  market_status?: {
    is_open: boolean
    reason: string
    next_open: string | null
    current_time: string
  }
}

export interface TradeLog {
  id: number
  session_id: number | null
  level: string
  category: string
  message: string
  metadata: Record<string, any> | null
  created_at: string
}

export interface BuyableQuantity {
  stock_code: string
  stock_name: string
  current_price: number
  available_cash: number
  max_buyable_quantity: number
  message: string | null
}

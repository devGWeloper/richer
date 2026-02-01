export const API_BASE_URL = '/api/v1'

export const SESSION_STATUS = {
  pending: { label: '대기', color: 'bg-yellow-100 text-yellow-800' },
  running: { label: '실행중', color: 'bg-green-100 text-green-800' },
  paused: { label: '일시정지', color: 'bg-blue-100 text-blue-800' },
  stopped: { label: '종료', color: 'bg-gray-100 text-gray-800' },
  error: { label: '오류', color: 'bg-red-100 text-red-800' },
} as const

export const TRADE_SIDE = {
  BUY: { label: '매수', color: 'text-red-600' },
  SELL: { label: '매도', color: 'text-blue-600' },
} as const

export const ORDER_STATUS = {
  pending: { label: '대기', color: 'text-yellow-600' },
  submitted: { label: '접수', color: 'text-blue-600' },
  filled: { label: '체결', color: 'text-green-600' },
  cancelled: { label: '취소', color: 'text-gray-600' },
  rejected: { label: '거부', color: 'text-red-600' },
} as const

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { fetchMyInfo, type UserProfileDto } from '../api/users'
import { persistUserDisplayName, rolesFromJwt } from '../api/auth'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type AuthContextValue = {
  /** Thông tin user đầy đủ, null nếu chưa đăng nhập hoặc đang load. */
  user: UserProfileDto | null
  /** Danh sách roles từ JWT (ví dụ: ['ROLE_ADMIN', 'ROLE_USER']). */
  roles: string[]
  /** true nếu có accessToken hợp lệ và đã fetch user info thành công. */
  isLoggedIn: boolean
  /** Shortcut: user có role ADMIN hoặc SUPER_ADMIN. */
  isAdmin: boolean
  /** true trong khi đang fetch /users/my-info lần đầu khi app khởi động. */
  isLoading: boolean
  /**
   * Gọi sau khi đăng nhập thành công để cập nhật context.
   * Lưu token vào localStorage trước khi gọi hàm này.
   */
  login: (user: UserProfileDto) => void
  /** Xóa user state. Token cleanup được xử lý bởi LogoutRoute trong App.tsx. */
  logout: () => void
  /**
   * Fetch lại /users/my-info và cập nhật context.
   * Dùng sau khi user update profile để toàn app nhận data mới.
   */
  refreshUser: () => Promise<void>
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─────────────────────────────────────────────
// Helper: chuẩn hóa roles
// ─────────────────────────────────────────────

function isAdminRole(role: string): boolean {
  const r = role.trim().toUpperCase()
  return (
    r === 'ROLE_ADMIN' ||
    r === 'ADMIN' ||
    r === 'ROLE_SUPER_ADMIN' ||
    r === 'SUPER_ADMIN' ||
    r.startsWith('ROLE_ADMIN')
  )
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfileDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // Tránh race condition khi StrictMode mount 2 lần hoặc component unmount giữa chừng
  const isMounted = useRef(true)

  // Fetch /users/my-info 1 lần duy nhất khi app khởi động
  useEffect(() => {
    isMounted.current = true
    const token = localStorage.getItem('accessToken')

    if (!token) {
      setIsLoading(false)
      return
    }

    fetchMyInfo()
      .then((data) => {
        if (!isMounted.current) return
        setUser(data)
        // Sync displayName vào localStorage cho các nơi đọc trực tiếp
        persistUserDisplayName(data.firstName ?? '', data.lastName ?? '')
      })
      .catch(() => {
        // Token hết hạn hoặc invalid → authFetch đã tự redirect /auth nếu cần
        if (isMounted.current) setUser(null)
      })
      .finally(() => {
        if (isMounted.current) setIsLoading(false)
      })

    return () => {
      isMounted.current = false
    }
  }, [])

  const login = useCallback((userData: UserProfileDto) => {
    setUser(userData)
    persistUserDisplayName(userData.firstName ?? '', userData.lastName ?? '')
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      const data = await fetchMyInfo()
      setUser(data)
      persistUserDisplayName(data.firstName ?? '', data.lastName ?? '')
    } catch {
      // Nếu refresh lỗi thì giữ nguyên user hiện tại, không reset
    }
  }, [])

  // Tính roles và isAdmin từ JWT (nhanh, không cần thêm API call)
  const token = localStorage.getItem('accessToken')
  const roles = rolesFromJwt(token)
  const isAdmin = roles.some(isAdminRole)

  const value: AuthContextValue = {
    user,
    roles,
    isLoggedIn: !!user,
    isAdmin,
    isLoading,
    login,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

/**
 * Hook để truy cập AuthContext trong bất kỳ component nào.
 *
 * @example
 * const { user, isAdmin, isLoading, refreshUser } = useAuth()
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth() phải được dùng bên trong <AuthProvider>.')
  }
  return ctx
}

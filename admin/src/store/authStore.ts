import { create } from 'zustand'

interface User {
  id: number
  username: string
  role: string
}

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  logout: () => void
  isLoggedIn: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
	// 访问令牌只保留到当前浏览器会话，降低持久化 XSS 窃取长期凭据的风险。
  token: sessionStorage.getItem('token'),
  user: readStoredUser(),

  setAuth: (token: string, user: User) => {
	sessionStorage.setItem('token', token)
	sessionStorage.setItem('user', JSON.stringify(user))
    set({ token, user })
  },

  logout: () => {
	sessionStorage.removeItem('token')
	sessionStorage.removeItem('user')
	localStorage.removeItem('token')
	localStorage.removeItem('user')
    set({ token: null, user: null })
  },

  isLoggedIn: () => {
    return !!get().token
  },
}))

function readStoredUser(): User | null {
	try {
		return JSON.parse(sessionStorage.getItem('user') || 'null')
	} catch {
		sessionStorage.removeItem('user')
		return null
	}
}

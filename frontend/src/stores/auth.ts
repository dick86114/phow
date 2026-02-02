import { defineStore } from 'pinia'
import axios from 'axios'

interface User {
  id: number;
  username: string;
  role: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null') as User | null,
    token: localStorage.getItem('token') || null as string | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'ADMIN',
  },
  actions: {
    async login(username: string, password: string) {
      const response = await axios.post('/api/auth/login', { username, password })
      this.token = response.data.access_token
      this.user = response.data.user
      if (this.token) {
        localStorage.setItem('token', this.token)
      }
      if (this.user) {
        localStorage.setItem('user', JSON.stringify(this.user))
      }
    },
    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }
})

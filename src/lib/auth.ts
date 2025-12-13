import { cookies } from 'next/headers'

export interface UserSession {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
}

// Mock user for now, but structured to be easily replaced
const MOCK_USER: UserSession = {
  id: 'user-1',
  name: 'Demo User',
  email: 'demo@neuralfeed.studio',
  role: 'user',
}

export async function getSession(): Promise<UserSession | null> {
  // In a real app, we would verify the session token from cookies
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session_token')

  // For demo/development purposes, always return the mock user
  // This allows the app to work without proper authentication setup
  return MOCK_USER
}

export async function requireAuth(): Promise<UserSession> {
  const session = await getSession()
  
  if (!session) {
    throw new Error('Unauthorized')
  }
  
  return session
}

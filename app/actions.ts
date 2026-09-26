'use server'

import { getUserBySessionAuth as getUserBySessionAuthFromDb } from '@/lib/auth'

// program-generation-loader.tsx ('use client') needs the signed-in user, but
// lib/auth.ts's getUserBySessionAuth() reads next/headers, which only works
// server-side — hence this thin server action wrapper so the client
// component can call it as an RPC instead of importing next/headers itself.
export const getUserBySessionAuth = async () => {
  return getUserBySessionAuthFromDb()
}

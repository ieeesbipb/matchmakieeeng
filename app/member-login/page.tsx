'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from "next/navigation"
import { createClient } from '@/utils/supabase/client'

export default function MemberLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'domain') {
      setError('Akses ditolak: Gunakan email @apps.ipb.ac.id');
      supabase.auth.signOut();
    }
  }, [supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.endsWith('@apps.ipb.ac.id')) {
      setError('Gunakan email @apps.ipb.ac.id kamu')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/')
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email atau password salah'
        : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#121820] px-4">
      <style>{`
        .btn-aura-hover {
          position: relative !important;
          overflow: hidden !important;
          transition: all 0.3s ease !important;
        }
        .btn-aura-hover::after {
          content: '' !important;
          position: absolute !important;
          inset: 0 !important;
          background: linear-gradient(
            90deg,
            rgba(59, 130, 246, 0) 0%,
            rgba(59, 130, 246, 0.35) 50%,
            rgba(59, 130, 246, 0) 100%
          ) !important;
          background-size: 200% 100% !important;
          opacity: 0 !important;
          transition: opacity 0.3s ease !important;
          pointer-events: none !important;
          z-index: 1 !important;
        }
        .btn-aura-hover:hover::after {
          opacity: 1 !important;
          animation: aura-shift 2s linear infinite !important;
        }
        .btn-aura-hover:hover {
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.4) !important;
        }
        @keyframes aura-shift {
          0% { background-position: 0% 50%; }
          100% { background-position: -200% 50%; }
        }
      `}</style>

      <div className="relative w-full max-w-[420px] z-10 flex flex-col items-center gap-6">
        {/* MatchmakIEEEng Logo on Top */}
        <div className="relative w-full flex justify-center py-2">
          <img
            src="/images/matchmakieeeng/MatchmakIEEEng.png"
            alt="MatchmakIEEEng Logo"
            className="h-12 md:h-14 w-auto object-contain relative z-10 filter drop-shadow-[0_0_12px_rgba(59,130,246,0.3)]"
          />
        </div>

        <div className="w-full bg-[#1E2638] border border-white/5 rounded-[24px] p-8 md:p-12 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-2 leading-tight">Welkam</h1>
          <p className="text-white/40 text-sm mb-8">Login dengan akun @apps.ipb.ac.id</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-300 text-xs">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-white/60">Email IPB</label>
              <input
                type="email"
                placeholder="nama@apps.ipb.ac.id"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#121820] border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-white/20 outline-none focus:border-[#16357B] focus:bg-[#16357B]/10 transition-all duration-200"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-white/60">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#121820] border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-white/20 outline-none focus:border-[#16357B] focus:bg-[#16357B]/10 transition-all duration-200"
              />
            </div>

            <div className="flex justify-start">
              <Link href="/reset-password" className="text-[#93c5fd] text-xs hover:underline">
                Lupa password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#16357B] text-white font-semibold text-sm rounded-xl py-3.5 mt-2 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed btn-aura-hover"
            >
              <span className="relative z-10">{loading ? 'Masuk...' : 'Masuk'}</span>
            </button>
          </form>

          <p className="text-center text-white/20 text-xs mt-8">
            Akun dibuat oleh admin, hubungi irham jika ada masalah
          </p>
        </div>
      </div>
    </main>
  )
}

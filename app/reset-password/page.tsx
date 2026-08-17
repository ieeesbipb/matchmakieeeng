'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), [])
  const [mode, setMode] = useState<'request' | 'update'>('request')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const prepareRecoverySession = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) setMode('update')
        return
      }

      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      if (hashParams.get('type') === 'recovery' || hashParams.get('access_token')) {
        setMode('update')
      }
    }

    prepareRecoverySession()

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('update')
    })

    return () => listener.subscription.unsubscribe()
  }, [supabase])

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email.endsWith('@apps.ipb.ac.id')) {
      setError('Gunakan email @apps.ipb.ac.id kamu')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSuccess('Link reset password sudah dikirim. Cek inbox atau spam email IPB kamu.')
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim link reset password')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 8) {
      setError('Password minimal 8 karakter')
      return
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password belum sama')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess('Password berhasil diganti. Kamu bisa login lagi dengan password baru.')
      setPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message || 'Gagal mengganti password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#121820] px-4">
      <div className="relative w-full max-w-[440px] z-10 flex flex-col items-center gap-6">
        {/* MatchmakIEEEng Logo on Top */}
        <div className="relative w-full flex justify-center py-2">
          <img
            src="/images/matchmakieeeng/MatchmakIEEEng.png"
            alt="MatchmakIEEEng Logo"
            className="h-12 md:h-14 w-auto object-contain relative z-10 filter drop-shadow-[0_0_12px_rgba(59,130,246,0.3)]"
          />
        </div>

        <div className="w-full bg-[#1E2638] border border-white/5 rounded-[24px] p-8 md:p-12 shadow-2xl">
          {mode === 'request' ? (
            <>
              <h1 className="text-3xl font-bold text-white mb-2 leading-tight">Atur ulang password</h1>
              <p className="text-white/40 text-sm leading-relaxed mb-8">
                Masukkan email IPB kamu. Kami akan kirim link sementara untuk membuat password baru.
              </p>

              <form onSubmit={handleResetRequest} className="flex flex-col gap-5">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 text-red-300 text-xs">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-[#16357B]/10 border border-[#16357B]/20 rounded-xl p-3.5 text-[#93c5fd] text-xs font-semibold">
                    {success}
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#16357B] hover:bg-[#1a4299] text-white font-semibold text-sm rounded-xl py-3.5 mt-2 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Mengirim...' : 'Kirim link reset'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-white mb-2 leading-tight">Buat password baru</h1>
              <p className="text-white/40 text-sm leading-relaxed mb-8">
                Gunakan password minimal 8 karakter agar akun member kamu tetap aman.
              </p>

              <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-5">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 text-red-300 text-xs">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-[#16357B]/10 border border-[#16357B]/20 rounded-xl p-3.5 text-[#93c5fd] text-xs font-semibold">
                    {success}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-white/60">Password baru</label>
                  <input
                    type="password"
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-[#121820] border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-white/20 outline-none focus:border-[#16357B] focus:bg-[#16357B]/10 transition-all duration-200"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-white/60">Konfirmasi password</label>
                  <input
                    type="password"
                    placeholder="Ulangi password baru"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full bg-[#121820] border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-white/20 outline-none focus:border-[#16357B] focus:bg-[#16357B]/10 transition-all duration-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#16357B] hover:bg-[#1a4299] text-white font-semibold text-sm rounded-xl py-3.5 mt-2 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Menyimpan...' : 'Simpan password baru'}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-white/30 text-xs mt-8">
            Sudah ingat password? <Link href="/member-login" className="text-[#93c5fd] hover:underline ml-1">Kembali login</Link>
          </p>
        </div>
      </div>
    </main>
  )
}

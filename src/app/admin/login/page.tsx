'use client';

import { useState, Suspense, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail, KeyRound, AlertTriangle, CheckCircle, X } from 'lucide-react';

function ExpiredToast() {
    const searchParams = useSearchParams();
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (searchParams.get('expired') === 'true') {
            setToast({ message: 'Session expired due to inactivity. Please log in again.', type: 'error' });
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
        if (searchParams.get('error') === 'unauthorized') {
            setToast({ message: 'You do not have permission to view the admin dashboard.', type: 'error' });
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    if (!toast) return null;

    return (
        <div className={`toast-notification ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
            {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 shrink-0" />
            ) : (
                <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-auto p-1 hover:opacity-70 transition">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        window.location.href = '/admin';
    };

    return (
        <div 
            className="min-h-screen flex items-center justify-center px-4"
            style={{
                background: 'linear-gradient(135deg, #D033FF 0%, #4DA6FF 100%)',
            }}
        >
            {/* ── Toast Notification ── */}
            <Suspense fallback={null}>
                <ExpiredToast />
            </Suspense>

            <div 
                className="p-8 sm:p-10 w-full max-w-md animate-slide-up"
                style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '2rem',
                }}
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center mb-4">
                        <Image
                            src="/clr_logo.png"
                            alt="Admin Logo"
                            width={80}
                            height={80}
                            className="rounded-2xl"
                        />
                    </div>
                    <h1 className="text-2xl font-black text-black">Admin Login</h1>
                    <p className="text-black/60 text-sm mt-1">Sign in to manage events</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/40 text-red-900 px-4 py-3 rounded-lg text-sm mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-black mb-1.5">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field pl-10 bg-white border-white/20 text-black placeholder-black/30 focus:bg-white focus:border-black/20"
                                placeholder=""
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-black mb-1.5">Password</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field pl-10 bg-white border-white/20 text-black placeholder-black/30 focus:bg-white focus:border-black/20"
                                placeholder=""
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 bg-white text-[#D033FF] hover:bg-white/90 active:scale-[0.98] font-bold"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

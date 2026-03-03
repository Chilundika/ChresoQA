'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, X } from 'lucide-react';

const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

export default function AdminSessionGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const isLoginPage = pathname === '/admin/login';

    const handleLogout = async () => {
        if (isLoginPage) return;

        await supabase.auth.signOut();

        // Pass a query parameter to show the toast on the login page
        router.push('/admin/login?expired=true');
    };

    const resetTimer = () => {
        if (isLoginPage) return;

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(handleLogout, TIMEOUT_MS);
    };

    useEffect(() => {
        if (isLoginPage) return;

        // Initialize timer
        resetTimer();

        // Add event listeners for user activity
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        const handleActivity = () => {
            resetTimer();
        };

        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [isLoginPage, pathname]);

    return (
        <>
            {children}
        </>
    );
}

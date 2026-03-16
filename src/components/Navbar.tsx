'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Calendar, Shield } from 'lucide-react';

export default function Navbar() {
    const pathname = usePathname();

    const isActive = (path: string) =>
        pathname === path || pathname.startsWith(path + '/');

    return (
        <nav 
            className="sticky top-0 z-50 shadow-md transition-all duration-300"
            style={{ background: 'linear-gradient(90deg, #000000 0%, #D033FF 100%)' }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <Image
                            src="/logo.png"
                            alt="CampusQA Logo"
                            width={36}
                            height={36}
                            className="rounded-lg"
                        />
                        <span className="text-lg font-bold text-white">CampusQA</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-1">
                        <Link
                            href="/"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive('/') && !isActive('/admin')
                                ? 'text-white bg-white/20'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Calendar className="w-4 h-4" />
                            Events
                        </Link>
                        <Link
                            href="/admin"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive('/admin')
                                ? 'text-white bg-white/20'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Shield className="w-4 h-4" />
                            Admin
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}

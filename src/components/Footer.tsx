"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, Phone, MessageSquare, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const currentYear = new Date().getFullYear();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) throw new Error("Subscription failed");
      
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 5000);
    } catch (error) {
      console.error("Error subscribing:", error);
      alert("Failed to subscribe. Please try again later.");
    }
  };

  return (
    <footer className="relative bg-[#4A148C] text-white pt-16 pb-8 px-6 md:px-12 lg:px-24 border-t border-white/10 overflow-hidden" style={{ zIndex: 10 }}>
      {/* Background Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D4FF]/50 to-transparent" />
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
        {/* Column 1: Company & Contact */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Image 
              src="/favicon.ico" 
              alt="DeZignBlu-Print ZM Logo" 
              width={40} 
              height={40} 
              className="rounded-lg shadow-lg shadow-black/20"
            />
            <span className="text-xl font-bold tracking-tight">DeZignBlu-Print ZM</span>
          </div>
          <p className="text-purple-100/80 leading-relaxed max-w-xs">
            "Streamlined Registration for the Modern Campus."
          </p>
          <div className="space-y-3">
            <a href="tel:+260772302337" className="flex items-center gap-3 text-sm hover:text-[#00D4FF] transition-colors duration-300">
              <Phone size={18} className="text-[#00D4FF]" />
              +260 772 302 337
            </a>
            <a href="https://wa.me/260958066752" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-[#00D4FF] transition-colors duration-300">
              <MessageSquare size={18} className="text-[#00D4FF]" />
              +260 958 066 752 (WhatsApp)
            </a>
            <a href="mailto:dezignbluprint.tech@gmail.com" className="flex items-center gap-3 text-sm hover:text-[#00D4FF] transition-colors duration-300">
              <Mail size={18} className="text-[#00D4FF]" />
              dezignbluprint.tech@gmail.com
            </a>
          </div>
        </div>

        {/* Column 2: Discover */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold border-b border-white/10 pb-2 inline-block">Discover</h3>
          <ul className="space-y-4">
            <li>
              <Link href="/" className="text-purple-100/80 hover:text-[#00D4FF] transition-colors duration-300 text-sm">
                Browse Events
              </Link>
            </li>
            {/* Add more links here if needed in future */}
          </ul>
        </div>

        {/* Column 3: Newsletter/CTA */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold border-b border-white/10 pb-2 inline-block">Stay Updated</h3>
          <p className="text-purple-100/80 text-sm">
            Get the latest campus event updates directly in your inbox.
          </p>
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-all flex-grow placeholder:text-purple-100/40"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={subscribed}
            />
            <button 
              type="submit"
              className={`font-bold px-6 py-2.5 rounded-xl text-sm transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 ${
                subscribed 
                ? "bg-green-500 text-white shadow-green-500/20" 
                : "bg-[#00D4FF] hover:bg-[#00B8E6] text-slate-900 shadow-[#00D4FF]/20"
              }`}
              disabled={subscribed}
            >
              {subscribed ? (
                <>
                  <CheckCircle2 size={18} />
                  Subscribed!
                </>
              ) : (
                "Subscribe"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-purple-100/60">
          <p>© {currentYear} DeZignBlu-Print ZM. All Rights Reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[#00D4FF] transition-colors duration-300">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#00D4FF] transition-colors duration-300">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

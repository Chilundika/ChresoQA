'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { RegistrationFormData } from '@/lib/types';
import { getClientIp } from '@/app/actions';
import { Send, Loader2, ShieldAlert } from 'lucide-react';

interface RegistrationFormProps {
    eventId: string;
    isFull: boolean;
    isClosed?: boolean;
    isOpen?: boolean;
    isPast?: boolean;
}

// Cookie helpers
function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number = 365) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function getRegisteredEvents(): string[] {
    const raw = getCookie('campus_registered_events');
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function markEventRegistered(eventId: string) {
    const existing = getRegisteredEvents();
    if (!existing.includes(eventId)) {
        existing.push(eventId);
    }
    setCookie('campus_registered_events', JSON.stringify(existing));
}

function isEventRegisteredViaCookie(eventId: string): boolean {
    return getRegisteredEvents().includes(eventId);
}

export default function RegistrationForm({ eventId, isFull, isClosed, isOpen = true, isPast }: RegistrationFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cookieBlocked, setCookieBlocked] = useState(false);
    const [formData, setFormData] = useState<RegistrationFormData>({
        first_name: '',
        last_name: '',
        email: '',
        contact_number: '',
        whatsapp_number: '',
        year_of_study: 1,
        program_name: '',
        will_attend: 'YES',
    });

    // Check cookie on mount
    useEffect(() => {
        if (isEventRegisteredViaCookie(eventId)) {
            setCookieBlocked(true);
        }
    }, [eventId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === 'year_of_study' ? parseInt(value) || 1 : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validate Gmail
        if (!formData.email.endsWith('@gmail.com')) {
            setError('Please use a valid Gmail address.');
            setLoading(false);
            return;
        }

        // Cookie check (soft block)
        if (isEventRegisteredViaCookie(eventId)) {
            setError('This device has already registered for this event.');
            setCookieBlocked(true);
            setLoading(false);
            return;
        }

        try {
            // Get client IP via Server Action
            const ipAddress = await getClientIp();

            const { data, error: insertError } = await supabase
                .from('registrations')
                .insert({
                    event_id: eventId,
                    ip_address: ipAddress,
                    ...formData,
                })
                .select()
                .single();

            if (insertError) {
                // Check for duplicate constraint violations
                if (
                    insertError.message.includes('unique_event_registration_per_ip') ||
                    insertError.message.includes('unique_event_registration_per_email') ||
                    insertError.code === '23505' // PostgreSQL unique violation code
                ) {
                    setError('This device has already registered for this event.');
                    // Also set cookie so subsequent checks are instant
                    markEventRegistered(eventId);
                    setCookieBlocked(true);
                } else if (insertError.message.includes('participant limit')) {
                    setError('Event has reached its participant limit.');
                } else {
                    setError(insertError.message);
                }
                setLoading(false);
                return;
            }

            // Success — set cookie and redirect
            markEventRegistered(eventId);
            router.push(`/events/${eventId}/success?rid=${data.id}&created=${data.created_at}`);
        } catch {
            setError('Something went wrong. Please try again.');
        }

        setLoading(false);
    };

    if (isFull) {
        return (
            <div className="glass-card p-8 text-center">
                <div className="text-5xl mb-4">🚫</div>
                <h3 className="text-xl font-bold text-red-400 mb-2">Event Full</h3>
                <p className="text-gray-500">Event has reached its participant limit.</p>
            </div>
        );
    }

    if (isPast) {
        return (
            <div className="glass-card p-8 text-center">
                <div className="text-5xl mb-4">📅</div>
                <h3 className="text-xl font-bold text-gray-500 mb-2">Event Ended</h3>
                <p className="text-gray-400">This event has already concluded.</p>
            </div>
        );
    }

    if (!isOpen) {
        return (
            <div className="glass-card p-8 text-center animate-fade-in">
                <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-amber-500/10">
                        <ShieldAlert className="w-8 h-8 text-amber-400" />
                    </div>
                </div>
                <h3 className="text-xl font-bold text-amber-400 mb-2">Registration Closed</h3>
                <p className="text-gray-500">Registration for this event has been closed by the IT Department.</p>
            </div>
        );
    }

    if (isClosed) {
        return (
            <div className="glass-card p-8 text-center">
                <div className="text-5xl mb-4">⏳</div>
                <h3 className="text-xl font-bold text-amber-400 mb-2">Registration Closed</h3>
                <p className="text-gray-500">Registration closes 2 hours before the event starts.</p>
            </div>
        );
    }

    if (cookieBlocked) {
        return (
            <div className="glass-card p-8 text-center animate-fade-in">
                <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-amber-500/10">
                        <ShieldAlert className="w-8 h-8 text-amber-400" />
                    </div>
                </div>
                <h3 className="text-xl font-bold text-amber-400 mb-2">Already Registered</h3>
                <p className="text-gray-500">This device has already registered for this event.</p>
                <p className="text-gray-400 text-sm mt-3">
                    Each device can only register once per event to ensure fairness.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 space-y-5">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Form</h2>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Name Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">First Name *</label>
                    <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        placeholder="John"
                        className="input-field"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Last Name *</label>
                    <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        placeholder="Doe"
                        className="input-field"
                        required
                    />
                </div>
            </div>

            {/* Email */}
            <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Gmail Address *</label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="student@gmail.com"
                    className="input-field"
                    required
                />
            </div>

            {/* Phone Numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Official Contact</label>
                    <input
                        type="tel"
                        name="contact_number"
                        value={formData.contact_number}
                        onChange={handleChange}
                        placeholder="+27 XX XXX XXXX"
                        className="input-field"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">WhatsApp Number</label>
                    <input
                        type="tel"
                        name="whatsapp_number"
                        value={formData.whatsapp_number}
                        onChange={handleChange}
                        placeholder="+27 XX XXX XXXX"
                        className="input-field"
                    />
                </div>
            </div>

            {/* Year & Program */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Year of Study</label>
                    <select
                        name="year_of_study"
                        value={formData.year_of_study}
                        onChange={handleChange}
                        className="input-field"
                    >
                        {[1, 2, 3, 4, 5, 6, 7].map((y) => (
                            <option key={y} value={y}>Year {y}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Program Name</label>
                    <input
                        type="text"
                        name="program_name"
                        value={formData.program_name}
                        onChange={handleChange}
                        placeholder="e.g. Computer Science"
                        className="input-field"
                    />
                </div>
            </div>

            {/* Attendance Toggle */}
            <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Will you attend? *</label>
                <div className="toggle-group">
                    <button
                        type="button"
                        className={`toggle-option ${formData.will_attend === 'YES' ? 'active' : ''}`}
                        onClick={() => setFormData((prev) => ({ ...prev, will_attend: 'YES' }))}
                    >
                        ✅ YES
                    </button>
                    <button
                        type="button"
                        className={`toggle-option ${formData.will_attend === 'MAYBE' ? 'active' : ''}`}
                        onClick={() => setFormData((prev) => ({ ...prev, will_attend: 'MAYBE' }))}
                    >
                        🤔 MAYBE
                    </button>
                </div>
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Registering...
                    </>
                ) : (
                    <>
                        <Send className="w-5 h-5" />
                        Register
                    </>
                )}
            </button>
        </form>
    );
}

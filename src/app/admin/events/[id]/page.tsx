'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { Event, Registration } from '@/lib/types';
import { exportToExcel } from '@/lib/excel';
import { generateGmailComposeLink } from '@/lib/meet';
import DataTable from '@/components/DataTable';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Download, Mail, Users, Loader2, Calendar, Video,
    ClipboardCopy, Check, Info, TableProperties, ExternalLink, Hash,
    Clock, Shield,
} from 'lucide-react';

const typeLabels: Record<string, string> = {
    orientation: 'Orientation',
    tutorial: 'Tutorial',
    live_qa: 'Live Q&A',
};

type Tab = 'registrations' | 'details' | 'send-link';

export default function AdminEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('registrations');
    const [copied, setCopied] = useState<string | null>(null);
    const [sendingInvite, setSendingInvite] = useState(false);

    useEffect(() => {
        checkAuthAndFetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function checkAuthAndFetch() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/admin/login');
            return;
        }

        const { data: eventData } = await supabase
            .from('events')
            .select('*')
            .eq('id', resolvedParams.id)
            .single();

        if (!eventData) {
            router.push('/admin');
            return;
        }

        setEvent(eventData);

        const { data: regsData } = await supabase
            .from('registrations')
            .select('*')
            .eq('event_id', resolvedParams.id)
            .order('created_at', { ascending: false });

        setRegistrations(regsData || []);
        setLoading(false);
    }

    const handleExportExcel = () => {
        if (!event || registrations.length === 0) return;
        const filename = `${event.title.replace(/\s+/g, '_')}_registrations`;
        exportToExcel(registrations, filename);
    };

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(label);
            setTimeout(() => setCopied(null), 2000);
        } catch {
            // Fallback for environments without clipboard API
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(label);
            setTimeout(() => setCopied(null), 2000);
        }
    };

    const handleAddAttendees = async () => {
        if (!event || !event.meet_url) return;
        if (registrations.length === 0) return;

        setSendingInvite(true);
        try {
            const emails = registrations.map(r => r.email);
            const res = await fetch('/api/calendar/add-attendees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meetUrl: event.meet_url,
                    emails
                })
            });

            if (res.status === 401) {
                // Not authenticated, redirect to Google OAuth
                window.location.href = `/api/calendar/auth?eventId=${event.id}`;
                return;
            }

            const data = await res.json();
            if (data.error) {
                alert('Error adding attendees: ' + data.error);
            } else {
                alert(`Successfully added ${data.count} attendees to the Google Calendar event!`);
            }
        } catch (e: any) {
            alert('Request failed: ' + e.message);
        } finally {
            setSendingInvite(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!event) return null;

    const yesCount = registrations.filter((r) => r.will_attend === 'YES').length;
    const maybeCount = registrations.filter((r) => r.will_attend === 'MAYBE').length;
    const allEmails = registrations.map((r) => r.email).join(', ');

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'registrations', label: 'Registrations', icon: <TableProperties className="w-4 h-4" /> },
        { id: 'details', label: 'Event Details', icon: <Info className="w-4 h-4" /> },
        { id: 'send-link', label: 'Send Meet Link', icon: <Mail className="w-4 h-4" /> },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Back */}
            <Link href="/admin" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition mb-8 text-sm">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
            </Link>

            {/* Event Header */}
            <div className="glass-card p-6 sm:p-8 mb-8 animate-slide-up">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <span className={`badge badge-${event.type}`}>
                            {typeLabels[event.type]}
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2">{event.title}</h1>
                        {event.description && (
                            <p className="text-gray-500 mt-2 max-w-2xl">{event.description}</p>
                        )}
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                        <button
                            onClick={handleExportExcel}
                            disabled={registrations.length === 0}
                            className="btn-secondary flex items-center gap-2 text-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export Excel
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{registrations.length}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1.5">
                            <Users className="w-4 h-4" /> Total
                        </p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-green-400">{yesCount}</p>
                        <p className="text-sm text-gray-500">✅ Confirmed</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-amber-400">{maybeCount}</p>
                        <p className="text-sm text-gray-500">🤔 Maybe</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">
                            {event.max_capacity - registrations.length}
                        </p>
                        <p className="text-sm text-gray-500">Spots left</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-50 p-1 rounded-xl border border-gray-200 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-gray-900 shadow-lg'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in" key={activeTab}>
                {/* === Registrations Tab === */}
                {activeTab === 'registrations' && (
                    <div className="glass-card p-6 sm:p-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                            Registrations ({registrations.length})
                        </h2>
                        <DataTable registrations={registrations} />
                    </div>
                )}

                {/* === Event Details Tab === */}
                {activeTab === 'details' && (
                    <div className="glass-card p-6 sm:p-8 space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Event Information</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Event ID */}
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    <Hash className="w-3.5 h-3.5" /> Event ID
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="text-sm text-gray-600 font-mono break-all flex-1">{event.id}</code>
                                    <button
                                        onClick={() => copyToClipboard(event.id, 'id')}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition flex-shrink-0"
                                    >
                                        {copied === 'id' ? <Check className="w-4 h-4 text-green-400" /> : <ClipboardCopy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Title */}
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    <Info className="w-3.5 h-3.5" /> Title
                                </div>
                                <p className="text-gray-900 font-semibold">{event.title}</p>
                            </div>

                            {/* Type */}
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    <Shield className="w-3.5 h-3.5" /> Event Type
                                </div>
                                <span className={`badge badge-${event.type}`}>
                                    {typeLabels[event.type]}
                                </span>
                            </div>

                            {/* Date */}
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    <Calendar className="w-3.5 h-3.5" /> Event Date
                                </div>
                                <p className="text-gray-900">
                                    {event.event_date
                                        ? new Date(event.event_date).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })
                                        : '—  Not set'}
                                </p>
                            </div>

                            {/* Start Timestamp */}
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    <Clock className="w-3.5 h-3.5" /> Registration Closes (2hr prior)
                                </div>
                                <p className="text-gray-900">
                                    {event.start_timestamp
                                        ? new Date(new Date(event.start_timestamp).getTime() - 7200000).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })
                                        : '—  Not set'}
                                </p>
                            </div>

                            {/* Max Capacity */}
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    <Users className="w-3.5 h-3.5" /> Max Capacity
                                </div>
                                <p className="text-gray-900 text-lg font-bold">{event.max_capacity}</p>
                            </div>

                            {/* Created At */}
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    <Clock className="w-3.5 h-3.5" /> Created At
                                </div>
                                <p className="text-gray-600 text-sm">
                                    {new Date(event.created_at).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>

                            {/* Google Meet URL — Full Width */}
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 md:col-span-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    <Video className="w-3.5 h-3.5" /> Google Meet URL
                                </div>
                                {event.meet_url ? (
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <a
                                            href={event.meet_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all flex items-center gap-1.5 transition"
                                        >
                                            {event.meet_url}
                                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                        </a>
                                        <button
                                            onClick={() => copyToClipboard(event.meet_url!, 'meet')}
                                            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                                        >
                                            {copied === 'meet' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                                            {copied === 'meet' ? 'Copied!' : 'Copy Link'}
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-gray-400 italic">No Google Meet URL configured for this event.</p>
                                )}
                            </div>

                            {/* Description — Full Width */}
                            {event.description && (
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 md:col-span-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        <Info className="w-3.5 h-3.5" /> Description
                                    </div>
                                    <p className="text-gray-600 leading-relaxed">{event.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* === Send Meet Link Tab === */}
                {activeTab === 'send-link' && (
                    <div className="glass-card p-6 sm:p-8 space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Send Meet Link to Attendees</h2>

                        {!event.meet_url ? (
                            <div className="p-6 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
                                <div className="text-3xl mb-3">⚠️</div>
                                <p className="text-amber-400 font-semibold mb-1">No Meet URL Configured</p>
                                <p className="text-gray-500 text-sm">Add a Google Meet URL when creating or editing the event.</p>
                            </div>
                        ) : registrations.length === 0 ? (
                            <div className="p-6 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
                                <div className="text-3xl mb-3">📭</div>
                                <p className="text-blue-400 font-semibold mb-1">No Registrations Yet</p>
                                <p className="text-gray-500 text-sm">Wait for attendees to register before sending the link.</p>
                            </div>
                        ) : (
                            <>
                                {/* Meet URL Display */}
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        Meet Link
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <a href={event.meet_url} target="_blank" rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 underline break-all flex items-center gap-1.5">
                                            {event.meet_url} <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                        </a>
                                        <button
                                            onClick={() => copyToClipboard(event.meet_url!, 'meetlink')}
                                            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                                        >
                                            {copied === 'meetlink' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                                            {copied === 'meetlink' ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                </div>

                                {/* Attendee Emails */}
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            Attendee Emails ({registrations.length})
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(allEmails, 'emails')}
                                            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                                        >
                                            {copied === 'emails' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                                            {copied === 'emails' ? 'Copied All!' : 'Copy All Emails'}
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-3 max-h-48 overflow-y-auto">
                                        {registrations.map((r) => (
                                            <span key={r.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">
                                                <Mail className="w-3 h-3" />
                                                {r.email}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={handleAddAttendees}
                                        disabled={sendingInvite}
                                        className="btn-primary flex items-center justify-center gap-2 flex-1 py-3.5"
                                    >
                                        {sendingInvite ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Calendar className="w-5 h-5" />
                                                Send Meet Link via Calendar API
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const emailBody = `Hello!\n\nYou are registered for "${event.title}".\n\nJoin the session using the link below:\n${event.meet_url}\n\nSee you there!\n\n— Campus Events Team`;
                                            copyToClipboard(emailBody, 'body');
                                        }}
                                        className="btn-secondary flex items-center justify-center gap-2 flex-1 py-3.5"
                                    >
                                        {copied === 'body' ? <Check className="w-5 h-5 text-green-400" /> : <ClipboardCopy className="w-5 h-5" />}
                                        {copied === 'body' ? 'Email Body Copied!' : 'Copy Email Body'}
                                    </button>
                                </div>

                                <p className="text-xs text-gray-400 text-center">
                                    💡 If the email button doesn&apos;t open your email client, use &quot;Copy All Emails&quot; and &quot;Copy Email Body&quot; to compose manually.
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

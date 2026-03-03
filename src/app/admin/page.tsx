'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Event } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Plus, LogOut, Calendar, Users, Trash2, Eye, Loader2,
    AlertTriangle, X, CheckCircle2, Download, Power, PowerOff, Archive, ArchiveRestore
} from 'lucide-react';
import { exportToExcel } from '@/lib/excel';

const typeLabels: Record<string, string> = {
    orientation: 'Orientation',
    tutorial: 'Tutorial',
    live_qa: 'Live Q&A',
};

export default function AdminDashboard() {
    const router = useRouter();
    const [events, setEvents] = useState<(Event & { registration_count: number })[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    // Delete modal state
    const [deleteTarget, setDeleteTarget] = useState<(Event & { registration_count: number }) | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Tab state
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/admin/login');
                return;
            }
            setUserId(user.id);
            await fetchEvents();
        } catch (err) {
            console.error('Auth check failed:', err);
            router.push('/admin/login');
        } finally {
            setLoading(false);
        }
    }

    async function fetchEvents() {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            return;
        }

        const eventsWithCounts = await Promise.all(
            (data || []).map(async (event: Event) => {
                const { count } = await supabase
                    .from('registrations')
                    .select('*', { count: 'exact', head: true })
                    .eq('event_id', event.id);
                return { ...event, registration_count: count || 0 };
            })
        );

        setEvents(eventsWithCounts);
    }

    async function handleToggleOpen(event: Event & { registration_count: number }) {
        const newStatus = !event.is_open;

        // Optimistic update
        setEvents(prev => prev.map(e => e.id === event.id ? { ...e, is_open: newStatus } : e));

        const { error } = await supabase
            .from('events')
            .update({ is_open: newStatus })
            .eq('id', event.id);

        if (error) {
            console.error('Toggle failed:', error);
            showToast('Failed to update event status.', 'error');
            // Revert optimistic update
            setEvents(prev => prev.map(e => e.id === event.id ? { ...e, is_open: !newStatus } : e));
        } else {
            showToast(`Event registration ${newStatus ? 'opened' : 'closed'} successfully.`, 'success');
        }
    }

    async function handleExportExcel(eventId: string, eventTitle: string) {
        try {
            const { data, error } = await supabase
                .from('registrations')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                showToast('No registrations to export.', 'error');
                return;
            }

            exportToExcel(data, `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_registrations`);
            showToast('Export successful.', 'success');
        } catch (err) {
            console.error('Export error:', err);
            showToast('Failed to export data.', 'error');
        }
    }

    async function handleArchive(event: Event & { registration_count: number }) {
        // Optimistic update
        setEvents(prev => prev.map(e => e.id === event.id ? { ...e, is_archived: true } : e));

        const { error } = await supabase
            .from('events')
            .update({ is_archived: true })
            .eq('id', event.id);

        if (error) {
            console.error('Archive failed:', error);
            showToast('Failed to archive event.', 'error');
            // Revert
            setEvents(prev => prev.map(e => e.id === event.id ? { ...e, is_archived: false } : e));
        } else {
            showToast('Event moved to archive.', 'success');
        }
    }

    async function handleUnarchive(event: Event & { registration_count: number }) {
        // Optimistic update
        setEvents(prev => prev.map(e => e.id === event.id ? { ...e, is_archived: false } : e));

        const { error } = await supabase
            .from('events')
            .update({ is_archived: false })
            .eq('id', event.id);

        if (error) {
            console.error('Unarchive failed:', error);
            showToast('Failed to restore event.', 'error');
            // Revert
            setEvents(prev => prev.map(e => e.id === event.id ? { ...e, is_archived: true } : e));
        } else {
            showToast('Event restored to active.', 'success');
        }
    }

    async function handleDeleteConfirm() {
        if (!deleteTarget) return;
        setDeleting(true);
        const { error } = await supabase.from('events').delete().eq('id', deleteTarget.id);
        setDeleting(false);

        if (error) {
            console.error('Delete failed:', error);
            showToast('Failed to delete event. Please try again.', 'error');
            setDeleteTarget(null);
            return;
        }

        setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id));
        setDeleteTarget(null);
        showToast('Event deleted successfully.', 'success');
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push('/admin/login');
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    const now = new Date();
    const activeEvents = events.filter(e => !e.is_archived && (!e.start_timestamp || new Date(e.start_timestamp) >= now));
    const archivedEvents = events.filter(e => e.is_archived || (e.start_timestamp && new Date(e.start_timestamp) < now));

    const displayedEvents = activeTab === 'active' ? activeEvents : archivedEvents;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* ── Toast Notification ── */}
            {toast && (
                <div className={`toast-notification ${toast.type === 'success' ? 'toast-success' : 'toast-error'
                    }`}>
                    {toast.type === 'success'
                        ? <CheckCircle2 className="w-5 h-5 shrink-0" />
                        : <AlertTriangle className="w-5 h-5 shrink-0" />
                    }
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-auto p-1 hover:opacity-70 transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            {deleteTarget && (
                <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-500/15">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Delete Event</h2>
                        </div>

                        <p className="text-gray-600 mb-2">
                            Are you sure you want to delete <strong className="text-gray-900">{deleteTarget.title}</strong>?
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            This will permanently remove the event and{' '}
                            <span className="text-red-400 font-semibold">
                                {deleteTarget.registration_count} registration{deleteTarget.registration_count !== 1 ? 's' : ''}
                            </span>.
                            This action cannot be undone.
                        </p>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                                className="btn-secondary text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                                className="btn-danger flex items-center gap-2 text-sm"
                            >
                                {deleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deleting…
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete Event
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage events and registrations</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/admin/events/new" className="btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        New Event
                    </Link>
                    <button onClick={handleLogout} className="btn-secondary flex items-center gap-2">
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10">
                            <Calendar className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{events.length}</p>
                            <p className="text-sm text-gray-500">Total Events</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/10">
                            <Users className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {events.reduce((acc, e) => acc + e.registration_count, 0)}
                            </p>
                            <p className="text-sm text-gray-500">Total Registrations</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10">
                            <Users className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {events.filter(e => e.registration_count >= e.max_capacity).length}
                            </p>
                            <p className="text-sm text-gray-500">Full Events</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`pb-4 px-6 text-sm font-medium transition-colors relative ${activeTab === 'active' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Active Events
                    {activeTab === 'active' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('archived')}
                    className={`pb-4 px-6 text-sm font-medium transition-colors relative ${activeTab === 'archived' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Archived Events
                    {activeTab === 'archived' && (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>
                    )}
                </button>
            </div>

            {/* Events Table */}
            {displayedEvents.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="text-5xl mb-4">📅</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Events Created</h3>
                    <p className="text-gray-500 mb-6">Create your first event to get started.</p>
                    <Link href="/admin/events/new" className="btn-primary inline-flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Create Event
                    </Link>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Event</th>
                                    <th>Type</th>
                                    <th>Date</th>
                                    <th>Capacity</th>
                                    <th>Status</th>
                                    {activeTab === 'active' && <th className="text-center">Manual Control</th>}
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedEvents.map((event) => {
                                    const isFull = event.registration_count >= event.max_capacity;
                                    return (
                                        <tr key={event.id}>
                                            <td className="font-medium text-gray-900">{event.title}</td>
                                            <td>
                                                <span className={`badge badge-${event.type}`}>
                                                    {typeLabels[event.type]}
                                                </span>
                                            </td>
                                            <td className="text-sm">
                                                {event.event_date
                                                    ? new Date(event.event_date).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })
                                                    : '—'}
                                            </td>
                                            <td>
                                                <span className="text-gray-900 font-medium">{event.registration_count}</span>
                                                <span className="text-gray-400"> / {event.max_capacity}</span>
                                            </td>
                                            <td>
                                                {activeTab === 'archived' ? (
                                                    <span className="badge bg-gray-500/15 text-gray-600 border border-gray-500/30">Past</span>
                                                ) : isFull ? (
                                                    <span className="badge bg-red-500/15 text-red-500 border border-red-500/30">Full</span>
                                                ) : !event.is_open ? (
                                                    <span className="badge bg-amber-500/15 text-amber-600 border border-amber-500/30">Closed</span>
                                                ) : (
                                                    <span className="badge bg-green-500/15 text-green-600 border border-green-500/30">Live</span>
                                                )}
                                            </td>
                                            {activeTab === 'active' && (
                                                <td className="text-center">
                                                    <button
                                                        onClick={() => handleToggleOpen(event)}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${event.is_open ? 'bg-blue-600' : 'bg-gray-200'}`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${event.is_open ? 'translate-x-6' : 'translate-x-1'}`}
                                                        />
                                                    </button>
                                                </td>
                                            )}
                                            <td>
                                                <div className="flex items-center justify-end gap-2">
                                                    {activeTab === 'active' && !event.is_archived && (
                                                        <button
                                                            onClick={() => handleArchive(event)}
                                                            className="p-2 rounded-lg hover:bg-amber-500/10 text-gray-500 hover:text-amber-600 transition"
                                                            title="Move to Archive"
                                                        >
                                                            <Archive className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {activeTab === 'archived' && event.is_archived && (
                                                        <button
                                                            onClick={() => handleUnarchive(event)}
                                                            className="p-2 rounded-lg hover:bg-blue-500/10 text-gray-500 hover:text-blue-600 transition"
                                                            title="Restore to Active"
                                                        >
                                                            <ArchiveRestore className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {activeTab === 'archived' && (
                                                        <button
                                                            onClick={() => handleExportExcel(event.id, event.title)}
                                                            className="p-2 rounded-lg hover:bg-green-500/10 text-gray-500 hover:text-green-600 transition"
                                                            title="Export to Excel"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <Link
                                                        href={`/admin/events/${event.id}`}
                                                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition"
                                                        title="View Registrations"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => setDeleteTarget(event)}
                                                        className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition"
                                                        title="Delete Event"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

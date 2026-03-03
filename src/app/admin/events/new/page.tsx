'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { EventCategory } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';

export default function NewEventPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [userId, setUserId] = useState<string | null>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<EventCategory>('orientation');
    const [eventDate, setEventDate] = useState('');
    const [maxCapacity, setMaxCapacity] = useState<number | ''>(200);
    const [meetUrl, setMeetUrl] = useState('');
    const [startTimestamp, setStartTimestamp] = useState('');

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/admin/login');
            return;
        }
        setUserId(user.id);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error: insertError } = await supabase.from('events').insert({
            title,
            description: description || null,
            type,
            event_date: eventDate ? new Date(eventDate).toISOString() : null,
            max_capacity: typeof maxCapacity === 'number' ? maxCapacity : 200,
            meet_url: meetUrl || null,
            admin_id: userId,
            start_timestamp: startTimestamp ? new Date(startTimestamp).toISOString() : null,
        });

        if (insertError) {
            setError(insertError.message);
            setLoading(false);
            return;
        }

        router.push('/admin');
    };

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
            <Link href="/admin" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition mb-8 text-sm">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
            </Link>

            <div className="glass-card p-6 sm:p-8 animate-slide-up">
                <h1 className="text-2xl font-black text-gray-900 mb-6">Create New Event</h1>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Event Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="input-field"
                            placeholder="e.g. First Year Orientation 2026"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="input-field min-h-[100px] resize-y"
                            placeholder="Describe the event..."
                        />
                    </div>

                    {/* Type & Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Event Type *</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as EventCategory)}
                                className="input-field"
                            >
                                <option value="orientation">Orientation</option>
                                <option value="tutorial">Tutorial</option>
                                <option value="live_qa">Live Q&A</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">Event Date</label>
                            <input
                                type="datetime-local"
                                value={eventDate}
                                onChange={(e) => setEventDate(e.target.value)}
                                className="input-field"
                            />
                        </div>
                    </div>

                    {/* Start Timestamp & Capacity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">
                                Start Timestamp *
                                <span className="block text-xs text-gray-400 font-normal">Registration closes 2 hours before this</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={startTimestamp}
                                onChange={(e) => setStartTimestamp(e.target.value)}
                                className="input-field"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">
                                Max Capacity *
                            </label>
                            <input
                                type="number"
                                value={maxCapacity}
                                onChange={(e) => setMaxCapacity(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="input-field"
                                min={1}
                                max={200}
                                required
                            />
                        </div>
                    </div>

                    {/* Meet URL (Full Width) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Google Meet URL</label>
                        <input
                            type="url"
                            value={meetUrl}
                            onChange={(e) => setMeetUrl(e.target.value)}
                            className="input-field"
                            placeholder="https://meet.google.com/..."
                        />
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
                                Creating...
                            </>
                        ) : (
                            <>
                                <Plus className="w-5 h-5" />
                                Create Event
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

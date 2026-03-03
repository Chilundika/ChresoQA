'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { Event } from '@/lib/types';
import RegistrationForm from '@/components/RegistrationForm';
import { ArrowLeft, Calendar, Users, MapPin } from 'lucide-react';
import Link from 'next/link';

const typeLabels: Record<string, string> = {
    orientation: 'Orientation',
    tutorial: 'Tutorial',
    live_qa: 'Live Q&A',
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [event, setEvent] = useState<Event | null>(null);
    const [regCount, setRegCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function fetchEvent() {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', resolvedParams.id)
            .single();

        if (error || !data) {
            setLoading(false);
            return;
        }

        setEvent(data);

        const { count } = await supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', resolvedParams.id);

        setRegCount(count || 0);
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
                <Link href="/" className="text-blue-400 hover:underline">← Back to Events</Link>
            </div>
        );
    }

    const isFull = regCount >= event.max_capacity;

    // Check 2-hour window logic (UTC parsing handled automatically by Date.parse for ISO strings)
    const isPast = event.start_timestamp ? new Date(event.start_timestamp) < new Date() : false;
    const isWithinTwoHours = event.start_timestamp
        ? (Date.parse(event.start_timestamp) - Date.now() <= 7200000)
        : false;

    const isClosed = isWithinTwoHours;
    const isOpen = event.is_open !== false; // handle nulls gracefully as true by default

    const capacityPercent = Math.min((regCount / event.max_capacity) * 100, 100);
    const capacityClass = capacityPercent >= 100 ? 'full' : capacityPercent >= 80 ? 'warning' : '';

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Back Link */}
            <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition mb-8 text-sm">
                <ArrowLeft className="w-4 h-4" />
                Back to Events
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Event Info — Left */}
                <div className="lg:col-span-2 space-y-6 animate-slide-up">
                    <div className="glass-card p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className={`badge badge-${event.type}`}>
                                {typeLabels[event.type] || event.type}
                            </span>
                            {isPast ? (
                                <span className="badge bg-gray-500/15 text-gray-600 border border-gray-500/30">Past</span>
                            ) : (!isOpen || isFull || isClosed) ? (
                                <span className="badge bg-amber-500/15 text-amber-600 border border-amber-500/30">Closed</span>
                            ) : (
                                <span className="badge bg-green-500/15 text-green-600 border border-green-500/30">Live</span>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
                            {event.title}
                        </h1>
                        {event.description && (
                            <p className="text-gray-500 leading-relaxed">{event.description}</p>
                        )}

                        {/* Details */}
                        <div className="space-y-3 pt-2">
                            {event.event_date && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="w-4 h-4 text-blue-400" />
                                    <span className="text-gray-600">
                                        {new Date(event.event_date).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            )}
                            {event.meet_url && (
                                <div className="flex items-center gap-3 text-sm">
                                    <MapPin className="w-4 h-4 text-purple-400" />
                                    <span className="text-gray-600">Online (Google Meet)</span>
                                </div>
                            )}
                        </div>

                        {/* Capacity */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                    <Users className="w-4 h-4" />
                                    <span>{regCount} / {event.max_capacity} registered</span>
                                </div>
                                {isFull && (
                                    <span className="text-xs font-bold text-red-400 uppercase">Full</span>
                                )}
                            </div>
                            <div className="capacity-bar">
                                <div
                                    className={`capacity-fill ${capacityClass}`}
                                    style={{ width: `${capacityPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Registration Form — Right */}
                <div className="lg:col-span-3 animate-slide-up" style={{ animationDelay: '100ms' }}>
                    <RegistrationForm eventId={event.id} isFull={isFull} isClosed={isClosed} isOpen={isOpen} isPast={isPast} />
                </div>
            </div>

        </div>
    );
}

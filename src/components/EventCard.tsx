'use client';

import Link from 'next/link';
import { Calendar, Users, ArrowRight } from 'lucide-react';
import { Event } from '@/lib/types';

const typeLabels: Record<string, string> = {
    orientation: 'Orientation',
    tutorial: 'Tutorial',
    live_qa: 'Live Q&A',
};

interface EventCardProps {
    event: Event;
    registrationCount: number;
}

export default function EventCard({ event, registrationCount }: EventCardProps) {
    const isFull = registrationCount >= event.max_capacity;

    // Evaluate if event is manually closed, or blocked by 2 hour window
    const isOpen = event.is_open !== false;
    const isWithinTwoHours = event.start_timestamp
        ? (Date.parse(event.start_timestamp) - Date.now() <= 7200000)
        : false;
    const isPast = event.start_timestamp ? new Date(event.start_timestamp) < new Date() : false;
    const isClosed = !isOpen || isFull || isWithinTwoHours || isPast;

    const capacityPercent = Math.min((registrationCount / event.max_capacity) * 100, 100);
    const capacityClass = capacityPercent >= 100 ? 'full' : capacityPercent >= 80 ? 'warning' : '';

    return (
        <div className="glass-card p-6 flex flex-col gap-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <span className={`badge badge-${event.type}`}>
                        {typeLabels[event.type] || event.type}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 mt-2 leading-tight">
                        {event.title}
                    </h3>
                </div>
            </div>

            {/* Description */}
            {event.description && (
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                    {event.description}
                </p>
            )}

            {/* Date */}
            {event.event_date && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>
                        {new Date(event.event_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                </div>
            )}

            {/* Capacity Bar */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Users className="w-4 h-4" />
                        <span>{registrationCount} / {event.max_capacity}</span>
                    </div>
                    {isFull && (
                        <span className="text-xs font-semibold text-red-400">FULL</span>
                    )}
                </div>
                <div className="capacity-bar">
                    <div
                        className={`capacity-fill ${capacityClass}`}
                        style={{ width: `${capacityPercent}%` }}
                    />
                </div>
            </div>

            {/* CTA */}
            <Link
                href={isClosed ? '#' : `/events/${event.id}`}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${isClosed
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20'
                    }`}
                onClick={(e) => isClosed && e.preventDefault()}
            >
                {isClosed ? (
                    'Registrations Closed!'
                ) : (
                    <>
                        Register Now
                        <ArrowRight className="w-4 h-4" />
                    </>
                )}
            </Link>
        </div>
    );
}

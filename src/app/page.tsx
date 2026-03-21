'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Event } from '@/lib/types';
import EventCard from '@/components/EventCard';
import { Sparkles, Loader2, CheckCircle, X } from 'lucide-react';

function ThankYouBanner() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setShow(true);
    }
  }, [searchParams]);

  if (!show) return null;

  return (
    <div className="max-w-2xl mx-auto mb-8 animate-slide-up">
      <div className="glass-card p-5 border-green-500/20 flex items-center gap-4"
        style={{ background: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.25)' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/15 flex-shrink-0">
          <CheckCircle className="w-6 h-6 text-green-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-green-400">Thank you for registering!</h3>
          <p className="text-gray-500 text-sm mt-0.5">Your spot has been confirmed. We look forward to seeing you!</p>
        </div>
        <button onClick={() => setShow(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [events, setEvents] = useState<(Event & { registration_count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;

      const now = new Date();

      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event: Event) => {
          const { count } = await supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          return { ...event, registration_count: count || 0 };
        })
      );

      // Filter events: only show those that are active and open
      const filteredEvents = eventsWithCounts.filter(event => {
        const isFull = event.registration_count >= event.max_capacity;
        const isOpen = event.is_open !== false;
        const isPast = event.start_timestamp ? new Date(event.start_timestamp) < now : false;
        const isWithinTwoHours = event.start_timestamp
          ? (new Date(event.start_timestamp).getTime() - now.getTime() <= 7200000)
          : false;

        const isClosed = !isOpen || isFull || isWithinTwoHours || isPast;
        return !isClosed;
      });

      setEvents(filteredEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Thank You Banner */}
      <Suspense fallback={null}>
        <ThankYouBanner />
      </Suspense>

      {/* Hero */}
      <div className="text-center mb-16 animate-slide-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          Campus Events Registration
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight">
          <span className="text-black">Discover & Register for</span>
          <br />
          <span className="text-black">Campus Events</span>
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
          Join Orientations, Tutorials, and Live Q&A sessions. Secure your spot before it fills up!
        </p>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 glass-card max-w-md mx-auto">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Events Yet</h3>
          <p className="text-gray-500">Check back soon for upcoming campus events.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, i) => (
            <div key={event.id} style={{ animationDelay: `${i * 100}ms` }}>
              <EventCard event={event} registrationCount={event.registration_count} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

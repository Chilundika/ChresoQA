export type EventCategory = 'orientation' | 'tutorial' | 'live_qa';

export interface Event {
    id: string;
    title: string;
    description: string | null;
    type: EventCategory;
    event_date: string | null;
    max_capacity: number;
    meet_url: string | null;
    admin_id: string | null;
    created_at: string;
    start_timestamp?: string | null;
    registration_count?: number;
    is_open: boolean;
    is_archived: boolean;
}

export interface Registration {
    id: string;
    event_id: string;
    first_name: string;
    last_name: string;
    email: string;
    contact_number: string | null;
    whatsapp_number: string | null;
    year_of_study: number | null;
    program_name: string | null;
    will_attend: 'YES' | 'MAYBE';
    created_at: string;
}

export interface RegistrationFormData {
    first_name: string;
    last_name: string;
    email: string;
    contact_number: string;
    whatsapp_number: string;
    year_of_study: number;
    program_name: string;
    will_attend: 'YES' | 'MAYBE';
}

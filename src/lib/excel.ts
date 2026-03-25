import * as XLSX from 'xlsx';
import { Registration } from './types';

export function exportToExcel(data: Registration[], filename: string = 'registrations') {
    const exportData = data.map((reg) => ({
        'First Name': reg.first_name,
        'Last Name': reg.last_name,
        'Email': reg.email,
        'Contact Number': reg.contact_number || '',
        'WhatsApp': reg.whatsapp_number || '',
        'Year of Study': reg.year_of_study || '',
        'Program': reg.program_name || '',
        'Will Attend': reg.will_attend,
        'Registered At': new Date(reg.created_at).toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
        wch: Math.max(key.length, ...exportData.map((row) => String((row as Record<string, unknown>)[key] || '').length)),
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportEventsToCSV(data: any[], filename: string = 'events_report') {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

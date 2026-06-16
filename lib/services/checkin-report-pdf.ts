// lib/services/checkin-report-pdf.ts
// PDF check-in report generation (server-side)

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Event, GuestType } from '@/lib/database/types';
import { CheckinReportGuestRow } from '@/lib/database/queries';
import { formatSwahiliDateTime } from '@/lib/utils/swahili-datetime';

type JsPdfWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

function guestTypeLabel(guestType: GuestType | undefined): string {
  return guestType === 'double' ? 'Double' : 'Single';
}

function formatCheckinTime(value: Date | string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatGeneratedAt(): string {
  return formatSwahiliDateTime(new Date());
}

export function generateCheckinReportPdf(
  event: Event,
  guests: CheckinReportGuestRow[],
  stats: { checkedIn: number; total: number }
): Buffer {
  const checkedInGuests = guests
    .filter((g) => g.checked_in)
    .sort(
      (a, b) =>
        new Date(a.checked_in_at ?? 0).getTime() -
        new Date(b.checked_in_at ?? 0).getTime()
    );

  const notCheckedInGuests = guests
    .filter((g) => !g.checked_in)
    .sort((a, b) => a.name.localeCompare(b.name, 'sw'));

  const notCheckedIn = stats.total - stats.checkedIn;
  const percentage =
    stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

  const doc = new jsPDF() as JsPdfWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('NIVLE E-Kadi - Ripoti ya Check-in', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tukio: ${event.name}`, 14, y);
  y += 6;
  doc.text(`Tarehe ya Tukio: ${formatSwahiliDateTime(event.date, event.time)}`, 14, y);
  y += 6;
  doc.text(`Imetolewa: ${formatGeneratedAt()}`, 14, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Muhtasari', 14, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(`Jumla ya Wageni: ${stats.total}`, 14, y);
  y += 6;
  doc.text(`Waliofika: ${stats.checkedIn}`, 14, y);
  y += 6;
  doc.text(`Hawakuja: ${notCheckedIn}`, 14, y);
  y += 6;
  doc.text(`Asilimia ya Mahudhurio: ${percentage}%`, 14, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('WALIOFIKA', 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [['#', 'Jina', 'Namba ya Simu', 'Aina', 'Saa ya Kuingia']],
    body: checkedInGuests.map((guest, index) => [
      String(index + 1),
      guest.name,
      guest.phone,
      guestTypeLabel(guest.guest_type),
      formatCheckinTime(guest.checked_in_at),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [30, 30, 30] },
    styles: { fontSize: 9, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  y = (doc.lastAutoTable?.finalY ?? y) + 12;

  if (y > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    y = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('HAWAKUJA', 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [['#', 'Jina', 'Namba ya Simu', 'Aina']],
    body: notCheckedInGuests.map((guest, index) => [
      String(index + 1),
      guest.name,
      guest.phone,
      guestTypeLabel(guest.guest_type),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [30, 30, 30] },
    styles: { fontSize: 9, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Ripoti imetolewa na NIVLE E-Kadi - admin.nivle-ekadi.com',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  return Buffer.from(doc.output('arraybuffer'));
}

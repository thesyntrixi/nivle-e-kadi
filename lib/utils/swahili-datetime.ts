const DAY_NAMES = [
  'Jumapili',
  'Jumatatu',
  'Jumanne',
  'Jumatano',
  'Alhamisi',
  'Ijumaa',
  'Jumamosi',
];

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Machi',
  'Aprili',
  'Mei',
  'Juni',
  'Julai',
  'Agosti',
  'Septemba',
  'Oktoba',
  'Novemba',
  'Desemba',
];

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

function format12HourTime(hours: number, minutes: number): string {
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `Saa ${hour12}:${padTwo(minutes)} ${period}`;
}

/**
 * Format a date/time for Swahili invitation messages.
 * Example: "Jumamosi, 15 Julai 2026, Saa 8:00 PM"
 */
export function formatSwahiliDateTime(
  dateInput: Date | string,
  timeInput?: string | null
): string {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return String(dateInput);
  }

  const dayName = DAY_NAMES[date.getDay()];
  const day = date.getDate();
  const month = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  let minutes = date.getMinutes();

  if (timeInput) {
    const match = timeInput.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
    }
  }

  const timePart = format12HourTime(hours, minutes);

  return `${dayName}, ${day} ${month} ${year}, ${timePart}`;
}

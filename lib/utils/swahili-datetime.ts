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

function getTimePeriod(hour: number): string {
  if (hour >= 0 && hour <= 11) return 'Asubuhi';
  if (hour >= 12 && hour <= 15) return 'Mchana';
  if (hour >= 16 && hour <= 18) return 'Jioni';
  return 'Usiku';
}

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Format a date/time for Swahili invitation messages.
 * Example: "Jumamosi, 15 Julai 2026, Saa 10:00 Asubuhi"
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

  const period = getTimePeriod(hours);
  const timePart = `Saa ${padTwo(hours)}:${padTwo(minutes)} ${period}`;

  return `${dayName}, ${day} ${month} ${year}, ${timePart}`;
}

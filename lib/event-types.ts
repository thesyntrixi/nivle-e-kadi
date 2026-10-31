export const EVENT_TYPES = [
  { value: 'Wedding', label: 'Harusi' },
  { value: 'Sendoff', label: 'Sendoff' },
  { value: 'Ticket', label: 'Tiketi (Movie / Igizo / Show)' },
  { value: 'Birthday', label: 'Birthday' },
  { value: 'Graduation', label: 'Graduation' },
  { value: 'Kitchen Party', label: 'Kitchen Party' },
  { value: 'Meeting', label: 'Mkutano' },
  { value: 'Conference', label: 'Conference' },
  { value: 'Corporate', label: 'Corporate' },
  { value: 'Other', label: 'Nyingine (Baby shower, n.k.)' },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]['value'];

export const EVENT_TYPE_VALUES: readonly EventType[] = EVENT_TYPES.map((item) => item.value);

export function isWeddingEventType(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === 'wedding';
}

export function isKnownEventType(value: string | null | undefined): value is EventType {
  return EVENT_TYPE_VALUES.includes(value as EventType);
}

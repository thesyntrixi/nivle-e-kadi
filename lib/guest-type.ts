import { GuestType } from '@/lib/database/types';

export function getGuestTypeBadgeLabel(
  guestType: GuestType | undefined,
  variant: 'short' | 'checkin' | 'invite' = 'short'
): string {
  const type = guestType ?? 'single';

  if (variant === 'checkin') {
    return type === 'double' ? '👥 Double (watu 2)' : '👤 Single (mtu 1)';
  }

  if (variant === 'invite') {
    return type === 'double'
      ? '👥 Mwaliko huu ni kwa watu 2'
      : '👤 Mwaliko huu ni kwa mtu 1';
  }

  return type === 'double' ? '👥 Double' : '👤 Single';
}

export function guestTypeBadgeClass(guestType: GuestType | undefined): string {
  return guestType === 'double'
    ? 'bg-accent-info/15 text-accent-info border-accent-info/30'
    : 'bg-surface-hover text-neutral-muted border-neutral-border';
}

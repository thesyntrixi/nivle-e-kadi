'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function GuestChatRedirect() {
  const params = useParams();
  const router = useRouter();
  const guestId = params.guestId as string;

  useEffect(() => {
    router.replace(`/messages?guest=${guestId}`);
  }, [guestId, router]);

  return (
    <div className="flex items-center justify-center py-16 text-neutral-muted text-small">
      Redirecting to messages...
    </div>
  );
}

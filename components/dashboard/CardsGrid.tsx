'use client';

import Link from 'next/link';
import { CardTemplate } from '@/lib/database/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export type CardItem = CardTemplate & {
  event_name?: string;
  guest_count?: number;
  file_size?: number | null;
};

interface CardsGridProps {
  cards: CardItem[];
  onDelete: (id: string) => Promise<void>;
  deletingId?: string | null;
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function FileTypeBadge({ type }: { type: CardTemplate['file_type'] }) {
  const colors: Record<CardTemplate['file_type'], string> = {
    PNG: 'bg-primary/20 text-primary border-primary/30',
    JPG: 'bg-accent-success/20 text-accent-success border-accent-success/30',
    PDF: 'bg-accent-warning/20 text-accent-warning border-accent-warning/30',
  };

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-small font-medium border ${colors[type]}`}
    >
      {type}
    </span>
  );
}

function CardThumbnail({ card }: { card: CardItem }) {
  if (card.file_type === 'PDF') {
    return (
      <div className="aspect-[4/3] bg-surface-hover flex flex-col items-center justify-center rounded-input border border-neutral-border">
        <span className="text-4xl mb-2" aria-hidden="true">📄</span>
        <span className="text-small text-neutral-muted">PDF</span>
      </div>
    );
  }

  return (
    <div className="aspect-[4/3] bg-surface-hover rounded-input overflow-hidden border border-neutral-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.file_url}
        alt={card.original_file_name}
        loading="lazy"
        className="w-full h-full object-cover max-h-[200px]"
      />
    </div>
  );
}

export function CardsGrid({ cards, onDelete, deletingId = null }: CardsGridProps) {
  if (cards.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <div className="py-8">
          <span className="text-4xl mb-4 block" aria-hidden="true">🎨</span>
          <h3 className="text-h3 text-neutral-text mb-2">No cards yet</h3>
          <p className="text-neutral-muted text-small mb-6">
            Upload your first invitation card template to personalize guest invitations.
          </p>
        </div>
      </Card>
    );
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    await onDelete(id);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      {cards.map((card) => (
        <Card
          key={card.id}
          hover
          padding="sm"
          className="group flex flex-col overflow-hidden transition-transform duration-200 hover:scale-[1.02]"
        >
          <Link href={`/cards/${card.id}`} className="block mb-4">
            <CardThumbnail card={card} />
          </Link>

          <div className="flex-1 space-y-2 px-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-neutral-text truncate flex-1">
                {card.original_file_name}
              </h3>
              <FileTypeBadge type={card.file_type} />
            </div>

            {card.event_name && (
              <p className="text-small text-neutral-muted truncate">
                <span className="text-neutral-text font-medium">Event:</span>{' '}
                {card.event_name}
              </p>
            )}

            <p className="text-small text-neutral-muted">
              Uploaded {formatDate(card.created_at)}
            </p>
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t border-neutral-border/50">
            <Link href={`/cards/${card.id}`} className="flex-1">
              <Button variant="outline" fullWidth className="!py-2 text-small">
                View
              </Button>
            </Link>
            <Button
              variant="danger"
              className="!py-2 text-small flex-1"
              loading={deletingId === card.id}
              onClick={() => handleDelete(card.id, card.original_file_name)}
            >
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function CardsGridLoading() {
  return (
    <Card padding="lg" className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="border-neutral-border border-t-primary" />
        <p className="text-small text-neutral-muted">Loading cards...</p>
      </div>
    </Card>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MessageWithGuest } from '@/app/api/messages/route';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface MessagesTableProps {
  messages: MessageWithGuest[];
  onDelete: (id: string) => Promise<void>;
  onResend: (message: MessageWithGuest) => Promise<void>;
  deletingId?: string | null;
  resendingId?: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Pending: 'bg-neutral-muted/20 text-neutral-muted border-neutral-border',
    Sent: 'bg-primary/20 text-primary border-primary/30',
    Delivered: 'bg-accent-success/20 text-accent-success border-accent-success/40',
    Failed: 'bg-accent-error/20 text-accent-error border-accent-error/40',
    Read: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-small font-medium border ${
        styles[status] ?? styles.Pending
      }`}
    >
      {status}
    </span>
  );
}

function formatDate(date: string | Date | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function previewText(text: string, max = 50): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function MessagesTable({
  messages,
  onDelete,
  onResend,
  deletingId = null,
  resendingId = null,
}: MessagesTableProps) {
  const router = useRouter();

  if (messages.length === 0) {
    return (
      <Card padding="lg" className="text-center py-12">
        <span className="text-4xl mb-4 block" aria-hidden="true">💬</span>
        <h3 className="text-h3 text-neutral-text mb-2">No messages yet</h3>
        <p className="text-neutral-muted text-small">
          Send your first SMS or WhatsApp invitation to get started.
        </p>
      </Card>
    );
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this message record?')) return;
    await onDelete(id);
  }

  return (
    <>
      <Card padding="sm" className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-border">
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">Guest</th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">Type</th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">Preview</th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">Status</th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted">Date</th>
                <th className="px-4 py-3 text-small font-medium uppercase tracking-wide text-neutral-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr
                  key={msg.id}
                  className="border-b border-neutral-border/50 last:border-0 hover:bg-surface-hover/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/messages/${msg.guest_id}`)}
                >
                  <td className="px-4 py-4 text-sm font-medium text-neutral-text">
                    {msg.guest_name}
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-muted">
                    {msg.message_type}
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-muted max-w-xs truncate">
                    {previewText(msg.content)}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={msg.display_status} />
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-muted whitespace-nowrap">
                    {formatDate(msg.sent_at ?? msg.created_at)}
                  </td>
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/messages/${msg.guest_id}`}>
                        <Button variant="outline" className="!px-3 !py-1.5 text-small">
                          Chat
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        className="!px-3 !py-1.5 text-small"
                        loading={resendingId === msg.id}
                        onClick={() => onResend(msg)}
                      >
                        Resend
                      </Button>
                      <Button
                        variant="danger"
                        className="!px-3 !py-1.5 text-small"
                        loading={deletingId === msg.id}
                        onClick={() => handleDelete(msg.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="md:hidden space-y-4">
        {messages.map((msg) => (
          <Card key={msg.id} padding="md" hover>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-text">{msg.guest_name}</h3>
                  <p className="text-small text-neutral-muted">{msg.message_type}</p>
                </div>
                <StatusBadge status={msg.display_status} />
              </div>
              <p className="text-small text-neutral-muted">{previewText(msg.content, 80)}</p>
              <p className="text-small text-neutral-muted">{formatDate(msg.sent_at ?? msg.created_at)}</p>
              <div className="flex gap-2">
                <Link href={`/messages/${msg.guest_id}`} className="flex-1">
                  <Button variant="outline" fullWidth className="!py-2 text-small">Chat</Button>
                </Link>
                <Button
                  variant="outline"
                  className="!py-2 text-small flex-1"
                  loading={resendingId === msg.id}
                  onClick={() => onResend(msg)}
                >
                  Resend
                </Button>
                <Button
                  variant="danger"
                  className="!py-2 text-small flex-1"
                  loading={deletingId === msg.id}
                  onClick={() => handleDelete(msg.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export function MessagesTableLoading() {
  return (
    <Card padding="lg" className="flex items-center justify-center py-16">
      <p className="text-small text-neutral-muted">Loading messages...</p>
    </Card>
  );
}

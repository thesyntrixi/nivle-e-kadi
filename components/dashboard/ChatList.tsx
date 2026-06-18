'use client';

import { Spinner } from '@/components/ui/Spinner';
import { formatEatListTime } from '@/lib/utils/eat-datetime';

export interface Conversation {
  guest_id: string;
  guest_name: string;
  guest_phone: string;
  last_message?: string;
  last_message_time?: Date | string;
  message_type: 'SMS' | 'WhatsApp';
  unread_count?: number;
}

export type ChatFilter = 'All' | 'SMS' | 'WhatsApp' | 'Unread';

interface ChatListProps {
  conversations: Conversation[];
  selectedGuestId?: string;
  onSelectGuest: (guestId: string) => void;
  onSearch: (query: string) => void;
  filter: ChatFilter;
  onFilterChange: (filter: ChatFilter) => void;
  isLoading?: boolean;
  className?: string;
  onBulkSms?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatListTime(date?: Date | string): string {
  return formatEatListTime(date);
}

function truncate(text: string, max = 45): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const FILTERS: ChatFilter[] = ['All', 'SMS', 'WhatsApp', 'Unread'];

export function ChatList({
  conversations,
  selectedGuestId,
  onSelectGuest,
  onSearch,
  filter,
  onFilterChange,
  isLoading = false,
  className = '',
  onBulkSms,
}: ChatListProps) {
  return (
    <div
      className={`flex flex-col h-full bg-surface-card border-r border-neutral-border ${className}`}
    >
      <div className="px-4 py-4 border-b border-neutral-border shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3 text-neutral-text font-semibold">Messages</h2>
          {onBulkSms && (
            <button
              type="button"
              onClick={onBulkSms}
              className="text-small text-primary hover:text-primary/80 font-medium transition-colors"
            >
              + Bulk SMS
            </button>
          )}
        </div>
        <input
          type="search"
          placeholder="Search guests..."
          onChange={(e) => onSearch(e.target.value)}
          className="input-field w-full text-sm"
        />
      </div>

      <div className="flex gap-1 px-3 py-2 border-b border-neutral-border shrink-0 overflow-x-auto">
        {FILTERS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onFilterChange(tab)}
            className={`px-3 py-1.5 rounded-full text-small font-medium whitespace-nowrap transition-colors ${
              filter === tab
                ? 'bg-primary text-white'
                : 'text-neutral-muted hover:bg-surface-hover hover:text-neutral-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="md" className="border-neutral-border border-t-primary" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 px-4">
            <span className="text-3xl mb-3 block" aria-hidden="true">💬</span>
            <p className="text-sm text-neutral-muted">No conversations yet</p>
            <p className="text-small text-neutral-muted mt-1">
              Send a message to get started
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isSelected = selectedGuestId === conv.guest_id;
            const unread = (conv.unread_count ?? 0) > 0;

            return (
              <button
                key={conv.guest_id}
                type="button"
                onClick={() => onSelectGuest(conv.guest_id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-neutral-border/40 ${
                  isSelected
                    ? 'bg-primary/10 border-l-2 border-l-primary'
                    : 'hover:bg-surface-hover/60 border-l-2 border-l-transparent'
                }`}
              >
                <div
                  className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold ${
                    conv.message_type === 'WhatsApp'
                      ? 'bg-accent-success/20 text-accent-success'
                      : 'bg-primary/20 text-primary'
                  }`}
                >
                  {getInitials(conv.guest_name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-neutral-text truncate">
                      {conv.guest_name}
                    </span>
                    <span className="text-xs text-neutral-muted shrink-0">
                      {formatListTime(conv.last_message_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-small text-neutral-muted truncate">
                      {conv.last_message
                        ? truncate(conv.last_message)
                        : 'No messages yet'}
                    </p>
                    {unread && (
                      <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full bg-primary text-white text-xs font-medium">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded ${
                      conv.message_type === 'WhatsApp'
                        ? 'bg-accent-success/10 text-accent-success'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {conv.message_type}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

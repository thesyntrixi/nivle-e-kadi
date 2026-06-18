/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useRef, useState } from 'react';
import { Message } from '@/lib/database/types';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatEatDateGroup, formatEatTime } from '@/lib/utils/eat-datetime';

interface ChatWindowProps {
  guestId?: string;
  guestName?: string;
  guestPhone?: string;
  messageType: 'SMS' | 'WhatsApp';
  messages: (Message & { display_status?: string })[];
  onSendMessage: (type: 'SMS' | 'WhatsApp', text: string) => Promise<void>;
  isLoading?: boolean;
  isLoadingChat?: boolean;
  isSending?: boolean;
  onBack?: () => void;
  onBulkSms?: () => void;
}

function StatusIcon({ status, displayStatus }: { status: Message['status']; displayStatus?: string }) {
  if (status === 'Failed') {
    return <span className="text-accent-error text-xs" title="Failed">✗</span>;
  }
  if (displayStatus === 'Read') {
    return <span className="text-cyan-400 text-xs" title="Read">✓✓✓</span>;
  }
  if (status === 'Delivered') {
    return <span className="text-accent-success text-xs" title="Delivered">✓✓</span>;
  }
  if (status === 'Sent') {
    return <span className="text-primary/80 text-xs" title="Sent">✓</span>;
  }
  return <span className="text-neutral-muted text-xs" title="Pending">○</span>;
}

function formatTime(date: string | Date | null): string {
  return formatEatTime(date);
}

function formatDateGroup(date: string | Date): string {
  return formatEatDateGroup(date);
}

function groupMessagesByDate(messages: (Message & { display_status?: string })[]) {
  const groups: { date: string; messages: (Message & { display_status?: string })[] }[] = [];
  let currentDate = '';

  for (const msg of messages) {
    const dateKey = new Date(msg.created_at).toDateString();
    if (dateKey !== currentDate) {
      currentDate = dateKey;
      groups.push({ date: formatDateGroup(msg.created_at), messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }

  return groups;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function TypeBadge({ type }: { type: 'SMS' | 'WhatsApp' }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        type === 'WhatsApp'
          ? 'bg-accent-success/20 text-accent-success'
          : 'bg-primary/20 text-primary'
      }`}
    >
      {type === 'WhatsApp' ? 'WA' : 'SMS'}
    </span>
  );
}

export function ChatWindow({
  guestId,
  guestName,
  guestPhone,
  messageType,
  messages,
  onSendMessage,
  isLoading = false,
  isLoadingChat = false,
  isSending = false,
  onBack,
  onBulkSms,
}: ChatWindowProps) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevGuestIdRef = useRef<string | undefined>(guestId);
  const prevMessageCountRef = useRef(messages.length);

  const charLimit = messageType === 'SMS' ? 160 : 4096;
  const isWhatsApp = messageType === 'WhatsApp';

  useEffect(() => {
    setText('');
  }, [guestId]);

  useEffect(() => {
    const guestChanged = guestId !== prevGuestIdRef.current;
    prevGuestIdRef.current = guestId;

    if (guestChanged) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      prevMessageCountRef.current = messages.length;
      return;
    }

    if (messages.length > prevMessageCountRef.current) {
      const lastMessage = messages[messages.length - 1];
      const isOutbound = (lastMessage.direction ?? 'outbound') === 'outbound';
      if (isOutbound || lastMessage.id.startsWith('temp-')) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }

    prevMessageCountRef.current = messages.length;
  }, [messages, guestId]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  async function handleSend() {
    if (!text.trim() || isSending || !isWhatsApp) return;
    await onSendMessage('WhatsApp', text.trim());
    setText('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && isWhatsApp) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!guestId) {
    return (
      <div className="flex flex-col h-full bg-surface-page items-center justify-center">
        <div className="text-center px-8 max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-surface-card border border-neutral-border flex items-center justify-center">
            <svg className="w-10 h-10 text-neutral-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-h3 text-neutral-text mb-2">Select a guest to start chatting</h3>
          <p className="text-small text-neutral-muted">
            Choose a conversation from the list, or send a bulk SMS to multiple guests.
          </p>
          {onBulkSms && (
            <Button className="mt-6" onClick={onBulkSms}>
              Send Bulk SMS
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-surface-page">
        <Spinner size="lg" className="border-neutral-border border-t-primary" />
      </div>
    );
  }

  const groups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full bg-surface-page overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-border bg-surface-card shrink-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-2 -ml-2 text-neutral-muted hover:text-neutral-text transition-colors"
            aria-label="Back to list"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
            messageType === 'WhatsApp'
              ? 'bg-accent-success/20 text-accent-success'
              : 'bg-primary/20 text-primary'
          }`}
        >
          {guestName ? getInitials(guestName) : '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-neutral-text truncate">{guestName}</p>
            <TypeBadge type={messageType} />
          </div>
          <p className="text-small text-neutral-muted truncate">{guestPhone}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isLoadingChat ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="md" className="border-neutral-border border-t-primary" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-neutral-muted text-small py-12">
            No messages yet.{' '}
            {isWhatsApp ? 'Send the first message below.' : 'Use bulk SMS to send invitations.'}
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.date}>
              <div className="flex justify-center mb-4">
                <span className="text-xs text-neutral-muted bg-surface-card border border-neutral-border px-3 py-1 rounded-full">
                  {group.date}
                </span>
              </div>
              <div className="space-y-2">
                {group.messages.map((msg) => {
                  const isSent = (msg.direction ?? 'outbound') === 'outbound';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] sm:max-w-[65%] rounded-2xl px-3.5 py-2 shadow-card ${
                          isSent
                            ? 'bg-primary text-white rounded-br-md'
                            : 'bg-[#30363D] text-neutral-text rounded-bl-md'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[10px] font-medium opacity-70`}>
                            {msg.message_type}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {msg.content}
                        </p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 ${
                            isSent ? 'text-white/70' : 'text-neutral-muted'
                          }`}
                        >
                          <span className="text-[11px]">
                            {formatTime(msg.sent_at ?? msg.created_at)}
                          </span>
                          {isSent && (
                            <StatusIcon
                              status={msg.status}
                              displayStatus={msg.display_status}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-neutral-border bg-surface-card shrink-0">
        {isWhatsApp ? (
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={isSending}
                placeholder="Type a message..."
                className="input-field flex-1 resize-none min-h-[42px] max-h-[120px] py-2.5"
              />
              <Button
                onClick={handleSend}
                loading={isSending}
                disabled={!text.trim()}
                className="shrink-0 !px-4"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </Button>
            </div>
            <p
              className={`text-xs ${
                text.length > charLimit ? 'text-accent-error' : 'text-neutral-muted'
              }`}
            >
              {text.length} / {charLimit}
            </p>
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-small text-neutral-muted mb-3">
              SMS is for bulk sending only. View message history above.
            </p>
            {onBulkSms && (
              <Button variant="outline" onClick={onBulkSms} className="!text-small">
                Send Bulk SMS
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

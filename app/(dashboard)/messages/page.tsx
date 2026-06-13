'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { MessageWithGuest } from '@/app/api/messages/route';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SendMessageForm, SendMessageData } from '@/components/forms/SendMessageForm';
import { ChatList, Conversation, ChatFilter } from '@/components/dashboard/ChatList';
import { ChatWindow } from '@/components/dashboard/ChatWindow';

function buildConversations(messages: MessageWithGuest[]): Conversation[] {
  const map = new Map<string, Conversation>();

  for (const msg of messages) {
    if (map.has(msg.guest_id)) continue;

    const isUnread =
      msg.display_status !== 'Read' &&
      (msg.status === 'Pending' || msg.status === 'Sent');

    map.set(msg.guest_id, {
      guest_id: msg.guest_id,
      guest_name: msg.guest_name,
      guest_phone: msg.guest_phone,
      last_message: msg.content,
      last_message_time: msg.sent_at ?? msg.created_at,
      message_type: msg.message_type,
      unread_count: isUnread ? 1 : 0,
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.last_message_time ?? 0).getTime();
    const tb = new Date(b.last_message_time ?? 0).getTime();
    return tb - ta;
  });
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesPageSkeleton />}>
      <MessagesPageContent />
    </Suspense>
  );
}

function MessagesPageSkeleton() {
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-6 lg:-my-8 h-[calc(100vh-4rem)] flex items-center justify-center bg-surface-page">
      <p className="text-neutral-muted text-small">Loading messages...</p>
    </div>
  );
}

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const guestFromUrl = searchParams.get('guest');

  const [allMessages, setAllMessages] = useState<MessageWithGuest[]>([]);
  const [chatMessages, setChatMessages] = useState<MessageWithGuest[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState<string | undefined>(
    guestFromUrl ?? undefined
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ChatFilter>('All');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(!!guestFromUrl);

  const conversations = useMemo(
    () => buildConversations(allMessages),
    [allMessages]
  );

  const selectedConversation = conversations.find(
    (c) => c.guest_id === selectedGuestId
  );

  const filteredConversations = useMemo(() => {
    let list = conversations;

    if (filter === 'SMS') {
      list = list.filter((c) => c.message_type === 'SMS');
    } else if (filter === 'WhatsApp') {
      list = list.filter((c) => c.message_type === 'WhatsApp');
    } else if (filter === 'Unread') {
      list = list.filter((c) => (c.unread_count ?? 0) > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.guest_name.toLowerCase().includes(q) ||
          c.guest_phone.includes(q) ||
          c.last_message?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [conversations, filter, searchQuery]);

  const fetchAllMessages = useCallback(async () => {
    setLoadingList(true);
    setError('');

    try {
      const response = await fetch('/api/messages');
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load messages.');
        return;
      }

      setAllMessages(data.data);
    } catch (err) {
      console.error('Fetch messages error:', err);
      setError('Failed to load messages.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  const fetchChatHistory = useCallback(async (guestId: string) => {
    setLoadingChat(true);

    try {
      const response = await fetch(`/api/messages?guest_id=${guestId}`);
      const data = await response.json();

      if (data.success) {
        setChatMessages(data.data);
      }
    } catch (err) {
      console.error('Fetch chat error:', err);
    } finally {
      setLoadingChat(false);
    }
  }, []);

  useEffect(() => {
    fetchAllMessages();
  }, [fetchAllMessages]);

  useEffect(() => {
    if (guestFromUrl) {
      setSelectedGuestId(guestFromUrl);
      setMobileShowChat(true);
    }
  }, [guestFromUrl]);

  useEffect(() => {
    if (selectedGuestId) {
      fetchChatHistory(selectedGuestId);
    } else {
      setChatMessages([]);
    }
  }, [selectedGuestId, fetchChatHistory]);

  // Poll for updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllMessages();
      if (selectedGuestId) {
        fetchChatHistory(selectedGuestId);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedGuestId, fetchAllMessages, fetchChatHistory]);

  function handleSelectGuest(guestId: string) {
    setSelectedGuestId(guestId);
    setMobileShowChat(true);
    setError('');
  }

  function handleBackToList() {
    setMobileShowChat(false);
  }

  async function handleSendMessage(type: 'SMS' | 'WhatsApp', text: string) {
    if (!selectedGuestId) return;

    setSending(true);
    setError('');

    const optimistic: MessageWithGuest = {
      id: `temp-${Date.now()}`,
      guest_id: selectedGuestId,
      event_id: '',
      message_type: type,
      content: text,
      status: 'Pending',
      external_message_id: null,
      sent_at: null,
      delivery_status_checked_at: null,
      created_at: new Date(),
      guest_name: selectedConversation?.guest_name ?? '',
      guest_phone: selectedConversation?.guest_phone ?? '',
      display_status: 'Pending',
    };

    setChatMessages((prev) => [...prev, optimistic]);

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          recipient_ids: [selectedGuestId],
          message: text,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setChatMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setError(data.error || data.data?.errors?.join(', ') || 'Failed to send message');
        return;
      }

      await Promise.all([
        fetchChatHistory(selectedGuestId),
        fetchAllMessages(),
      ]);
    } catch (err) {
      console.error('Send message error:', err);
      setChatMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError('Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  async function handleBulkSend(data: SendMessageData) {
    setSending(true);
    setError('');

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.type,
          recipient_ids: data.recipientIds,
          message: data.message,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.error || result.data?.errors?.join(', ') || 'Failed to send message'
        );
      }

      setSuccess(result.message || `Sent ${result.data.created} message(s)`);
      setShowBulkModal(false);
      await fetchAllMessages();
    } catch (err) {
      throw err;
    } finally {
      setSending(false);
    }
  }

  const messageType = selectedConversation?.message_type ?? 'WhatsApp';

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-6 lg:-my-8 h-[calc(100vh-4rem)] flex flex-col">
      {(error || success) && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4 shrink-0 space-y-2">
          {success && <Alert variant="success" message={success} />}
          {error && <Alert variant="error" message={error} />}
        </div>
      )}

      <div className="flex flex-1 min-h-0 border border-neutral-border rounded-none sm:rounded-card overflow-hidden bg-surface-card mx-0 sm:mx-4 lg:mx-8 sm:mb-4 lg:mb-8">
        {/* Left panel — chat list */}
        <div
          className={`w-full md:w-[35%] lg:w-[30%] shrink-0 ${
            mobileShowChat ? 'hidden md:flex' : 'flex'
          } flex-col min-h-0`}
        >
          <ChatList
            conversations={filteredConversations}
            selectedGuestId={selectedGuestId}
            onSelectGuest={handleSelectGuest}
            onSearch={setSearchQuery}
            filter={filter}
            onFilterChange={setFilter}
            isLoading={loadingList}
            onBulkSms={() => setShowBulkModal(true)}
            className="h-full"
          />
        </div>

        {/* Right panel — chat window */}
        <div
          className={`flex-1 min-w-0 min-h-0 ${
            mobileShowChat ? 'flex' : 'hidden md:flex'
          } flex-col`}
        >
          <ChatWindow
            guestId={selectedGuestId}
            guestName={selectedConversation?.guest_name}
            guestPhone={selectedConversation?.guest_phone}
            messageType={messageType}
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isLoading={loadingList && !selectedGuestId}
            isLoadingChat={loadingChat}
            isSending={sending}
            onBack={handleBackToList}
            onBulkSms={() => setShowBulkModal(true)}
          />
        </div>
      </div>

      {showBulkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Send bulk message"
          onClick={() => !sending && setShowBulkModal(false)}
        >
          <Card
            padding="lg"
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-h3 text-neutral-text">Send Bulk SMS</h3>
              <button
                type="button"
                onClick={() => !sending && setShowBulkModal(false)}
                className="text-neutral-muted hover:text-neutral-text text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <SendMessageForm
              onSubmit={handleBulkSend}
              isLoading={sending}
              defaultType="SMS"
            />
            <div className="mt-4">
              <Button
                variant="ghost"
                fullWidth
                disabled={sending}
                onClick={() => setShowBulkModal(false)}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

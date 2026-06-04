import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { MessageCircle, RefreshCw, Search, Send, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../../ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import websocketService from '@/utils/websocket';
import {
  listSupportConversations,
  getSupportConversation,
  sendSupportAdminMessage,
  markSupportConversationRead,
  updateSupportConversationStatus,
  type SupportConversation,
  type SupportMessage,
} from '@/api/rider/riderLiveChatSupport.api';

function ConversationListItem({
  conversation: c,
  isSelected,
  onSelect,
}: {
  conversation: SupportConversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(c.conversationId)}
      className={`w-full text-left px-3 py-3 border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors overflow-hidden ${
        isSelected ? 'bg-[#FFF7ED] border-l-4 border-l-[#F97316]' : 'border-l-4 border-l-transparent'
      }`}
    >
      <div className="flex items-start gap-2 min-w-0">
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="font-semibold text-sm text-[#111827] truncate">{c.riderName}</p>
          <p className="text-xs text-[#6B7280] truncate">{c.riderId}</p>
          {c.riderPhone ? (
            <p className="text-xs text-[#9CA3AF] truncate">{c.riderPhone}</p>
          ) : null}
          <p className="text-xs text-[#9CA3AF] truncate mt-0.5">{c.lastMessage || 'No messages yet'}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 w-[52px]">
          {c.adminUnreadCount > 0 ? (
            <span className="bg-[#F97316] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
              {c.adminUnreadCount > 99 ? '99+' : c.adminUnreadCount}
            </span>
          ) : (
            <span className="h-[18px]" aria-hidden />
          )}
          <Badge
            variant={c.status === 'open' ? 'default' : 'secondary'}
            className="text-[10px] px-1.5 py-0 max-w-full truncate capitalize"
          >
            {c.status}
          </Badge>
        </div>
      </div>
    </button>
  );
}

export function RiderLiveChatSupport() {
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<SupportConversation | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    try {
      setLoadingList(true);
      const list = await listSupportConversations({ search: search.trim() || undefined });
      setConversations(list);
    } catch (e) {
      toast.error('Failed to load conversations', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoadingList(false);
    }
  }, [search]);

  const loadThread = useCallback(async (conversationId: string) => {
    try {
      setLoadingThread(true);
      const data = await getSupportConversation(conversationId);
      setSelectedConversation(data.conversation);
      setMessages(data.messages);
      await markSupportConversationRead(conversationId);
      setConversations((prev) =>
        prev.map((c) =>
          c.conversationId === conversationId ? { ...c, adminUnreadCount: 0 } : c
        )
      );
    } catch (e) {
      toast.error('Failed to load chat', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    websocketService.connect();
    websocketService.subscribe('support:admin');

    const onMessage = (payload: {
      conversation?: SupportConversation;
      message?: SupportMessage;
    }) => {
      if (!payload?.conversation) return;
      setConversations((prev) => {
        const others = prev.filter((c) => c.conversationId !== payload.conversation!.conversationId);
        return [payload.conversation!, ...others].sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
        );
      });
      if (selectedId === payload.conversation.conversationId) {
        setSelectedConversation(payload.conversation);
        if (payload.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.messageId === payload.message!.messageId)) return prev;
            return [...prev, payload.message!];
          });
        }
      }
    };

    const onUpdated = (payload: {
      conversation?: SupportConversation;
      message?: SupportMessage;
    }) => {
      if (!payload?.conversation) return;
      setConversations((prev) => {
        const others = prev.filter((c) => c.conversationId !== payload.conversation!.conversationId);
        return [payload.conversation!, ...others].sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
        );
      });
      if (selectedId === payload.conversation.conversationId) {
        setSelectedConversation(payload.conversation);
        if (payload.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.messageId === payload.message!.messageId)) return prev;
            return [...prev, payload.message!];
          });
        }
      }
    };

    websocketService.on('support:message', onMessage);
    websocketService.on('support:conversation:updated', onUpdated);

    return () => {
      websocketService.off('support:message', onMessage);
      websocketService.off('support:conversation:updated', onUpdated);
    };
  }, [selectedId]);

  useEffect(() => {
    if (selectedId) {
      websocketService.emit('support:join', { conversationId: selectedId });
      return () => websocketService.emit('support:leave', { conversationId: selectedId });
    }
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingThread]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.adminUnreadCount || 0), 0),
    [conversations]
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const preview = conversations.find((c) => c.conversationId === id) ?? null;
    setSelectedConversation(preview);
    setMessages([]);
    setDraft('');
    void loadThread(id);
  };

  const handleSend = async () => {
    if (!selectedId || !draft.trim() || sending) return;
    const text = draft.trim();
    setDraft('');
    setSending(true);
    const clientMessageId = `admin-${Date.now()}`;
    try {
      const result = await sendSupportAdminMessage(selectedId, text, clientMessageId);
      setMessages((prev) => {
        if (prev.some((m) => m.messageId === result.message.messageId)) return prev;
        return [...prev, result.message];
      });
      setSelectedConversation(result.conversation);
      setConversations((prev) => {
        const others = prev.filter((c) => c.conversationId !== result.conversation.conversationId);
        return [result.conversation, ...others];
      });
    } catch (e) {
      setDraft(text);
      toast.error('Failed to send message', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async (resolved: boolean) => {
    if (!selectedId) return;
    try {
      const updated = await updateSupportConversationStatus(
        selectedId,
        resolved ? 'resolved' : 'open'
      );
      setSelectedConversation(updated);
      setConversations((prev) =>
        prev.map((c) => (c.conversationId === selectedId ? updated : c))
      );
      toast.success(resolved ? 'Conversation resolved' : 'Conversation reopened');
    } catch (e) {
      toast.error('Failed to update status', {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const chatHeaderName =
    selectedConversation?.riderName ??
    conversations.find((c) => c.conversationId === selectedId)?.riderName ??
    'Rider';

  return (
    <div className="flex flex-col gap-4 w-full max-w-full overflow-hidden">
      <PageHeader
        title="Live Chat Support"
        description="Real-time support conversations with riders"
        actions={
          <Button variant="outline" size="sm" onClick={() => loadList()} className="gap-2 shrink-0">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Split-panel chat shell */}
      <div className="flex flex-row flex-1 w-full min-h-[520px] h-[calc(100vh-220px)] max-h-[720px] border border-[#E5E7EB] rounded-xl bg-white overflow-hidden shadow-sm">
        {/* LEFT: conversation list */}
        <aside className="flex flex-col shrink-0 w-[300px] sm:w-[320px] md:w-[360px] min-h-0 border-r border-[#E5E7EB] overflow-hidden bg-white">
          <div className="shrink-0 p-3 border-b border-[#E5E7EB] space-y-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
              <Input
                placeholder="Search name, rider ID, mobile…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadList()}
                className="pl-9 w-full"
              />
            </div>
            {totalUnread > 0 && (
              <Badge className="bg-[#F97316] text-white w-fit">{totalUnread} unread</Badge>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            {loadingList ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="p-6 text-sm text-[#6B7280] text-center break-words">
                No rider conversations yet
              </p>
            ) : (
              conversations.map((c) => (
                <ConversationListItem
                  key={c.conversationId}
                  conversation={c}
                  isSelected={selectedId === c.conversationId}
                  onSelect={handleSelect}
                />
              ))
            )}
          </div>
        </aside>

        {/* RIGHT: active chat thread */}
        <section className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden bg-[#F9FAFB]">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center min-w-0 overflow-hidden">
              <MessageCircle className="h-14 w-14 text-[#D1D5DB] shrink-0" />
              <p className="text-sm text-[#6B7280] max-w-xs break-words">
                Select a conversation from the list to start chatting
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <header className="shrink-0 px-4 py-3 border-b border-[#E5E7EB] bg-white flex items-center justify-between gap-3 min-w-0 overflow-hidden">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="font-semibold text-[#111827] truncate">{chatHeaderName}</p>
                  <p className="text-xs text-[#6B7280] truncate">
                    {selectedConversation?.riderId ?? '—'}
                    {selectedConversation?.riderPhone
                      ? ` · ${selectedConversation.riderPhone}`
                      : ''}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {selectedConversation?.status === 'open' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 whitespace-nowrap"
                      onClick={() => handleResolve(true)}
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Resolve
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 whitespace-nowrap"
                      onClick={() => handleResolve(false)}
                    >
                      <RotateCcw className="h-4 w-4 shrink-0" />
                      Reopen
                    </Button>
                  )}
                </div>
              </header>

              {/* Messages */}
              <div
                ref={messagesScrollRef}
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3"
              >
                {loadingThread ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-2/3 max-w-[280px]" />
                    <Skeleton className="h-12 w-1/2 max-w-[220px] ml-auto" />
                    <Skeleton className="h-12 w-2/3 max-w-[280px]" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-[#6B7280] text-center py-8">
                    No messages yet. Send a message to start the conversation.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m) => {
                      const isAdmin = m.senderType === 'admin';
                      return (
                        <div
                          key={m.messageId}
                          className={`flex w-full ${isAdmin ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[min(75%,420px)] rounded-2xl px-3 py-2 text-sm shadow-sm break-words ${
                              isAdmin
                                ? 'bg-[#F97316] text-white rounded-br-md'
                                : 'bg-white border border-[#E5E7EB] text-[#111827] rounded-bl-md'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                            <p
                              className={`text-[10px] mt-1 ${
                                isAdmin ? 'text-orange-100' : 'text-[#9CA3AF]'
                              }`}
                            >
                              {format(new Date(m.createdAt), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Composer: input left, send right */}
              <footer className="shrink-0 p-3 border-t border-[#E5E7EB] bg-white">
                <div className="flex flex-row items-center gap-2 min-w-0">
                  <Input
                    className="flex-1 min-w-0"
                    placeholder="Type a message…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    disabled={sending || selectedConversation?.status === 'resolved'}
                  />
                  <Button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !draft.trim() || selectedConversation?.status === 'resolved'}
                    className="bg-[#F97316] hover:bg-[#EA580C] shrink-0 h-10 w-10 p-0 flex items-center justify-center"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

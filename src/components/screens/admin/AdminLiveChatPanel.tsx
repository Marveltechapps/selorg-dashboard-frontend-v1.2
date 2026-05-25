import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  acceptLiveChat,
  sendChatMessage,
  fetchLiveChats,
  fetchCannedResponses,
  closeTicket,
  type LiveChat,
  type ChatMessage,
  type CannedResponse,
} from './supportCenterApi';
import { getCurrentUser } from '@/api/authApi';
import { toast } from 'sonner';
import { cn } from '@/components/ui/utils';
import {
  ArrowDown,
  ArrowLeft,
  CheckCheck,
  ChevronDown,
  Circle,
  Clock,
  Copy,
  MessageCircle,
  MoreVertical,
  Phone,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  User,
  UserPlus,
  XCircle,
  Zap,
} from 'lucide-react';

interface AdminLiveChatPanelProps {
  chats: LiveChat[];
  onChatsChange: (chats: LiveChat[]) => void;
}

type ChatFilter = 'all' | 'waiting' | 'active';

const CHAT_WALLPAPER =
  'radial-gradient(circle at 20% 30%, rgba(0,128,105,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(0,128,105,0.05) 0%, transparent 45%), #efeae2';

const QUICK_REPLIES_FALLBACK: { title: string; content: string }[] = [
  { title: 'Greeting', content: 'Hi! Thanks for reaching out. How can I help you today?' },
  { title: 'Order status', content: 'Let me check your order status right away. One moment please.' },
  { title: 'Refund', content: 'I understand your concern about the refund. I am looking into this and will update you shortly.' },
  { title: 'Closing', content: 'Is there anything else I can help you with today?' },
];

function getChatTitle(chat: LiveChat): string {
  return chat.displayName || chat.customerName || 'Customer';
}

function formatPhoneLabel(phone?: string): string {
  if (!phone?.trim()) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone.trim();
}

function getChatSubtitle(chat: LiveChat): string | null {
  const title = getChatTitle(chat);
  const phone = formatPhoneLabel(chat.customerPhone);
  const titleDigits = title.replace(/\D/g, '');
  const phoneDigits = phone.replace(/\D/g, '');
  if (phone && phoneDigits && !titleDigits.endsWith(phoneDigits.slice(-10))) {
    return phone;
  }
  if (chat.orderNumber?.trim()) return `Order ${chat.orderNumber.trim()}`;
  const subject = chat.subject?.trim();
  if (subject && !/^general chat support$/i.test(subject)) return subject;
  return phone || null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  const digits = name.replace(/\D/g, '');
  if (digits.length >= 2) return digits.slice(-2);
  return (parts[0]?.[0] ?? '').toUpperCase();
}

/** Avatar with bundled Tailwind colors (arbitrary hex classes are stripped in admin build). */
function ChatAvatar({
  label,
  size = 'list',
  status = 'active',
}: {
  label: string;
  size?: 'list' | 'header';
  status?: 'active' | 'waiting';
}) {
  const initials = getInitials(label);
  const showIcon = initials.length === 0;
  return (
    <div
      className={cn(
        size === 'header' ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-sm',
        'rounded-full flex items-center justify-center font-semibold shrink-0 ring-2 ring-white text-white',
        status === 'waiting' ? 'bg-amber-500' : 'bg-emerald-600',
      )}
      aria-hidden
    >
      {showIcon ? (
        <User size={size === 'header' ? 20 : 22} strokeWidth={2.25} className="text-white" />
      ) : (
        <span className="text-white leading-none select-none">{initials}</span>
      )}
    </div>
  );
}

function getVisibleMessages(chat: LiveChat): ChatMessage[] {
  const subject = chat.subject?.trim();
  return chat.messages.filter((m, index, arr) => {
    if (!m.message?.trim()) return false;
    if (
      subject &&
      m.senderType === 'customer' &&
      m.message.trim() === subject &&
      (arr.length === 1 || index === 0)
    ) {
      return false;
    }
    return true;
  });
}

function formatMessageTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatListTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) return formatMessageTime(timestamp);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();
    if (isYesterday) return 'Yesterday';
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function formatDateDivider(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();
    if (isYesterday) return 'Yesterday';
    return d.toLocaleDateString([], {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return '';
  }
}

function formatWaitDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function sameCalendarDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function getLastMessage(chat: LiveChat): ChatMessage | undefined {
  const msgs = getVisibleMessages(chat);
  return msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
}

function getUnreadCount(chat: LiveChat): number {
  const msgs = getVisibleMessages(chat);
  let lastAgentIdx = -1;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].senderType === 'agent') {
      lastAgentIdx = i;
      break;
    }
  }
  return msgs.slice(lastAgentIdx + 1).filter((m) => m.senderType === 'customer').length;
}

function sortChats(list: LiveChat[]): LiveChat[] {
  const rank = (s: LiveChat['status']) => (s === 'waiting' ? 0 : s === 'active' ? 1 : 2);
  return [...list].sort((a, b) => {
    const sr = rank(a.status) - rank(b.status);
    if (sr !== 0) return sr;
    const ta = getLastMessage(a)?.timestamp ?? a.startedAt;
    const tb = getLastMessage(b)?.timestamp ?? b.startedAt;
    return new Date(tb).getTime() - new Date(ta).getTime();
  });
}

function MessageBubble({
  message,
  isAgent,
  isGrouped,
  customerLabel,
}: {
  message: ChatMessage;
  isAgent: boolean;
  isGrouped: boolean;
  customerLabel: string;
}) {
  return (
    <div className={cn('flex mb-0.5', isAgent ? 'justify-end' : 'justify-start', isGrouped && 'mt-0.5')}>
      <div
        className={cn(
          'relative max-w-[min(78%,440px)] px-3 pt-2 pb-1 shadow-sm',
          isAgent
            ? 'bg-green-100 rounded-lg rounded-tr-sm'
            : 'bg-white rounded-lg rounded-tl-sm border border-zinc-100',
          isGrouped && (isAgent ? 'rounded-tr-lg' : 'rounded-tl-lg'),
        )}
      >
        {!isAgent && !isGrouped && customerLabel && (
          <p className="text-[11px] font-semibold text-emerald-700 mb-0.5">{customerLabel}</p>
        )}
        <p className="text-[14.5px] leading-[19px] text-zinc-900 whitespace-pre-wrap break-words pr-1">
          {message.message}
        </p>
        <div className="flex justify-end items-center gap-0.5 mt-0.5">
          <span className="text-[10px] text-zinc-500 leading-none tabular-nums">
            {formatMessageTime(message.timestamp)}
          </span>
          {isAgent && (
            <CheckCheck size={12} className="text-sky-500 shrink-0" aria-hidden />
          )}
        </div>
      </div>
    </div>
  );
}

function SystemPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center my-3">
      <span className="bg-white/90 text-zinc-600 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm border border-zinc-200">
        {children}
      </span>
    </div>
  );
}

export function AdminLiveChatPanel({ chats, onChatsChange }: AdminLiveChatPanelProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [mobileShowsThread, setMobileShowsThread] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatFilter, setChatFilter] = useState<ChatFilter>('all');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(() => new Date());
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevMessageCountsRef = useRef<Record<string, number>>({});

  const sortedChats = useMemo(() => sortChats(chats), [chats]);

  const stats = useMemo(
    () => ({
      waiting: chats.filter((c) => c.status === 'waiting').length,
      active: chats.filter((c) => c.status === 'active').length,
      total: chats.length,
      unread: chats.reduce((sum, c) => sum + getUnreadCount(c), 0),
    }),
    [chats],
  );

  const filteredChats = useMemo(() => {
    let list = sortedChats;
    if (chatFilter === 'waiting') list = list.filter((c) => c.status === 'waiting');
    if (chatFilter === 'active') list = list.filter((c) => c.status === 'active');
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const haystack = [
        getChatTitle(c),
        c.customerName,
        c.customerPhone,
        c.customerId,
        c.orderNumber,
        getLastMessage(c)?.message,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sortedChats, searchQuery, chatFilter]);

  const selectedChat = useMemo(
    () => chats.find((c) => c.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  );

  const quickReplies = useMemo(() => {
    if (cannedResponses.length > 0) {
      return cannedResponses.slice(0, 8).map((c) => ({ title: c.title, content: c.content }));
    }
    return QUICK_REPLIES_FALLBACK;
  }, [cannedResponses]);

  useEffect(() => {
    void fetchCannedResponses()
      .then(setCannedResponses)
      .catch(() => {
        /* optional */
      });
  }, []);

  useEffect(() => {
    setLastSyncedAt(new Date());
  }, [chats]);

  useEffect(() => {
    chats.forEach((chat) => {
      const count = chat.messages.length;
      const prev = prevMessageCountsRef.current[chat.id] ?? count;
      if (count > prev && chat.id !== selectedChatId) {
        const last = getLastMessage(chat);
        if (last?.senderType === 'customer') {
          toast.message(`New message from ${getChatTitle(chat)}`, {
            description: last.message.length > 72 ? `${last.message.slice(0, 72)}…` : last.message,
          });
        }
      }
      prevMessageCountsRef.current[chat.id] = count;
    });
  }, [chats, selectedChatId]);

  useEffect(() => {
    if (filteredChats.length === 0) {
      setSelectedChatId(null);
      setMobileShowsThread(false);
      return;
    }
    const stillVisible = selectedChatId && filteredChats.some((c) => c.id === selectedChatId);
    if (!stillVisible) {
      const preferWaiting = filteredChats.find((c) => c.status === 'waiting');
      setSelectedChatId((preferWaiting ?? filteredChats[0]).id);
    }
  }, [filteredChats, selectedChatId]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowScrollButton(false);
  }, []);

  useEffect(() => {
    if (selectedChat) {
      scrollToBottom('auto');
    }
  }, [selectedChat?.id, selectedChat?.messages.length, scrollToBottom]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  }, [messageInput]);

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollButton(distance > 100);
  };

  const selectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setMessageInput('');
    setMobileShowsThread(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchLiveChats();
      onChatsChange(data);
      toast.success('Conversations updated');
    } catch {
      toast.error('Failed to refresh chats');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedChat || selectedChat.status !== 'waiting') return;
    setAccepting(true);
    try {
      const user = getCurrentUser();
      await acceptLiveChat(selectedChat.id, user?.id, user?.name);
      toast.success('Chat accepted — you can reply now');
      const data = await fetchLiveChats();
      onChatsChange(data);
    } catch {
      toast.error('Failed to accept chat');
    } finally {
      setAccepting(false);
    }
  };

  const handleEndChat = async () => {
    if (!selectedChat || closing) return;
    setClosing(true);
    try {
      await closeTicket(selectedChat.id);
      toast.success('Conversation ended');
      const data = await fetchLiveChats();
      onChatsChange(data);
      setSelectedChatId(null);
      setMobileShowsThread(false);
    } catch {
      toast.error('Failed to end conversation');
    } finally {
      setClosing(false);
    }
  };

  const handleSend = async () => {
    const text = messageInput.trim();
    if (!text || !selectedChat || sending) return;

    if (selectedChat.status === 'waiting') {
      toast.error('Accept this chat before replying');
      return;
    }

    setSending(true);
    setMessageInput('');
    try {
      const user = getCurrentUser();
      await sendChatMessage(
        selectedChat.id,
        user?.id ?? 'admin',
        user?.name ?? 'Support Agent',
        'agent',
        text,
      );
      const data = await fetchLiveChats();
      onChatsChange(data);
      requestAnimationFrame(() => scrollToBottom());
    } catch {
      setMessageInput(text);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const insertQuickReply = (content: string) => {
    setMessageInput((prev) => (prev.trim() ? `${prev.trim()}\n${content}` : content));
    textareaRef.current?.focus();
  };

  const copyCustomerId = async () => {
    if (!selectedChat?.customerId) return;
    try {
      await navigator.clipboard.writeText(selectedChat.customerId);
      toast.success('Customer ID copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const copyCustomerPhone = async () => {
    const phone = selectedChat?.customerPhone?.trim();
    if (!phone) {
      toast.error('No phone number on file');
      return;
    }
    try {
      await navigator.clipboard.writeText(phone.replace(/\s/g, ''));
      toast.success('Phone number copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const renderMessages = (chat: LiveChat) => {
    const customerLabel = getChatTitle(chat);
    const visible = getVisibleMessages(chat);
    if (visible.length === 0) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center text-[#667781] px-6 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center mb-4 shadow-sm">
            <MessageCircle size={32} className="text-emerald-600 opacity-60" />
          </div>
          <p className="text-sm font-medium text-[#41525d]">No messages yet</p>
          <p className="text-xs mt-1 max-w-xs">
            {chat.status === 'waiting'
              ? 'Accept the chat to start helping this customer.'
              : 'Send a greeting to begin the conversation.'}
          </p>
        </div>
      );
    }

    const nodes: React.ReactNode[] = [];
    visible.forEach((msg, index) => {
      const prev = visible[index - 1];
      if (!prev || !sameCalendarDay(prev.timestamp, msg.timestamp)) {
        const label = formatDateDivider(msg.timestamp);
        if (label) {
          nodes.push(<SystemPill key={`date-${msg.id}`}>{label}</SystemPill>);
        }
      }
      const isAgent = msg.senderType === 'agent';
      const isGrouped =
        !!prev &&
        prev.senderType === msg.senderType &&
        sameCalendarDay(prev.timestamp, msg.timestamp);
      nodes.push(
        <MessageBubble
          key={msg.id}
          message={msg}
          isAgent={isAgent}
          isGrouped={isGrouped}
          customerLabel={customerLabel}
        />,
      );
    });
    return nodes;
  };

  const filterChip = (value: ChatFilter, label: string, count: number) => {
    if (value !== 'all' && count === 0) return null;
    const selected = chatFilter === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => setChatFilter(value)}
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
          selected
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
            : 'bg-white text-zinc-600 hover:bg-zinc-100 border-zinc-200',
        )}
      >
        <span className={selected ? 'text-white' : 'text-zinc-700'}>{label}</span>
        <span className={cn('tabular-nums', selected ? 'text-white' : 'text-zinc-500')}>
          {count}
        </span>
      </button>
    );
  };

  const listPane = (
    <div
      className={cn(
        'flex flex-col min-h-0 min-w-0 border-r border-[#d1d7db] bg-white',
        mobileShowsThread ? 'hidden md:flex' : 'flex',
      )}
    >
      <div className="px-4 py-3 bg-gradient-to-b from-[#f0f2f5] to-[#e9edef] border-b border-[#d1d7db] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold text-[#111b21] text-[15px]">Live conversations</h3>
            <p className="text-[11px] text-[#667781] flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live · synced {formatMessageTime(lastSyncedAt.toISOString())}
            </p>
          </div>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#54656f] hover:bg-white/80"
                  onClick={() => void handleRefresh()}
                  disabled={refreshing}
                  aria-label="Refresh chats"
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh conversations</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg bg-amber-50 border border-amber-100 px-2 py-1.5 text-center">
            <p className="text-lg font-bold text-amber-700 tabular-nums">{stats.waiting}</p>
            <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wide">Waiting</p>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1.5 text-center">
            <p className="text-lg font-bold text-emerald-700 tabular-nums">{stats.active}</p>
            <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Active</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5 text-center">
            <p className="text-lg font-bold text-slate-700 tabular-nums">{stats.unread}</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Unread</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {filterChip('all', 'All', stats.total)}
          {filterChip('waiting', 'Waiting', stats.waiting)}
          {filterChip('active', 'Active', stats.active)}
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" />
          <Input
            placeholder="Search name or message…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-white border-0 shadow-sm rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="text-center py-16 px-4 text-[#667781]">
            <MessageCircle className="mx-auto mb-3 opacity-40" size={40} />
            <p className="text-sm font-medium text-[#41525d]">
              {chats.length === 0 ? 'No active conversations' : 'No chats match your filters'}
            </p>
            <p className="text-xs mt-1">
              {chats.length === 0
                ? 'Customer messages from the app will appear here.'
                : 'Try another filter or clear search.'}
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const last = getLastMessage(chat);
            const isSelected = chat.id === selectedChatId;
            const unread = getUnreadCount(chat);
            const title = getChatTitle(chat);
            const subtitle = getChatSubtitle(chat);
            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => selectChat(chat.id)}
                className={cn(
                  'w-full text-left flex items-center gap-3 px-3 py-3 border-b border-[#f0f2f5] hover:bg-[#f5f6f6] transition-colors relative',
                  isSelected && 'bg-zinc-100 border-l-4 border-l-emerald-600 pl-2',
                  chat.status === 'waiting' && !isSelected && 'bg-amber-50/40',
                )}
              >
                <div className="relative shrink-0">
                  <ChatAvatar
                    label={title}
                    status={chat.status === 'waiting' ? 'waiting' : 'active'}
                  />
                  {chat.status === 'waiting' && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-white animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        'truncate text-[15px]',
                        unread > 0 ? 'font-bold text-[#111b21]' : 'font-medium text-[#111b21]',
                      )}
                    >
                      {title}
                    </span>
                    {last && (
                      <span className="text-[11px] text-[#667781] shrink-0 tabular-nums">
                        {formatListTime(last.timestamp)}
                      </span>
                    )}
                  </div>
                  {subtitle && (
                    <p className="text-[11px] text-[#8696a0] truncate flex items-center gap-0.5">
                      {chat.customerPhone && <Phone size={10} className="shrink-0" />}
                      {subtitle}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p
                      className={cn(
                        'text-[13px] truncate',
                        unread > 0 ? 'text-[#111b21] font-medium' : 'text-[#667781]',
                      )}
                    >
                      {last
                        ? `${last.senderType === 'agent' ? 'You: ' : ''}${last.message}`
                        : 'No messages yet'}
                    </p>
                    {unread > 0 ? (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-green-500 text-white text-[11px] font-bold flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    ) : chat.status === 'waiting' ? (
                      <Badge className="shrink-0 bg-amber-500 hover:bg-amber-500 text-[10px] px-1.5 h-5">
                        New
                      </Badge>
                    ) : null}
                  </div>
                  {chat.status === 'waiting' && chat.waitTime > 0 && (
                    <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-0.5">
                      <Clock size={10} />
                      Waiting {formatWaitDuration(chat.waitTime)}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const threadPane = (
    <div
      className={cn(
        'flex flex-col min-h-0 min-w-0 bg-[#efeae2] relative',
        !mobileShowsThread && filteredChats.length > 0 ? 'hidden md:flex' : 'flex',
      )}
    >
      {selectedChat ? (
        <>
          <div className="px-3 md:px-4 py-2.5 bg-[#f0f2f5] border-b border-[#d1d7db] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9 shrink-0 text-[#54656f]"
                onClick={() => setMobileShowsThread(false)}
                aria-label="Back to chats"
              >
                <ArrowLeft size={20} />
              </Button>
              <ChatAvatar
                label={getChatTitle(selectedChat)}
                size="header"
                status={selectedChat.status === 'waiting' ? 'waiting' : 'active'}
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-[#111b21] text-[16px] truncate">
                  {getChatTitle(selectedChat)}
                </h4>
                {getChatSubtitle(selectedChat) && (
                  <p className="text-xs text-emerald-700 font-medium truncate flex items-center gap-1">
                    <Phone size={12} className="shrink-0" />
                    {getChatSubtitle(selectedChat)}
                  </p>
                )}
                <p className="text-xs text-[#667781] truncate flex items-center gap-1.5 flex-wrap mt-0.5">
                  {selectedChat.status === 'waiting' ? (
                    <>
                      <Circle size={8} className="fill-amber-500 text-amber-500 shrink-0" />
                      <span className="text-amber-700 font-medium">
                        Waiting · {formatWaitDuration(selectedChat.waitTime)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Circle size={8} className="fill-emerald-500 text-emerald-500 shrink-0" />
                      <span>
                        {selectedChat.agentName
                          ? `Handled by ${selectedChat.agentName}`
                          : 'Active session'}
                      </span>
                    </>
                  )}
                  <span className="text-[#8696a0]">·</span>
                  <span>Started {formatListTime(selectedChat.startedAt)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {selectedChat.status === 'waiting' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white hidden sm:flex"
                  disabled={accepting}
                  onClick={() => void handleAccept()}
                >
                  <UserPlus size={14} className="mr-1.5" />
                  {accepting ? 'Accepting…' : 'Accept'}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-[#54656f]"
                    aria-label="Chat actions"
                  >
                    <MoreVertical size={18} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  {selectedChat.status === 'waiting' && (
                    <DropdownMenuItem onClick={() => void handleAccept()} disabled={accepting}>
                      <UserPlus size={14} className="mr-2" />
                      Accept chat
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => void copyCustomerId()}>
                    <Copy size={14} className="mr-2" />
                    Copy customer ID
                  </DropdownMenuItem>
                  {selectedChat.customerPhone && (
                    <DropdownMenuItem onClick={() => void copyCustomerPhone()}>
                      <Phone size={14} className="mr-2" />
                      Copy phone ({selectedChat.customerPhone})
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-rose-600 focus:text-rose-600"
                    onClick={() => void handleEndChat()}
                    disabled={closing}
                  >
                    <XCircle size={14} className="mr-2" />
                    End conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {selectedChat.status === 'waiting' && (
            <div className="shrink-0 px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-2 text-sm">
              <span className="text-amber-800">
                This customer is waiting for an agent. Accept to reply.
              </span>
              <Button
                size="sm"
                className="sm:hidden bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                disabled={accepting}
                onClick={() => void handleAccept()}
              >
                Accept
              </Button>
            </div>
          )}

          <div
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            className="flex-1 min-h-0 overflow-y-auto px-3 md:px-8 py-4 scroll-smooth"
            style={{ background: CHAT_WALLPAPER }}
          >
            <div className="max-w-3xl mx-auto w-full">{renderMessages(selectedChat)}</div>
            <div ref={messagesEndRef} />
          </div>

          {showScrollButton && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10">
              <Button
                size="sm"
                className="rounded-full shadow-lg bg-white text-[#54656f] hover:bg-[#f0f2f5] border border-[#d1d7db] h-9 px-3"
                onClick={() => scrollToBottom()}
              >
                <ArrowDown size={14} className="mr-1.5" />
                Latest messages
              </Button>
            </div>
          )}

          <div className="shrink-0 px-3 md:px-4 py-3 bg-[#f0f2f5] border-t border-[#d1d7db]">
            <div className="max-w-3xl mx-auto w-full space-y-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                <Sparkles size={14} className="text-emerald-600 shrink-0" />
                <span className="text-[11px] text-[#667781] shrink-0 mr-1">Quick replies</span>
                {quickReplies.map((qr) => (
                  <button
                    key={qr.title}
                    type="button"
                    onClick={() => insertQuickReply(qr.content)}
                    disabled={selectedChat.status === 'waiting'}
                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-white border border-zinc-200 text-zinc-600 hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {qr.title}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="size-10 shrink-0 rounded-full border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                      disabled={selectedChat.status === 'waiting'}
                      aria-label="More replies"
                    >
                      <ChevronDown size={18} className="text-zinc-700" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-w-sm">
                    <DropdownMenuLabel>Canned responses</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {quickReplies.map((qr) => (
                      <DropdownMenuItem
                        key={qr.title}
                        onClick={() => insertQuickReply(qr.content)}
                        className="flex flex-col items-start gap-0.5 py-2"
                      >
                        <span className="font-medium text-xs">{qr.title}</span>
                        <span className="text-[11px] text-muted-foreground line-clamp-2">
                          {qr.content}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={
                    selectedChat.status === 'waiting'
                      ? 'Accept chat to send messages…'
                      : 'Type a message · Enter to send'
                  }
                  disabled={sending || selectedChat.status === 'waiting'}
                  className="flex-1 resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 max-h-32 min-h-[40px] disabled:opacity-60"
                />
                <Button
                  type="button"
                  className="size-10 shrink-0 rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                  disabled={
                    !messageInput.trim() || sending || selectedChat.status === 'waiting'
                  }
                  onClick={() => void handleSend()}
                  aria-label="Send message"
                >
                  <Send size={20} strokeWidth={2.5} aria-hidden />
                </Button>
              </div>
              <p className="text-[10px] text-[#8696a0] text-center hidden sm:block">
                <Zap size={10} className="inline mr-0.5" />
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-[#667781] px-6">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center mb-6 shadow-inner"
            style={{ background: CHAT_WALLPAPER }}
          >
            <MessageCircle size={52} className="text-emerald-600 opacity-25" />
          </div>
          <h3 className="text-2xl font-light text-[#41525d] mb-2">Selorg Live Support</h3>
          <p className="text-sm text-center max-w-md text-[#667781] leading-relaxed">
            Pick a conversation from the list to respond to customers in real time. Waiting chats
            are highlighted — accept them first, then use quick replies to respond faster.
          </p>
          {stats.waiting > 0 && (
            <Button
              className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                const next = sortedChats.find((c) => c.status === 'waiting');
                if (next) {
                  setChatFilter('waiting');
                  selectChat(next.id);
                }
              }}
            >
              <UserPlus size={16} className="mr-2" />
              Answer {stats.waiting} waiting {stats.waiting === 1 ? 'chat' : 'chats'}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="w-full min-w-0 bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm h-[min(92vh,820px)] min-h-[560px] grid grid-cols-1 md:grid-cols-[minmax(300px,34%)_minmax(0,1fr)]"
      data-testid="admin-live-chat-panel"
    >
      {listPane}
      {threadPane}
    </div>
  );
}

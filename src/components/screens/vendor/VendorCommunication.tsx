import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Paperclip, Loader2, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import {
  fetchChats,
  fetchChatDetails,
  sendMessage as sendMessageApi,
  markChatAsRead,
  type ApiChat,
  type ApiMessage,
} from '../../../api/communication/communicationApi';

interface Message {
  id: string;
  content: string;
  sender: string;
  senderType: 'vendor' | 'me';
  timestamp: string;
  hasAttachment?: boolean;
  attachmentName?: string;
}

interface Chat {
  id: string;
  vendorName: string;
  contactName: string;
  lastMessage: string;
  lastMessageTime: string;
  messages: Message[];
  unreadCount?: number;
}

function formatLastMessageTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function mapApiMessageToUi(msg: ApiMessage): Message {
  const ts = msg.timestamp || msg.createdAt;
  const time = ts ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
  return {
    id: msg.id,
    content: msg.content,
    sender: msg.senderName,
    senderType: msg.direction === 'outgoing' ? 'me' : 'vendor',
    timestamp: time,
  };
}

function mapApiChatToUi(api: ApiChat): Chat {
  return {
    id: api.id,
    vendorName: api.participantName,
    contactName: api.participantName,
    lastMessage: api.lastMessage ?? 'No messages yet',
    lastMessageTime: formatLastMessageTime(api.lastMessageTime),
    messages: [],
    unreadCount: api.unreadCount ?? 0,
  };
}

export function VendorCommunication() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChatDetails, setSelectedChatDetails] = useState<Chat | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatsError, setChatsError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    setChatsError(null);
    try {
      const list = await fetchChats(false);
      const mapped = list.map(mapApiChatToUi);
      setChats(mapped);
      setSelectedChatId((prev) =>
        prev && mapped.some((c) => c.id === prev) ? prev : (mapped[0]?.id ?? null)
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load chats';
      setChatsError(msg);
      setChats([]);
      toast.error(msg);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  const loadChatDetails = useCallback(
    async (chatId: string) => {
      if (!chatId) return;
      setLoadingDetails(true);
      setDetailsError(null);
      try {
        const details = await fetchChatDetails(chatId);
        await markChatAsRead(chatId);
        const ui: Chat = {
          ...mapApiChatToUi(details),
          messages: (details.messages ?? []).map(mapApiMessageToUi),
        };
        setSelectedChatDetails(ui);
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, lastMessage: ui.lastMessage, lastMessageTime: ui.lastMessageTime, unreadCount: 0 } : c))
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load chat';
        setDetailsError(msg);
        setSelectedChatDetails(null);
        toast.error(msg);
      } finally {
        setLoadingDetails(false);
      }
    },
    []
  );

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      loadChatDetails(selectedChatId);
    } else {
      setSelectedChatDetails(null);
    }
  }, [selectedChatId, loadChatDetails]);

  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!content || !selectedChatId || !selectedChatDetails) return;

    setSendingMessage(true);
    try {
      const sent = await sendMessageApi(selectedChatId, content);
      const newMsg = mapApiMessageToUi(sent);
      setSelectedChatDetails((prev) =>
        prev ? { ...prev, messages: [...prev.messages, newMsg], lastMessage: content, lastMessageTime: 'Just now' } : prev
      );
      setChats((prev) =>
        prev.map((c) =>
          c.id === selectedChatId ? { ...c, lastMessage: content, lastMessageTime: 'Just now' } : c
        )
      );
      setMessageInput('');
      toast.success('Message sent');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send message';
      toast.error(msg);
    } finally {
      setSendingMessage(false);
    }
  };

  const selectedChat = selectedChatDetails;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Communication"
        subtitle="Centralized messaging with vendor partners"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Chat List */}
        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA]">
            <h3 className="font-bold text-[#212121]">Vendor Messages</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingChats && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-[#4F46E5]" />
              </div>
            )}
            {!loadingChats && chatsError && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <AlertCircle size={40} className="text-red-500 mb-2" />
                <p className="text-sm text-[#616161]">{chatsError}</p>
              </div>
            )}
            {!loadingChats && !chatsError && chats.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageSquare size={40} className="text-[#9E9E9E] mb-2" />
                <p className="font-medium text-[#212121]">No conversations yet</p>
                <p className="text-sm text-[#757575] mt-1">Chats will appear here when available</p>
              </div>
            )}
            {!loadingChats && !chatsError && chats.length > 0 &&
              chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`p-4 border-b border-[#E0E0E0] hover:bg-[#F5F5F5] cursor-pointer transition-colors ${
                    selectedChatId === chat.id ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-[#212121]">{chat.vendorName}</span>
                    <span className="text-xs text-[#757575]">{chat.lastMessageTime}</span>
                  </div>
                  <p className="text-sm text-[#616161] truncate">{chat.lastMessage}</p>
                  {chat.unreadCount ? (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                      {chat.unreadCount} unread
                    </span>
                  ) : null}
                </div>
              ))}
          </div>
        </div>

        {/* Chat Window */}
        {selectedChat ? (
          <div className="lg:col-span-2 bg-white border border-[#E0E0E0] rounded-xl overflow-hidden flex flex-col shadow-sm">
            <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#212121]">{selectedChat.vendorName}</h3>
                <p className="text-xs text-[#4F46E5]">Contact: {selectedChat.contactName}</p>
              </div>
            </div>

            <div className="flex-1 bg-gray-50 p-4 space-y-4 overflow-y-auto">
              {loadingDetails && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-[#4F46E5]" />
                </div>
              )}
              {!loadingDetails && detailsError && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle size={40} className="text-red-500 mb-2" />
                  <p className="text-sm text-[#616161]">{detailsError}</p>
                </div>
              )}
              {!loadingDetails && !detailsError && selectedChat.messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare size={40} className="text-[#9E9E9E] mb-2" />
                  <p className="text-sm text-[#757575]">No messages yet. Start the conversation.</p>
                </div>
              )}
              {!loadingDetails && !detailsError && selectedChat.messages.length > 0 &&
                selectedChat.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderType === 'vendor' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`p-3 rounded-lg border max-w-[80%] shadow-sm ${
                        message.senderType === 'vendor'
                          ? 'bg-white border-[#E0E0E0]'
                          : 'bg-[#E0E7FF] border-[#4F46E5]/20'
                      }`}
                    >
                      <p className="text-sm text-[#212121]">{message.content}</p>
                      {message.hasAttachment && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-white rounded border border-[#E0E0E0]">
                          <Paperclip size={14} className="text-[#757575]" />
                          <span className="text-xs font-medium">{message.attachmentName}</span>
                        </div>
                      )}
                      <span
                        className={`text-[10px] mt-1 block ${
                          message.senderType === 'vendor' ? 'text-[#9E9E9E]' : 'text-[#4F46E5]'
                        }`}
                      >
                        {message.sender} • {message.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            <div className="p-4 border-t border-[#E0E0E0] bg-white flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={sendingMessage}
                className="flex-1 h-10 px-3 rounded-lg border border-[#E0E0E0] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none disabled:opacity-70"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sendingMessage}
                className="bg-[#4F46E5] text-white p-2 rounded-lg hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[40px]"
              >
                {sendingMessage ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white border border-[#E0E0E0] rounded-xl flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
              <p className="text-lg font-bold text-[#1F2937] mb-2">No Chat Selected</p>
              <p className="text-sm text-[#6B7280]">
                {chats.length === 0 ? 'No conversations available' : 'Select a conversation to start messaging'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

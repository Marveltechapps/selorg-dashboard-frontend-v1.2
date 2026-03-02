import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import { MessageSquare, BellRing, Send, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  listActiveChats,
  getChatDetails,
  sendMessage as sendChatMessage,
  markChatAsRead,
  createBroadcast,
  flagIssue,
  ChatSummary,
  Chat,
  Message,
} from './communicationApi';

export function CommunicationHub() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingChatDetails, setLoadingChatDetails] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  // Cache for chat details to prevent unnecessary re-fetching
  const [chatCache, setChatCache] = useState<Map<string, Chat>>(new Map());

  // Load chats list
  const loadChats = async (skipDetailsReload = false) => {
    try {
      setLoading(true);
      const chatsData = await listActiveChats(false);
      setChats(chatsData);
      
      // Only reload chat details if explicitly requested and chat is selected
      if (!skipDetailsReload && selectedChatId) {
        // Don't reload details - just update the chat list
        // This prevents unnecessary API calls when switching chats
      }
    } catch (error) {
      console.error('Failed to load chats', error);
      setChats([]);
      toast.error('Failed to load chats', {
        description: error instanceof Error ? error.message : 'Please check your connection',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load chat details with messages - with caching to prevent unnecessary re-fetch
  const loadChatDetails = async (chatId: string) => {
    // Don't reload if it's the same chat already loaded
    if (selectedChatId === chatId && selectedChat) {
      return;
    }

    // Check cache first
    const cachedChat = chatCache.get(chatId);
    if (cachedChat) {
      setSelectedChatId(chatId);
      setSelectedChat(cachedChat);
      // Still mark as read in background
      markChatAsRead(chatId).catch(err => {
        // Failed to mark chat as read - non-critical error
      });
      return;
    }

    try {
      setLoadingChatDetails(true);
      setSelectedChatId(chatId);
      
      // Load chat details and mark as read in parallel for better performance
      const [chatData] = await Promise.all([
        getChatDetails(chatId, { limit: 50 }),
        markChatAsRead(chatId).catch(err => {
          // Don't fail if mark as read fails
          // Failed to mark chat as read - non-critical error
        })
      ]);
      
      setSelectedChat(chatData);
      
      // Cache the chat data
      setChatCache(prev => new Map(prev).set(chatId, chatData));
      
      // Update unread count in chats list without full reload
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId 
            ? { ...chat, unreadCount: 0 }
            : chat
        )
      );
    } catch (error) {
      console.error('Failed to load chat details', error);
      toast.error('Failed to load chat details');
      setSelectedChatId(null);
      setSelectedChat(null);
    } finally {
      setLoadingChatDetails(false);
    }
  };

  // Handle chat selection
  const handleChatSelect = (chatId: string) => {
    // Don't reload if clicking the same chat
    if (selectedChatId === chatId && selectedChat) {
      return;
    }
    loadChatDetails(chatId);
  };

  // Send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChatId || sendingMessage) return;

    try {
      setSendingMessage(true);
      const newMessage = await sendChatMessage(selectedChatId, messageInput.trim());
      
      // Update local state and cache
      if (selectedChat) {
        const updatedChat = {
          ...selectedChat,
          messages: [...selectedChat.messages, newMessage],
        };
        setSelectedChat(updatedChat);
        
        // Update cache
        setChatCache(prev => new Map(prev).set(selectedChatId, updatedChat));
      }
      
      setMessageInput('');
      
      // Update chats list to update last message without full reload
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === selectedChatId
            ? {
                ...chat,
                lastMessage: newMessage.content,
                lastMessageTime: newMessage.timestamp,
              }
            : chat
        )
      );
    } catch (error) {
      console.error('Failed to send message', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle broadcast
  const handleBroadcast = async () => {
    setIsBroadcastOpen(true);
    // In a real implementation, you'd open a modal here
    toast.info('Broadcast feature - open modal to send broadcast');
  };

  // Handle flag issue
  const handleFlagIssue = async (chatId: string) => {
    const reason = prompt('Please provide a reason for flagging this issue:');
    if (!reason) return;

    try {
      await flagIssue(chatId, {
        reason,
        priority: 'medium',
        category: 'delivery_issue',
      });
      toast.success('Issue flagged successfully');
    } catch (error) {
      console.error('Failed to flag issue', error);
      toast.error('Failed to flag issue');
    }
  };

  // Initial load
  useEffect(() => {
    loadChats();
  }, []);

  // Automatic polling disabled - use manual refresh button instead
  // Real-time polling for chats (every 15 seconds for real-time messaging)
  // useEffect(() => {
  //   let interval: NodeJS.Timeout | null = null;
  //   
  //   const startPolling = () => {
  //     if (interval) clearInterval(interval);
  //     interval = setInterval(() => {
  //       if (!document.hidden) {
  //         loadChats();
  //         // Also refresh selected chat messages
  //         if (selectedChatId) {
  //           loadChatDetails(selectedChatId);
  //         }
  //       }
  //     }, 15000); // Poll every 15 seconds for real-time chat updates
  //   };

  //   const handleVisibilityChange = () => {
  //     if (document.hidden) {
  //       if (interval) {
  //         clearInterval(interval);
  //         interval = null;
  //       }
  //     } else {
  //       startPolling();
  //       loadChats();
  //       if (selectedChatId) {
  //         loadChatDetails(selectedChatId);
  //       }
  //     }
  //   };

  //   startPolling();
  //   document.addEventListener('visibilitychange', handleVisibilityChange);

  //   return () => {
  //     if (interval) clearInterval(interval);
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   };
  // }, [selectedChatId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communication Hub"
        subtitle="Rider messaging and support"
        actions={
          <Button
            onClick={handleBroadcast}
            className="bg-[#16A34A] hover:bg-[#15803D] text-white"
          >
            <MessageSquare size={16} className="mr-2" />
            Broadcast
          </Button>
        }
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Chat List */}
        <div className="bg-white border border-[#E0E0E0] rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
            <h3 className="font-bold text-[#212121]">Active Chats</h3>
            <Button variant="ghost" size="sm" onClick={loadChats} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 m-2" />
              ))
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No chats
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  className={`p-4 border-b border-[#E0E0E0] hover:bg-[#F5F5F5] cursor-pointer transition-colors ${
                    selectedChatId === chat.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-[#212121]">
                      {chat.participantName} ({chat.participantType})
                    </span>
                    <span className="text-xs text-[#757575]">
                      {new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-[#616161] truncate">{chat.lastMessage}</p>
                  {chat.unreadCount > 0 && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2 bg-white border border-[#E0E0E0] rounded-xl overflow-hidden flex flex-col shadow-sm">
          {loadingChatDetails ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316] mx-auto mb-4"></div>
                <p className="text-gray-500 text-sm">Loading chat...</p>
              </div>
            </div>
          ) : selectedChat ? (
            <>
              <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                    {selectedChat.participantName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#212121]">{selectedChat.participantName}</h3>
                    <p className={`text-xs ${selectedChat.isOnline ? 'text-[#16A34A]' : 'text-gray-500'}`}>
                      {selectedChat.isOnline ? 'Online' : 'Offline'}
                      {selectedChat.relatedOrderId && ` • Order ${selectedChat.relatedOrderId}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFlagIssue(selectedChat.id)}
                  className="text-[#EF4444] border-[#EF4444] hover:bg-red-50"
                >
                  <AlertTriangle size={12} className="mr-1" />
                  Flag Issue
                </Button>
              </div>

              <div className="flex-1 bg-gray-50 p-4 space-y-4 overflow-y-auto">
                {selectedChat.messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  selectedChat.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`p-3 rounded-lg border max-w-[80%] shadow-sm ${
                          message.direction === 'outgoing'
                            ? 'bg-[#FFF7ED] border-[#F97316]/20'
                            : 'bg-white border-[#E0E0E0]'
                        }`}
                      >
                        <p className="text-sm text-[#212121]">{message.content}</p>
                        <span
                          className={`text-[10px] mt-1 block ${
                            message.direction === 'outgoing' ? 'text-[#F97316]' : 'text-[#9E9E9E]'
                          }`}
                        >
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-[#E0E0E0] bg-white flex gap-2">
                <Input
                  type="text"
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                  disabled={sendingMessage}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendingMessage}
                  className="bg-[#F97316] text-white hover:bg-[#EA580C]"
                >
                  <Send size={20} />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                <p>Select a chat to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

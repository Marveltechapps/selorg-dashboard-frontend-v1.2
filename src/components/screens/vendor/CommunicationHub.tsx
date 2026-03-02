import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Inbox,
  AlertTriangle,
  Star,
  Send,
  Paperclip,
  MoreVertical,
  X,
  Phone,
  Mail,
  Download,
  Archive,
  Trash2,
  Check,
  CheckCheck,
  Clock,
  FileText,
  Image as ImageIcon,
  Smile
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Types
type MessageType = 'vendor' | 'user' | 'system' | 'escalation';
type ConversationType = 'all' | 'unread' | 'escalations' | 'feedback';

interface Message {
  id: string;
  conversationId: string;
  sender: string;
  senderType: 'vendor' | 'user';
  content: string;
  timestamp: string;
  timeAgo: string;
  isRead: boolean;
  hasAttachment?: boolean;
  attachmentName?: string;
  attachmentSize?: string;
}

interface Conversation {
  id: string;
  vendorName: string;
  initials: string;
  contactName: string;
  avatarColor: string;
  lastMessage: string;
  lastMessageTime: string;
  timeAgo: string;
  unreadCount: number;
  isOnline: boolean;
  isEscalated: boolean;
  isFeedback: boolean;
  messages: Message[];
}

const saveConversationsToStorage = (_conversations: Conversation[]) => {};

const loadConversationsFromStorage = (): Conversation[] => {
  return [];
};

// Mock Data
const mockConversations: Conversation[] = [
  {
    id: '1',
    vendorName: 'Fresh Farms Inc.',
    initials: 'FF',
    contactName: 'Michael Green',
    avatarColor: '#4F46E5',
    lastMessage: 'We are experiencing heavy rain in the region, causing a delay in harvest pickup.',
    lastMessageTime: 'Dec 19, 10:30 AM',
    timeAgo: '5 mins ago',
    unreadCount: 2,
    isOnline: true,
    isEscalated: false,
    isFeedback: false,
    messages: [
      {
        id: '1',
        conversationId: '1',
        sender: 'Michael Green',
        senderType: 'vendor',
        content: 'We are experiencing heavy rain in the region, causing a delay in harvest pickup.',
        timestamp: 'Dec 19, 10:30 AM',
        timeAgo: '5 mins ago',
        isRead: true,
      },
      {
        id: '2',
        conversationId: '1',
        sender: 'Michael Green',
        senderType: 'vendor',
        content: 'We expect to dispatch by 2 PM today.',
        timestamp: 'Dec 19, 10:32 AM',
        timeAgo: '3 mins ago',
        isRead: true,
        hasAttachment: true,
        attachmentName: 'revised_schedule.pdf',
        attachmentSize: '1.2 MB',
      },
      {
        id: '3',
        conversationId: '1',
        sender: 'Me',
        senderType: 'user',
        content: 'Understood. What is the new ETA for the shipment?',
        timestamp: 'Dec 19, 10:35 AM',
        timeAgo: 'Just now',
        isRead: true,
      },
    ],
  },
  {
    id: '2',
    vendorName: 'Tech Logistics',
    initials: 'TL',
    contactName: 'Raj Patel',
    avatarColor: '#F59E0B',
    lastMessage: 'Invoice submission confirmation.',
    lastMessageTime: 'Dec 19, 9:30 AM',
    timeAgo: '1h ago',
    unreadCount: 0,
    isOnline: false,
    isEscalated: true,
    isFeedback: false,
    messages: [
      {
        id: '1',
        conversationId: '2',
        sender: 'Raj Patel',
        senderType: 'vendor',
        content: 'Invoice submission confirmation.',
        timestamp: 'Dec 19, 9:30 AM',
        timeAgo: '1h ago',
        isRead: true,
      },
    ],
  },
  {
    id: '3',
    vendorName: 'Global Spices',
    initials: 'GS',
    contactName: 'Sarah Kumar',
    avatarColor: '#10B981',
    lastMessage: 'Thank you for the positive feedback!',
    lastMessageTime: 'Dec 19, 8:00 AM',
    timeAgo: '3h ago',
    unreadCount: 0,
    isOnline: true,
    isEscalated: false,
    isFeedback: true,
    messages: [
      {
        id: '1',
        conversationId: '3',
        sender: 'Sarah Kumar',
        senderType: 'vendor',
        content: 'Thank you for the positive feedback!',
        timestamp: 'Dec 19, 8:00 AM',
        timeAgo: '3h ago',
        isRead: true,
      },
    ],
  },
  {
    id: '4',
    vendorName: 'Dairy Delights',
    initials: 'DD',
    contactName: 'John Smith',
    avatarColor: '#EF4444',
    lastMessage: 'Regarding the temperature issue...',
    lastMessageTime: 'Dec 18, 4:30 PM',
    timeAgo: 'Yesterday',
    unreadCount: 1,
    isOnline: false,
    isEscalated: false,
    isFeedback: false,
    messages: [
      {
        id: '1',
        conversationId: '4',
        sender: 'John Smith',
        senderType: 'vendor',
        content: 'Regarding the temperature issue...',
        timestamp: 'Dec 18, 4:30 PM',
        timeAgo: 'Yesterday',
        isRead: false,
      },
    ],
  },
];

export function CommunicationHub() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(
    mockConversations[0] || null
  );
  
  const [filterType, setFilterType] = useState<ConversationType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Modal states
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showConversationDetailsModal, setShowConversationDetailsModal] = useState(false);
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // New message form
  const [messageType, setMessageType] = useState<'vendor' | 'internal' | 'escalation' | 'feedback'>('vendor');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');

  // Feedback form
  const [feedbackType, setFeedbackType] = useState<'positive' | 'constructive' | 'issue'>('positive');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState('');

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'unread' && conv.unreadCount > 0) ||
      (filterType === 'escalations' && conv.isEscalated) ||
      (filterType === 'feedback' && conv.isFeedback);

    const matchesSearch =
      searchQuery === '' ||
      conv.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Get filter counts
  const getFilterCount = (type: ConversationType) => {
    if (type === 'all') return conversations.length;
    if (type === 'unread') return conversations.filter((c) => c.unreadCount > 0).length;
    if (type === 'escalations') return conversations.filter((c) => c.isEscalated).length;
    if (type === 'feedback') return conversations.filter((c) => c.isFeedback).length;
    return 0;
  };

  // Update active conversation when conversations change (to get latest messages)
  useEffect(() => {
    if (activeConversation) {
      const updated = conversations.find(c => c.id === activeConversation.id);
      if (updated) {
        // Only update if messages have changed to avoid unnecessary re-renders
        if (updated.messages.length !== activeConversation.messages.length) {
          setActiveConversation(updated);
        }
      }
    }
  }, [conversations]); // eslint-disable-line react-hooks/exhaustive-deps

  // Send message
  const handleSendMessage = () => {
    if (messageInput.trim() === '' || !activeConversation) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId: activeConversation.id,
      content: messageInput.trim(),
      sender: 'You',
      senderType: 'user',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      timeAgo: 'Just now',
      isRead: false,
      hasAttachment: false,
    };

    // Update the active conversation with the new message
    const updatedConversation: Conversation = {
      ...activeConversation,
      messages: [...activeConversation.messages, newMessage],
      lastMessage: messageInput.trim(),
      lastMessageTime: 'Just now',
      timeAgo: 'Just now',
    };

    // Update conversations list
    const updatedConversations = conversations.map(conv =>
      conv.id === activeConversation.id ? updatedConversation : conv
    );

    setConversations(updatedConversations);
    setActiveConversation(updatedConversation);
    setMessageInput('');
    toast.success('Message sent');
  };

  // Simulate typing indicator
  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start bg-white px-6 py-5 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-[32px] font-bold text-[#1F2937]">Communication Hub</h1>
          <p className="text-sm text-[#6B7280] mt-1">Direct chat with vendors, escalation notes, and feedback</p>
        </div>
        <button
          onClick={() => setShowNewMessageModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#4F46E5] text-white font-medium rounded-md hover:bg-[#4338CA] transition-all duration-200"
        >
          <MessageSquare className="w-4 h-4" />
          New Message
        </button>
      </div>

      {/* Two-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Conversations List */}
        <div className="w-[360px] bg-white border-r border-[#E5E7EB] flex flex-col">
          {/* Search & Filter */}
          <div className="p-4 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search vendor, PO, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterType === 'all'
                    ? 'bg-[#4F46E5] text-white'
                    : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                All
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">{getFilterCount('all')}</span>
              </button>

              <button
                onClick={() => setFilterType('unread')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterType === 'unread'
                    ? 'bg-[#4F46E5] text-white'
                    : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                }`}
              >
                <Inbox className="w-3 h-3" />
                Unread
                {getFilterCount('unread') > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-[#EF4444] text-white rounded text-[10px]">
                    {getFilterCount('unread')}
                  </span>
                )}
              </button>

              <button
                onClick={() => setFilterType('escalations')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterType === 'escalations'
                    ? 'bg-[#4F46E5] text-white'
                    : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span className="ml-1 px-1.5 py-0.5 bg-[#F59E0B] text-white rounded text-[10px]">
                  {getFilterCount('escalations')}
                </span>
              </button>

              <button
                onClick={() => setFilterType('feedback')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterType === 'feedback'
                    ? 'bg-[#4F46E5] text-white'
                    : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                }`}
              >
                <Star className="w-3 h-3" />
                {getFilterCount('feedback') > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">{getFilterCount('feedback')}</span>
                )}
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            {filteredConversations.map((conversation) => {
              // Find the conversation from state to get latest data
              const currentConv = conversations.find(c => c.id === conversation.id) || conversation;
              return (
              <div
                key={conversation.id}
                onClick={() => {
                  // Find the latest conversation data from state
                  const latestConv = conversations.find(c => c.id === conversation.id) || conversation;
                  setActiveConversation(latestConv);
                }}
                className={`relative p-3 rounded-lg cursor-pointer transition-all ${
                  currentConv.unreadCount > 0 ? 'bg-[#F9FAFB]' : 'bg-white'
                } ${
                  activeConversation?.id === conversation.id
                    ? 'border-2 border-[#4F46E5] shadow-sm'
                    : 'border border-[#E5E7EB] hover:bg-[#F9FAFB]'
                } ${currentConv.isEscalated ? 'border-l-4 !border-l-[#F59E0B]' : ''}`}
              >
                {conversation.unreadCount > 0 && (
                  <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#4F46E5]" />
                )}

                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: conversation.avatarColor }}
                    >
                      {conversation.initials}
                    </div>
                    {conversation.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#10B981] border-2 border-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-[#1F2937] truncate">{conversation.vendorName}</h3>
                        <p className="text-xs text-[#6B7280]">Contact: {conversation.contactName}</p>
                      </div>
                      <span className="text-[11px] text-[#9CA3AF] flex-shrink-0 ml-2">{conversation.timeAgo}</span>
                    </div>

                    <p className="text-xs text-[#6B7280] line-clamp-2 mb-1">{currentConv.lastMessage}</p>

                    <div className="flex items-center gap-2">
                      {currentConv.isEscalated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEE2E2] text-[#991B1B] text-[10px] font-bold rounded">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Escalated
                        </span>
                      )}
                      {currentConv.unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-[#4F46E5] text-white text-[10px] font-bold rounded-full">
                          {currentConv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>

        {/* Right Main Area: Active Conversation */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col bg-white">
            {/* Conversation Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: activeConversation.avatarColor }}
                  >
                    {activeConversation.initials}
                  </div>
                  {activeConversation.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#10B981] border-2 border-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1F2937]">{activeConversation.vendorName}</h2>
                  <p className="text-xs text-[#6B7280]">
                    Contact: {activeConversation.contactName} •{' '}
                    <span className="text-[#10B981]">{activeConversation.isOnline ? 'Online' : 'Offline'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 text-[#6B7280] hover:bg-[#F3F4F6] rounded-md transition-colors">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowConversationDetailsModal(true)}
                  className="p-2 text-[#6B7280] hover:bg-[#F3F4F6] rounded-md transition-colors"
                >
                  <Star className="w-4 h-4" />
                </button>
                <button className="p-2 text-[#6B7280] hover:bg-[#F3F4F6] rounded-md transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#F9FAFB] space-y-4">
              {activeConversation.messages.map((message, index) => {
                const isVendor = message.senderType === 'vendor';
                const showAvatar = index === 0 || activeConversation.messages[index - 1].senderType !== message.senderType;

                return (
                  <div key={message.id} className={`flex gap-3 ${isVendor ? 'justify-start' : 'justify-end'}`}>
                    {/* Vendor Avatar */}
                    {isVendor && (
                      <div className="flex-shrink-0">
                        {showAvatar ? (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: activeConversation.avatarColor }}
                          >
                            {activeConversation.initials}
                          </div>
                        ) : (
                          <div className="w-8" />
                        )}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className={`flex flex-col ${isVendor ? 'items-start' : 'items-end'} max-w-[60%]`}>
                      {showAvatar && isVendor && (
                        <span className="text-xs font-bold text-[#1F2937] mb-1">{message.sender}</span>
                      )}

                      <div
                        className={`px-4 py-2.5 rounded-xl ${
                          isVendor
                            ? 'bg-[#E5E7EB] text-[#1F2937] rounded-tl-none'
                            : 'bg-[#4F46E5] text-white rounded-tr-none'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>

                        {/* Attachment */}
                        {message.hasAttachment && (
                          <div className="mt-2 p-2 bg-white/10 rounded-lg flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{message.attachmentName}</p>
                              <p className="text-[10px] opacity-70">{message.attachmentSize}</p>
                            </div>
                            <button className="p-1 hover:bg-white/20 rounded">
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[11px] ${isVendor ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
                          {message.timestamp}
                        </span>
                        {!isVendor && (
                          <div className={`flex items-center ${message.isRead ? 'text-[#4F46E5]' : 'text-[#9CA3AF]'}`}>
                            {message.isRead ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: activeConversation.avatarColor }}
                  >
                    {activeConversation.initials}
                  </div>
                  <div className="bg-[#E5E7EB] px-4 py-2.5 rounded-xl rounded-tl-none">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input Area */}
            <div className="p-6 bg-white border-t border-[#E5E7EB]">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={messageInput}
                    onChange={handleTyping}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-4 py-3 pr-20 bg-white border border-[#D1D5DB] rounded-lg text-sm resize-none focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    style={{ maxHeight: '120px', minHeight: '44px' }}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <button className="p-1.5 text-[#6B7280] hover:text-[#1F2937] transition-colors">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-[#6B7280] hover:text-[#1F2937] transition-colors">
                      <Smile className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={messageInput.trim() === ''}
                  className="w-10 h-10 flex items-center justify-center bg-[#4F46E5] text-white rounded-full hover:bg-[#4338CA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <button className="text-xs text-[#4F46E5] hover:underline flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  Attach file
                </button>
                <button className="text-xs text-[#4F46E5] hover:underline flex items-center gap-1">
                  <Smile className="w-3 h-3" />
                  Add emoji
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#F9FAFB]">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
              <p className="text-lg font-bold text-[#1F2937] mb-2">No Conversation Selected</p>
              <p className="text-sm text-[#6B7280]">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Start New Message */}
      <Dialog open={showNewMessageModal} onOpenChange={setShowNewMessageModal}>
        <DialogContent className="max-w-[600px] p-0" aria-describedby="new-message-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">New Message</DialogTitle>
            <DialogDescription id="new-message-description" className="text-sm text-[#6B7280]">
              Start a conversation with vendor or team
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Message Type */}
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-3">Message Type</label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                  <input
                    type="radio"
                    name="messageType"
                    value="vendor"
                    checked={messageType === 'vendor'}
                    onChange={(e) => setMessageType(e.target.value as any)}
                    className="mt-0.5 w-4 h-4 text-[#4F46E5]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#1F2937]">Vendor Message</p>
                    <p className="text-xs text-[#6B7280]">Direct communication with vendor</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                  <input
                    type="radio"
                    name="messageType"
                    value="escalation"
                    checked={messageType === 'escalation'}
                    onChange={(e) => setMessageType(e.target.value as any)}
                    className="mt-0.5 w-4 h-4 text-[#4F46E5]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#1F2937]">Escalation</p>
                    <p className="text-xs text-[#6B7280]">Escalate issue to management</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                  <input
                    type="radio"
                    name="messageType"
                    value="feedback"
                    checked={messageType === 'feedback'}
                    onChange={(e) => setMessageType(e.target.value as any)}
                    className="mt-0.5 w-4 h-4 text-[#4F46E5]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[#1F2937]">Feedback</p>
                    <p className="text-xs text-[#6B7280]">Send feedback to vendor</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Recipient Selection */}
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                Recipient <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              >
                <option value="">Select vendor...</option>
                <option value="fresh-farms">Fresh Farms Inc.</option>
                <option value="tech-logistics">Tech Logistics</option>
                <option value="global-spices">Global Spices</option>
                <option value="dairy-delights">Dairy Delights</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Subject (Optional)</label>
              <input
                type="text"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Message subject..."
                maxLength={100}
                className="w-full h-10 px-3 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>

            {/* Message Content */}
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your message..."
                rows={5}
                maxLength={2000}
                className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-sm text-[#1F2937] placeholder-[#9CA3AF] resize-none focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              />
              <p className="text-xs text-[#9CA3AF] mt-1">{messageContent.length}/2000 characters</p>
            </div>

            {/* Attachments */}
            <div>
              <button className="flex items-center gap-2 text-sm text-[#4F46E5] hover:underline">
                <Paperclip className="w-4 h-4" />
                Attach file
              </button>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => setShowNewMessageModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Find or create conversation for the recipient
                const recipientNames: Record<string, { name: string; contact: string; initials: string; color: string }> = {
                  'fresh-farms': { name: 'Fresh Farms Inc.', contact: 'Michael Green', initials: 'FF', color: '#4F46E5' },
                  'tech-logistics': { name: 'Tech Logistics', contact: 'Sarah Johnson', initials: 'TL', color: '#10B981' },
                  'global-spices': { name: 'Global Spices', contact: 'John Smith', initials: 'GS', color: '#F59E0B' },
                  'dairy-delights': { name: 'Dairy Delights', contact: 'Emma Wilson', initials: 'DD', color: '#EF4444' },
                };

                const recipientInfo = recipientNames[selectedRecipient] || {
                  name: selectedRecipient,
                  contact: 'Contact',
                  initials: selectedRecipient.substring(0, 2).toUpperCase(),
                  color: '#6B7280',
                };

                const existingConv = conversations.find(c => c.id === selectedRecipient);

                const newMessage: Message = {
                  id: Date.now().toString(),
                  conversationId: selectedRecipient,
                  content: messageContent.trim(),
                  sender: 'You',
                  senderType: 'user',
                  timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                  timeAgo: 'Just now',
                  isRead: false,
                  hasAttachment: false,
                };

                if (existingConv) {
                  // Add message to existing conversation
                  const updatedConversation: Conversation = {
                    ...existingConv,
                    messages: [...existingConv.messages, newMessage],
                    lastMessage: messageContent.trim(),
                    lastMessageTime: 'Just now',
                    timeAgo: 'Just now',
                  };

                  const updatedConversations = conversations.map(conv =>
                    conv.id === selectedRecipient ? updatedConversation : conv
                  );

                  setConversations(updatedConversations);
                  
                  // Switch to this conversation if not already active
                  if (activeConversation?.id !== selectedRecipient) {
                    setActiveConversation(updatedConversation);
                  } else {
                    setActiveConversation(updatedConversation);
                  }
                } else {
                  // Create new conversation
                  const newConversation: Conversation = {
                    id: selectedRecipient,
                    vendorName: recipientInfo.name,
                    initials: recipientInfo.initials,
                    contactName: recipientInfo.contact,
                    avatarColor: recipientInfo.color,
                    lastMessage: messageContent.trim(),
                    lastMessageTime: 'Just now',
                    timeAgo: 'Just now',
                    unreadCount: 0,
                    isOnline: false,
                    isEscalated: false,
                    isFeedback: messageType === 'feedback',
                    messages: [newMessage],
                  };

                  setConversations(prev => {
                    const updated = [...prev, newConversation];
                    return updated;
                  });
                  setActiveConversation(newConversation);
                }

                toast.success(`Message sent to ${recipientInfo.name}`);
                setShowNewMessageModal(false);
                setMessageContent('');
                setMessageSubject('');
                setSelectedRecipient('');
              }}
              disabled={!selectedRecipient || !messageContent.trim()}
              className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Message
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Conversation Details */}
      <Dialog open={showConversationDetailsModal} onOpenChange={setShowConversationDetailsModal}>
        <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="conversation-details-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">Conversation Details</DialogTitle>
            <DialogDescription id="conversation-details-description" className="text-sm text-[#6B7280]">{activeConversation?.vendorName}</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Vendor Info */}
            <div className="bg-[#F9FAFB] p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Vendor:</span>
                <span className="font-medium text-[#1F2937]">{activeConversation?.vendorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Contact:</span>
                <span className="text-[#1F2937]">{activeConversation?.contactName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Email:</span>
                <span className="text-[#4F46E5]">michael@freshfarms.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Phone:</span>
                <span className="text-[#1F2937]">+91-9876543210</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Status:</span>
                <span className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${activeConversation?.isOnline ? 'bg-[#10B981]' : 'bg-[#9CA3AF]'}`} />
                  <span className="text-[#1F2937]">{activeConversation?.isOnline ? 'Online' : 'Offline'}</span>
                </span>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Shared Attachments</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-lg">
                  <FileText className="w-5 h-5 text-[#4F46E5]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1F2937] truncate">revised_schedule.pdf</p>
                    <p className="text-xs text-[#6B7280]">1.2 MB • Dec 19, 10:32 AM</p>
                  </div>
                  <button className="p-1.5 text-[#6B7280] hover:text-[#1F2937]">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div>
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Actions</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 p-3 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] rounded-lg transition-colors">
                  <Star className="w-4 h-4" />
                  Star conversation
                </button>
                <button className="w-full flex items-center gap-3 p-3 text-left text-sm text-[#1F2937] hover:bg-[#F9FAFB] rounded-lg transition-colors">
                  <Archive className="w-4 h-4" />
                  Archive conversation
                </button>
                <button className="w-full flex items-center gap-3 p-3 text-left text-sm text-[#EF4444] hover:bg-[#FEE2E2] rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                  Delete conversation
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end">
            <button
              onClick={() => setShowConversationDetailsModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Escalation Notes */}
      <Dialog open={showEscalationModal} onOpenChange={setShowEscalationModal}>
        <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="escalation-details-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">Escalation Details</DialogTitle>
            <DialogDescription id="escalation-details-description" className="text-sm text-[#6B7280]">
              Fresh Farms Inc. - PO-2024-0012
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Summary */}
            <div className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] p-4 rounded-lg">
              <h3 className="text-sm font-bold text-[#92400E] mb-2">⚠️ High Severity Escalation</h3>
              <p className="text-sm text-[#713F12]">Late shipment - 48 hours overdue</p>
            </div>

            {/* Details */}
            <div className="bg-[#F9FAFB] p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Escalated by:</span>
                <span className="text-[#1F2937]">John Smith (Category Manager)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Escalation date:</span>
                <span className="text-[#1F2937]">Dec 19, 2024, 2:30 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Escalated to:</span>
                <span className="text-[#1F2937]">Sarah Johnson (VP Procurement)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Status:</span>
                <span className="text-[#F59E0B]">Awaiting response</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">SLA Remaining:</span>
                <span className="font-bold text-[#EF4444]">2 hours 15 minutes</span>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-bold text-[#1F2937] mb-3">Timeline</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#DBEAFE] flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-[#1E40AF]" />
                    </div>
                    <div className="w-0.5 h-full bg-[#E5E7EB]" />
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-bold text-[#1F2937]">Issue Detected</p>
                    <p className="text-xs text-[#6B7280]">Dec 19, 10:30 AM</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">Shipment SHP-9924 reported delayed</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#FEF3C7] flex items-center justify-center">
                      <Clock className="w-4 h-4 text-[#92400E]" />
                    </div>
                    <div className="w-0.5 h-full bg-[#E5E7EB]" />
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-bold text-[#1F2937]">Escalation Triggered</p>
                    <p className="text-xs text-[#6B7280]">Dec 19, 2:30 PM</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">Escalated to Sarah Johnson (VP Procurement)</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#F59E0B] flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#F59E0B]">Awaiting Resolution</p>
                    <p className="text-xs text-[#6B7280]">Current Status</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => {
                toast.success('Escalation resolved');
                setShowEscalationModal(false);
              }}
              className="px-6 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-md hover:bg-[#059669]"
            >
              Mark as Resolved
            </button>
            <button
              onClick={() => setShowEscalationModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Feedback Management */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto p-0" aria-describedby="vendor-feedback-description">
          <DialogHeader className="px-6 py-5 border-b border-[#E5E7EB]">
            <DialogTitle className="text-lg font-bold text-[#1F2937]">Vendor Feedback</DialogTitle>
            <DialogDescription id="vendor-feedback-description" className="text-sm text-[#6B7280]">Fresh Farms Inc.</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6 space-y-6">
            {/* Feedback Type */}
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-3">Feedback Type</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                  <input
                    type="radio"
                    name="feedbackType"
                    value="positive"
                    checked={feedbackType === 'positive'}
                    onChange={(e) => setFeedbackType(e.target.value as any)}
                    className="w-4 h-4 text-[#4F46E5]"
                  />
                  <span className="text-sm text-[#1F2937]">Positive feedback</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                  <input
                    type="radio"
                    name="feedbackType"
                    value="constructive"
                    checked={feedbackType === 'constructive'}
                    onChange={(e) => setFeedbackType(e.target.value as any)}
                    className="w-4 h-4 text-[#4F46E5]"
                  />
                  <span className="text-sm text-[#1F2937]">Constructive feedback</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                  <input
                    type="radio"
                    name="feedbackType"
                    value="issue"
                    checked={feedbackType === 'issue'}
                    onChange={(e) => setFeedbackType(e.target.value as any)}
                    className="w-4 h-4 text-[#4F46E5]"
                  />
                  <span className="text-sm text-[#1F2937]">Issue feedback</span>
                </label>
              </div>
            </div>

            {/* Rating */}
            {feedbackType !== 'issue' && (
              <div>
                <label className="block text-xs font-bold text-[#6B7280] uppercase mb-3">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setFeedbackRating(rating)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          rating <= feedbackRating
                            ? 'fill-[#FBBF24] text-[#FBBF24]'
                            : 'text-[#D1D5DB]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-3">Categories</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'On-time delivery',
                  'Product quality',
                  'Communication',
                  'Compliance',
                  'Pricing',
                  'Problem resolution',
                ].map((category) => (
                  <label key={category} className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4 text-[#4F46E5] rounded" />
                    <span className="text-sm text-[#1F2937]">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase mb-2">Feedback Comments</label>
              <textarea
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                placeholder="Share your feedback..."
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-sm resize-none focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
              />
              <p className="text-xs text-[#9CA3AF] mt-1">{feedbackComments.length}/500 characters</p>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FAFBFC] border-t border-[#E5E7EB] flex justify-end gap-3">
            <button
              onClick={() => setShowFeedbackModal(false)}
              className="px-6 py-2.5 bg-white border border-[#D1D5DB] text-[#1F2937] text-sm font-medium rounded-md hover:bg-[#F3F4F6]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.success('Feedback submitted');
                setShowFeedbackModal(false);
                setFeedbackComments('');
                setFeedbackRating(0);
              }}
              className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-medium rounded-md hover:bg-[#4338CA]"
            >
              Submit Feedback
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

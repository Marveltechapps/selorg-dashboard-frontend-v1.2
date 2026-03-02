import { API_ENDPOINTS } from '../../../config/api';
import { apiRequest } from '../../../utils/apiRequest';

export interface ChatSummary {
  id: string;
  participantId: string;
  participantName: string;
  participantType: 'Rider' | 'TeamLead' | 'Dispatch' | 'Other';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  relatedOrderId?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  direction: 'incoming' | 'outgoing';
  read: boolean;
}

export interface Chat {
  id: string;
  participantId: string;
  participantName: string;
  participantType: 'Rider' | 'TeamLead' | 'Dispatch' | 'Other';
  isOnline: boolean;
  relatedOrderId?: string;
  messages: Message[];
}

export interface Broadcast {
  id: string;
  message: string;
  recipients: string[];
  priority: 'normal' | 'high' | 'urgent';
  createdAt: string;
  status: 'sent' | 'pending' | 'failed';
  sentCount?: number;
  failedCount?: number;
}

/**
 * Backend API response types
 */
interface ApiChatSummary {
  chats: ChatSummary[];
}

interface ApiChat {
  id: string;
  participantId: string;
  participantName: string;
  participantType: string;
  isOnline: boolean;
  relatedOrderId?: string;
  messages: any[];
}

/**
 * Transform backend data
 */
function transformTimestamp(timestamp: string | Date): string {
  return typeof timestamp === 'string' ? timestamp : new Date(timestamp).toISOString();
}

function transformMessage(apiMessage: any): Message {
  return {
    id: apiMessage.id,
    chatId: apiMessage.chatId,
    senderId: apiMessage.senderId,
    senderName: apiMessage.senderName,
    content: apiMessage.content,
    timestamp: transformTimestamp(apiMessage.createdAt || apiMessage.timestamp),
    direction: apiMessage.direction as 'incoming' | 'outgoing',
    read: apiMessage.read || false,
  };
}

function transformChat(apiChat: ApiChat): Chat {
  return {
    id: apiChat.id,
    participantId: apiChat.participantId,
    participantName: apiChat.participantName,
    participantType: apiChat.participantType as any,
    isOnline: apiChat.isOnline,
    relatedOrderId: apiChat.relatedOrderId,
    messages: (apiChat.messages || []).map(transformMessage),
  };
}

/**
 * List active chats
 */
export async function listActiveChats(unreadOnly: boolean = false): Promise<ChatSummary[]> {
  const queryParams = new URLSearchParams();
  if (unreadOnly) {
    queryParams.append('unreadOnly', 'true');
  }

  const endpoint = queryParams.toString()
    ? `${API_ENDPOINTS.communication.chats}?${queryParams.toString()}`
    : API_ENDPOINTS.communication.chats;

  const response = await apiRequest<ApiChatSummary>(endpoint, {}, 'Communication API');
  const chats = response?.chats ?? [];
  return Array.isArray(chats) ? chats.map(chat => ({
    ...chat,
    lastMessageTime: transformTimestamp(chat.lastMessageTime || chat.lastMessageAt || new Date().toISOString()),
  })) : [];
}

/**
 * Get chat details with messages
 */
export async function getChatDetails(
  chatId: string,
  options?: { limit?: number; before?: string }
): Promise<Chat> {
  const queryParams = new URLSearchParams();
  if (options?.limit) {
    queryParams.append('limit', options.limit.toString());
  }
  if (options?.before) {
    queryParams.append('before', options.before);
  }

  const queryString = queryParams.toString();
  const endpoint = queryString
    ? `${API_ENDPOINTS.communication.chat(chatId)}?${queryString}`
    : API_ENDPOINTS.communication.chat(chatId);

  const apiChat = await apiRequest<ApiChat>(endpoint, {}, 'Communication API');
  return transformChat(apiChat);
}

/**
 * Send a message in a chat
 */
export async function sendMessage(chatId: string, content: string): Promise<Message> {
  const result = await apiRequest<any>(
    API_ENDPOINTS.communication.chatMessages(chatId),
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    },
    'Communication API'
  );
  return transformMessage(result);
}

/**
 * Mark chat as read
 */
export async function markChatAsRead(chatId: string): Promise<void> {
  await apiRequest(
    API_ENDPOINTS.communication.markRead(chatId),
    {
      method: 'PUT',
    },
    'Communication API'
  );
}

/**
 * Create a broadcast
 */
export async function createBroadcast(data: {
  message: string;
  recipients: string[];
  priority?: 'normal' | 'high' | 'urgent';
}): Promise<Broadcast> {
  const result = await apiRequest<Broadcast>(
    API_ENDPOINTS.communication.broadcasts,
    {
      method: 'POST',
      body: JSON.stringify({
        message: data.message,
        recipients: data.recipients,
        priority: data.priority || 'normal',
      }),
    },
    'Communication API'
  );
  return {
    ...result,
    createdAt: transformTimestamp(result.createdAt),
  };
}

/**
 * Flag an issue in a chat
 */
export async function flagIssue(
  chatId: string,
  data: {
    reason: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    category?: 'delivery_issue' | 'technical_issue' | 'customer_issue' | 'other';
  }
): Promise<{ message: string; issueId: string }> {
  return await apiRequest<{ message: string; issueId: string }>(
    API_ENDPOINTS.communication.flagIssue(chatId),
    {
      method: 'POST',
      body: JSON.stringify({
        reason: data.reason,
        priority: data.priority || 'medium',
        category: data.category || 'other',
      }),
    },
    'Communication API'
  );
}


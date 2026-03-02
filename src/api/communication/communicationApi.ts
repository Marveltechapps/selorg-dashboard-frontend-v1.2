/**
 * Communication API - VendorCommunication and shared communication endpoints.
 * Base: /api/v1/shared/communication
 */
import { API_CONFIG, API_ENDPOINTS } from '../../config/api';
import { getAuthToken } from '../../contexts/AuthContext';

function authHeaders(): HeadersInit {
  const token = getAuthToken() || '';
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return headers;
}

const BASE = `${API_CONFIG.baseURL}${API_ENDPOINTS.communication.chats}`;

export interface ApiChat {
  id: string;
  participantId: string;
  participantName: string;
  participantType: string;
  isOnline?: boolean;
  relatedOrderId?: string;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  unreadCount?: number;
}

export interface ApiMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  direction: 'incoming' | 'outgoing';
  read?: boolean;
  createdAt?: string;
  timestamp?: string;
}

export interface ApiChatDetails extends ApiChat {
  messages: ApiMessage[];
}

export async function fetchChats(unreadOnly = false): Promise<ApiChat[]> {
  const qs = unreadOnly ? '?unreadOnly=true' : '';
  const response = await fetch(`${BASE}${qs}`, { headers: authHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch chats: ${response.status}`);
  }
  const data = await response.json();
  return data.chats ?? [];
}

export async function fetchChatDetails(chatId: string, options?: { limit?: number; before?: string }): Promise<ApiChatDetails> {
  let url = `${BASE}/${chatId}`;
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.before) params.set('before', options.before);
  const qs = params.toString();
  if (qs) url += `?${qs}`;

  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    if (response.status === 404) throw new Error('Chat not found');
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch chat details: ${response.status}`);
  }
  return response.json();
}

export async function sendMessage(chatId: string, content: string): Promise<ApiMessage> {
  const response = await fetch(`${BASE}/${chatId}/messages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error('Chat not found');
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to send message: ${response.status}`);
  }
  return response.json();
}

export async function markChatAsRead(chatId: string): Promise<void> {
  const response = await fetch(`${API_CONFIG.baseURL}${API_ENDPOINTS.communication.markRead(chatId)}`, {
    method: 'PUT',
    headers: authHeaders(),
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error('Chat not found');
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to mark as read: ${response.status}`);
  }
}

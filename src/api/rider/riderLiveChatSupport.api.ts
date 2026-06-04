import { apiRequest } from '../../utils/apiRequest';

export interface SupportConversation {
  conversationId: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  status: 'open' | 'resolved';
  lastMessage: string;
  lastMessageAt: string | null;
  riderUnreadCount: number;
  adminUnreadCount: number;
  resolvedAt?: string | null;
}

export interface SupportMessage {
  messageId: string;
  conversationId: string;
  senderType: 'rider' | 'admin';
  senderId: string;
  senderName: string;
  body: string;
  clientMessageId?: string | null;
  createdAt: string;
}

const PREFIX = '/support-chat/admin';

export async function listSupportConversations(params?: {
  search?: string;
  status?: string;
  unreadOnly?: boolean;
}): Promise<SupportConversation[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.status) qs.set('status', params.status);
  if (params?.unreadOnly) qs.set('unreadOnly', 'true');
  const res = await apiRequest<{ success: boolean; data: { conversations: SupportConversation[] } }>(
    `${PREFIX}/conversations${qs.toString() ? `?${qs}` : ''}`,
    {},
    'Live Chat Support'
  );
  return res.data?.conversations ?? [];
}

export async function getSupportConversation(conversationId: string): Promise<{
  conversation: SupportConversation;
  messages: SupportMessage[];
}> {
  const res = await apiRequest<{
    success: boolean;
    data: { conversation: SupportConversation; messages: SupportMessage[] };
  }>(`${PREFIX}/conversations/${conversationId}`, {}, 'Live Chat Support');
  return res.data;
}

export async function sendSupportAdminMessage(
  conversationId: string,
  body: string,
  clientMessageId?: string
): Promise<{ conversation: SupportConversation; message: SupportMessage }> {
  const res = await apiRequest<{
    success: boolean;
    data: { conversation: SupportConversation; message: SupportMessage };
  }>(
    `${PREFIX}/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ body, clientMessageId }),
    },
    'Live Chat Support'
  );
  return res.data;
}

export async function markSupportConversationRead(conversationId: string): Promise<SupportConversation> {
  const res = await apiRequest<{ success: boolean; data: { conversation: SupportConversation } }>(
    `${PREFIX}/conversations/${conversationId}/read`,
    { method: 'POST' },
    'Live Chat Support'
  );
  return res.data.conversation;
}

export async function updateSupportConversationStatus(
  conversationId: string,
  status: 'open' | 'resolved'
): Promise<SupportConversation> {
  const res = await apiRequest<{ success: boolean; data: { conversation: SupportConversation } }>(
    `${PREFIX}/conversations/${conversationId}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    'Live Chat Support'
  );
  return res.data.conversation;
}

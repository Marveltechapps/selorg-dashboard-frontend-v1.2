import { apiRequest } from '@/api/apiClient';

const PREFIX = '/admin/support';

// --- Type Definitions ---

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: 'order' | 'payment' | 'delivery' | 'account' | 'technical' | 'feedback';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerId: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  tags: string[];
  orderNumber?: string;
  responseTime?: number;
  resolutionTime?: number;
  slaBreached: boolean;
  rating?: number;
  notes: TicketNote[];
}

export interface TicketNote {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  type: 'customer_reply' | 'agent_reply' | 'internal_note' | 'status_change' | 'assignment';
  content: string;
  createdAt: string;
  isInternal: boolean;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'agent' | 'senior_agent' | 'team_lead' | 'manager';
  isOnline: boolean;
  activeTickets: number;
  totalResolved: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  maxTicketCapacity: number;
}

export interface CannedResponse {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  usageCount: number;
  createdBy: string;
  lastUsed?: string;
}

export interface TicketCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  ticketCount: number;
  avgResolutionTime: number;
  slaTarget: number;
}

export interface SLAMetrics {
  totalTickets: number;
  withinSLA: number;
  breachedSLA?: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  firstResponseSLA: number;
  resolutionSLA?: number;
  openTickets?: number;
  resolvedTickets?: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderType: 'customer' | 'agent';
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface LiveChat {
  id: string;
  customerId: string;
  customerName: string;
  agentId?: string;
  agentName?: string;
  status: 'waiting' | 'active' | 'ended';
  startedAt: string;
  endedAt?: string;
  messages: ChatMessage[];
  waitTime: number;
}

export interface SupportFAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  sortOrder: number;
  isActive: boolean;
}

export interface SupportFeedback {
  id: string;
  customerId?: string;
  customerName?: string;
  sentiment: string;
  productOrCategory?: string;
  content?: string;
  ticketId?: string;
  rating?: number;
  createdAt: string;
}

// --- API Functions ---

export async function fetchTickets(
  filters?: { status?: string; priority?: string; category?: string; assignedTo?: string; search?: string }
): Promise<SupportTicket[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters?.priority && filters.priority !== 'all') params.set('priority', filters.priority);
  if (filters?.category && filters.category !== 'all') params.set('category', filters.category);
  if (filters?.assignedTo && filters.assignedTo !== 'all') params.set('assignedTo', filters.assignedTo);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  const res = await apiRequest<{ success: boolean; data: SupportTicket[] }>(
    `${PREFIX}/tickets${qs ? `?${qs}` : ''}`
  );
  return res.data ?? [];
}

export async function fetchTicketById(id: string): Promise<SupportTicket | null> {
  const res = await apiRequest<{ success: boolean; data: SupportTicket }>(`${PREFIX}/tickets/${id}`);
  return res.data ?? null;
}

export interface CreateTicketInput {
  subject: string;
  description?: string;
  category?: string;
  priority?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerId?: string;
  orderNumber?: string;
}

export async function createTicket(
  data: CreateTicketInput
): Promise<SupportTicket> {
  const res = await apiRequest<{ success: boolean; data: SupportTicket }>(`${PREFIX}/tickets`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.data) throw new Error('Failed to create ticket');
  return res.data;
}

export async function updateTicket(id: string, data: Partial<SupportTicket>): Promise<SupportTicket> {
  const res = await apiRequest<{ success: boolean; data: SupportTicket }>(`${PREFIX}/tickets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.data) throw new Error('Failed to update ticket');
  return res.data;
}

export async function assignTicket(ticketId: string, agentId: string, agentName?: string): Promise<SupportTicket> {
  const res = await apiRequest<{ success: boolean; data: SupportTicket }>(
    `${PREFIX}/tickets/${ticketId}/assign`,
    {
      method: 'POST',
      body: JSON.stringify({ agentId, agentName }),
    }
  );
  if (!res.data) throw new Error('Failed to assign ticket');
  return res.data;
}

export async function addTicketNote(
  ticketId: string,
  note: Omit<TicketNote, 'id' | 'createdAt'>
): Promise<TicketNote> {
  const res = await apiRequest<{ success: boolean; data: TicketNote }>(
    `${PREFIX}/tickets/${ticketId}/notes`,
    {
      method: 'POST',
      body: JSON.stringify(note),
    }
  );
  if (!res.data) throw new Error('Failed to add note');
  return res.data;
}

export async function closeTicket(ticketId: string): Promise<SupportTicket> {
  const res = await apiRequest<{ success: boolean; data: SupportTicket }>(
    `${PREFIX}/tickets/${ticketId}/close`,
    {
      method: 'POST',
    }
  );
  if (!res.data) throw new Error('Failed to close ticket');
  return res.data;
}

export async function fetchAgents(): Promise<Agent[]> {
  const res = await apiRequest<{ success: boolean; data: Agent[] }>(`${PREFIX}/agents`);
  return res.data ?? [];
}

export async function fetchCannedResponses(): Promise<CannedResponse[]> {
  const res = await apiRequest<{ success: boolean; data: CannedResponse[] }>(
    `${PREFIX}/canned-responses`
  );
  return res.data ?? [];
}

export async function fetchCategories(): Promise<TicketCategory[]> {
  const res = await apiRequest<{ success: boolean; data: TicketCategory[] }>(
    `${PREFIX}/categories`
  );
  return res.data ?? [];
}

export async function fetchSLAMetrics(): Promise<SLAMetrics> {
  const res = await apiRequest<{ success: boolean; data: SLAMetrics }>(`${PREFIX}/sla-metrics`);
  if (!res.data) {
    return {
      totalTickets: 0,
      withinSLA: 0,
      avgResponseTime: 0,
      avgResolutionTime: 0,
      firstResponseSLA: 30,
    };
  }
  return res.data;
}

export async function fetchLiveChats(): Promise<LiveChat[]> {
  const res = await apiRequest<{ success: boolean; data: LiveChat[] }>(`${PREFIX}/live-chats`);
  return res.data ?? [];
}

export async function fetchFAQs(): Promise<SupportFAQ[]> {
  const res = await apiRequest<{ success: boolean; data: SupportFAQ[] }>(`${PREFIX}/faqs`);
  return res.data ?? [];
}

export async function createFAQ(data: {
  question: string;
  answer: string;
  category?: string;
  keywords?: string[];
  sortOrder?: number;
}): Promise<SupportFAQ> {
  const res = await apiRequest<{ success: boolean; data: SupportFAQ }>(`${PREFIX}/faqs`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.data) throw new Error('Failed to create FAQ');
  return res.data;
}

export async function updateFAQ(
  id: string,
  data: Partial<{ question: string; answer: string; category: string; keywords: string[]; sortOrder: number; isActive: boolean }>
): Promise<SupportFAQ> {
  const res = await apiRequest<{ success: boolean; data: SupportFAQ }>(`${PREFIX}/faqs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.data) throw new Error('Failed to update FAQ');
  return res.data;
}

export async function deleteFAQ(id: string): Promise<void> {
  await apiRequest<{ success: boolean }>(`${PREFIX}/faqs/${id}`, { method: 'DELETE' });
}

export async function fetchFeedback(): Promise<SupportFeedback[]> {
  const res = await apiRequest<{ success: boolean; data: SupportFeedback[] }>(`${PREFIX}/feedback`);
  return res.data ?? [];
}

export async function sendChatMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  senderType: 'customer' | 'agent',
  message: string
): Promise<ChatMessage> {
  throw new Error('Live chat not implemented');
}

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminModal } from '@/components/screens/admin/modals/AdminModal';
import { AdminConfirmDialog } from '@/components/screens/admin/modals/AdminConfirmDialog';
import { AdminFormBody, AdminFormGrid, AdminField } from '@/components/screens/admin/modals/AdminForm';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fetchTickets,
  fetchTicketById,
  fetchAgents,
  fetchSLAMetrics,
  fetchLiveChats,
  updateTicket,
  assignTicket,
  addTicketNote,
  closeTicket,
  escalateTicket,
  triggerTicketRefund,
  triggerTicketRedelivery,
  createTicket,
  fetchFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  fetchFeedback,
  SupportTicket,
  Agent,
  SLAMetrics,
  LiveChat,
  SupportFAQ,
  SupportFeedback,
} from './supportCenterApi';
import { toast } from 'sonner';
import {
  MessageSquare,
  RefreshCw,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Send,
  Eye,
  MessageCircle,
  Activity,
  Target,
  Plus,
  Edit,
  Trash2,
  HelpCircle,
  ThumbsUp,
  CreditCard,
  ArrowUpRight,
  Phone,
  Truck,
  RotateCcw,
  Timer,
} from 'lucide-react';
import { getCurrentUser } from '@/api/authApi';
import { AdminLiveChatPanel } from './AdminLiveChatPanel';

export function SupportCenter() {
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [slaMetrics, setSlaMetrics] = useState<SLAMetrics | null>(null);
  const [liveChats, setLiveChats] = useState<LiveChat[]>([]);
  const [faqs, setFaqs] = useState<SupportFAQ[]>([]);
  const [feedback, setFeedback] = useState<SupportFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q != null && q !== '') setSearchQuery(q);
  }, [searchParams]);

  // Modals
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [viewTicketOpen, setViewTicketOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [closeTicketLoading, setCloseTicketLoading] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [createTicketForm, setCreateTicketForm] = useState({ subject: '', description: '', customerName: '', customerEmail: '', customerPhone: '', category: 'order', priority: 'medium', orderNumber: '' });
  const [createTicketLoading, setCreateTicketLoading] = useState(false);
  const [editingFaq, setEditingFaq] = useState<SupportFAQ | null>(null);
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: 'general', keywords: '' });
  const [deleteFaqTarget, setDeleteFaqTarget] = useState<SupportFAQ | null>(null);
  const [deleteFaqLoading, setDeleteFaqLoading] = useState(false);

  // Escalation & Refund modals (P1-44 to P1-47)
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateTarget, setEscalateTarget] = useState<'darkstore' | 'rider_ops'>('darkstore');
  const [escalateNotes, setEscalateNotes] = useState('');
  const [escalateLoading, setEscalateLoading] = useState(false);
  const [triggerRefundOpen, setTriggerRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundOrderNumber, setRefundOrderNumber] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [redeliveryOpen, setRedeliveryOpen] = useState(false);
  const [redeliveryNotes, setRedeliveryNotes] = useState('');
  const [redeliveryOrderNumber, setRedeliveryOrderNumber] = useState('');
  const [redeliveryLoading, setRedeliveryLoading] = useState(false);

  // Inbox selection state (P1-37)
  const [inboxSelectedTicketId, setInboxSelectedTicketId] = useState<string | null>(null);
  const [supportTab, setSupportTab] = useState('all-tickets');
  const liveChatWaitingCount = useMemo(
    () => liveChats.filter((c) => c.status === 'waiting').length,
    [liveChats],
  );

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const chatsData = await fetchLiveChats();
        setLiveChats(chatsData);
      } catch {
        // ignore background poll errors
      }
    }, 5000);
    return () => clearInterval(poll);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (priorityFilter !== 'all') filters.priority = priorityFilter;
      if (categoryFilter !== 'all') filters.category = categoryFilter;

      const [ticketsData, agentsData, slaData, chatsData, faqsData, feedbackData] = await Promise.all([
        fetchTickets(filters),
        fetchAgents(),
        fetchSLAMetrics(),
        fetchLiveChats(),
        fetchFAQs(),
        fetchFeedback(),
      ]);

      setTickets(ticketsData);
      setAgents(agentsData);
      setSlaMetrics(slaData);
      setLiveChats(chatsData);
      setFaqs(faqsData);
      setFeedback(feedbackData);
      const waiting = chatsData.filter((c) => c.status === 'waiting').length;
      if (waiting > 0 && supportTab === 'all-tickets') {
        setSupportTab('live-chats');
      }
    } catch (error) {
      toast.error('Failed to load support data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyText('');
    setViewTicketOpen(true);
    void fetchTicketById(ticket.id).then((fresh) => {
      if (fresh) setSelectedTicket(fresh);
    });
  };

  const handleAssignTicket = async (ticketId: string, agentId: string) => {
    if (!agentId) return;
    try {
      const updated = await assignTicket(ticketId, agentId);
      toast.success('Ticket assigned successfully');
      if (updated && selectedTicket?.id === ticketId) {
        setSelectedTicket(updated);
      }
      loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to assign ticket';
      toast.error(message);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket) return;
    const text = replyText.trim();
    if (!text) {
      toast.error('Please enter a reply message');
      return;
    }

    setReplySending(true);
    try {
      const user = getCurrentUser();
      await addTicketNote(selectedTicket.id, {
        ticketId: selectedTicket.id,
        authorId: user?.id || 'agent-1',
        authorName: user?.name || user?.email || 'Admin',
        type: 'agent_reply',
        content: text,
        isInternal: false,
      });

      const updated =
        (await updateTicket(selectedTicket.id, { status: 'in_progress' }).catch(() => null)) ??
        (await fetchTicketById(selectedTicket.id));

      if (updated) {
        setSelectedTicket(updated);
      }

      toast.success('Reply sent successfully');
      setReplyText('');
      loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send reply';
      toast.error(message);
    } finally {
      setReplySending(false);
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    if (closeTicketLoading) return;
    setCloseTicketLoading(true);
    try {
      const updated = await closeTicket(ticketId);
      toast.success('Ticket closed successfully');
      if (updated && selectedTicket?.id === ticketId) {
        setSelectedTicket(updated);
      }
      setReplyText('');
      setInboxSelectedTicketId(null);
      setSelectedTicket(null);
      setViewTicketOpen(false);
      loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to close ticket';
      toast.error(message);
    } finally {
      setCloseTicketLoading(false);
    }
  };

  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      await updateTicket(ticketId, { status: status as any });
      toast.success('Status updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleCreateTicket = async () => {
    if (!createTicketForm.subject.trim() || !createTicketForm.customerName.trim() || !createTicketForm.customerEmail.trim()) {
      toast.error('Subject, customer name and email are required');
      return;
    }
    setCreateTicketLoading(true);
    try {
      await createTicket({
        subject: createTicketForm.subject,
        description: createTicketForm.description,
        category: createTicketForm.category,
        priority: createTicketForm.priority,
        customerName: createTicketForm.customerName,
        customerEmail: createTicketForm.customerEmail,
        customerPhone: createTicketForm.customerPhone || undefined,
        orderNumber: createTicketForm.orderNumber || undefined,
      });
      toast.success('Ticket created successfully');
      setCreateTicketOpen(false);
      setCreateTicketForm({ subject: '', description: '', customerName: '', customerEmail: '', customerPhone: '', category: 'order', priority: 'medium', orderNumber: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to create ticket');
    } finally {
      setCreateTicketLoading(false);
    }
  };

  const handleSaveFaq = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }
    try {
      if (editingFaq) {
        await updateFAQ(editingFaq.id, {
          question: faqForm.question,
          answer: faqForm.answer,
          category: faqForm.category,
          keywords: faqForm.keywords ? faqForm.keywords.split(',').map(k => k.trim()) : [],
        });
        toast.success('FAQ updated');
      } else {
        await createFAQ({
          question: faqForm.question,
          answer: faqForm.answer,
          category: faqForm.category,
          keywords: faqForm.keywords ? faqForm.keywords.split(',').map(k => k.trim()) : [],
        });
        toast.success('FAQ created');
      }
      setEditingFaq(null);
      setFaqModalOpen(false);
      setFaqForm({ question: '', answer: '', category: 'general', keywords: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to save FAQ');
    }
  };

  const handleConfirmDeleteFaq = async () => {
    if (!deleteFaqTarget) return;
    setDeleteFaqLoading(true);
    try {
      await deleteFAQ(deleteFaqTarget.id);
      toast.success('FAQ deleted');
      setDeleteFaqTarget(null);
      if (editingFaq?.id === deleteFaqTarget.id) {
        setEditingFaq(null);
        setFaqModalOpen(false);
      }
      loadData();
    } catch (error) {
      toast.error('Failed to delete FAQ');
    } finally {
      setDeleteFaqLoading(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedTicket || escalateLoading) return;
    const description = escalateNotes.trim() || selectedTicket.description?.trim();
    if (!description) {
      toast.error('Please add escalation notes');
      return;
    }
    setEscalateLoading(true);
    try {
      const updated = await escalateTicket(selectedTicket.id, {
        targetTeam: escalateTarget,
        description,
      });
      setSelectedTicket(updated);
      toast.success(`Escalated to ${escalateTarget === 'darkstore' ? 'Store' : 'Rider Ops'}`);
      setEscalateModalOpen(false);
      setEscalateNotes('');
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to escalate';
      toast.error(message);
    } finally {
      setEscalateLoading(false);
    }
  };

  const handleTriggerRefund = async () => {
    if (!selectedTicket || refundLoading) return;
    const amount = parseFloat(refundAmount);
    if (!refundAmount.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid refund amount');
      return;
    }
    const orderNumber = (refundOrderNumber.trim() || selectedTicket.orderNumber || '').trim();
    if (!orderNumber) {
      toast.error('Enter the customer order number for this refund');
      return;
    }
    setRefundLoading(true);
    try {
      const result = await triggerTicketRefund(selectedTicket.id, {
        amount,
        reasonText: refundReason.trim() || 'Triggered from support ticket',
        reasonCode: 'other',
        orderNumber,
      });
      setSelectedTicket(result.ticket);
      toast.success(`Refund request created (₹${result.refund.amount.toFixed(2)})`);
      setTriggerRefundOpen(false);
      setRefundAmount('');
      setRefundReason('');
      setRefundOrderNumber('');
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create refund';
      toast.error(message);
    } finally {
      setRefundLoading(false);
    }
  };

  const handleTriggerRedelivery = async () => {
    if (!selectedTicket || redeliveryLoading) return;
    const orderNumber = (redeliveryOrderNumber.trim() || selectedTicket.orderNumber || '').trim();
    if (!orderNumber) {
      toast.error('Enter the customer order number for re-delivery');
      return;
    }
    setRedeliveryLoading(true);
    try {
      const result = await triggerTicketRedelivery(selectedTicket.id, {
        notes: redeliveryNotes.trim() || undefined,
        orderNumber,
      });
      setSelectedTicket(result.ticket);
      toast.success(`Re-delivery dispatch created (${result.dispatch.orderId})`);
      setRedeliveryOpen(false);
      setRedeliveryNotes('');
      setRedeliveryOrderNumber('');
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create re-delivery';
      toast.error(message);
    } finally {
      setRedeliveryLoading(false);
    }
  };

  const needsOrderNumberInput = !selectedTicket?.orderNumber;

  const getSLATimeRemaining = (ticket: SupportTicket) => {
    const slaMinutes = slaMetrics?.firstResponseSLA || 30;
    const created = new Date(ticket.createdAt).getTime();
    const deadline = created + slaMinutes * 60 * 1000;
    const now = Date.now();
    const diff = deadline - now;
    if (diff <= 0) return { text: `${Math.abs(Math.floor(diff / 60000))}m overdue`, breached: true };
    const mins = Math.floor(diff / 60000);
    return { text: `${mins}m left`, breached: false };
  };

  const currentUser = getCurrentUser();
  const myAssignedTickets = currentUser ? tickets.filter(t => t.assignedTo === currentUser.id) : [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-rose-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-purple-500';
      case 'resolved': return 'bg-emerald-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.ticketNumber.toLowerCase().includes(query) ||
      ticket.subject.toLowerCase().includes(query) ||
      ticket.customerName.toLowerCase().includes(query) ||
      ticket.customerEmail.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-[#71717a]">Loading support center...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#18181b]">Support Center</h1>
          <p className="text-[#71717a] text-sm">Manage customer tickets and live chat support</p>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={async () => {
              await loadData();
              toast.success('Support center data refreshed');
            }} 
            variant="outline"
          >
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Open Tickets</p>
            <AlertCircle className="text-blue-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{tickets.filter(t => t.status === 'open').length}</p>
          <p className="text-xs text-[#71717a] mt-1">Awaiting response</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">In Progress</p>
            <Activity className="text-purple-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{tickets.filter(t => t.status === 'in_progress').length}</p>
          <p className="text-xs text-[#71717a] mt-1">Being handled</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Avg Response Time</p>
            <Clock className="text-amber-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{slaMetrics?.avgResponseTime}m</p>
          <p className="text-xs text-[#71717a] mt-1">Target: {slaMetrics?.firstResponseSLA}m</p>
        </div>
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">SLA Compliance</p>
            <Target className="text-emerald-600" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">
            {slaMetrics && slaMetrics.totalTickets > 0 ? Math.round((slaMetrics.withinSLA / slaMetrics.totalTickets) * 100) : 0}%
          </p>
          <p className="text-xs text-[#71717a] mt-1">{slaMetrics?.withinSLA} of {slaMetrics?.totalTickets}</p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={supportTab} onValueChange={setSupportTab} className="space-y-4 min-w-0">
        <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden whitespace-nowrap">
          <TabsTrigger value="all-tickets" className="shrink-0">
            <MessageSquare size={14} className="mr-1.5" /> All Tickets
          </TabsTrigger>
          <TabsTrigger value="my-tickets" className="shrink-0">
            <User size={14} className="mr-1.5" /> My Tickets
          </TabsTrigger>
          <TabsTrigger value="live-chats" className="shrink-0 relative">
            <MessageCircle size={14} className="mr-1.5" />
            Live Chats
            {liveChats.length > 0 && (
              <span className="ml-1.5 tabular-nums text-[#71717a]">({liveChats.length})</span>
            )}
            {liveChatWaitingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold animate-pulse">
                {liveChatWaitingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="faqs" className="shrink-0">
            <HelpCircle size={14} className="mr-1.5" /> FAQs
          </TabsTrigger>
          <TabsTrigger value="feedback" className="shrink-0">
            <ThumbsUp size={14} className="mr-1.5" /> Feedback
          </TabsTrigger>
          <TabsTrigger value="refund-tickets" className="shrink-0">
            <CreditCard size={14} className="mr-1.5" /> Refund Tickets
          </TabsTrigger>
        </TabsList>

        {/* All Tickets Tab - Inbox Layout (P1-37) */}
        <TabsContent value="all-tickets">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm h-[90vh] flex flex-col">
            {/* Filters */}
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" size={16} />
                  <Input placeholder="Search tickets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Inbox Layout: Left panel list + Right panel detail */}
            <div className="flex flex-1 min-h-0">
              {/* Left Panel: Ticket List */}
              <div className="w-[380px] border-r border-[#e4e4e7] overflow-y-auto flex-shrink-0">
                {filteredTickets.length === 0 ? (
                  <div className="p-8 text-center text-[#71717a]">No tickets found</div>
                ) : (
                  filteredTickets.map((ticket) => {
                    const sla = getSLATimeRemaining(ticket);
                    const isSelected = inboxSelectedTicketId === ticket.id;
                    return (
                      <div
                        key={ticket.id}
                        onClick={() => { setInboxSelectedTicketId(ticket.id); handleViewTicket(ticket); }}
                        className={`p-4 border-b border-[#e4e4e7] cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-[#f4f4f5]'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-bold text-[#e11d48]">{ticket.ticketNumber}</span>
                          <div className="flex items-center gap-1.5">
                            <Badge className={`${getPriorityColor(ticket.priority)} text-[10px] px-1.5 py-0`}>{ticket.priority}</Badge>
                            {/* SLA Timer (P1-41) */}
                            <span className={`text-[10px] font-mono flex items-center gap-0.5 px-1.5 py-0.5 rounded ${sla.breached ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              <Timer size={10} />
                              {sla.text}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-[#18181b] line-clamp-1">{ticket.subject}</p>
                        <p className="text-xs text-[#71717a] mt-0.5 line-clamp-1">{ticket.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-[#71717a]">{ticket.customerName}</span>
                          <Badge className={`${getStatusColor(ticket.status)} text-[10px] px-1.5 py-0 capitalize`}>{ticket.status.replace('_', ' ')}</Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Panel: Ticket Detail */}
              <div className="flex-1 overflow-y-auto">
                {selectedTicket && inboxSelectedTicketId ? (
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-[#18181b]">{selectedTicket.subject}</h3>
                        <p className="text-xs text-[#71717a]">{selectedTicket.ticketNumber} · {selectedTicket.customerName} · {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={`${getPriorityColor(selectedTicket.priority)} capitalize`}>{selectedTicket.priority}</Badge>
                        <Badge className={`${getStatusColor(selectedTicket.status)} capitalize`}>{selectedTicket.status.replace('_', ' ')}</Badge>
                      </div>
                    </div>

                    <div className="bg-[#f4f4f5] p-4 rounded-lg text-sm">{selectedTicket.description}</div>

                    {/* Customer info */}
                    <div className={`grid gap-3 text-sm ${selectedTicket.orderNumber ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                      <div><p className="text-[#71717a] text-xs">Customer</p><p className="font-medium">{selectedTicket.customerName}</p></div>
                      <div><p className="text-[#71717a] text-xs">Email</p><p className="font-medium">{selectedTicket.customerEmail}</p></div>
                      <div><p className="text-[#71717a] text-xs">Phone</p><p className="font-medium">{selectedTicket.customerPhone || '—'}</p></div>
                      {selectedTicket.orderNumber ? (
                        <div><p className="text-[#71717a] text-xs">Order</p><p className="font-medium">{selectedTicket.orderNumber}</p></div>
                      ) : null}
                    </div>

                    {/* Action Buttons (P1-44 to P1-47) */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={escalateLoading}
                        onClick={() => {
                          setEscalateTarget('darkstore');
                          setEscalateNotes('');
                          setEscalateModalOpen(true);
                        }}
                      >
                        <ArrowUpRight size={14} className="mr-1" /> Escalate to Store
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={escalateLoading}
                        onClick={() => {
                          setEscalateTarget('rider_ops');
                          setEscalateNotes('');
                          setEscalateModalOpen(true);
                        }}
                      >
                        <Truck size={14} className="mr-1" /> Escalate to Rider Ops
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-600 border-emerald-200"
                        disabled={refundLoading}
                        onClick={() => {
                          setRefundOrderNumber(selectedTicket.orderNumber || '');
                          setTriggerRefundOpen(true);
                        }}
                      >
                        <RotateCcw size={14} className="mr-1" /> Trigger Refund
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-200"
                        disabled={redeliveryLoading}
                        onClick={() => {
                          setRedeliveryOrderNumber(selectedTicket.orderNumber || '');
                          setRedeliveryOpen(true);
                        }}
                      >
                        <Truck size={14} className="mr-1" /> Trigger Re-delivery
                      </Button>
                    </div>

                    {/* Assign */}
                    <div className="flex items-center gap-3">
                      <Label className="text-xs">Assign:</Label>
                      <Select value={selectedTicket.assignedTo || ''} onValueChange={(val) => handleAssignTicket(selectedTicket.id, val)}>
                        <SelectTrigger className="w-48 h-8"><SelectValue placeholder="Select agent" /></SelectTrigger>
                        <SelectContent>{agents.filter(a => a.isOnline).map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-[#18181b]">Timeline</h4>
                      {(selectedTicket.notes || []).map((note) => (
                        <div key={note.id} className={`p-3 rounded-lg text-sm ${note.isInternal ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{note.authorName}</span>
                            <span className="text-xs text-[#71717a]">{new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                          <p>{note.content}</p>
                        </div>
                      ))}
                    </div>

                    {/* Reply */}
                    <div className="flex gap-2">
                      <textarea className="flex-1 min-h-16 p-3 border border-[#e4e4e7] rounded-lg text-sm resize-none" placeholder="Type your response..." value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                      <div className="flex flex-col gap-2">
                        <Button size="sm" onClick={handleSendReply} disabled={replySending}>
                          <Send size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCloseTicket(selectedTicket.id)}
                          disabled={closeTicketLoading || replySending}
                          title="Close ticket"
                        >
                          <CheckCircle size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-[#a1a1aa]">
                    <div className="text-center">
                      <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
                      <p>Select a ticket to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* My Tickets Tab */}
        <TabsContent value="my-tickets">
          <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm h-[90vh] overflow-y-auto">
            <div className="text-center py-12 min-h-full">
              <User className="mx-auto mb-4 text-[#a1a1aa]" size={48} />
              <h3 className="font-bold text-[#18181b] mb-2">My Assigned Tickets</h3>
              <p className="text-[#71717a] mb-4">
                You have {myAssignedTickets.length} tickets assigned to you
              </p>
              <div className="space-y-2 max-w-2xl mx-auto">
                {myAssignedTickets.length === 0 ? (
                  <p className="text-[#71717a] py-4">No tickets assigned to you</p>
                ) : (
                myAssignedTickets.map(ticket => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 border border-[#e4e4e7] rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#e11d48]">{ticket.ticketNumber}</span>
                      <span className="text-sm">{ticket.subject}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleViewTicket(ticket)}>
                      View
                    </Button>
                  </div>
                ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Live Chats Tab */}
        <TabsContent value="live-chats" className="w-full min-w-0 mt-0">
          <AdminLiveChatPanel chats={liveChats} onChatsChange={setLiveChats} />
        </TabsContent>

        {/* FAQs Tab */}
        <TabsContent value="faqs">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm h-[90vh] flex flex-col">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">FAQ Management</h3>
                <p className="text-xs text-[#71717a] mt-1">{faqs.length} FAQs</p>
              </div>
              <Button size="sm" onClick={() => { setEditingFaq(null); setFaqForm({ question: '', answer: '', category: 'general', keywords: '' }); setFaqModalOpen(true); }}>
                <Plus size={14} className="mr-1.5" /> Add FAQ
              </Button>
            </div>
            <div className="p-6 space-y-3 flex-1 min-h-0 overflow-y-auto">
              {faqs.length === 0 ? (
                <div className="text-center py-12 text-[#71717a]">
                  <HelpCircle className="mx-auto mb-3" size={48} />
                  <p>No FAQs yet. Add one to get started.</p>
                </div>
              ) : (
                faqs.map((faq) => (
                  <div key={faq.id} className="border border-[#e4e4e7] rounded-lg p-4">
                    <h4 className="font-bold text-[#18181b]">{faq.question}</h4>
                    <p className="text-sm text-[#71717a] mt-1">{faq.answer}</p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => { setEditingFaq(faq); setFaqForm({ question: faq.question, answer: faq.answer, category: faq.category, keywords: faq.keywords?.join(', ') || '' }); setFaqModalOpen(true); }}>
                        <Edit size={12} className="mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600"
                        onClick={() => setDeleteFaqTarget(faq)}
                      >
                        <Trash2 size={12} className="mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm h-[90vh] flex flex-col">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Feedback Review</h3>
              <p className="text-xs text-[#71717a] mt-1">{feedback.length} feedback items</p>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Product/Category</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedback.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-[#71717a] py-8">No feedback yet</TableCell>
                    </TableRow>
                  ) : (
                    feedback.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.customerName || '—'}</TableCell>
                        <TableCell>
                          <Badge className={f.sentiment === 'positive' ? 'bg-emerald-500' : f.sentiment === 'negative' ? 'bg-rose-500' : 'bg-gray-500'}>
                            {f.sentiment}
                          </Badge>
                        </TableCell>
                        <TableCell>{f.productOrCategory || '—'}</TableCell>
                        <TableCell className="max-w-xs truncate">{f.content || '—'}</TableCell>
                        <TableCell>{f.rating != null ? `${f.rating}★` : '—'}</TableCell>
                        <TableCell className="text-xs text-[#71717a]">{f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
        {/* Refund Tickets Tab (P1-28/P1-29) */}
        <TabsContent value="refund-tickets">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm h-[90vh] flex flex-col">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Refund-Related Tickets</h3>
              <p className="text-xs text-[#71717a] mt-1">Tickets involving payment or refund issues</p>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const refundTickets = tickets.filter(t => t.category === 'payment' || t.subject.toLowerCase().includes('refund') || t.subject.toLowerCase().includes('payment'));
                    return refundTickets.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-[#71717a] py-8">No refund tickets found</TableCell></TableRow>
                    ) : (
                      refundTickets.map(ticket => (
                        <TableRow key={ticket.id} className="cursor-pointer hover:bg-[#f4f4f5]" onClick={() => handleViewTicket(ticket)}>
                          <TableCell className="font-mono font-bold text-[#e11d48]">{ticket.ticketNumber}</TableCell>
                          <TableCell><p className="font-medium">{ticket.customerName}</p></TableCell>
                          <TableCell className="font-mono text-sm">{ticket.orderNumber || '—'}</TableCell>
                          <TableCell className="text-sm">{ticket.subject}</TableCell>
                          <TableCell><Badge className={`${getStatusColor(ticket.status)} capitalize`}>{ticket.status.replace('_', ' ')}</Badge></TableCell>
                          <TableCell><Badge className={`${getPriorityColor(ticket.priority)} capitalize`}>{ticket.priority}</Badge></TableCell>
                          <TableCell className="text-xs text-[#71717a]">{new Date(ticket.createdAt).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    );
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AdminModal
        open={escalateModalOpen}
        onOpenChange={setEscalateModalOpen}
        title={`Escalate to ${escalateTarget === 'darkstore' ? 'Store' : 'Rider Ops'}`}
        subtitle={`Create an escalation for ticket ${selectedTicket?.ticketNumber}`}
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEscalateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEscalate} disabled={escalateLoading}>
              {escalateLoading ? 'Escalating...' : 'Escalate'}
            </Button>
          </>
        }
      >
        <AdminFormBody>
          <AdminField label="Notes">
            <Textarea
              value={escalateNotes}
              onChange={e => setEscalateNotes(e.target.value)}
              placeholder="Describe the issue..."
              rows={4}
            />
          </AdminField>
        </AdminFormBody>
      </AdminModal>

      <AdminModal
        open={triggerRefundOpen}
        onOpenChange={setTriggerRefundOpen}
        title="Trigger Refund"
        subtitle={`Create a refund request for ticket ${selectedTicket?.ticketNumber}`}
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setTriggerRefundOpen(false)}>Cancel</Button>
            <Button
              onClick={handleTriggerRefund}
              disabled={
                refundLoading ||
                !refundAmount.trim() ||
                !(refundOrderNumber.trim() || selectedTicket?.orderNumber)
              }
            >
              {refundLoading ? 'Creating...' : 'Create Refund'}
            </Button>
          </>
        }
      >
        <AdminFormBody>
          <AdminFormGrid>
            <AdminField label="Order Number">
              <Input
                value={refundOrderNumber}
                onChange={e => setRefundOrderNumber(e.target.value)}
                placeholder="e.g. ORD-12345"
                disabled={Boolean(selectedTicket?.orderNumber)}
              />
            </AdminField>
            <AdminField label="Amount (₹)">
              <Input type="number" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="0.00" />
            </AdminField>
            <AdminField label="Reason" className="md:col-span-2">
              <Input value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Reason for refund" />
            </AdminField>
          </AdminFormGrid>
          {needsOrderNumberInput && (
            <p className="text-xs text-[#71717a]">Picker tickets need the related customer order number for refunds.</p>
          )}
        </AdminFormBody>
      </AdminModal>

      <AdminModal
        open={redeliveryOpen}
        onOpenChange={setRedeliveryOpen}
        title="Trigger Re-delivery"
        subtitle={`Create a re-delivery dispatch for ticket ${selectedTicket?.ticketNumber}`}
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setRedeliveryOpen(false)}>Cancel</Button>
            <Button
              onClick={handleTriggerRedelivery}
              disabled={
                redeliveryLoading ||
                !(redeliveryOrderNumber.trim() || selectedTicket?.orderNumber)
              }
            >
              {redeliveryLoading ? 'Creating...' : 'Dispatch Re-delivery'}
            </Button>
          </>
        }
      >
        <AdminFormBody>
          <AdminField label="Order Number">
            <Input
              value={redeliveryOrderNumber}
              onChange={e => setRedeliveryOrderNumber(e.target.value)}
              placeholder="e.g. ORD-12345"
              disabled={Boolean(selectedTicket?.orderNumber)}
            />
          </AdminField>
          <AdminField label="Delivery Notes">
            <Textarea
              value={redeliveryNotes}
              onChange={e => setRedeliveryNotes(e.target.value)}
              placeholder="Special instructions..."
              rows={4}
            />
          </AdminField>
          {needsOrderNumberInput && (
            <p className="text-xs text-[#71717a]">Picker tickets need the related customer order number for re-delivery.</p>
          )}
        </AdminFormBody>
      </AdminModal>

      <AdminModal
        open={createTicketOpen}
        onOpenChange={setCreateTicketOpen}
        title="Create Ticket"
        subtitle="Create a new support ticket on behalf of a customer."
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateTicketOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTicket} disabled={createTicketLoading}>
              {createTicketLoading ? 'Creating...' : 'Create Ticket'}
            </Button>
          </>
        }
      >
        <AdminFormBody>
          <AdminField label="Subject *">
            <Input value={createTicketForm.subject} onChange={(e) => setCreateTicketForm(f => ({ ...f, subject: e.target.value }))} placeholder="Ticket subject" />
          </AdminField>
          <AdminField label="Description">
            <Textarea value={createTicketForm.description} onChange={(e) => setCreateTicketForm(f => ({ ...f, description: e.target.value }))} placeholder="Issue description" rows={4} />
          </AdminField>
          <AdminFormGrid>
            <AdminField label="Customer Name *">
              <Input value={createTicketForm.customerName} onChange={(e) => setCreateTicketForm(f => ({ ...f, customerName: e.target.value }))} placeholder="Customer name" />
            </AdminField>
            <AdminField label="Customer Email *">
              <Input type="email" value={createTicketForm.customerEmail} onChange={(e) => setCreateTicketForm(f => ({ ...f, customerEmail: e.target.value }))} placeholder="customer@email.com" />
            </AdminField>
            <AdminField label="Customer Phone">
              <Input value={createTicketForm.customerPhone} onChange={(e) => setCreateTicketForm(f => ({ ...f, customerPhone: e.target.value }))} placeholder="+91-98765-43210" />
            </AdminField>
            <AdminField label="Order Number">
              <Input value={createTicketForm.orderNumber} onChange={(e) => setCreateTicketForm(f => ({ ...f, orderNumber: e.target.value }))} placeholder="ORD-12345" />
            </AdminField>
            <AdminField label="Category">
              <Select value={createTicketForm.category} onValueChange={(v) => setCreateTicketForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">Order</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                </SelectContent>
              </Select>
            </AdminField>
            <AdminField label="Priority">
              <Select value={createTicketForm.priority} onValueChange={(v) => setCreateTicketForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </AdminField>
          </AdminFormGrid>
        </AdminFormBody>
      </AdminModal>

      <AdminModal
        open={faqModalOpen}
        onOpenChange={(open) => { setFaqModalOpen(open); if (!open) setEditingFaq(null); }}
        title={editingFaq ? 'Edit FAQ' : 'Add FAQ'}
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setFaqModalOpen(false); setEditingFaq(null); }}>Cancel</Button>
            <Button onClick={handleSaveFaq}>Save FAQ</Button>
          </>
        }
      >
        <AdminFormBody>
          <AdminField label="Question *">
            <Input value={faqForm.question} onChange={(e) => setFaqForm(f => ({ ...f, question: e.target.value }))} placeholder="Question" />
          </AdminField>
          <AdminField label="Answer *">
            <Textarea value={faqForm.answer} onChange={(e) => setFaqForm(f => ({ ...f, answer: e.target.value }))} placeholder="Answer" rows={4} />
          </AdminField>
          <AdminFormGrid>
            <AdminField label="Category">
              <Input value={faqForm.category} onChange={(e) => setFaqForm(f => ({ ...f, category: e.target.value }))} placeholder="general" />
            </AdminField>
            <AdminField label="Keywords (comma separated)">
              <Input value={faqForm.keywords} onChange={(e) => setFaqForm(f => ({ ...f, keywords: e.target.value }))} placeholder="track, delivery" />
            </AdminField>
          </AdminFormGrid>
        </AdminFormBody>
      </AdminModal>

      <AdminModal
        open={viewTicketOpen}
        onOpenChange={setViewTicketOpen}
        title={`Ticket Details - ${selectedTicket?.ticketNumber}`}
        subtitle={selectedTicket ? `Created on ${new Date(selectedTicket.createdAt).toLocaleString()}` : undefined}
        maxWidth="max-w-3xl"
        footer={
          selectedTicket ? (
            <div className="flex w-full justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => handleCloseTicket(selectedTicket.id)}
                disabled={
                  replySending ||
                  closeTicketLoading ||
                  selectedTicket.status === 'closed' ||
                  (selectedTicket.id.startsWith('picker-support-') && selectedTicket.status === 'resolved')
                }
              >
                <CheckCircle size={14} className="mr-1.5" />
                {closeTicketLoading ? 'Closing…' : 'Close Ticket'}
              </Button>
              <Button
                onClick={handleSendReply}
                disabled={replySending || closeTicketLoading || !replyText.trim()}
              >
                <Send size={14} className="mr-1.5" />
                {replySending ? 'Sending…' : 'Send Reply'}
              </Button>
            </div>
          ) : undefined
        }
      >
        {selectedTicket && (
          <AdminFormBody>
            <div className="flex justify-end -mt-2 mb-2">
              <Badge className={getPriorityColor(selectedTicket.priority)}>
                {selectedTicket.priority}
              </Badge>
            </div>
            <div className="p-4 bg-[#f4f4f5] rounded-lg">
              <h4 className="font-bold text-[#18181b] mb-2">Customer Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[#71717a]">Name</p>
                  <p className="font-medium">{selectedTicket.customerName}</p>
                </div>
                <div>
                  <p className="text-[#71717a]">Email</p>
                  <p className="font-medium">{selectedTicket.customerEmail}</p>
                </div>
                <div>
                  <p className="text-[#71717a]">Phone</p>
                  <p className="font-medium">{selectedTicket.customerPhone}</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-[#18181b] mb-2">Subject</h4>
              <p className="text-[#18181b]">{selectedTicket.subject}</p>
            </div>
            <div>
              <h4 className="font-bold text-[#18181b] mb-2">Description</h4>
              <p className="text-[#71717a]">{selectedTicket.description}</p>
            </div>
            <AdminFormGrid>
              <AdminField label="Assign to Agent">
                <Select
                  value={selectedTicket.assignedTo || ''}
                  onValueChange={(val) => handleAssignTicket(selectedTicket.id, val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.filter(a => a.isOnline).map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} ({agent.activeTickets}/{agent.maxTicketCapacity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </AdminField>
              <AdminField label="Status">
                <Select
                  value={selectedTicket.status}
                  onValueChange={(val) => handleStatusChange(selectedTicket.id, val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </AdminField>
            </AdminFormGrid>
            <div>
              <h4 className="font-bold text-[#18181b] mb-3">Timeline</h4>
              <div className="space-y-3">
                {(selectedTicket.notes || []).map((note) => (
                  <div key={note.id} className={`p-3 rounded-lg ${note.isInternal ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{note.authorName}</span>
                      <span className="text-xs text-[#71717a]">{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-[#18181b]">{note.content}</p>
                    {note.isInternal && <Badge variant="outline" className="mt-1 text-xs">Internal Note</Badge>}
                  </div>
                ))}
              </div>
            </div>
            <AdminField label="Send Reply">
              <Textarea
                placeholder="Type your response..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
              />
            </AdminField>
          </AdminFormBody>
        )}
      </AdminModal>

      <AdminConfirmDialog
        open={Boolean(deleteFaqTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteFaqLoading) setDeleteFaqTarget(null);
        }}
        title="Delete FAQ?"
        description={
          deleteFaqTarget ? (
            <>
              Are you sure you want to delete{' '}
              <strong className="text-[#18181b]">{deleteFaqTarget.question}</strong>? This cannot be
              undone.
            </>
          ) : null
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteFaqLoading}
        onConfirm={handleConfirmDeleteFaq}
      />
    </div>
  );
}

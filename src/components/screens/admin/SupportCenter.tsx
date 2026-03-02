import React, { useState, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  fetchAgents,
  fetchCannedResponses,
  fetchCategories,
  fetchSLAMetrics,
  fetchLiveChats,
  updateTicket,
  assignTicket,
  addTicketNote,
  closeTicket,
  createTicket,
  fetchFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  fetchFeedback,
  SupportTicket,
  Agent,
  CannedResponse,
  TicketCategory,
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
  UserPlus,
  MessageCircle,
  Award,
  Zap,
  Activity,
  Target,
  Users,
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
import { apiRequest } from '@/api/apiClient';
import { getCurrentUser } from '@/api/authApi';

export function SupportCenter() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
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

  // Modals
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [viewTicketOpen, setViewTicketOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [createTicketForm, setCreateTicketForm] = useState({ subject: '', description: '', customerName: '', customerEmail: '', customerPhone: '', category: 'order', priority: 'medium', orderNumber: '' });
  const [createTicketLoading, setCreateTicketLoading] = useState(false);
  const [editingFaq, setEditingFaq] = useState<SupportFAQ | null>(null);
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: 'general', keywords: '' });

  // Escalation & Refund modals (P1-44 to P1-47)
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateTarget, setEscalateTarget] = useState<'darkstore' | 'rider_ops'>('darkstore');
  const [escalateNotes, setEscalateNotes] = useState('');
  const [escalateLoading, setEscalateLoading] = useState(false);
  const [triggerRefundOpen, setTriggerRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [redeliveryOpen, setRedeliveryOpen] = useState(false);
  const [redeliveryNotes, setRedeliveryNotes] = useState('');
  const [redeliveryLoading, setRedeliveryLoading] = useState(false);

  // Inbox selection state (P1-37)
  const [inboxSelectedTicketId, setInboxSelectedTicketId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, categoryFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (priorityFilter !== 'all') filters.priority = priorityFilter;
      if (categoryFilter !== 'all') filters.category = categoryFilter;

      const [ticketsData, agentsData, cannedData, categoriesData, slaData, chatsData, faqsData, feedbackData] = await Promise.all([
        fetchTickets(filters),
        fetchAgents(),
        fetchCannedResponses(),
        fetchCategories(),
        fetchSLAMetrics(),
        fetchLiveChats(),
        fetchFAQs(),
        fetchFeedback(),
      ]);

      setTickets(ticketsData);
      setAgents(agentsData);
      setCannedResponses(cannedData);
      setCategories(categoriesData);
      setSlaMetrics(slaData);
      setLiveChats(chatsData);
      setFaqs(faqsData);
      setFeedback(feedbackData);
    } catch (error) {
      toast.error('Failed to load support data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setViewTicketOpen(true);
  };

  const handleAssignTicket = async (ticketId: string, agentId: string) => {
    try {
      await assignTicket(ticketId, agentId);
      toast.success('Ticket assigned successfully');
      loadData();
      if (selectedTicket?.id === ticketId) {
        setViewTicketOpen(false);
        setSelectedTicket(null);
      }
    } catch (error) {
      toast.error('Failed to assign ticket');
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;

    try {
      const user = getCurrentUser();
      await addTicketNote(selectedTicket.id, {
        ticketId: selectedTicket.id,
        authorId: user?.id || 'agent-1',
        authorName: user?.name || 'Current Agent',
        type: 'agent_reply',
        content: replyText,
        isInternal: false,
      });

      await updateTicket(selectedTicket.id, { status: 'in_progress' });

      toast.success('Reply sent successfully');
      setReplyText('');
      loadData();
      setViewTicketOpen(false);
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    try {
      await closeTicket(ticketId);
      toast.success('Ticket closed successfully');
      loadData();
      setViewTicketOpen(false);
    } catch (error) {
      toast.error('Failed to close ticket');
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

  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Delete this FAQ?')) return;
    try {
      await deleteFAQ(id);
      toast.success('FAQ deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete FAQ');
    }
  };

  const handleEscalate = async () => {
    if (!selectedTicket) return;
    setEscalateLoading(true);
    try {
      await apiRequest('/shared/escalations', {
        method: 'POST',
        body: JSON.stringify({
          orderId: selectedTicket.orderNumber,
          ticketId: selectedTicket.id,
          targetTeam: escalateTarget,
          issueType: selectedTicket.category,
          description: escalateNotes || selectedTicket.description,
          customerName: selectedTicket.customerName,
          customerPhone: selectedTicket.customerPhone,
        }),
      });
      toast.success(`Escalated to ${escalateTarget === 'darkstore' ? 'Store' : 'Rider Ops'}`);
      setEscalateModalOpen(false);
      setEscalateNotes('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to escalate');
    } finally {
      setEscalateLoading(false);
    }
  };

  const handleTriggerRefund = async () => {
    if (!selectedTicket || !refundAmount) return;
    setRefundLoading(true);
    try {
      await apiRequest('/finance/refunds', {
        method: 'POST',
        body: JSON.stringify({
          orderId: selectedTicket.orderNumber,
          customerId: selectedTicket.customerId,
          customerName: selectedTicket.customerName,
          customerEmail: selectedTicket.customerEmail,
          amount: parseFloat(refundAmount),
          reasonCode: 'other',
          reasonText: refundReason || 'Triggered from support ticket',
          channel: 'customer_support',
          ticketId: selectedTicket.id,
        }),
      });
      toast.success('Refund request created');
      setTriggerRefundOpen(false);
      setRefundAmount('');
      setRefundReason('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create refund');
    } finally {
      setRefundLoading(false);
    }
  };

  const handleTriggerRedelivery = async () => {
    if (!selectedTicket) return;
    setRedeliveryLoading(true);
    try {
      await apiRequest('/rider/dispatch/manual-order', {
        method: 'POST',
        body: JSON.stringify({
          orderId: selectedTicket.orderNumber,
          customerName: selectedTicket.customerName,
          notes: redeliveryNotes || 'Re-delivery from support ticket',
          isRedelivery: true,
          ticketId: selectedTicket.id,
        }),
      });
      toast.success('Re-delivery dispatch created');
      setRedeliveryOpen(false);
      setRedeliveryNotes('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create re-delivery');
    } finally {
      setRedeliveryLoading(false);
    }
  };

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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'order': return '🛒';
      case 'payment': return '💳';
      case 'delivery': return '🚚';
      case 'account': return '👤';
      case 'technical': return '⚙️';
      case 'feedback': return '💬';
      default: return '📝';
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
          <Button size="sm" variant="default" onClick={() => setCreateTicketOpen(true)}>
            <Plus size={14} className="mr-1.5" /> Create Ticket
          </Button>
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
      <div className="grid grid-cols-5 gap-4">
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
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#71717a]">Active Agents</p>
            <Users className="text-[#e11d48]" size={16} />
          </div>
          <p className="text-2xl font-bold text-[#18181b]">{agents.filter(a => a.isOnline).length}</p>
          <p className="text-xs text-[#71717a] mt-1">of {agents.length} total</p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="all-tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-tickets">
            <MessageSquare size={14} className="mr-1.5" /> All Tickets
          </TabsTrigger>
          <TabsTrigger value="my-tickets">
            <User size={14} className="mr-1.5" /> My Tickets
          </TabsTrigger>
          <TabsTrigger value="live-chats">
            <MessageCircle size={14} className="mr-1.5" /> Live Chats ({liveChats.length})
          </TabsTrigger>
          <TabsTrigger value="canned">
            <Zap size={14} className="mr-1.5" /> Canned Responses
          </TabsTrigger>
          <TabsTrigger value="team">
            <Award size={14} className="mr-1.5" /> Team Performance
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Filter size={14} className="mr-1.5" /> Categories
          </TabsTrigger>
          <TabsTrigger value="faqs">
            <HelpCircle size={14} className="mr-1.5" /> FAQs
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <ThumbsUp size={14} className="mr-1.5" /> Feedback
          </TabsTrigger>
          <TabsTrigger value="refund-tickets">
            <CreditCard size={14} className="mr-1.5" /> Refund Tickets
          </TabsTrigger>
        </TabsList>

        {/* All Tickets Tab - Inbox Layout (P1-37) */}
        <TabsContent value="all-tickets">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
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
            <div className="flex" style={{ height: '600px' }}>
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
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div><p className="text-[#71717a] text-xs">Customer</p><p className="font-medium">{selectedTicket.customerName}</p></div>
                      <div><p className="text-[#71717a] text-xs">Email</p><p className="font-medium">{selectedTicket.customerEmail}</p></div>
                      <div><p className="text-[#71717a] text-xs">Phone</p><p className="font-medium">{selectedTicket.customerPhone}</p></div>
                    </div>

                    {/* Action Buttons (P1-44 to P1-47) */}
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => { setEscalateTarget('darkstore'); setEscalateModalOpen(true); }}>
                        <ArrowUpRight size={14} className="mr-1" /> Escalate to Store
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEscalateTarget('rider_ops'); setEscalateModalOpen(true); }}>
                        <Truck size={14} className="mr-1" /> Escalate to Rider Ops
                      </Button>
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200" onClick={() => setTriggerRefundOpen(true)}>
                        <RotateCcw size={14} className="mr-1" /> Trigger Refund
                      </Button>
                      <Button size="sm" variant="outline" className="text-blue-600 border-blue-200" onClick={() => setRedeliveryOpen(true)}>
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
                        <Button size="sm" onClick={handleSendReply}><Send size={14} /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleCloseTicket(selectedTicket.id)}><CheckCircle size={14} /></Button>
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
          <div className="bg-white border border-[#e4e4e7] rounded-xl p-6 shadow-sm">
            <div className="text-center py-12">
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
        <TabsContent value="live-chats">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Active Chat Sessions</h3>
              <p className="text-xs text-[#71717a] mt-1">{liveChats.length} active conversations</p>
            </div>

            <div className="p-6 space-y-3">
              {liveChats.length === 0 ? (
                <div className="text-center py-12 text-[#71717a]">
                  <MessageCircle className="mx-auto mb-3" size={48} />
                  <p>No active chats</p>
                </div>
              ) : (
                liveChats.map((chat) => (
                  <div key={chat.id} className="border border-[#e4e4e7] rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-[#18181b]">{chat.customerName}</h4>
                        <p className="text-xs text-[#71717a]">
                          {chat.status === 'waiting' ? (
                            <span className="text-amber-600">Waiting for {chat.waitTime}s</span>
                          ) : (
                            <span className="text-emerald-600">Handled by {chat.agentName}</span>
                          )}
                        </p>
                      </div>
                      <Badge className={chat.status === 'waiting' ? 'bg-amber-500' : 'bg-emerald-500'}>
                        {chat.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                      {chat.messages.map((msg) => (
                        <div key={msg.id} className={`p-2 rounded ${msg.senderType === 'customer' ? 'bg-[#f4f4f5]' : 'bg-blue-50'}`}>
                          <p className="text-xs font-medium text-[#52525b]">{msg.senderName}</p>
                          <p className="text-sm text-[#18181b]">{msg.message}</p>
                        </div>
                      ))}
                    </div>

                    {chat.status === 'waiting' && (
                      <Button size="sm" className="w-full">
                        <UserPlus size={14} className="mr-1.5" /> Accept Chat
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* Canned Responses Tab */}
        <TabsContent value="canned">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Quick Reply Templates</h3>
              <p className="text-xs text-[#71717a] mt-1">{cannedResponses.length} templates available</p>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              {cannedResponses.map((response) => (
                <div key={response.id} className="border border-[#e4e4e7] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-[#18181b]">{response.title}</h4>
                    <Badge variant="outline" className="text-xs">{response.category}</Badge>
                  </div>
                  <p className="text-sm text-[#71717a] mb-3 line-clamp-3">{response.content}</p>
                  <div className="flex items-center justify-between text-xs text-[#a1a1aa]">
                    <span>Used {response.usageCount} times</span>
                    <Button size="sm" variant="ghost">
                      <Send size={12} className="mr-1" /> Use
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Team Performance Tab */}
        <TabsContent value="team">
          {/* Analytics Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#71717a] text-sm mb-1">
                <Timer size={16} />
                Avg Resolution Time
              </div>
              <p className="text-2xl font-bold text-[#18181b]">
                {agents.length > 0
                  ? `${Math.round(agents.reduce((s, a) => s + a.avgResolutionTime, 0) / agents.length)}m`
                  : '—'}
              </p>
              <p className="text-xs text-[#71717a] mt-1">Across all agents</p>
            </div>
            <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#71717a] text-sm mb-1">
                <Activity size={16} />
                Tickets by Category
              </div>
              <div className="space-y-1 mt-1">
                {categories.slice(0, 3).map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between text-xs">
                    <span className="text-[#52525b] truncate">{cat.name}</span>
                    <span className="font-bold text-[#18181b]">{cat.ticketCount}</span>
                  </div>
                ))}
                {categories.length === 0 && <p className="text-xs text-[#a1a1aa]">No data</p>}
              </div>
            </div>
            <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#71717a] text-sm mb-1">
                <AlertCircle size={16} />
                SLA Breach Rate
              </div>
              <p className="text-2xl font-bold text-[#18181b]">
                {slaMetrics
                  ? `${((slaMetrics.breachedCount / Math.max(1, slaMetrics.totalTickets)) * 100).toFixed(1)}%`
                  : '—'}
              </p>
              <p className="text-xs text-[#71717a] mt-1">
                {slaMetrics ? `${slaMetrics.breachedCount} of ${slaMetrics.totalTickets} tickets` : 'No SLA data'}
              </p>
            </div>
            <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-[#71717a] text-sm mb-1">
                <Award size={16} />
                Avg Satisfaction
              </div>
              <p className="text-2xl font-bold text-[#18181b]">
                {agents.length > 0
                  ? (agents.reduce((s, a) => s + a.satisfactionScore, 0) / agents.length).toFixed(1)
                  : '—'}
              </p>
              <p className="text-xs text-amber-500 mt-1">
                {agents.length > 0 ? '★'.repeat(Math.round(agents.reduce((s, a) => s + a.satisfactionScore, 0) / agents.length)) : ''}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Team Leaderboard</h3>
              <p className="text-xs text-[#71717a] mt-1">Agent performance metrics</p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active Tickets</TableHead>
                    <TableHead>Total Resolved</TableHead>
                    <TableHead>Avg Resolution Time</TableHead>
                    <TableHead>Satisfaction Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent, index) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#e11d48] text-white flex items-center justify-center font-bold text-xs">
                            {agent.avatar}
                          </div>
                          <div>
                            <p className="font-medium text-[#18181b]">{agent.name}</p>
                            <p className="text-xs text-[#71717a]">{agent.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {agent.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${agent.isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          <span className="text-sm">{agent.isOnline ? 'Online' : 'Offline'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-[#18181b]">{agent.activeTickets}</span>
                        <span className="text-xs text-[#71717a]"> / {agent.maxTicketCapacity}</span>
                      </TableCell>
                      <TableCell className="font-bold text-emerald-600">{agent.totalResolved}</TableCell>
                      <TableCell className="font-mono">{agent.avgResolutionTime}m</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#18181b]">{agent.satisfactionScore}</span>
                          <span className="text-amber-500">★</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Ticket Categories</h3>
              <p className="text-xs text-[#71717a] mt-1">Performance by category</p>
            </div>

            <div className="p-6 grid grid-cols-3 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="border border-[#e4e4e7] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-[#f4f4f5] rounded-lg flex items-center justify-center text-2xl">
                      {getCategoryIcon(category.name.toLowerCase().split(' ')[0])}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#18181b]">{category.name}</h4>
                      <p className="text-xs text-[#71717a]">{category.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-[#71717a]">Total Tickets</p>
                      <p className="text-xl font-bold text-[#18181b]">{category.ticketCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#71717a]">Avg Resolution</p>
                      <p className="text-xl font-bold text-[#18181b]">{category.avgResolutionTime}m</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#e4e4e7]">
                    <p className="text-xs text-[#71717a]">SLA Target: {category.slaTarget} minutes</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* FAQs Tab */}
        <TabsContent value="faqs">
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-[#18181b]">FAQ Management</h3>
                <p className="text-xs text-[#71717a] mt-1">{faqs.length} FAQs</p>
              </div>
              <Button size="sm" onClick={() => { setEditingFaq(null); setFaqForm({ question: '', answer: '', category: 'general', keywords: '' }); setFaqModalOpen(true); }}>
                <Plus size={14} className="mr-1.5" /> Add FAQ
              </Button>
            </div>
            <div className="p-6 space-y-3">
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
                      <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => handleDeleteFaq(faq.id)}>
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
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Feedback Review</h3>
              <p className="text-xs text-[#71717a] mt-1">{feedback.length} feedback items</p>
            </div>
            <div className="overflow-x-auto">
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
          <div className="bg-white border border-[#e4e4e7] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc]">
              <h3 className="font-bold text-[#18181b]">Refund-Related Tickets</h3>
              <p className="text-xs text-[#71717a] mt-1">Tickets involving payment or refund issues</p>
            </div>
            <div className="overflow-x-auto">
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

      {/* Escalation Modal (P1-44/P1-45) */}
      <Dialog open={escalateModalOpen} onOpenChange={setEscalateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escalate to {escalateTarget === 'darkstore' ? 'Store' : 'Rider Ops'}</DialogTitle>
            <DialogDescription>Create an escalation for ticket {selectedTicket?.ticketNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Notes</Label><textarea className="w-full min-h-20 p-3 border border-[#e4e4e7] rounded-lg text-sm resize-none" value={escalateNotes} onChange={e => setEscalateNotes(e.target.value)} placeholder="Describe the issue..." /></div>
            <div className="flex gap-2"><Button variant="outline" onClick={() => setEscalateModalOpen(false)}>Cancel</Button><Button onClick={handleEscalate} disabled={escalateLoading}>{escalateLoading ? 'Escalating...' : 'Escalate'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trigger Refund Modal (P1-46) */}
      <Dialog open={triggerRefundOpen} onOpenChange={setTriggerRefundOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Trigger Refund</DialogTitle><DialogDescription>Create a refund request for ticket {selectedTicket?.ticketNumber}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Amount (₹)</Label><Input type="number" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="0.00" /></div>
            <div><Label>Reason</Label><Input value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Reason for refund" /></div>
            <div className="flex gap-2"><Button variant="outline" onClick={() => setTriggerRefundOpen(false)}>Cancel</Button><Button onClick={handleTriggerRefund} disabled={refundLoading}>{refundLoading ? 'Creating...' : 'Create Refund'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trigger Re-delivery Modal (P1-47) */}
      <Dialog open={redeliveryOpen} onOpenChange={setRedeliveryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Trigger Re-delivery</DialogTitle><DialogDescription>Create a re-delivery dispatch for ticket {selectedTicket?.ticketNumber}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><Label>Delivery Notes</Label><textarea className="w-full min-h-20 p-3 border border-[#e4e4e7] rounded-lg text-sm resize-none" value={redeliveryNotes} onChange={e => setRedeliveryNotes(e.target.value)} placeholder="Special instructions..." /></div>
            <div className="flex gap-2"><Button variant="outline" onClick={() => setRedeliveryOpen(false)}>Cancel</Button><Button onClick={handleTriggerRedelivery} disabled={redeliveryLoading}>{redeliveryLoading ? 'Creating...' : 'Dispatch Re-delivery'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Ticket Modal */}
      <Dialog open={createTicketOpen} onOpenChange={setCreateTicketOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Ticket</DialogTitle>
            <DialogDescription>Create a new support ticket on behalf of a customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject *</Label>
              <Input value={createTicketForm.subject} onChange={(e) => setCreateTicketForm(f => ({ ...f, subject: e.target.value }))} placeholder="Ticket subject" />
            </div>
            <div>
              <Label>Description</Label>
              <textarea className="w-full min-h-20 p-3 border border-[#e4e4e7] rounded-lg text-sm resize-none" value={createTicketForm.description} onChange={(e) => setCreateTicketForm(f => ({ ...f, description: e.target.value }))} placeholder="Issue description" />
            </div>
            <div>
              <Label>Customer Name *</Label>
              <Input value={createTicketForm.customerName} onChange={(e) => setCreateTicketForm(f => ({ ...f, customerName: e.target.value }))} placeholder="Customer name" />
            </div>
            <div>
              <Label>Customer Email *</Label>
              <Input type="email" value={createTicketForm.customerEmail} onChange={(e) => setCreateTicketForm(f => ({ ...f, customerEmail: e.target.value }))} placeholder="customer@email.com" />
            </div>
            <div>
              <Label>Customer Phone</Label>
              <Input value={createTicketForm.customerPhone} onChange={(e) => setCreateTicketForm(f => ({ ...f, customerPhone: e.target.value }))} placeholder="+91-98765-43210" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
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
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={createTicketForm.priority} onValueChange={(v) => setCreateTicketForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Order Number</Label>
              <Input value={createTicketForm.orderNumber} onChange={(e) => setCreateTicketForm(f => ({ ...f, orderNumber: e.target.value }))} placeholder="ORD-12345" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCreateTicketOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTicket} disabled={createTicketLoading}>
                {createTicketLoading ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAQ Edit/Add Modal */}
      <Dialog open={faqModalOpen} onOpenChange={(open) => { setFaqModalOpen(open); if (!open) setEditingFaq(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFaq ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Question *</Label>
              <Input value={faqForm.question} onChange={(e) => setFaqForm(f => ({ ...f, question: e.target.value }))} placeholder="Question" />
            </div>
            <div>
              <Label>Answer *</Label>
              <textarea className="w-full min-h-24 p-3 border border-[#e4e4e7] rounded-lg text-sm resize-none" value={faqForm.answer} onChange={(e) => setFaqForm(f => ({ ...f, answer: e.target.value }))} placeholder="Answer" />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={faqForm.category} onChange={(e) => setFaqForm(f => ({ ...f, category: e.target.value }))} placeholder="general" />
            </div>
            <div>
              <Label>Keywords (comma separated)</Label>
              <Input value={faqForm.keywords} onChange={(e) => setFaqForm(f => ({ ...f, keywords: e.target.value }))} placeholder="track, delivery" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setFaqModalOpen(false); setEditingFaq(null); }}>Cancel</Button>
              <Button onClick={handleSaveFaq}>Save FAQ</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Ticket Modal */}
      <Dialog open={viewTicketOpen} onOpenChange={setViewTicketOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Ticket Details - {selectedTicket?.ticketNumber}</span>
              <Badge className={selectedTicket ? getPriorityColor(selectedTicket.priority) : ''}>
                {selectedTicket?.priority}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Created on {selectedTicket ? new Date(selectedTicket.createdAt).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="p-4 bg-[#f4f4f5] rounded-lg">
                <h4 className="font-bold text-[#18181b] mb-2">Customer Information</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
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

              {/* Ticket Details */}
              <div>
                <h4 className="font-bold text-[#18181b] mb-2">Subject</h4>
                <p className="text-[#18181b]">{selectedTicket.subject}</p>
              </div>

              <div>
                <h4 className="font-bold text-[#18181b] mb-2">Description</h4>
                <p className="text-[#71717a]">{selectedTicket.description}</p>
              </div>

              {/* Assignment */}
              <div>
                <Label className="mb-2 block">Assign to Agent</Label>
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
              </div>

              {/* Status */}
              <div>
                <Label className="mb-2 block">Status</Label>
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
              </div>

              {/* Timeline */}
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

              {/* Reply */}
              <div>
                <Label className="mb-2 block">Send Reply</Label>
                <textarea
                  className="w-full min-h-24 p-3 border border-[#e4e4e7] rounded-lg text-sm resize-none"
                  placeholder="Type your response..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleSendReply} className="flex-1">
                  <Send size={14} className="mr-1.5" /> Send Reply
                </Button>
                <Button variant="outline" onClick={() => handleCloseTicket(selectedTicket.id)}>
                  <CheckCircle size={14} className="mr-1.5" /> Close Ticket
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

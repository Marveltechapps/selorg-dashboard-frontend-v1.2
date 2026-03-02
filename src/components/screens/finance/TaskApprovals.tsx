import React, { useState, useEffect } from 'react';
import { RefreshCcw } from 'lucide-react';
import { Button } from "../../ui/button";
import { toast } from 'sonner';

import { 
    ApprovalTask, 
    ApprovalSummary, 
    TaskType,
    ApprovalDecisionPayload,
    fetchApprovalSummary,
    fetchApprovalTasks,
    submitTaskDecision
} from './approvalsApi';

import { ApprovalSummaryCards } from './ApprovalSummaryCards';
import { ApprovalQueueTable } from './ApprovalQueueTable';
import { TaskDetailsDrawer } from './TaskDetailsDrawer';

export function TaskApprovals() {
  const [summary, setSummary] = useState<ApprovalSummary | null>(null);
  const [tasks, setTasks] = useState<ApprovalTask[]>([]);
  
  const [activeFilter, setActiveFilter] = useState<TaskType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  // Drawer
  const [selectedTask, setSelectedTask] = useState<ApprovalTask | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadData = async () => {
      setIsLoading(true);
      try {
          const type = activeFilter === 'all' ? undefined : activeFilter;
          const [summaryData, tasksData] = await Promise.all([
              fetchApprovalSummary(),
              fetchApprovalTasks('pending', type)
          ]);
          setSummary(summaryData);
          setTasks(tasksData);
      } catch (e) {
          toast.error("Failed to load approval tasks");
          setSummary(null);
          setTasks([]);
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      loadData();
  }, [activeFilter]);

  const handleDecision = async (id: string, payload: ApprovalDecisionPayload) => {
      const taskBeforeUpdate = tasks.find(t => t.id === id);
      setTasks(prev => prev.filter(t => t.id !== id));

      if (summary && taskBeforeUpdate) {
          setSummary(prev => {
              if (!prev) return null;
              let refundCount = prev.refundRequestsCount;
              let invoiceCount = prev.invoiceApprovalsCount;
              if (taskBeforeUpdate.type === 'refund' && refundCount > 0) refundCount -= 1;
              else if (taskBeforeUpdate.type === 'invoice' && invoiceCount > 0) invoiceCount -= 1;
              return {
                  ...prev,
                  refundRequestsCount: refundCount,
                  invoiceApprovalsCount: invoiceCount,
                  approvedTodayCount: payload.decision === 'approve' ? prev.approvedTodayCount + 1 : prev.approvedTodayCount,
              };
          });
      }

      try {
          await submitTaskDecision(id, payload);
          toast.success(`Task ${payload.decision}d`);
      } catch (e) {
          console.error('Failed to process decision:', e);
          toast.error("Failed to process decision");
          if (taskBeforeUpdate) {
              setTasks(prev => [...prev, taskBeforeUpdate].sort((a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              ));
          }
          if (summary && taskBeforeUpdate) {
              setSummary(prev => {
                  if (!prev) return null;
                  return {
                      ...prev,
                      refundRequestsCount: taskBeforeUpdate.type === 'refund' ? prev.refundRequestsCount + 1 : prev.refundRequestsCount,
                      invoiceApprovalsCount: taskBeforeUpdate.type === 'invoice' ? prev.invoiceApprovalsCount + 1 : prev.invoiceApprovalsCount,
                      approvedTodayCount: payload.decision === 'approve' ? Math.max(0, prev.approvedTodayCount - 1) : prev.approvedTodayCount,
                  };
              });
          }
      }
  };

  const handleQuickApprove = (id: string) => handleDecision(id, { decision: 'approve' });
  const handleQuickReject = (id: string) => handleDecision(id, { decision: 'reject', note: 'Quick rejection' });

  const handleTaskClick = (task: ApprovalTask) => {
      setSelectedTask(task);
      setDrawerOpen(true);
  };
  
  // Prevent any default form submissions or page reloads
  useEffect(() => {
    const handleSubmit = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('submit', handleSubmit, true);
    return () => document.removeEventListener('submit', handleSubmit, true);
  }, []);
  
  // Summary is updated in handleDecision, no need for separate effect

  return (
    <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Task & Workflow Approvals</h1>
          <p className="text-[#757575] text-sm">Approve refunds, large payments, and invoice settlements</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            loadData();
          }}
          type="button"
        >
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <ApprovalSummaryCards 
          summary={summary}
          isLoading={isLoading}
          activeFilter={activeFilter}
          onFilter={setActiveFilter}
      />

      <ApprovalQueueTable 
          tasks={tasks}
          isLoading={isLoading}
          onTaskClick={handleTaskClick}
          onQuickApprove={handleQuickApprove}
          onQuickReject={handleQuickReject}
      />

      <TaskDetailsDrawer 
          task={selectedTask}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onDecision={handleDecision}
      />
    </div>
  );
}

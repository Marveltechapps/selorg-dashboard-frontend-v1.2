import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../ui/page-header';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { HrSummaryCards } from "./hr/HrSummaryCards";
import { DocumentApprovalTable } from "./hr/DocumentApprovalTable";
import { DocumentReviewDrawer } from "./hr/DocumentReviewDrawer";
import { OnboardRiderModal } from "./hr/OnboardRiderModal";
import { OnboardingStatusTab } from "./hr/OnboardingStatusTab";
import { TrainingStatusTab } from "./hr/TrainingStatusTab";
import { AccessAndDeviceTab } from "./hr/AccessAndDeviceTab";
import { ContractsComplianceTab } from "./hr/ContractsComplianceTab";

import { 
  fetchHrSummary, 
  fetchDocuments, 
  fetchRiderDetails, 
  fetchAllRiders,
  fetchDocumentDetails
} from "./hr/hrApi";
import { HrDashboardSummary, RiderDocument, Rider } from "./hr/types";

export function RiderHR() {
  // State
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<HrDashboardSummary | null>(null);
  const [documents, setDocuments] = useState<RiderDocument[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  
  // Filter State
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Modal/Drawer State
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [reviewDoc, setReviewDoc] = useState<RiderDocument | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewRiderDetails, setReviewRiderDetails] = useState<Rider | null>(null);

  // Initial Data Load
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Reload documents when filter changes
  useEffect(() => {
    loadDocuments();
  }, [filterStatus]);

  // Real-time polling for document queue and summary (every 30 seconds)
  // Pause polling when tab is hidden to save resources
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        if (!document.hidden) {
          loadDashboardData();
        }
      }, 30000); // Poll every 30 seconds
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause polling when tab is hidden
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      } else {
        // Resume polling when tab becomes visible
        startPolling();
        // Also refresh immediately when tab becomes visible
        loadDashboardData();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [summaryData, ridersData] = await Promise.all([
        fetchHrSummary(),
        fetchAllRiders()
      ]);
      setSummary(summaryData);
      setRiders(ridersData);
      await loadDocuments(); // Load initial documents
    } catch (error) {
      console.error("Failed to load HR data", error);
      toast.error("Failed to load dashboard data", {
        description: error instanceof Error ? error.message : "Please check your connection and try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data } = await fetchDocuments({ status: filterStatus });
      setDocuments(data);
    } catch (error) {
      console.error("Failed to load documents", error);
      toast.error("Failed to load documents", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const handleReviewClick = async (doc: RiderDocument) => {
    try {
      // Fetch fresh document details and rider details
      const [freshDoc, rider] = await Promise.all([
        fetchDocumentDetails(doc.id),
        fetchRiderDetails(doc.riderId)
      ]);
      
      if (freshDoc) {
        setReviewDoc(freshDoc);
      } else {
        setReviewDoc(doc); // Fallback to passed doc
      }
      setReviewRiderDetails(rider);
      setIsReviewOpen(true);
    } catch (error) {
      console.error("Error opening review drawer:", error);
      toast.error("Failed to load document details");
      // Still open with existing doc data
      setReviewDoc(doc);
      setIsReviewOpen(true);
    }
  };

  const handleStatusUpdate = async () => {
    // Refresh everything to update counts and table
    await loadDashboardData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rider HR & Payroll"
        subtitle="Staff management and compensation"
        actions={
          <button 
            onClick={() => setIsOnboardOpen(true)}
            className="px-4 py-2 bg-[#16A34A] text-white font-medium rounded-lg hover:bg-[#15803D] flex items-center gap-2"
          >
            <Plus size={16} />
            Add Rider
          </button>
        }
      />

      {/* Summary Cards */}
      <HrSummaryCards 
        summary={summary} 
        loading={loading}
        onFilterPending={() => setFilterStatus("pending")}
        onShowExpired={() => setFilterStatus("expired")}
        onShowActive={() => setFilterStatus("all")}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="bg-white border border-[#E0E0E0] p-1 h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="documents" className="data-[state=active]:bg-[#F3F4F6]">Document Queue</TabsTrigger>
          <TabsTrigger value="onboarding" className="data-[state=active]:bg-[#F3F4F6]">Onboarding Status</TabsTrigger>
          <TabsTrigger value="training" className="data-[state=active]:bg-[#F3F4F6]">Training</TabsTrigger>
          <TabsTrigger value="access" className="data-[state=active]:bg-[#F3F4F6]">Access & Devices</TabsTrigger>
          <TabsTrigger value="contracts" className="data-[state=active]:bg-[#F3F4F6]">Contracts & Compliance</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="documents" className="m-0">
            <DocumentApprovalTable 
              documents={documents}
              loading={loading}
              filterStatus={filterStatus}
              onFilterChange={setFilterStatus}
              onReview={handleReviewClick}
              onViewReason={(doc) => {
                setReviewDoc(doc);
                setIsReviewOpen(true);
              }}
            />
          </TabsContent>
          
          <TabsContent value="onboarding" className="m-0">
            <OnboardingStatusTab riders={riders} loading={loading} />
          </TabsContent>

          <TabsContent value="training" className="m-0">
            <TrainingStatusTab riders={riders} loading={loading} onRefresh={loadDashboardData} />
          </TabsContent>

          <TabsContent value="access" className="m-0">
            <AccessAndDeviceTab 
              riders={riders} 
              loading={loading} 
              onRefresh={loadDashboardData}
            />
          </TabsContent>

          <TabsContent value="contracts" className="m-0">
            <ContractsComplianceTab riders={riders} loading={loading} onRefresh={loadDashboardData} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Drawers & Modals */}
      <DocumentReviewDrawer 
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        document={reviewDoc}
        riderDetails={reviewRiderDetails}
        onStatusUpdate={handleStatusUpdate}
      />

      <OnboardRiderModal 
        isOpen={isOnboardOpen}
        onClose={() => setIsOnboardOpen(false)}
        onSuccess={loadDashboardData}
      />
    </div>
  );
}
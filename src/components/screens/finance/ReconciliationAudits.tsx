import React, { useState, useEffect } from 'react';
import { PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

import { SettlementSummaryCard } from './SettlementSummaryCard';
import { ReconExceptionsCard } from './ReconExceptionsCard';
import { RunReconciliationModal } from './RunReconciliationModal';
import { ExceptionInvestigationDrawer } from './ExceptionInvestigationDrawer';
import { ResolveExceptionModal } from './ResolveExceptionModal';
import { GatewayDetailDrawer } from './GatewayDetailDrawer';

import {
    SettlementSummaryItem,
    ReconciliationException,
    fetchReconSummary,
    fetchExceptions,
    investigateException
} from './reconciliationApi';
import { Button } from '../../ui/button';

export function ReconciliationAudits() {
    // --- State ---
    const [summary, setSummary] = useState<SettlementSummaryItem[]>([]);
    const [exceptions, setExceptions] = useState<ReconciliationException[]>([]);
    
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);
    const [isLoadingExceptions, setIsLoadingExceptions] = useState(true);

    // Modals / Drawers
    const [runModalOpen, setRunModalOpen] = useState(false);
    const [resolveModalOpen, setResolveModalOpen] = useState(false);
    
    const [selectedGateway, setSelectedGateway] = useState<SettlementSummaryItem | null>(null);
    const [gatewayDrawerOpen, setGatewayDrawerOpen] = useState(false);

    const [selectedException, setSelectedException] = useState<ReconciliationException | null>(null);
    const [investigateDrawerOpen, setInvestigateDrawerOpen] = useState(false);

    // --- Data Fetching ---
    const loadData = async () => {
        setIsLoadingSummary(true);
        setIsLoadingExceptions(true);
        try {
            // Fetch exceptions and summary in parallel
            const [sum, exc] = await Promise.all([
                fetchReconSummary(new Date().toISOString()),
                fetchExceptions('open')
            ]);
            setSummary(sum);
            setExceptions(exc);
        } catch (e) {
            toast.error("Failed to load reconciliation data");
        } finally {
            setIsLoadingSummary(false);
            setIsLoadingExceptions(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // --- Handlers ---
    const handleRunSuccess = () => {
        loadData();
    };

    const handleResolveSuccess = () => {
        // Reload data to get updated exceptions
        loadData();
    };

    const handleGatewayClick = (item: SettlementSummaryItem) => {
        setSelectedGateway(item);
        setGatewayDrawerOpen(true);
    };

    const handleInvestigateClick = (ex: ReconciliationException) => {
        setSelectedException(ex);
        setInvestigateDrawerOpen(true);
    };
    
    const handleCloseInvestigation = () => {
        setInvestigateDrawerOpen(false);
        // Optionally update exception status
        if (selectedException) {
            setExceptions(prev => prev.map(ex => 
                ex.id === selectedException.id 
                    ? { ...ex, status: 'in_review' as any }
                    : ex
            ));
        }
    };

    const handleResolveClick = (ex: ReconciliationException) => {
        setSelectedException(ex);
        setResolveModalOpen(true);
    };

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-[#212121]">Reconciliation & Audits</h1>
                    <p className="text-[#757575] text-sm">Monitor daily settlements and resolve financial discrepancies</p>
                </div>
                <Button 
                    onClick={() => setRunModalOpen(true)}
                    className="bg-[#14B8A6] hover:bg-[#0D9488] text-white font-medium shadow-sm transition-colors"
                >
                    <PlayCircle className="mr-2 h-4 w-4" /> Run Reconciliation
                </Button>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                <div className="h-full min-h-[400px]">
                    <SettlementSummaryCard 
                        items={summary}
                        isLoading={isLoadingSummary}
                        onSelectGateway={handleGatewayClick}
                    />
                </div>
                <div className="h-full min-h-[400px]">
                    <ReconExceptionsCard 
                        exceptions={exceptions}
                        isLoading={isLoadingExceptions}
                        onInvestigate={handleInvestigateClick}
                        onResolve={handleResolveClick}
                    />
                </div>
            </div>

            {/* Modals & Drawers */}
            <RunReconciliationModal 
                open={runModalOpen}
                onClose={() => setRunModalOpen(false)}
                onSuccess={handleRunSuccess}
            />

            <GatewayDetailDrawer 
                gateway={selectedGateway}
                open={gatewayDrawerOpen}
                onClose={() => setGatewayDrawerOpen(false)}
                onViewExceptions={() => {
                    // Filter logic could go here if we were implementing real filtering
                }}
            />

            <ExceptionInvestigationDrawer 
                exception={selectedException}
                open={investigateDrawerOpen}
                onClose={async () => {
                    // Update exception status to in_review when closing investigation
                    if (selectedException) {
                        try {
                            await investigateException(selectedException.id);
                            toast.success("Investigation closed");
                            // Reload data to show updated status
                            await loadData();
                        } catch (e) {
                            console.error('Failed to close investigation', e);
                            toast.error("Failed to close investigation");
                        }
                    }
                    setInvestigateDrawerOpen(false);
                }}
                onResolve={(ex) => {
                    setInvestigateDrawerOpen(false);
                    handleResolveClick(ex);
                }}
            />

            <ResolveExceptionModal 
                exception={selectedException}
                open={resolveModalOpen}
                onClose={() => setResolveModalOpen(false)}
                onSuccess={handleResolveSuccess}
            />
        </div>
    );
}

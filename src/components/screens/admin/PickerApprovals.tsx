import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { PickerApprovalsTable } from './PickerApprovalsTable';
import { PickerDetailsDrawer } from './PickerDetailsDrawer';
import {
  PickerApprovalListItem,
  PickerApprovalDetails,
  PickerApprovalsFilter,
  fetchPickerApprovalsList,
  fetchPickerDetails,
} from './pickerApprovalsApi';
import { fetchPickersWithMetrics, type PickerPerformanceItem } from '@/api/darkstore/pickers.api';

export function PickerApprovals() {
  const [data, setData] = useState<PickerApprovalListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [rawPickersMetrics, setRawPickersMetrics] = useState<PickerPerformanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<PickerApprovalsFilter>({
    page: 1,
    limit: 20,
    status: undefined,
  });
  const [selectedPicker, setSelectedPicker] = useState<PickerApprovalDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const riskMap = useMemo(() => {
    const map: Record<string, { riskScore: number; riskLevel: 'low' | 'medium' | 'high' }> = {};
    for (const p of rawPickersMetrics) {
      map[p.pickerId] = { riskScore: p.riskScore, riskLevel: p.riskLevel };
    }
    return map;
  }, [rawPickersMetrics]);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    try {
      const [result, pickersRes] = await Promise.all([
        fetchPickerApprovalsList(filters),
        fetchPickersWithMetrics({ risk: undefined }).catch(() => ({ success: false, data: [] as PickerPerformanceItem[] })),
      ]);
      setData(result.data);
      setTotal(result.total);
      setRawPickersMetrics(pickersRes.success && pickersRes.data ? pickersRes.data : []);
    } catch (e) {
      toast.error('Failed to load picker approvals');
      setData([]);
      setTotal(0);
      setRawPickersMetrics([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleViewDetails = async (picker: PickerApprovalListItem) => {
    setSelectedPicker(null);
    setDetailsOpen(true);
    try {
      const detailed = await fetchPickerDetails(picker.pickerId);
      setSelectedPicker(detailed);
    } catch (e) {
      toast.error('Failed to load picker details');
      setDetailsOpen(false);
    }
  };

  const handleRefresh = () => {
    loadList();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Picker Approvals</h1>
          <p className="text-[#757575] text-sm">
            Review and approve picker onboarding requests
          </p>
        </div>
      </div>

      <PickerApprovalsTable
        data={data}
        riskMap={riskMap}
        isLoading={isLoading}
        filters={filters}
        total={total}
        onFilterChange={setFilters}
        onViewDetails={handleViewDetails}
      />

      <PickerDetailsDrawer
        picker={selectedPicker}
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedPicker(null);
        }}
        onRefresh={handleRefresh}
        onPickerUpdated={setSelectedPicker}
      />
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { AddStoreModal } from '../modals/AddStoreModal';
import { StoreDetailsModal } from '../modals/StoreDetailsModal';
import { toast } from 'sonner';
import { fetchStores, fetchCities, fetchZones, Store, deleteStore, City, Zone, Pagination } from '../storeWarehouseApi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAGE_SIZE = 20;

interface StoresTabProps {
  openAddModal?: boolean;
  onAddModalClose?: () => void;
}

export function StoresTab({ openAddModal, onAddModalClose }: StoresTabProps = {}) {
  const [addStoreOpen, setAddStoreOpen] = useState(false);
  const [detailsStoreId, setDetailsStoreId] = useState<string | null>(null);
  const [detailsStorePreview, setDetailsStorePreview] = useState<Store | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [stores, setStores] = useState<Store[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [editStore, setEditStore] = useState<Store | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    fetchCities().then(setCities).catch(() => {});
  }, []);

  useEffect(() => {
    if (cityFilter && cityFilter !== 'all') {
      fetchZones(cityFilter).then(setZones).catch(() => setZones([]));
    } else {
      setZones([]);
      setZoneFilter('all');
    }
  }, [cityFilter]);

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchStores({
        search: searchDebounced.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        cityId: cityFilter !== 'all' ? cityFilter : undefined,
        zoneId: zoneFilter !== 'all' ? zoneFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        page,
        limit: PAGE_SIZE,
      });
      setStores(result.data);
      setPagination(result.pagination ?? null);
    } catch (error: any) {
      console.error('Failed to load stores:', error);
      toast.error(error?.message ?? 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, statusFilter, cityFilter, zoneFilter, typeFilter, page]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, statusFilter, cityFilter, zoneFilter, typeFilter]);

  useEffect(() => {
    if (openAddModal) {
      setAddStoreOpen(true);
      onAddModalClose?.();
    }
  }, [openAddModal]);

  const handleAddStore = () => {
    setEditStore(null);
    setAddStoreOpen(true);
  };

  const handleStoreSuccess = () => {
    loadStores();
  };

  const handleEditStore = (store: Store) => {
    setEditStore(store);
    setAddStoreOpen(true);
  };

  const handleDeleteStore = async (store: Store) => {
    if (!confirm(`Are you sure you want to delete "${store.name}"?`)) return;
    try {
      await deleteStore(store.id);
      toast.success('Store deleted successfully');
      loadStores();
    } catch (error: any) {
      toast.error(error?.message ?? 'Failed to delete store');
    }
  };

  const handleViewDetails = (store: Store) => {
    setDetailsStorePreview(store);
    setDetailsStoreId(store.id);
  };

  return (
    <>
      <div className="p-4 border-b border-[#e4e4e7] bg-[#fcfcfc] flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" size={14} />
            <input
              type="text"
              placeholder="Search stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-4 rounded-lg bg-white border border-[#e4e4e7] text-sm focus:ring-2 focus:ring-[#e11d48] focus:border-transparent w-52 shadow-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[120px] bg-white border-[#e4e4e7]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="h-9 w-[140px] bg-white border-[#e4e4e7]">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={zoneFilter} onValueChange={setZoneFilter} disabled={!cityFilter || cityFilter === 'all'}>
            <SelectTrigger className="h-9 w-[140px] bg-white border-[#e4e4e7]">
              <SelectValue placeholder={cityFilter === 'all' ? 'Select city first' : 'Zone'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Zones</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[120px] bg-white border-[#e4e4e7]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="store">Store</SelectItem>
              <SelectItem value="dark_store">Dark Store</SelectItem>
              <SelectItem value="warehouse">Warehouse</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          onClick={handleAddStore}
          className="h-9 px-4 bg-[#18181b] text-white text-sm font-medium rounded-lg hover:bg-[#27272a] flex items-center gap-2 shadow-lg shadow-zinc-500/20 self-start sm:self-auto"
        >
          <Plus size={14} /> Add New Store
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#e11d48] border-t-transparent" />
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f9fafb] text-[#71717a] font-medium border-b border-[#e4e4e7] sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3">Store ID</th>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">City / Zone</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Manager</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e4e7]">
              {stores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-[#71717a]">
                    No stores found matching your search criteria
                  </td>
                </tr>
              ) : (
                stores.map((store) => (
                  <tr key={store.id} className="hover:bg-[#fcfcfc] group">
                    <td className="px-6 py-4 font-mono text-[#71717a]">{store.code}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#18181b]">{store.name}</div>
                      <div className="text-xs text-[#71717a]">{store.address}</div>
                    </td>
                    <td className="px-6 py-4 text-[#52525b]">{store.city} • {store.zone ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {store.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {store.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      ) : store.status === 'offline' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Offline
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> {store.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#52525b]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#f4f4f5] border border-[#e4e4e7] flex items-center justify-center text-[10px]">VM</div>
                        {store.manager}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 text-[#a1a1aa] hover:text-[#18181b] hover:bg-[#f4f4f5] rounded transition-colors">
                            <MoreHorizontal size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditStore(store)}>
                            <Edit size={14} className="mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDetails(store)}>
                            <Eye size={14} className="mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteStore(store)}
                            className="text-rose-600"
                          >
                            <Trash2 size={14} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-3 border-t border-[#e4e4e7] bg-[#fcfcfc] flex items-center justify-between text-sm text-[#71717a]">
          <span>
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="p-2 rounded hover:bg-[#e4e4e7] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-3">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded hover:bg-[#e4e4e7] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      <StoreDetailsModal
        open={!!detailsStoreId}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsStoreId(null);
            setDetailsStorePreview(null);
          }
        }}
        storeId={detailsStoreId}
        storePreview={detailsStorePreview}
        onEdit={(s) => {
          setDetailsStoreId(null);
          setDetailsStorePreview(null);
          setEditStore(s);
          setAddStoreOpen(true);
        }}
      />

      <AddStoreModal
        open={addStoreOpen}
        onOpenChange={(open) => {
          setAddStoreOpen(open);
          if (!open) setEditStore(null);
          onAddModalClose?.();
        }}
        onSuccess={handleStoreSuccess}
        editStore={editStore}
      />
    </>
  );
}

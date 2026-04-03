import React, { useState, useEffect, useCallback } from 'react';
import {
  Video,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Loader2,
  Package,
  CheckCircle,
  Truck,
  Layout,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  type TrainingVideo,
  type KitConfig,
  type KitItem,
  fetchKitConfig,
  updateKitConfig,
  fetchTrainingVideos,
  createTrainingVideo,
  updateTrainingVideo,
  deleteTrainingVideo
} from './trainingKitApi';
import { fetchAllRiders } from './hr/hrApi';

type DeleteConfirmState =
  | { type: 'video'; id: string; title: string }
  | { type: 'kit'; item: KitItem }
  | null;

function durationSecondsToDisplay(sec: number): string {
  if (sec < 60) return `${sec} sec`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m} min ${s} sec` : `${m} min`;
}

export function TrainingKitManagement() {
  const [activeTab, setActiveTab] = useState<'training' | 'kit'>('training');
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [kitConfig, setKitConfig] = useState<KitConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedHubName, setSelectedHubName] = useState<string | null>(null);

  // Training Form state
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [videoForm, setVideoForm] = useState<any>({
    videoId: '',
    title: '',
    description: '',
    duration: 300,
    durationDisplay: '5 min',
    videoUrl: '',
    thumbnailUrl: '',
    order: 0,
    minimumWatchPercentage: 80,
    isActive: true,
  });

  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Kit Item Form state
  const [showKitItemForm, setShowKitItemForm] = useState(false);
  const [editingKitItem, setEditingKitItem] = useState<KitItem | null>(null);
  const [kitItemForm, setKitItemForm] = useState<KitItem>({
    id: '',
    label: '',
    iconName: 'other',
    isActive: true,
    order: 0
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Individual try-catches to ensure one failure doesn't block everything
      const [videosData, kitData, ridersData] = await Promise.all([
        fetchTrainingVideos().catch(err => {
          console.error('Error fetching training videos:', err);
          return [] as TrainingVideo[];
        }),
        fetchKitConfig().catch(err => {
          console.error('Error fetching kit config:', err);
          return null as KitConfig | null;
        }),
        fetchAllRiders().catch(err => {
          console.error('Error fetching riders:', err);
          return [];
        })
      ]);

      setVideos((videosData || []).sort((a, b) => a.order - b.order));
      setKitConfig(kitData);
      
      const sampleHub = (ridersData && ridersData.length > 0) ? (ridersData[0].hubName || null) : null;
      setSelectedHubName(sampleHub);
      
      if (!videosData.length && !kitData) {
        toast.error('Failed to load some dashboard data');
      }
    } catch (e) {
      console.error('Data load error:', e);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveVideo = async () => {
    if (!videoForm.title.trim() || !videoForm.videoUrl.trim()) {
      toast.error('Title and video URL are required');
      return;
    }
    setSaving(true);
    try {
      if (editingVideoId) {
        await updateTrainingVideo(editingVideoId, videoForm);
        toast.success('Training video updated');
      } else {
        const videoId = videoForm.videoId?.trim() || `video${Date.now()}`;
        await createTrainingVideo({ ...videoForm, videoId });
        toast.success('Training video created');
      }
      setShowVideoForm(false);
      loadData();
    } catch (e) {
      toast.error('Failed to save video');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveKitItem = async () => {
    if (!kitItemForm.label.trim()) {
      toast.error('Item label is required');
      return;
    }
    
    setSaving(true);
    try {
      const currentItems = [...(kitConfig?.items || [])];
      let newItems;
      
      if (editingKitItem) {
        newItems = currentItems.map(item => 
          item.id === editingKitItem.id ? kitItemForm : item
        );
      } else {
        const itemId = kitItemForm.id || `item${Date.now()}`;
        newItems = [...currentItems, { ...kitItemForm, id: itemId }];
      }

      await updateKitConfig({ ...kitConfig, items: newItems });
      toast.success('Kit items updated');
      setShowKitItemForm(false);
      loadData();
    } catch (e) {
      toast.error('Failed to save kit item');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateKitMeta = async () => {
    if (!kitConfig) return;
    setSaving(true);
    try {
      await updateKitConfig(kitConfig);
      toast.success('Kit configuration updated');
      loadData();
    } catch (e) {
      toast.error('Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveVideo = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === videos.length - 1) return;

    const newVideos = [...videos];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap order values
    const tempOrder = newVideos[index].order;
    newVideos[index].order = newVideos[targetIndex].order;
    newVideos[targetIndex].order = tempOrder;

    try {
      setLoading(true);
      await Promise.all([
        updateTrainingVideo(newVideos[index]._id, { order: newVideos[index].order }),
        updateTrainingVideo(newVideos[targetIndex]._id, { order: newVideos[targetIndex].order })
      ]);
      loadData();
    } catch (e) {
      toast.error('Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveKitItem = async (index: number, direction: 'up' | 'down') => {
    if (!kitConfig) return;
    const items = [...(kitConfig.items || [])].sort((a, b) => a.order - b.order);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newItems = [...items];
    
    // Swap order values
    const tempOrder = newItems[index].order;
    newItems[index].order = newItems[targetIndex].order;
    newItems[targetIndex].order = tempOrder;

    try {
      setSaving(true);
      await updateKitConfig({ ...kitConfig, items: newItems });
      loadData();
    } catch (e) {
      toast.error('Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Rider App Training & Kit</h1>
          <p className="text-[#6B7280] text-sm mt-1">
            Manage onboarding content including training videos and rider equipment checklist.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex border-b border-[#E5E7EB] mb-6">
        <button
          onClick={() => setActiveTab('training')}
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${
            activeTab === 'training' ? 'text-[#F97316]' : 'text-[#6B7280] hover:text-[#1F2937]'
          }`}
        >
          Training Videos
          {activeTab === 'training' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F97316]" />}
        </button>
        <button
          onClick={() => setActiveTab('kit')}
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${
            activeTab === 'kit' ? 'text-[#F97316]' : 'text-[#6B7280] hover:text-[#1F2937]'
          }`}
        >
          Rider Kit & Hub
          {activeTab === 'kit' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F97316]" />}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-[#6B7280]" />
        </div>
      ) : activeTab === 'training' ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E5E7EB] flex justify-between items-center">
            <h3 className="font-bold text-[#1F2937] flex items-center gap-2">
              <Video size={18} className="text-[#F97316]" />
              Training Videos
            </h3>
            <Button onClick={() => {
              setEditingVideoId(null);
              setVideoForm({
                videoId: '',
                title: '',
                description: '',
                duration: 300,
                durationDisplay: '5 min',
                videoUrl: '',
                thumbnailUrl: '',
                order: videos.length + 1,
                minimumWatchPercentage: 80,
                isActive: true,
              });
              setShowVideoForm(true);
            }}>
              <Plus size={16} className="mr-2" />
              Add Video
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <TableHead className="w-[80px]">Order</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-[#6B7280]">
                    No training videos configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                videos.map((v, index) => (
                  <TableRow key={v._id}>
                    <TableCell className="font-mono text-sm">{v.order}</TableCell>
                    <TableCell className="font-medium">{v.title}</TableCell>
                    <TableCell>{v.durationDisplay}</TableCell>
                    <TableCell>
                      <Badge variant={v.isActive ? 'default' : 'secondary'} className={v.isActive ? 'bg-green-100 text-green-800 border-green-200' : ''}>
                        {v.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleMoveVideo(index, 'up')} disabled={index === 0}>
                          <ChevronUp size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleMoveVideo(index, 'down')} disabled={index === videos.length - 1}>
                          <ChevronDown size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => window.open(v.videoUrl, '_blank')}>
                          <ExternalLink size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingVideoId(v._id);
                          setVideoForm(v);
                          setShowVideoForm(true);
                        }}>
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => setDeleteConfirm({ type: 'video', id: v._id, title: v.title })}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E5E7EB] flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-[#1F2937] flex items-center gap-2">
                  <Package size={18} className="text-[#F97316]" />
                  Kit Checklist Items
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleUpdateKitMeta} disabled={saving}>
                    {saving && <Loader2 size={14} className="animate-spin mr-2" />}
                    Save Meta
                  </Button>
                  <Button onClick={() => {
                    setEditingKitItem(null);
                    setKitItemForm({
                      id: '',
                      label: '',
                      iconName: 'other',
                      isActive: true,
                      order: (kitConfig?.items?.length || 0) + 1
                    });
                    setShowKitItemForm(true);
                  }}>
                    <Plus size={16} className="mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB]">
                <div className="space-y-2">
                  <Label>Kit Card Title</Label>
                  <Input 
                    value={kitConfig?.title || ''} 
                    onChange={(e) => setKitConfig(prev => prev ? { ...prev, title: e.target.value } : null)}
                    placeholder="Collect Rider Kit"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kit Description</Label>
                  <Textarea 
                    value={kitConfig?.description || ''} 
                    onChange={(e) => setKitConfig(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Please collect your assets from your assigned hub to start delivering."
                    rows={2}
                  />
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm text-[#6B7280] flex items-center gap-2 mb-4">
                <Truck size={14} />
                Uses assigned rider hub from profile (e.g. {selectedHubName || 'Koramangala Hub'})
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB]">
                  <TableHead className="w-[80px]">Order</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead>Item Label</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kitConfig?.items?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-[#6B7280]">
                      No kit items configured yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  kitConfig?.items?.sort((a,b) => a.order - b.order).map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.order}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.iconName.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.label}</TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? 'default' : 'secondary'} className={item.isActive ? 'bg-green-100 text-green-800 border-green-200' : ''}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleMoveKitItem(index, 'up')} disabled={index === 0}>
                            <ChevronUp size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleMoveKitItem(index, 'down')} disabled={index === (kitConfig?.items?.length || 0) - 1}>
                            <ChevronDown size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEditingKitItem(item);
                            setKitItemForm(item);
                            setShowKitItemForm(true);
                          }}>
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => setDeleteConfirm({ type: 'kit', item })}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        title={deleteConfirm?.type === 'kit' ? 'Remove kit item?' : 'Delete training video?'}
        description={
          deleteConfirm?.type === 'kit'
            ? `Remove "${deleteConfirm.item.label}" from the checklist? You can add it again later.`
            : deleteConfirm?.type === 'video'
              ? `Delete "${deleteConfirm.title}"? This cannot be undone.`
              : ''
        }
        confirmText={deleteConfirm?.type === 'kit' ? 'Remove' : 'Delete'}
        cancelText="Cancel"
        variant="destructive"
        isLoading={deleteLoading}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          setDeleteLoading(true);
          try {
            if (deleteConfirm.type === 'video') {
              await deleteTrainingVideo(deleteConfirm.id);
              toast.success('Training video deleted');
            } else {
              if (!kitConfig) {
                toast.error('Kit configuration is not loaded');
                throw new Error('Kit configuration is not loaded');
              }
              const newItems = kitConfig.items.filter((i) => i.id !== deleteConfirm.item.id);
              await updateKitConfig({ ...kitConfig, items: newItems });
              toast.success('Kit item removed');
            }
            loadData();
          } catch {
            toast.error(
              deleteConfirm.type === 'video' ? 'Failed to delete video' : 'Failed to remove kit item'
            );
            throw new Error('delete failed');
          } finally {
            setDeleteLoading(false);
          }
        }}
      />

      {/* Video Form Modal */}
      <Dialog open={showVideoForm} onOpenChange={setShowVideoForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingVideoId ? 'Edit Training Video' : 'Add Training Video'}</DialogTitle>
            <DialogDescription>
              Add or edit a training video entry (title, URL, duration and visibility).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Video Title *</Label>
              <Input 
                value={videoForm.title} 
                onChange={(e) => setVideoForm({...videoForm, title: e.target.value})}
                placeholder="e.g. Delivery Partner Basics"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (seconds)</Label>
                <Input 
                  type="number" 
                  value={videoForm.duration} 
                  onChange={(e) => {
                    const sec = parseInt(e.target.value) || 0;
                    setVideoForm({...videoForm, duration: sec, durationDisplay: durationSecondsToDisplay(sec)});
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input 
                  type="number" 
                  value={videoForm.order} 
                  onChange={(e) => setVideoForm({...videoForm, order: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Video URL (S3/YouTube) *</Label>
              <Input 
                value={videoForm.videoUrl} 
                onChange={(e) => setVideoForm({...videoForm, videoUrl: e.target.value})}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={videoForm.description} 
                onChange={(e) => setVideoForm({...videoForm, description: e.target.value})}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min. Watch (%)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="100"
                  value={videoForm.minimumWatchPercentage} 
                  onChange={(e) => setVideoForm({...videoForm, minimumWatchPercentage: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <Switch 
                  checked={videoForm.isActive} 
                  onCheckedChange={(checked) => setVideoForm({...videoForm, isActive: checked})} 
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVideoForm(false)}>Cancel</Button>
            <Button onClick={handleSaveVideo} disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-2" />}
              {editingVideoId ? 'Update Video' : 'Add Video'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kit Item Form Modal */}
      <Dialog open={showKitItemForm} onOpenChange={setShowKitItemForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingKitItem ? 'Edit Kit Item' : 'Add Kit Item'}</DialogTitle>
            <DialogDescription>
              Define a kit checklist item that riders will mark when collecting their equipment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Label *</Label>
              <Input 
                value={kitItemForm.label} 
                onChange={(e) => setKitItemForm({...kitItemForm, label: e.target.value})}
                placeholder="e.g. Delivery Bag"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon Type</Label>
              <select 
                className="w-full h-10 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm bg-white"
                value={kitItemForm.iconName}
                onChange={(e) => setKitItemForm({...kitItemForm, iconName: e.target.value as any})}
              >
                <option value="tshirt">T-Shirt</option>
                <option value="delivery_bag">Delivery Bag</option>
                <option value="id_card">ID Card</option>
                <option value="other">Other Box</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input 
                type="number" 
                value={kitItemForm.order} 
                onChange={(e) => setKitItemForm({...kitItemForm, order: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={kitItemForm.isActive} 
                onCheckedChange={(checked) => setKitItemForm({...kitItemForm, isActive: checked})} 
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKitItemForm(false)}>Cancel</Button>
            <Button onClick={handleSaveKitItem} disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-2" />}
              {editingKitItem ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

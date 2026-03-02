import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRightLeft, Truck, AlertCircle, Save, Loader2 } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { allocationApi } from './allocationApi';
import { toast } from "sonner";

interface AllocationDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sku: any;
  onRebalance: () => void;
  onCreateTransfer: () => void;
  onUpdate?: () => void;
}

export function AllocationDetailDrawer({ open, onOpenChange, sku, onRebalance, onCreateTransfer, onUpdate }: AllocationDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState("location");
  const [historyData, setHistoryData] = useState<{ week: string; demand: number; stock: number }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!open || !sku?.id) {
      setHistoryData([]);
      return;
    }
    let mounted = true;
    (async () => {
      setHistoryLoading(true);
      try {
        const data = await allocationApi.fetchAllocationHistory(sku.id);
        if (mounted && Array.isArray(data)) setHistoryData(data);
        else if (mounted) setHistoryData([]);
      } catch {
        if (mounted) setHistoryData([]);
      } finally {
        if (mounted) setHistoryLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [open, sku?.id]);
  const [editedAllocations, setEditedAllocations] = useState<Record<string, number>>({});


  if (!sku) return null;

  const handleAllocationChange = (locationId: string, value: string) => {
    setEditedAllocations({ ...editedAllocations, [locationId]: parseInt(value) || 0 });
  };

  const handleSaveAllocation = async () => {
    const promises: Promise<any>[] = [];
    for (const locationId of Object.keys(editedAllocations)) {
      const location = sku.locations?.find((loc: any) => loc.id === locationId);
      const allocId = location?.allocationId ?? locationId;
      if (location && allocId) {
        promises.push(
          allocationApi.updateSKUAllocation(allocId, {
            allocated: editedAllocations[locationId],
            target: editedAllocations[locationId],
            onHand: location.onHand,
            inTransit: location.inTransit
          })
        );
      }
    }
    try {
      await Promise.all(promises);
      toast.success('Allocation plan saved');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save allocation');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-[600px] sm:w-[800px] p-0 flex flex-col h-full bg-white"
      >
        <SheetHeader className="p-4 border-b bg-gray-50/50">
            <div className="flex justify-between items-start">
                <div>
                    <SheetTitle className="text-lg font-bold text-[#212121]">{sku.name}</SheetTitle>
                    <SheetDescription className="text-[10px] text-[#757575] flex items-center gap-2 mt-0.5">
                        {sku.code} • {sku.packSize}
                        <Badge variant="outline" className="ml-1 bg-white text-[9px] h-4 px-1.5">{sku.category}</Badge>
                    </SheetDescription>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Total Stock</p>
                    <p className="text-lg font-bold text-[#212121]">{sku.totalStock.toLocaleString()} <span className="text-[10px] font-normal text-gray-500">units</span></p>
                </div>
            </div>

            <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 px-2.5" onClick={onRebalance}>
                    <ArrowRightLeft size={12} /> Rebalance Across Locations
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 px-2.5" onClick={onCreateTransfer}>
                    <Truck size={12} /> Create Transfer Order
                </Button>
            </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="location" value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <div className="px-6 pt-1 border-b">
                    <TabsList className="bg-transparent h-auto p-0 space-x-6">
                        <TabsTrigger value="overview" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] rounded-none px-0 pb-2 text-xs font-medium">Overview</TabsTrigger>
                        <TabsTrigger value="location" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] rounded-none px-0 pb-2 text-xs font-medium">By Location</TabsTrigger>
                        <TabsTrigger value="promotions" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] rounded-none px-0 pb-2 text-xs font-medium">Promotions</TabsTrigger>
                        <TabsTrigger value="chart" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] rounded-none px-0 pb-2 text-xs font-medium">History Chart</TabsTrigger>
                    </TabsList>
                </div>

                <ScrollArea className="flex-1 bg-white">
                    <TabsContent value="location" className="p-4 m-0">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-[10px] text-yellow-700 bg-yellow-50 px-2 py-1 rounded-md border border-yellow-100">
                                <AlertCircle size={12} />
                                <span>Changes are staged until you save.</span>
                            </div>
                            <Button 
                              size="sm" 
                              className="h-7 text-[10px] bg-[#7C3AED] hover:bg-[#6D28D9] gap-1.5 px-3"
                              onClick={handleSaveAllocation}
                            >
                                <Save size={12} /> Save Allocation Plan
                            </Button>
                        </div>

                        <div className="overflow-x-auto overflow-y-visible" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
                            <Table className="min-w-[600px]">
                                <TableHeader>
                                    <TableRow className="h-8">
                                        <TableHead className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Location</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">On-hand</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">In-Transit</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Safety Stock</TableHead>
                                        <TableHead className="text-right w-[110px] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Target Alloc.</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Gap</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sku.locations.map((loc: any) => {
                                        const currentTarget = editedAllocations[loc.id] ?? loc.target;
                                        const gap = loc.onHand - currentTarget;
                                        return (
                                            <TableRow key={loc.id} className="h-10">
                                                <TableCell className="font-medium text-[11px] py-2 whitespace-nowrap">{loc.name}</TableCell>
                                                <TableCell className="text-right text-[11px] py-2 whitespace-nowrap">{loc.onHand.toLocaleString()}</TableCell>
                                                <TableCell className="text-right text-gray-500 text-[11px] py-2 whitespace-nowrap">{loc.inTransit.toLocaleString()}</TableCell>
                                                <TableCell className="text-right text-gray-500 text-[11px] py-2 whitespace-nowrap">{loc.safetyStock.toLocaleString()}</TableCell>
                                                <TableCell className="text-right py-2 whitespace-nowrap">
                                                    <Input 
                                                        type="number" 
                                                        value={currentTarget} 
                                                        onChange={(e) => handleAllocationChange(loc.id, e.target.value)}
                                                        className="h-7 w-20 ml-auto text-right text-[11px] px-2"
                                                    />
                                                </TableCell>
                                                <TableCell className={`text-right font-bold text-[11px] py-2 whitespace-nowrap ${gap < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {gap > 0 ? '+' : ''}{gap.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="overview" className="p-4 m-0 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 border rounded-lg bg-gray-50">
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Total Allocated</p>
                                <p className="text-lg font-bold">{sku.locations.reduce((acc: number, l: any) => acc + l.target, 0).toLocaleString()}</p>
                            </div>
                            <div className="p-3 border rounded-lg bg-gray-50">
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Total On-hand</p>
                                <p className="text-lg font-bold">{sku.locations.reduce((acc: number, l: any) => acc + l.onHand, 0).toLocaleString()}</p>
                            </div>
                            <div className="p-3 border rounded-lg bg-gray-50">
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Open Purchase Orders</p>
                                <p className="text-lg font-bold">—</p>
                            </div>
                            <div className="p-3 border rounded-lg bg-gray-50">
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Avg Daily Sales</p>
                                <p className="text-lg font-bold">—</p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="promotions" className="p-4 m-0">
                         <div className="space-y-3">
                            <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-blue-900 text-xs">Summer Sale</h4>
                                        <p className="text-[10px] text-blue-700">Flat 20% Off • Ends in 12 days</p>
                                    </div>
                                    <Badge className="bg-blue-200 text-blue-800 hover:bg-blue-300 text-[9px] h-4 px-1.5">Active</Badge>
                                </div>
                                <div className="mt-1.5 text-[10px] text-blue-800">
                                    <span className="font-medium">Impact:</span> +15% expected demand increase
                                </div>
                            </div>
                            
                            <div className="p-3 border border-gray-200 bg-gray-50 rounded-lg opacity-75">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-xs">Weekend Bundle</h4>
                                        <p className="text-[10px] text-gray-600">Buy 2 Get 1 Free • Starts next week</p>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">Scheduled</Badge>
                                </div>
                            </div>
                         </div>
                    </TabsContent>

                    <TabsContent value="chart" className="p-6 m-0">
                        <div className="h-[300px] w-full">
                            {historyLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <span>Loading history...</span>
                                </div>
                            ) : historyData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={historyData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="week" stroke="#9CA3AF" tickLine={false} axisLine={false} />
                                        <YAxis stroke="#9CA3AF" tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="demand" name="Demand" stroke="#7C3AED" strokeWidth={2} dot={{ r: 4, fill: "#7C3AED" }} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="stock" name="Stock Level" stroke="#10B981" strokeWidth={2} dot={{ r: 4, fill: "#10B981" }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
                                    <p className="font-medium">No history data</p>
                                    <p className="text-xs mt-1">Demand and stock history is not available for this SKU.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

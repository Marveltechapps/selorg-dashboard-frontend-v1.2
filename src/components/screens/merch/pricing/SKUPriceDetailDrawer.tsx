import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../../ui/sheet";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Badge } from "../../../ui/badge";
import { Separator } from "../../../ui/separator";
import { ArrowUpRight, ArrowDownRight, TrendingUp, IndianRupee } from "lucide-react";
import { pricingApi } from './pricingApi';
import { toast } from "sonner";

interface SKUPriceDetailDrawerProps {
  sku: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (sku: any) => void;
}

export function SKUPriceDetailDrawer({ sku, open, onOpenChange, onUpdate }: SKUPriceDetailDrawerProps) {
  const [basePrice, setBasePrice] = React.useState<string>("");
  const [sellingPrice, setSellingPrice] = React.useState<string>("");

  const [activeTab, setActiveTab] = React.useState("history");

  React.useEffect(() => {
    if (sku) {
      setBasePrice(sku.base.toString());
      setSellingPrice(sku.sell.toString());
    }
  }, [sku]);

  if (!sku) return null;

  const handleUpdate = () => {
    const updatedSell = parseFloat(sellingPrice);
    const updatedBase = parseFloat(basePrice);
    const cost = sku.cost || 10.50;
    const margin = parseFloat((((updatedSell - cost) / updatedSell) * 100).toFixed(1));
    
    const updatedSku = {
      ...sku,
      base: updatedBase,
      sell: updatedSell,
      margin: margin,
      marginStatus: margin < 10 ? 'critical' : (margin < 15 ? 'warning' : 'healthy')
    };

    onUpdate(updatedSku);
  };

  const historyData = sku.history && sku.history.length > 0 ? sku.history : [
    { date: 'Jan', price: sku.sell * 0.8, competitor: sku.competitor * 0.8 },
    { date: 'Feb', price: sku.sell * 0.85, competitor: sku.competitor * 0.85 },
    { date: 'Mar', price: sku.sell * 0.9, competitor: sku.competitor * 0.9 },
    { date: 'Apr', price: sku.sell * 0.95, competitor: sku.competitor * 0.92 },
    { date: 'May', price: sku.sell * 0.98, competitor: sku.competitor * 0.95 },
    { date: 'Jun', price: sku.sell * 0.99, competitor: sku.competitor * 0.98 },
    { date: 'Jul', price: sku.sell, competitor: sku.competitor },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[800px] sm:w-[700px] overflow-y-auto pr-10">
        <SheetHeader className="mb-6 mr-10">
          <SheetTitle className="flex flex-col gap-1">
            <span className="text-2xl">{sku.name}</span>
            <span className="text-sm font-normal text-slate-500">{sku.code}</span>
          </SheetTitle>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">Beverages</Badge>
            <Badge variant="secondary">Primary Region: East</Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border">
                    <p className="text-sm text-slate-500">Current Margin</p>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-green-600">16.6%</span>
                        <span className="text-xs text-green-600 flex items-center mb-1"><ArrowUpRight size={12} /> 2%</span>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border">
                    <p className="text-sm text-slate-500">vs Competitor</p>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-slate-900">-₹0.21</span>
                        <span className="text-xs text-slate-500 mb-1">Cheaper</span>
                    </div>
                </div>
            </div>

            {/* Edit Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-white shadow-sm">
                <h3 className="font-semibold flex items-center gap-2"><IndianRupee size={16} /> Price Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Base Price</Label>
                        <div className="relative">
                             <span className="absolute left-3 top-2.5 text-slate-500">₹</span>
                             <Input 
                                className="pl-6" 
                                value={basePrice} 
                                onChange={(e) => setBasePrice(e.target.value)}
                             />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Selling Price</Label>
                        <div className="relative">
                             <span className="absolute left-3 top-2.5 text-slate-500">₹</span>
                             <Input 
                                className="pl-6 font-bold" 
                                value={sellingPrice} 
                                onChange={(e) => setSellingPrice(e.target.value)}
                             />
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center text-sm pt-2">
                    <span className="text-slate-500">Cost: ${sku.cost || '10.50'}</span>
                    <Button 
                        type="button"
                        size="sm" 
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={handleUpdate}
                    >
                        Update Price
                    </Button>
                </div>
            </div>

            {/* Analytics Tab */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                    <TabsTrigger value="history" className="flex-1">Price History</TabsTrigger>
                    <TabsTrigger value="breakdown" className="flex-1">Regional Breakdown</TabsTrigger>
                </TabsList>
                <TabsContent value="history" className="h-[350px] mt-4 min-h-[300px] border rounded-lg p-2 bg-slate-50 relative">
                    {activeTab === "history" && (
                        <div className="w-full h-full absolute inset-0 p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart key={`${sku.id}-${activeTab}`} data={historyData} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(v) => `₹${v}`} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Line type="monotone" dataKey="price" stroke="#7C3AED" strokeWidth={3} dot={{r: 4, fill: '#7C3AED'}} activeDot={{r: 6}} name="Selling Price" animationDuration={500} />
                                    <Line type="monotone" dataKey="competitor" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Competitor Avg" animationDuration={500} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="breakdown">
                    <div className="space-y-3 mt-4">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                            <span>East Coast</span>
                            <span className="font-bold">₹14.99</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                            <span>West Coast</span>
                            <span className="font-bold">₹15.50</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                            <span>Central</span>
                            <span className="font-bold">₹14.50</span>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h4 className="font-medium text-amber-900 mb-1 flex items-center gap-2">
                    <TrendingUp size={16} /> Competitive Insight
                </h4>
                <p className="text-sm text-amber-800">
                    Competitor X has lowered their price by ₹0.30 in the last week. Consider matching to maintain market share.
                </p>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

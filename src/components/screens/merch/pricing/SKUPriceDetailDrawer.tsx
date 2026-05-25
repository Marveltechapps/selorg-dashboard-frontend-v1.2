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
    const cost = sku.cost ?? 0;
    const margin = updatedSell > 0 && cost > 0
      ? parseFloat((((updatedSell - cost) / updatedSell) * 100).toFixed(1))
      : sku.margin ?? 0;
    
    const updatedSku = {
      ...sku,
      base: updatedBase,
      sell: updatedSell,
      margin: margin,
      marginStatus: margin < 10 ? 'critical' : (margin < 15 ? 'warning' : 'healthy')
    };

    onUpdate(updatedSku);
  };

  const historyData = sku.history && sku.history.length > 0 ? sku.history.map((h: any) => ({
    date: h.date,
    price: h.price ?? h.sell ?? sku.sell,
    competitor: h.competitor ?? sku.competitor ?? 0,
  })) : [];
  const competitorDiff = (sku.sell ?? 0) - (sku.competitor ?? 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[700px] sm:max-w-[700px] overflow-y-auto px-6 pb-8 pt-4">
        <SheetHeader className="mb-6 px-0">
          <SheetTitle className="flex flex-col gap-1">
            <span className="text-2xl">{sku.name}</span>
            <span className="text-sm font-normal text-slate-500">{sku.code}</span>
          </SheetTitle>
          <div className="flex gap-2 mt-2">
            {sku.category && <Badge variant="outline">{sku.category}</Badge>}
            {sku.region && <Badge variant="secondary">Region: {sku.region}</Badge>}
          </div>
        </SheetHeader>

        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border">
                    <p className="text-sm text-slate-500">Current Margin</p>
                    <div className="flex items-end gap-2">
                        <span className={`text-2xl font-bold ${sku.marginStatus === 'healthy' ? 'text-green-600' : sku.marginStatus === 'warning' ? 'text-amber-600' : 'text-red-600'}`}>
                          {sku.margin?.toFixed?.(1) ?? sku.margin}%
                        </span>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border">
                    <p className="text-sm text-slate-500">vs Competitor</p>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-slate-900">
                          {competitorDiff >= 0 ? '+' : ''}₹{Math.abs(competitorDiff).toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-500 mb-1">
                          {competitorDiff > 0 ? 'Pricier' : competitorDiff < 0 ? 'Cheaper' : 'Matched'}
                        </span>
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
                    <span className="text-slate-500">Cost: ₹{(sku.cost ?? 0).toFixed(2)}</span>
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
                    {historyData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                        No price history yet. Updates will appear here after price changes.
                      </div>
                    ) : activeTab === "history" && (
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
                            <span>Base Price</span>
                            <span className="font-bold">₹{(sku.base ?? 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                            <span>Selling Price</span>
                            <span className="font-bold">₹{(sku.sell ?? 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                            <span>Competitor Avg</span>
                            <span className="font-bold">₹{(sku.competitor ?? 0).toFixed(2)}</span>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h4 className="font-medium text-amber-900 mb-1 flex items-center gap-2">
                    <TrendingUp size={16} /> Competitive Insight
                </h4>
                <p className="text-sm text-amber-800">
                  {sku.competitor > 0
                    ? `Competitor average is ₹${sku.competitor.toFixed(2)}. Your selling price is ${competitorDiff === 0 ? 'matched' : competitorDiff < 0 ? `${Math.abs(competitorDiff).toFixed(2)} lower` : `${competitorDiff.toFixed(2)} higher`}.`
                    : 'No competitor benchmark available for this SKU yet.'}
                </p>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../../ui/sheet";
import { Badge } from "../../../ui/badge";
import { Button } from "../../../ui/button";
import { cn } from "../../../../lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../ui/tabs";
import { ScrollArea } from "../../../ui/scroll-area";
import { Megaphone, Calendar, Tag, CheckCircle2, User, Clock, AlertTriangle, ArrowUpRight, History, Package, TrendingUp, BarChart3, Search } from 'lucide-react';
import { Separator } from "../../../ui/separator";
import { Input } from "../../../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../ui/table";

interface CampaignDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: any; // Using any for now, ideally strictly typed
  onAction?: (id: string, action: string) => void;
}

export function CampaignDrawer({ open, onOpenChange, campaign, onAction }: CampaignDrawerProps) {
  if (!campaign) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[1200px] sm:w-[1100px] p-0 flex flex-col h-full bg-white shadow-2xl border-l-0 overflow-hidden transition-all duration-500">
        <SheetHeader className="p-4 border-b bg-gray-50/50 space-y-3 shrink-0">
            <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                     <Badge 
                        variant="secondary" 
                        className={`mb-1.5 text-[8px] px-1.5 py-0 h-4 font-black uppercase tracking-widest ${
                            campaign.status === 'Active' ? 'bg-green-100 text-green-700' :
                            campaign.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-700' :
                            campaign.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                            campaign.status === 'Paused' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                        }`}
                    >
                        {campaign.status}
                    </Badge>
                    <SheetTitle className="text-lg font-black text-gray-900 leading-tight truncate">{campaign.name}</SheetTitle>
                    <SheetDescription className="text-[9px] font-bold text-gray-400 mt-0.5 truncate">{campaign.tagline}</SheetDescription>
                </div>
                <div className="flex gap-1 shrink-0 mr-12">
                    <Button variant="outline" size="sm" className="h-6 text-[8px] font-black uppercase tracking-wider px-2.5 border" onClick={() => onAction?.(campaign._id, 'Edit')}>Edit</Button>
                    {campaign.status === 'Active' ? (
                        <Button variant="destructive" size="sm" className="h-6 text-[8px] font-black uppercase tracking-wider px-2.5" onClick={() => onAction?.(campaign._id, 'Paused')}>Pause</Button>
                    ) : campaign.status === 'Paused' ? (
                        <Button className="bg-[#7C3AED] text-white h-6 text-[8px] font-black uppercase tracking-wider px-2.5" size="sm" onClick={() => onAction?.(campaign._id, 'Active')}>Resume</Button>
                    ) : null}
                    {campaign.status !== 'Archived' && (
                        <Button variant="ghost" size="sm" className="h-6 text-[8px] font-black uppercase tracking-wider px-2.5 text-gray-400 hover:text-red-600" onClick={() => onAction?.(campaign._id, 'Archived')}>Archive</Button>
                    )}
                </div>
            </div>
            
            <div className="flex flex-wrap gap-y-1.5 gap-x-3 text-[9px] text-[#616161]">
                <div className="flex items-center gap-1 whitespace-nowrap bg-white px-2 py-0.5 rounded border border-gray-100 shadow-sm">
                    <Calendar size={10} className="text-[#7C3AED]" />
                    <span className="font-bold">{campaign.period}</span>
                </div>
                <div className="flex items-center gap-1 whitespace-nowrap bg-white px-2 py-0.5 rounded border border-gray-100 shadow-sm">
                    <User size={10} className="text-[#7C3AED]" />
                    <span className="font-bold">{campaign.owner?.name ?? '—'}</span>
                </div>
                <div className="flex items-center gap-1 whitespace-nowrap bg-white px-2 py-0.5 rounded border border-gray-100 shadow-sm">
                    <Tag size={10} className="text-[#7C3AED]" />
                    <span className="font-bold truncate max-w-[150px]">{campaign.target}</span>
                </div>
            </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
             <Tabs defaultValue="details" className="h-full flex flex-col">
                <div className="px-4 border-b shrink-0 bg-white">
                    <TabsList className="bg-transparent h-auto p-0 space-x-4 mr-12">
                        <TabsTrigger value="details" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] rounded-none px-0 py-2.5 text-[9px] font-black uppercase tracking-widest opacity-60 data-[state=active]:opacity-100">Overview</TabsTrigger>
                        <TabsTrigger value="skus" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] rounded-none px-0 py-2.5 text-[9px] font-black uppercase tracking-widest opacity-60 data-[state=active]:opacity-100">Target SKUs</TabsTrigger>
                        <TabsTrigger value="performance" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] rounded-none px-0 py-2.5 text-[9px] font-black uppercase tracking-widest opacity-60 data-[state=active]:opacity-100">Performance</TabsTrigger>
                        <TabsTrigger value="history" className="bg-transparent border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:text-[#7C3AED] rounded-none px-0 py-2.5 text-[9px] font-black uppercase tracking-widest opacity-60 data-[state=active]:opacity-100">Audit Trail</TabsTrigger>
                    </TabsList>
                </div>

                <ScrollArea className="flex-1">
                    <TabsContent value="details" className="p-4 space-y-5 mt-0 outline-none">
                         {/* KPI Summary */}
                         <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-[#F3E8FF]/50 rounded-xl border border-[#E9D5FF]/50 shadow-sm">
                                <p className="text-[8px] text-[#6D28D9] font-black mb-1 uppercase tracking-widest">Revenue Uplift</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-[#7C3AED] tracking-tighter">{campaign.kpi?.value || '+0%'}</span>
                                    <ArrowUpRight size={10} className="text-[#7C3AED] stroke-[3]" />
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100 shadow-sm">
                                <p className="text-[8px] text-gray-500 font-black mb-1 uppercase tracking-widest">Redemptions</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-gray-900 tracking-tighter">1,240</span>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100 shadow-sm">
                                <p className="text-[8px] text-gray-500 font-black mb-1 uppercase tracking-widest">Margin Hit</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-orange-600 tracking-tighter">-2.1%</span>
                                </div>
                            </div>
                         </div>

                         {/* Config Sections */}
                            <div className="space-y-3">
                            <h3 className="font-black text-[8px] text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1 h-3 bg-[#7C3AED] rounded-full" />
                                Rules & Constraints
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Discount Logic', value: 'Flat 20% Off Base Price' },
                                    { label: 'Minimum Order', value: '₹25.00' },
                                    { label: 'Customer Segment', value: 'Loyalty Tier Gold+' },
                                    { label: 'Stackable', value: 'No', color: 'text-red-600' }
                                ].map((rule) => (
                                    <div key={rule.label} className="flex justify-between p-2.5 border border-gray-100 rounded-lg bg-gray-50/20">
                                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">{rule.label}</span>
                                        <span className={cn("text-[9px] font-black text-gray-900", rule.color)}>{rule.value}</span>
                                </div>
                                ))}
                            </div>
                         </div>
                    </TabsContent>

                    <TabsContent value="skus" className="p-4 mt-0 outline-none space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-[8px] text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1 h-3 bg-[#7C3AED] rounded-full" />
                                Targeted Products (4)
                            </h3>
                            <div className="relative w-40">
                                <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-gray-400" />
                                <Input className="pl-7 h-7 border border-gray-100 text-[9px] rounded-lg bg-gray-50/50" placeholder="Search..." />
                            </div>
                        </div>

                        <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow className="h-7 hover:bg-transparent border-b">
                                        <TableHead className="font-black text-[8px] uppercase tracking-widest px-3 h-7">SKU</TableHead>
                                        <TableHead className="font-black text-[8px] uppercase tracking-widest px-3 h-7">Cat</TableHead>
                                        <TableHead className="font-black text-[8px] uppercase tracking-widest px-3 h-7 text-right">Base</TableHead>
                                        <TableHead className="font-black text-[8px] uppercase tracking-widest px-3 h-7 text-right">Promo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[1, 2, 3, 4].map((i) => (
                                        <TableRow key={i} className="bg-white hover:bg-gray-50/30 border-b last:border-0 transition-colors">
                                            <TableCell className="px-3 py-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-gray-50 rounded-md flex items-center justify-center text-[7px] font-black text-gray-300 border border-gray-100 shrink-0">IMG</div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-[10px] text-gray-900 truncate">SKU {i}02</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-3 py-1.5">
                                                <Badge variant="secondary" className="text-[7px] font-black px-1 h-3 bg-gray-100 text-gray-600">Bev</Badge>
                                            </TableCell>
                                            <TableCell className="px-3 py-1.5 text-right font-bold text-gray-300 line-through text-[9px]">₹12</TableCell>
                                            <TableCell className="px-3 py-1.5 text-right font-black text-green-600 text-[10px]">₹10</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="performance" className="p-4 mt-0 outline-none space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 border border-gray-100 rounded-xl bg-white space-y-2 shadow-sm">
                                <h4 className="text-[8px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                    <BarChart3 size={10} className="text-[#7C3AED]" />
                                    Conv.
                                </h4>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <span className="text-lg font-black text-gray-900 leading-none">24.8%</span>
                                        <p className="text-[8px] text-green-600 font-black mt-1 uppercase tracking-tighter">↑ 12%</p>
                                        </div>
                                    <div className="flex gap-0.5 items-end h-8">
                                        {[40, 60, 45, 70, 55, 85, 65].map((h, i) => (
                                            <div key={i} className="w-1 bg-[#F3E8FF] rounded-t-[1px]" style={{ height: `${h}%` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-3 border border-gray-100 rounded-xl bg-white space-y-2 shadow-sm">
                                <h4 className="text-[8px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                    <TrendingUp size={10} className="text-[#7C3AED]" />
                                    Red.
                                </h4>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <span className="text-lg font-black text-gray-900 leading-none">142</span>
                                        <p className="text-[8px] text-gray-500 font-black mt-1 uppercase tracking-tighter">Daily</p>
                                            </div>
                                    <div className="flex gap-0.5 items-end h-8">
                                        {[30, 45, 35, 50, 40, 60, 45].map((h, i) => (
                                            <div key={i} className={`w-1 rounded-t-[1px] ${i === 5 ? 'bg-[#7C3AED]' : 'bg-gray-100'}`} style={{ height: `${h}%` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-black text-[8px] text-gray-400 uppercase tracking-widest">Regional</h3>
                            <div className="space-y-2">
                                {[
                                    { region: 'NE', value: 450, percent: 36, color: 'bg-[#7C3AED]' },
                                    { region: 'West', value: 320, percent: 25, color: 'bg-[#A855F7]' },
                                    { region: 'Mid', value: 280, percent: 22, color: 'bg-[#C084FC]' },
                                    { region: 'South', value: 190, percent: 15, color: 'bg-[#D8B4FE]' }
                                ].map((item) => (
                                    <div key={item.region} className="space-y-1">
                                        <div className="flex justify-between text-[8px] font-black uppercase tracking-tighter">
                                            <span className="text-gray-500">{item.region}</span>
                                            <span className="text-gray-900">{item.value}</span>
                                        </div>
                                        <div className="h-1 bg-gray-50 rounded-full overflow-hidden">
                                            <div className={cn("h-full rounded-full transition-all duration-700 ease-out", item.color)} style={{ width: `${item.percent}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="p-4 mt-0 outline-none">
                        <div className="space-y-5">
                            <h3 className="font-black text-[8px] text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                <div className="w-1 h-3 bg-[#7C3AED] rounded-full" />
                                Log
                            </h3>
                            <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-gray-100">
                                {[
                                    { user: 'SM', name: 'Sarah', action: 'Approved', time: '2h ago', comment: "Looks good." },
                                    { user: 'AL', name: 'Alice', action: 'Created', time: '5h ago' }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-3 relative z-10">
                                        <div className="shrink-0 w-6 h-6 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[8px] font-black text-[#7C3AED] shadow-sm">
                                            {item.user}
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-gray-900 truncate">
                                                {item.name} <span className="text-gray-400 font-bold ml-1">{item.action}</span>
                                            </p>
                                            <div className="flex items-center gap-1 text-[8px] text-gray-400 font-black uppercase tracking-widest">
                                                <Clock size={8} /> {item.time}
                                            </div>
                                            {item.comment && (
                                                <div className="mt-1 p-2 bg-gray-50/30 border border-gray-100 rounded-lg text-[10px] text-gray-500 font-medium italic">
                                                    "{item.comment}"
                                                </div>
                                            )}
                                    </div>
                                </div>
                            ))}
                            </div>
                        </div>
                    </TabsContent>
                </ScrollArea>
             </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

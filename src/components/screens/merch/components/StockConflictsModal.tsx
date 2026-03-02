import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../../ui/table";
import { Badge } from "../../../ui/badge";
import { AlertTriangle, ArrowRightLeft, Pause, Percent, Loader2 } from "lucide-react";
import { getStockConflicts } from '../../../../api/merch/merchApi';
import { toast } from "sonner";

interface StockConflictsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StockConflictsModal({ isOpen, onClose }: StockConflictsModalProps) {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchConflicts = async () => {
        try {
          setLoading(true);
          const res = await getStockConflicts();
          if (res.success && Array.isArray(res.data)) {
            setConflicts(res.data);
          } else {
            setConflicts([]);
          }
        } catch (error) {
          toast.error("Failed to load stock conflicts");
        } finally {
          setLoading(false);
        }
      };
      fetchConflicts();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
             <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="text-red-600" size={24} />
             </div>
             <div>
                <DialogTitle className="text-xl font-bold">Stock vs Promo Conflicts</DialogTitle>
                <DialogDescription>
                    Detected inventory risks for active and upcoming promotions.
                </DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <div className="border rounded-lg overflow-hidden mt-2">
          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="animate-spin text-[#7C3AED]" />
            </div>
          ) : conflicts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No stock conflicts detected.
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Committed</TableHead>
                  <TableHead>Risk</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {conflicts.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium text-xs">{item.name}</TableCell>
                    <TableCell className="text-xs">{item.category}</TableCell>
                  <TableCell className="text-xs">{item.region}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{item.availableStock}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{item.committedStock}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`
                          ${item.severity === 'High' ? 'bg-red-100 text-red-800 border-red-200' : 
                            item.severity === 'Medium' ? 'bg-orange-100 text-orange-800 border-orange-200' : 
                          'bg-yellow-100 text-yellow-800 border-yellow-200'}
                    `}>
                          {item.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600" title="Pause Promo">
                            <Pause size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600" title="Reduce Discount">
                            <Percent size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-green-600" title="Reallocate Stock">
                            <ArrowRightLeft size={14} />
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </div>
        
        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-xs text-yellow-800 flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5" />
            <p><strong>Recommendation:</strong> For critical risks, pause the promotion immediately or initiate an emergency stock transfer from nearby warehouses.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

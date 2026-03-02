import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "../../../ui/dialog";
import { Collection } from './types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../ui/table";
import { Badge } from "../../../ui/badge";
import { ImageWithFallback } from '../../../figma/ImageWithFallback';
import { ImageIcon, Edit, Copy, Archive } from 'lucide-react';
import { Button } from "../../../ui/button";

interface CollectionsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  onSelectCollection: (collection: Collection) => void;
  onEdit: (collection: Collection) => void;
  onDuplicate: (collection: Collection) => void;
  onArchive: (collection: Collection) => void;
}

export function CollectionsListModal({ 
  isOpen, 
  onClose, 
  collections, 
  onSelectCollection,
  onEdit,
  onDuplicate,
  onArchive
}: CollectionsListModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold">All Collections</DialogTitle>
          <DialogDescription>
            View and manage all your merchandising collections across all regions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-0">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead className="w-[300px]">Collection</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>SKUs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((col) => (
                <TableRow 
                  key={col.id} 
                  className="hover:bg-gray-50 cursor-pointer group"
                  onClick={() => onSelectCollection(col)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center shrink-0">
                        {col.imageUrl ? (
                          <ImageWithFallback src={col.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={16} className="text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{col.name}</p>
                        <p className="text-xs text-gray-500 truncate">{col.description}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{col.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`
                      text-[10px] uppercase font-bold
                      ${col.status === 'Live' ? 'bg-green-50 text-green-700 border-green-200' : 
                        col.status === 'Draft' ? 'bg-gray-50 text-gray-600 border-gray-200' : 
                        col.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        'bg-red-50 text-red-700 border-red-200'}
                    `}>
                      {col.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{col.region}</TableCell>
                  <TableCell className="text-xs">{col.skus.length}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#7C3AED]" onClick={() => onEdit(col)}>
                        <Edit size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#7C3AED]" onClick={() => onDuplicate(col)}>
                        <Copy size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => onArchive(col)}>
                        <Archive size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}



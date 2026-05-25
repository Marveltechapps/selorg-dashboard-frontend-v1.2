import React, { useMemo, useState } from 'react';
import { Zone } from './types';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Badge } from '../../../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../ui/dropdown-menu';
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

interface ZonesManagementPanelProps {
  zones: Zone[];
  selectedZoneId?: string | null;
  onSelectZone: (zone: Zone) => void;
  onEditZone: (zone: Zone) => void;
  onViewZone: (zone: Zone) => void;
  onDeleteZone: (zone: Zone) => void;
  onDuplicateZone: (zone: Zone) => void;
  onToggleVisibility: (zoneId: string) => void;
  onToggleStatus: (zone: Zone) => void;
}

export function ZonesManagementPanel({
  zones,
  selectedZoneId = null,
  onSelectZone,
  onEditZone,
  onViewZone,
  onDeleteZone,
  onDuplicateZone,
  onToggleVisibility,
  onToggleStatus,
}: ZonesManagementPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Zone | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return zones;
    return zones.filter(
      (z) =>
        z.name.toLowerCase().includes(q) ||
        z.type.toLowerCase().includes(q) ||
        z.status.toLowerCase().includes(q),
    );
  }, [zones, search]);

  return (
    <div className="shrink-0 bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#E0E0E0]">
        <button
          type="button"
          className="flex items-center gap-2 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
          <div>
            <h2 className="font-bold text-[#212121] text-sm">Zone management</h2>
            <p className="text-xs text-[#757575]">{zones.length} zones · edit, duplicate, or archive</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search zones…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-44 text-sm"
          />
        </div>
      </div>

      {expanded && (
        <div className="max-h-56 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Area (km²)</TableHead>
                <TableHead className="text-right">Visible</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-8">
                    {zones.length === 0
                      ? 'No zones yet. Create one or seed demo data from the header.'
                      : 'No zones match your search.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((zone) => (
                  <TableRow
                    key={zone.id}
                    className={`group cursor-pointer ${selectedZoneId === zone.id ? 'bg-violet-50 hover:bg-violet-50' : ''}`}
                    onClick={() => onSelectZone(zone)}
                  >
                    <TableCell>
                      <button
                        type="button"
                        className="flex items-center gap-2 font-medium text-left hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectZone(zone);
                        }}
                      >
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                        {zone.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{zone.type}</TableCell>
                    <TableCell>
                      <Badge variant={zone.status === 'Active' ? 'default' : 'secondary'}>{zone.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{zone.areaSqKm ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={zone.isVisible ? 'Hide on map' : 'Show on map'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleVisibility(zone.id);
                        }}
                      >
                        {zone.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              onSelectZone(zone);
                              onViewZone(zone);
                            }}
                          >
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditZone(zone)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDuplicateZone(zone)}>
                            <Copy className="h-4 w-4 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onToggleStatus(zone)}>
                            {zone.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setDeleteTarget(zone)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete zone?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.name}</strong> and its boundary data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTarget) {
                  onDeleteZone(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete zone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

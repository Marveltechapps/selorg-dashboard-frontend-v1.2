import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../ui/table";
import { Badge } from "../../../ui/badge";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Zone, Store } from './types';
import { Search, MapPin, AlertCircle } from 'lucide-react';

interface ActiveZonesModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: Zone[];
  onEditZone: (zone: Zone) => void;
  onViewOnMap: (zone: Zone) => void;
  onArchiveZone?: (zone: Zone) => void;
}

export function ActiveZonesModal({ isOpen, onClose, zones, onEditZone, onViewOnMap, onArchiveZone }: ActiveZonesModalProps) {
    const [search, setSearch] = useState('');
    
    const filteredZones = zones.filter(z => z.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl h-[70vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Active Zones</DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-2 mb-4">
                    <Search className="w-4 h-4 text-gray-500" />
                    <Input 
                        placeholder="Search zones..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        className="max-w-xs"
                    />
                </div>
                <div className="flex-1 overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Zone Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Area (sq km)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredZones.map(zone => (
                                <TableRow key={zone.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                                            {zone.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>{zone.type}</TableCell>
                                    <TableCell>
                                        <Badge variant={zone.status === 'Active' ? 'default' : 'secondary'}>{zone.status}</Badge>
                                    </TableCell>
                                    <TableCell>{zone.areaSqKm}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="sm" onClick={() => onViewOnMap(zone)}>View on Map</Button>
                                        <Button variant="outline" size="sm" onClick={() => onEditZone(zone)}>Edit</Button>
                                        {onArchiveZone && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => onArchiveZone(zone)}
                                            >
                                                Archive
                                            </Button>
                                        )}
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


interface StoreCoverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: Store[];
  zones: Zone[];
  onViewTargeting?: (store: Store) => void;
  onStoresUpdated?: () => void;
}

export function StoreCoverageModal({ isOpen, onClose, stores, zones, onViewTargeting, onStoresUpdated }: StoreCoverageModalProps) {
    const handleFixCoverageGaps = () => {
        const storesWithoutZones = stores.filter(s => s.zones.length === 0);
        if (storesWithoutZones.length === 0) {
            toast.info('All stores have zone coverage');
            return;
        }
        
        // Auto-assign stores to nearest zones (simplified: assign to first available zone)
        let fixedCount = 0;
        storesWithoutZones.forEach(store => {
            const nearestZone = zones.find(z => z.status === 'Active');
            if (nearestZone) {
                const updated = geofenceApi.updateStore(store.id, {
                    zones: [...store.zones, nearestZone.name],
                    serviceStatus: 'Full'
                });
                if (updated) fixedCount++;
            }
        });
        
        if (fixedCount > 0) {
            toast.success(`Fixed coverage for ${fixedCount} store(s)`, {
                description: 'Stores have been assigned to zones and will persist after refresh'
            });
            // Notify parent to reload stores
            if (onStoresUpdated) {
                onStoresUpdated();
            }
        } else {
            toast.error('Failed to fix coverage gaps', {
                description: 'No active zones available to assign'
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[70vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Store Coverage Analysis</DialogTitle>
                </DialogHeader>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="text-yellow-600 h-5 w-5" />
                        <div>
                            <p className="font-medium text-yellow-900">Coverage Gaps Detected</p>
                            <p className="text-sm text-yellow-700">{stores.filter(s => s.zones.length === 0).length} stores have incomplete or missing zone coverage.</p>
                        </div>
                    </div>
                    <Button 
                        variant="outline" 
                        className="border-yellow-600 text-yellow-800 hover:bg-yellow-100"
                        onClick={handleFixCoverageGaps}
                    >
                        Fix Coverage Gaps
                    </Button>
                </div>

                <div className="flex-1 overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Store Name</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Service Status</TableHead>
                                <TableHead>Assigned Zones</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stores.map(store => (
                                <TableRow key={store.id}>
                                    <TableCell className="font-medium">{store.name}</TableCell>
                                    <TableCell>{store.address}</TableCell>
                                    <TableCell>
                                        <Badge variant={store.serviceStatus === 'Full' ? 'default' : store.serviceStatus === 'Partial' ? 'secondary' : 'destructive'}>
                                            {store.serviceStatus} Service
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {store.zones.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {store.zones.map(z => (
                                                    <Badge key={z} variant="outline" className="text-xs">Zone {z}</Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic">No zones</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                         <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => {
                                                if (onViewTargeting) {
                                                    onViewTargeting(store);
                                                }
                                            }}
                                         >
                                            View Targeting
                                         </Button>
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

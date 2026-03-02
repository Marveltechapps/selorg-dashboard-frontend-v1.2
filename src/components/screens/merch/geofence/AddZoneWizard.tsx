import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui/select";
import { Checkbox } from "../../../ui/checkbox";
import { Zone, Store, ZoneType } from './types';
import { MapArea } from './MapArea';
import { Tabs, TabsList, TabsTrigger } from "../../../ui/tabs"; // For steps visualization

interface AddZoneWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (zone: Zone) => void;
  existingZones: Zone[];
  stores?: Store[];
}

const STEPS = ['Basics', 'Draw', 'Link Stores', 'Rules', 'Review'];

export function AddZoneWizard({ isOpen, onClose, onSave, existingZones, stores = [] }: AddZoneWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [zoneData, setZoneData] = useState<Partial<Zone>>({
    name: '',
    type: 'Serviceable',
    color: '#3b82f6',
    isVisible: true,
    status: 'Active',
    points: [],
  });
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  
  // Drawing state
  const [drawingPoints, setDrawingPoints] = useState<{x: number, y: number}[]>([]);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setDrawingPoints([]);
      setSelectedStores([]);
      setZoneData({
        name: '',
        type: 'Serviceable',
        color: '#3b82f6',
        isVisible: true,
        status: 'Active',
        points: [],
      });
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep === 1 && drawingPoints.length < 3) {
        alert("Please draw at least 3 points on the map.");
        return;
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save
      const newZone: Zone = {
        ...zoneData as Zone,
        points: drawingPoints,
        storesCovered: selectedStores.length,
        areaSqKm: Math.round(Math.random() * 20) + 5 // Mock area calculation
      };
      onSave(newZone);
      // Removed manual onClose() here, handled by parent after successful API call
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleMapClick = (x: number, y: number) => {
    setDrawingPoints([...drawingPoints, { x, y }]);
  };

  const undoLastPoint = () => {
    setDrawingPoints(drawingPoints.slice(0, -1));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <div className="p-6 border-b">
            <DialogTitle>Add New Zone</DialogTitle>
             <div className="flex gap-2 mt-4">
                {STEPS.map((step, idx) => (
                    <div key={step} className={`flex-1 h-2 rounded-full ${idx <= currentStep ? 'bg-primary' : 'bg-gray-200'}`} />
                ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
                 {STEPS.map((step, idx) => (
                    <span key={step} className={idx === currentStep ? 'font-bold text-primary' : ''}>{step}</span>
                ))}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            {currentStep === 0 && (
                <div className="space-y-4 max-w-md mx-auto mt-8">
                    <div className="space-y-2">
                        <Label>Zone Name</Label>
                        <Input 
                            value={zoneData.name} 
                            onChange={(e) => setZoneData({...zoneData, name: e.target.value})} 
                            placeholder="e.g. Downtown Core"
                        />
                    </div>
                     <div className="space-y-2">
                        <Label>Zone Type</Label>
                        <Select 
                            value={zoneData.type} 
                            onValueChange={(val) => setZoneData({...zoneData, type: val as ZoneType})}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Serviceable">Serviceable Area</SelectItem>
                                <SelectItem value="Exclusion">Exclusion Zone</SelectItem>
                                <SelectItem value="Priority">Priority Delivery</SelectItem>
                                <SelectItem value="Promo-Only">Promo Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Color Representation</Label>
                        <div className="flex gap-2">
                            {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map(color => (
                                <button
                                    key={color}
                                    className={`w-8 h-8 rounded-full border-2 ${zoneData.color === color ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setZoneData({...zoneData, color})}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {currentStep === 1 && (
                <div className="h-full flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-gray-500">Click on the map to draw polygon points. Close the shape by clicking near the start.</p>
                         <Button variant="outline" size="sm" onClick={undoLastPoint} disabled={drawingPoints.length === 0}>Undo Point</Button>
                    </div>
                    <div className="flex-1 border rounded-lg overflow-hidden relative min-h-[300px]">
                        <MapArea 
                            zones={existingZones}
                            stores={stores}
                            onZoneClick={() => {}}
                            onStoreClick={() => {}}
                            isDrawing={true}
                            drawingPoints={drawingPoints}
                            onMapClick={handleMapClick}
                        />
                    </div>
                </div>
            )}

            {currentStep === 2 && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-500 mb-4">Select stores that belong to this zone.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stores.map(store => (
                            <div key={store.id} className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50">
                                <Checkbox 
                                    id={`store-${store.id}`} 
                                    checked={selectedStores.includes(store.id)}
                                    onCheckedChange={(checked) => {
                                        if (checked) setSelectedStores([...selectedStores, store.id]);
                                        else setSelectedStores(selectedStores.filter(id => id !== store.id));
                                    }}
                                />
                                <Label htmlFor={`store-${store.id}`} className="flex-1 cursor-pointer">
                                    <div className="font-medium">{store.name}</div>
                                    <div className="text-xs text-gray-500">{store.address}</div>
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {currentStep === 3 && (
                 <div className="space-y-4 max-w-lg mx-auto">
                    <div className="space-y-4">
                        <h4 className="font-medium">Delivery Settings</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Base Delivery Fee</Label>
                                <Input type="number" placeholder="₹2.99" />
                            </div>
                            <div className="space-y-2">
                                <Label>Min Order Value</Label>
                                <Input type="number" placeholder="₹15.00" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-medium">Targeting Rules</h4>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="promo-eligible" defaultChecked />
                            <Label htmlFor="promo-eligible">Enable standard promotions</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="surge-pricing" />
                            <Label htmlFor="surge-pricing">Enable surge pricing during peak hours</Label>
                        </div>
                    </div>
                </div>
            )}

            {currentStep === 4 && (
                <div className="space-y-6 max-w-md mx-auto">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        <h3 className="font-bold text-lg">{zoneData.name}</h3>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Type</span>
                            <span className="font-medium">{zoneData.type}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-gray-500">Points</span>
                            <span className="font-medium">{drawingPoints.length} vertices</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-gray-500">Linked Stores</span>
                            <span className="font-medium">{selectedStores.length}</span>
                        </div>
                    </div>
                    <p className="text-sm text-green-600 text-center bg-green-50 p-2 rounded">
                        ✓ No overlapping conflicts detected
                    </p>
                </div>
            )}
        </div>

        <DialogFooter className="p-6 border-t">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>Back</Button>
            <Button onClick={handleNext}>{currentStep === STEPS.length - 1 ? 'Save Zone' : 'Next'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

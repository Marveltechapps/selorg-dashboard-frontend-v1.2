import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { AlertTriangle, UploadCloud, ChevronRight, X, FileText } from 'lucide-react';
import { ChargebackCase, fetchChargebacks } from './refundsApi';
import { ScrollArea } from "../../ui/scroll-area";
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DisputeCenter({ open, onClose }: Props) {
  const [cases, setCases] = useState<ChargebackCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<ChargebackCase | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (open) {
          fetchChargebacks().then(setCases);
      }
  }, [open]);

  // Custom styles to override Dialog max-width constraints - reduce by 5% (from 95vw to 90vw, from 92vh to 87vh)
  useEffect(() => {
    if (open) {
      const style = document.createElement('style');
      style.textContent = `
        [data-slot="dialog-content"] {
          max-width: 90vw !important;
          width: 90vw !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[87vh] flex flex-col p-0 gap-0 bg-gray-50 overflow-hidden" style={{ maxWidth: '90vw', width: '90vw', height: '87vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-white border-b border-gray-200">
             <div className="flex items-center gap-3">
                 <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                     <AlertTriangle size={20} />
                 </div>
                 <div>
                     <DialogTitle className="text-xl font-bold text-gray-900">Dispute Center</DialogTitle>
                     <DialogDescription>Manage chargebacks and evidence submission</DialogDescription>
                 </div>
             </div>
             <Button variant="ghost" onClick={onClose}><X size={20}/></Button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Sidebar List */}
            <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col min-h-0">
                 <div className="p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                     <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Disputes ({cases.length})</h3>
                 </div>
                 <ScrollArea className="flex-1 min-h-0">
                     <div className="divide-y divide-gray-100">
                         {cases.map(c => (
                             <div 
                                key={c.id} 
                                onClick={() => setSelectedCase(c)}
                                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedCase?.id === c.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                             >
                                 <div className="flex justify-between items-start mb-2">
                                     <Badge variant="outline" className={`${c.status === 'open' ? 'text-orange-600 bg-orange-50 border-orange-200' : ''}`}>
                                         {c.status}
                                     </Badge>
                                     <span className="text-xs text-gray-400">{new Date(c.initiatedAt).toLocaleDateString()}</span>
                                 </div>
                                 <h4 className="font-bold text-gray-900 text-sm mb-1">{c.reasonCode}</h4>
                                 <div className="flex justify-between items-center">
                                     <span className="text-sm font-mono text-gray-600">{c.amount} {c.currency}</span>
                                     <span className="text-xs text-gray-400">{c.cardNetwork}</span>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </ScrollArea>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-gray-50 flex flex-col min-h-0 overflow-hidden">
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-8">
                 {selectedCase ? (
                     <div className="max-w-4xl mx-auto space-y-6">
                         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                             <h2 className="text-lg font-bold text-gray-900 mb-4">Case Details: {selectedCase.id}</h2>
                             
                             <div className="grid grid-cols-2 gap-6 mb-6">
                                 <div>
                                     <p className="text-xs text-gray-500 uppercase">Amount Disputed</p>
                                     <p className="text-xl font-bold">{selectedCase.amount} {selectedCase.currency}</p>
                                 </div>
                                 <div>
                                     <p className="text-xs text-gray-500 uppercase">Order Reference</p>
                                     <p className="text-lg font-mono text-blue-600">{selectedCase.orderId}</p>
                                 </div>
                             </div>

                             {/* Timeline: initiatedAt from API; deadline not in ChargebackCase schema yet */}
                             <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                                 <div className="relative">
                                     <div className="absolute -left-[29px] bg-red-500 h-4 w-4 rounded-full border-2 border-white"></div>
                                     <p className="text-sm font-bold text-gray-900">Chargeback Initiated</p>
                                     <p className="text-xs text-gray-500">{new Date(selectedCase.initiatedAt).toLocaleString()}</p>
                                 </div>
                                 <div className="relative">
                                     <div className="absolute -left-[29px] bg-gray-300 h-4 w-4 rounded-full border-2 border-white"></div>
                                     <p className="text-sm font-bold text-gray-500">Evidence Submission Deadline</p>
                                     <p className="text-xs text-gray-500">Not available from API</p>
                                 </div>
                             </div>
                         </div>

                         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                             <h3 className="font-bold text-gray-900 mb-4">Evidence</h3>
                             <input
                               ref={fileInputRef}
                               type="file"
                               accept=".pdf,.png,.jpg,.jpeg"
                               multiple
                               onChange={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 const files = Array.from(e.target.files || []);
                                 const validFiles: File[] = [];
                                 files.forEach(file => {
                                   // Validate file type
                                   const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
                                   if (!validTypes.includes(file.type)) {
                                     toast.error(`${file.name} is not a valid file type. Please use PDF, PNG, or JPG.`);
                                     return;
                                   }
                                   // Validate file size
                                   if (file.size > 10 * 1024 * 1024) {
                                     toast.error(`${file.name} is too large. Max 10MB.`);
                                     return;
                                   }
                                   validFiles.push(file);
                                 });
                                 if (validFiles.length > 0) {
                                   setUploadedFiles(prev => [...prev, ...validFiles]);
                                   toast.success(`${validFiles.length} file(s) added`);
                                 }
                                 // Reset input to allow selecting same file again
                                 if (fileInputRef.current) {
                                   fileInputRef.current.value = '';
                                 }
                               }}
                               className="hidden"
                               id="evidence-upload"
                             />
                             <div 
                               className="border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
                               onClick={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 fileInputRef.current?.click();
                               }}
                               onDrop={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 const files = Array.from(e.dataTransfer.files);
                                 const validFiles: File[] = [];
                                 files.forEach(file => {
                                   const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
                                   if (!validTypes.includes(file.type)) {
                                     toast.error(`${file.name} is not a valid file type. Please use PDF, PNG, or JPG.`);
                                     return;
                                   }
                                   if (file.size > 10 * 1024 * 1024) {
                                     toast.error(`${file.name} is too large. Max 10MB.`);
                                     return;
                                   }
                                   validFiles.push(file);
                                 });
                                 if (validFiles.length > 0) {
                                   setUploadedFiles(prev => [...prev, ...validFiles]);
                                   toast.success(`${validFiles.length} file(s) added`);
                                 }
                               }}
                               onDragOver={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                               }}
                               onDragEnter={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                               }}
                             >
                                 <UploadCloud className="h-10 w-10 text-gray-300 mb-3" />
                                 <p className="text-sm font-medium text-gray-900">Upload evidence files</p>
                                 <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max 10MB each)</p>
                                 <p className="text-xs text-gray-400 mt-1">Click or drag and drop files here</p>
                             </div>
                             {uploadedFiles.length > 0 && (
                               <div className="mt-4 space-y-2">
                                 <p className="text-sm font-medium text-gray-700">Uploaded Files ({uploadedFiles.length}):</p>
                                 <div className="space-y-2 max-h-48 overflow-y-auto">
                                   {uploadedFiles.map((file, idx) => (
                                     <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                       <div className="flex items-center gap-2 flex-1 min-w-0">
                                         <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                         <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                         <span className="text-xs text-gray-500 flex-shrink-0">
                                           ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                         </span>
                                       </div>
                                       <Button
                                         type="button"
                                         variant="ghost"
                                         size="sm"
                                         onClick={(e) => {
                                           e.preventDefault();
                                           e.stopPropagation();
                                           setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
                                           toast.success("File removed");
                                         }}
                                         className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                                       >
                                         <X size={14} />
                                       </Button>
                                     </div>
                                   ))}
                                 </div>
                                 <Button
                                   type="button"
                                   className="w-full mt-4 bg-[#14B8A6] hover:bg-[#0D9488]"
                                   onClick={(e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     if (uploadedFiles.length > 0) {
                                       toast.success(`Submitting ${uploadedFiles.length} evidence file(s)...`);
                                       // In a real app, this would upload to server
                                       setTimeout(() => {
                                         toast.success("Evidence submitted successfully");
                                         setUploadedFiles([]);
                                       }, 1000);
                                     }
                                   }}
                                 >
                                   Submit Evidence ({uploadedFiles.length})
                                 </Button>
                               </div>
                             )}
                         </div>
                     </div>
                 ) : (
                     <div className="h-full flex flex-col items-center justify-center text-gray-400 min-h-[400px]">
                         <AlertTriangle size={48} className="mb-4 opacity-20" />
                         <p>Select a chargeback case to view details</p>
                     </div>
                 )}
                </div>
              </ScrollArea>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
}

export function AddNoteModal({ isOpen, onClose, onConfirm }: AddNoteModalProps) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!note.trim()) return;
    setLoading(true);
    await onConfirm(note);
    setLoading(false);
    setNote("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Internal Note</DialogTitle>
          <DialogDescription>Add a note to the alert timeline for other dispatchers.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea 
            value={note} 
            onChange={(e) => setNote(e.target.value)} 
            rows={4}
            placeholder="Type your note here..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || !note.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

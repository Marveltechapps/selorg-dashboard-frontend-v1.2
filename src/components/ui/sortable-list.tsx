/**
 * Simple drag-and-drop sortable list (HTML5 DnD).
 */
import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';

export interface SortableListProps<T> {
  items: T[];
  keyFn: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  onReorder: (newOrder: T[]) => void;
  /** Optional class for the list container */
  className?: string;
  /** Optional class for each row */
  itemClassName?: string;
}

export function SortableList<T>({
  items,
  keyFn,
  renderItem,
  onReorder,
  className = '',
  itemClassName = '',
}: SortableListProps<T>) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.setData('application/json', JSON.stringify({ id }));
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    setDraggedId(null);
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;
    const keys = items.map(keyFn);
    const from = keys.indexOf(sourceId);
    const to = keys.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...items];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    onReorder(next);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <ul className={`space-y-1 ${className}`}>
      {items.map((item, index) => {
        const id = keyFn(item);
        const isDragging = draggedId === id;
        const isOver = dragOverId === id;
        return (
          <li
            key={id}
            draggable
            onDragStart={(e) => handleDragStart(e, id)}
            onDragOver={(e) => handleDragOver(e, id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, id)}
            onDragEnd={handleDragEnd}
            className={`
              flex items-center gap-2 rounded-lg border bg-white p-2 transition
              ${isDragging ? 'opacity-50' : ''}
              ${isOver ? 'border-[#034703] ring-1 ring-[#034703]' : 'border-[#e4e4e7]'}
              ${itemClassName}
            `}
          >
            <span className="cursor-grab active:cursor-grabbing text-[#a1a1aa]" aria-hidden>
              <GripVertical className="h-4 w-4" />
            </span>
            <span className="flex-1 min-w-0">{renderItem(item, index)}</span>
          </li>
        );
      })}
    </ul>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Map, Settings2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { fetchShelfView } from '../../../api/inventory-management/shelfView.api';
import { DEFAULT_STORE_ZONE } from '../../../api/inventory-management/shelves.api';

type ShelfCell = {
  location_code: string;
  aisle: string;
  shelf_number: number;
};

function normalizeLocation(code: string | undefined | null): string {
  return String(code || '')
    .trim()
    .toUpperCase();
}

function flattenAisles(aisles: any[]): ShelfCell[] {
  const cells: ShelfCell[] = [];
  for (const aisleObj of aisles) {
    const aisle = aisleObj?.aisle ?? '?';
    for (const shelf of aisleObj?.shelves || []) {
      cells.push({
        location_code: shelf.location_code,
        aisle: String(aisle),
        shelf_number: shelf.shelf_number ?? 0,
      });
    }
  }
  return cells;
}

export function PutawayRoutingGuide({
  storeId,
  targetLocation,
  refreshKey = 0,
  onOpenStoreSetup,
}: {
  storeId: string;
  targetLocation?: string | null;
  refreshKey?: number;
  onOpenStoreSetup?: () => void;
}) {
  const [aisles, setAisles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLDivElement>(null);
  const [pathD, setPathD] = useState<string | null>(null);

  const targetNorm = normalizeLocation(targetLocation);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const data = await fetchShelfView({
          storeId,
          zone: DEFAULT_STORE_ZONE,
          aisle: 'all',
          shelf_location: targetLocation || undefined,
        });
        if (cancelled) return;
        const list = Array.isArray(data?.aisles) ? data.aisles : [];
        setAisles(list);
      } catch {
        if (!cancelled) {
          setAisles([]);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId, targetLocation, refreshKey]);

  const cells = useMemo(() => flattenAisles(aisles), [aisles]);
  const hasMap = cells.length > 0;
  const targetIndex = useMemo(
    () => cells.findIndex((c) => normalizeLocation(c.location_code) === targetNorm),
    [cells, targetNorm]
  );
  const targetFound = targetIndex >= 0;

  useEffect(() => {
    if (!hasMap || !targetFound) {
      setPathD(null);
      return;
    }
    const draw = () => {
      const grid = gridRef.current;
      const start = startRef.current;
      const target = targetRef.current;
      if (!grid || !start || !target) {
        setPathD(null);
        return;
      }
      const g = grid.getBoundingClientRect();
      const s = start.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      const x1 = s.left + s.width / 2 - g.left;
      const y1 = s.top + s.height / 2 - g.top;
      const x2 = t.left + t.width / 2 - g.left;
      const y2 = t.top + t.height / 2 - g.top;
      const midX = (x1 + x2) / 2;
      setPathD(`M ${x1} ${y1} Q ${midX} ${y1} ${x2} ${y2}`);
    };
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [hasMap, targetFound, aisles, targetNorm, loading]);

  return (
    <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm flex-1 p-6 relative overflow-hidden min-h-[200px] flex flex-col">
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur p-2 rounded border border-[#E0E0E0] shadow-sm max-w-[220px]">
        <h4 className="font-bold text-[#212121] text-sm flex items-center gap-2">
          <Map size={14} /> Routing Guide
        </h4>
        <p className="text-xs text-[#616161]">
          {targetLocation
            ? targetFound
              ? `Route to ${targetLocation}`
              : `Target ${targetLocation} not on floor map`
            : 'Select a putaway task to see the route'}
        </p>
      </div>

      <div
        ref={gridRef}
        className="w-full flex-1 bg-[#F5F5F5] rounded-lg border border-[#E0E0E0] relative flex items-center justify-center mt-12 min-h-[140px]"
      >
        {loading ? (
          <span className="text-sm text-[#9E9E9E]">Loading store layout...</span>
        ) : loadError ? (
          <span className="text-sm text-[#EF4444]">Failed to load layout</span>
        ) : !hasMap ? (
          <div className="text-center px-4">
            <p className="text-sm text-[#616161] font-bold mb-2">No shelves configured</p>
            <p className="text-xs text-[#9E9E9E] mb-3">
              Add shelf locations in Store Setup to enable routing.
            </p>
            {onOpenStoreSetup && (
              <button
                type="button"
                onClick={onOpenStoreSetup}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[#1677FF] border border-[#91CAFF] rounded-lg hover:bg-[#F0F7FF]"
              >
                <Settings2 size={14} /> Open Store Setup
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 w-full h-full p-4 overflow-auto content-start">
              {aisles.map((aisleObj: any) => (
                <div key={aisleObj.aisle} className="flex flex-col gap-1.5">
                  <div className="text-[10px] font-bold text-[#757575] text-center uppercase">
                    Aisle {aisleObj.aisle}
                  </div>
                  {(aisleObj.shelves || []).map((shelf: any, shelfIdx: number) => {
                    const loc = shelf.location_code;
                    const isTarget = normalizeLocation(loc) === targetNorm;
                    const isStart =
                      aisleObj === aisles[0] && shelfIdx === 0 && !isTarget;
                    return (
                      <div
                        key={loc}
                        ref={isTarget ? targetRef : isStart ? startRef : undefined}
                        className={cn(
                          'h-10 rounded border-2 flex items-center justify-center text-[10px] font-mono font-bold transition-all',
                          isTarget
                            ? 'border-[#4ADE80] bg-[#F0FDF4] text-[#16A34A] ring-2 ring-[#4ADE80]/30 scale-105 shadow-md z-10'
                            : isStart
                              ? 'border-[#1677FF] bg-[#E6F7FF] text-[#1677FF]'
                              : 'border-[#E0E0E0] bg-white text-[#9E9E9E]'
                        )}
                        title={loc}
                      >
                        {isTarget ? 'TARGET' : isStart ? 'START' : loc.split('-').slice(-2).join('-')}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {pathD && targetFound && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
                <path
                  d={pathD}
                  fill="none"
                  stroke="#1677FF"
                  strokeWidth="3"
                  strokeDasharray="8 4"
                  className="animate-pulse"
                />
              </svg>
            )}
          </>
        )}
      </div>
    </div>
  );
}

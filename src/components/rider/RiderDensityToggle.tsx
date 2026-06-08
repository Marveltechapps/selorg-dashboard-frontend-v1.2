import { LayoutGrid, Rows3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRiderOps } from './RiderOpsProvider';

export function RiderDensityToggle() {
  const { density, setDensity } = useRiderOps();

  return (
    <div className="hidden sm:flex items-center rounded-lg border border-[#e4e4e7] p-0.5 bg-[#fafafa]">
      <button
        type="button"
        title="Comfortable density"
        onClick={() => setDensity('comfortable')}
        className={cn(
          'p-1.5 rounded-md transition-colors',
          density === 'comfortable' ? 'bg-white text-[#18181b] shadow-sm' : 'text-[#71717a] hover:text-[#18181b]'
        )}
      >
        <LayoutGrid size={16} />
      </button>
      <button
        type="button"
        title="Compact density"
        onClick={() => setDensity('compact')}
        className={cn(
          'p-1.5 rounded-md transition-colors',
          density === 'compact' ? 'bg-white text-[#18181b] shadow-sm' : 'text-[#71717a] hover:text-[#18181b]'
        )}
      >
        <Rows3 size={16} />
      </button>
    </div>
  );
}

import { cn } from '@/lib/utils';

/** Standard admin modal / drawer form padding and vertical rhythm */
export const adminFormClass = 'space-y-4 px-6 py-4';

/** Two-column responsive field grid (Master Data default) */
export const adminFormGrid2Class = 'grid grid-cols-1 md:grid-cols-2 gap-3';

/** Three-column responsive field grid */
export const adminFormGrid3Class = 'grid grid-cols-1 md:grid-cols-3 gap-3';

/** Single field: label + control + hint spacing */
export const adminFieldClass = 'space-y-2';

/** Section heading inside long admin forms */
export const adminSectionTitleClass = 'text-sm font-semibold text-[#18181b]';

/** Validation error border on Input / SelectTrigger / Textarea */
export function adminInputErrorClass(
  field: string,
  errors: Record<string, string | undefined>
) {
  return cn(errors[field] && 'border-rose-500 focus-visible:ring-rose-500/30');
}

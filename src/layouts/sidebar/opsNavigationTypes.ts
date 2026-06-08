import type { LucideIcon } from 'lucide-react';

export interface OpsNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: string;
  /** Legacy route ids that redirect to this item */
  aliases?: string[];
  hidden?: boolean;
}

export interface OpsNavSection {
  category: string;
  items: OpsNavItem[];
  collapseDefault?: boolean;
}

export function buildTabAliases(sections: OpsNavSection[]): Record<string, string> {
  return sections
    .flatMap((s) => s.items.flatMap((item) => (item.aliases ?? []).map((alias) => [alias, item.id] as const)))
    .reduce<Record<string, string>>((acc, [alias, id]) => {
      acc[alias] = id;
      return acc;
    }, {});
}

export function resolveOpsTab(tab: string, aliases: Record<string, string>): string {
  return aliases[tab] ?? tab;
}

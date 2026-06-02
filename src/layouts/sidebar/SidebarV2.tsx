import React from 'react';
import { Sidebar } from '../../components/Sidebar';

interface SidebarV2Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

/** @deprecated Use Sidebar — both share categorized darkstore navigation. */
export function SidebarV2(props: SidebarV2Props) {
  return <Sidebar {...props} />;
}

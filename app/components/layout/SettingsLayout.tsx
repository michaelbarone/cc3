'use client';

import { ReactNode } from 'react';
import SettingsLayout from '@/app/settings/layout';

interface SettingsLayoutWrapperProps {
  children: ReactNode;
}

export default function SettingsLayoutWrapper({ children }: SettingsLayoutWrapperProps) {
  return <SettingsLayout>{children}</SettingsLayout>;
}

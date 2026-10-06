import { ReactNode } from 'react';
import Sidebar from '@/components/admin/Sidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-dequino-neutral font-lato">
      <Sidebar />
      <main className="flex-1 h-screen overflow-y-auto bg-dequino-neutral">
        {children}
      </main>
    </div>
  );
}

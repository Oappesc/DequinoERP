import { ReactNode } from 'react';
import Sidebar from '@/components/admin/Sidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-dequino-neutral font-lato">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-dequino-neutral min-w-0">
        {children}
      </main>
    </div>
  );
}

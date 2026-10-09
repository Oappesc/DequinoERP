'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ShoppingCart, 
  BarChart3, 
  Users, 
  Package, 
  Menu, 
  X, 
  LogOut,
  Handshake,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const menuItems = [
  { name: 'Ventas', href: '/admin', icon: ShoppingCart },
  { name: 'Consignación', href: '/admin/consignacion', icon: Handshake },
  { name: 'Reportes', href: '/admin/reportes', icon: BarChart3 },
  { name: 'Clientes', href: '/admin/clientes', icon: Users },
  { name: 'Inventario', href: '/admin/inventario', icon: Package },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false); // Mobile drawer
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop toggle
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    localStorage.setItem('sidebar_collapsed', (!isCollapsed).toString());
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-dequino-secondary text-white sticky top-0 z-40 shadow-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-[#B38E5D] to-[#8C6D45] flex items-center justify-center font-bold text-xs text-white shadow-sm">
            DQ
          </div>
          <span className="font-bold tracking-wide">Dequino ERP - Admin</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white transition"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-[#1F2920] text-white/80 transform transition-all duration-300 ease-in-out flex flex-col shadow-2xl shrink-0 h-screen lg:translate-x-0 lg:relative lg:shadow-none
          ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        <div className={`hidden lg:flex items-center px-4 py-6 border-b border-white/10 relative transition-all duration-300 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-[#B38E5D] to-[#8C6D45] text-white font-bold shadow-sm flex items-center justify-center text-lg">
            DQ
          </div>
          <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
            <h2 className="font-bold text-white text-lg leading-tight">Distribuidora</h2>
            <p className="text-xs font-semibold text-[#B38E5D] uppercase tracking-widest">Admin Panel</p>
          </div>
          
          <button 
            onClick={toggleCollapse}
            className="absolute -right-3 top-7 bg-[#1F2920] text-white/60 hover:text-white rounded-full p-1 border border-white/10 shadow-sm hidden lg:flex hover:scale-110 transition-transform"
            title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.name} 
                href={item.href as any}
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-3 rounded-2xl font-medium transition-all duration-150
                  ${isActive 
                    ? 'bg-dequino-primary text-white shadow-sm shadow-dequino-primary/20' 
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                  }
                  ${isCollapsed ? 'lg:justify-center' : ''}
                `}
              >
                <div className={`p-2 shrink-0 rounded-xl ${isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-white/70'}`}>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100 w-auto'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button 
            title={isCollapsed ? 'Cerrar Sesión' : undefined}
            className={`flex items-center gap-3 px-3 py-3 w-full rounded-2xl font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors group ${isCollapsed ? 'lg:justify-center' : ''}`}
          >
            <div className="p-2 shrink-0 rounded-xl bg-white/5 group-hover:bg-rose-500/20 group-hover:text-rose-300 transition-colors">
              <LogOut size={18} />
            </div>
            <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'lg:opacity-0 lg:w-0' : 'opacity-100 w-auto'}`}>
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

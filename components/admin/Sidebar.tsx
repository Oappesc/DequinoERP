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
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center font-bold text-sm">
            DQ
          </div>
          <span className="font-bold tracking-wide">Administración</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsOpen(false)} 
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-slate-900 text-slate-300 transform transition-all duration-300 ease-in-out flex flex-col shadow-2xl shrink-0 h-screen md:translate-x-0 md:relative md:shadow-none
          ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full'}
          ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        `}
      >
        <div className={`hidden md:flex items-center px-4 py-6 border-b border-slate-800 relative transition-all duration-300 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 shrink-0 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-violet-600/20">
            DQ
          </div>
          <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
            <h2 className="font-bold text-white text-lg leading-tight">Distribuidora</h2>
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Admin Panel</p>
          </div>
          
          <button 
            onClick={toggleCollapse}
            className="absolute -right-3 top-7 bg-slate-800 text-slate-400 hover:text-white rounded-full p-1 border border-slate-700 shadow-sm hidden md:flex hover:scale-110 transition-transform"
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
                className={`flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all duration-300
                  ${isActive 
                    ? 'bg-violet-600/10 text-violet-400' 
                    : 'hover:bg-slate-800 hover:text-white'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <div className={`p-2 shrink-0 rounded-lg ${isActive ? 'bg-violet-600/20 text-violet-400' : 'bg-slate-800'}`}>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button 
            title={isCollapsed ? 'Cerrar Sesión' : undefined}
            className={`flex items-center gap-3 px-3 py-3 w-full rounded-xl font-medium text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-all duration-300 group ${isCollapsed ? 'justify-center' : ''}`}
          >
            <div className="p-2 shrink-0 rounded-lg bg-slate-800 group-hover:bg-rose-500/10 group-hover:text-rose-400 transition-colors">
              <LogOut size={18} />
            </div>
            <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

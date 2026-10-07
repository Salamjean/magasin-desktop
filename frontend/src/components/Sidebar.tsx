import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Logo } from './Logo';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  Users,
  Building2,
  TrendingUp,
  Receipt,
  ClipboardList,
  Truck,
  DollarSign,
  Settings,
  RefreshCw,
  Clock,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  PackageCheck,
  X,
  Bike,
  Tag
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}

interface NavCategory {
  title?: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, mobileOpen, setMobileOpen }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const role = user?.role || 'admin';

  // Navigation Items groupées par Catégories selon le Rôle
  const adminNavCategories: NavCategory[] = [
    {
      title: 'Vue d’ensemble',
      items: [
        { label: 'Tableau de bord', path: '/', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Stocks & Catalogue',
      items: [
        { label: 'Produits & Articles', path: '/products', icon: Package },
        { label: 'Catégories', path: '/categories', icon: Layers },
        { label: 'Mouvements Stock', path: '/stock', icon: TrendingUp },
        { label: 'Inventaires Physiques', path: '/inventories', icon: ClipboardList },
      ]
    },
    {
      title: 'Ventes & Finances',
      items: [
        { label: 'Historique des Ventes', path: '/sales', icon: Receipt },
        { label: 'Clients & Crédits', path: '/customers', icon: Users },
        { label: 'Gestion des Caisses', path: '/cash-registers', icon: DollarSign },
        { label: 'Dépenses & Charges', path: '/expenses', icon: DollarSign },
      ]
    },
    {
      title: 'Achats & Fournisseurs',
      items: [
        { label: 'Achats & Commandes', path: '/purchases', icon: ClipboardList },
        { label: 'Fournisseurs', path: '/suppliers', icon: Building2 },
      ]
    },
    {
      title: 'Système & Paramètres',
      items: [
        { label: 'Livraisons & OTP', path: '/deliveries', icon: Truck },
        { label: 'Utilisateurs & Droits', path: '/users', icon: ShieldCheck },
        { label: 'Paramètres Généraux', path: '/settings', icon: Settings },
        { label: 'Étiquettes rayons', path: '/labels', icon: Tag },
      ]
    },
  ];

  const caissierNavCategories: NavCategory[] = [
    {
      title: 'Vue d’ensemble',
      items: [
        { label: 'Tableau de bord', path: '/', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Caisse & Ventes',
      items: [
        { label: 'Point de vente (TPV)', path: '/pos', icon: ShoppingCart, highlight: true },
        { label: 'Gestion de caisse', path: '/cash-registers', icon: DollarSign },
        { label: 'Clients & Crédits', path: '/customers', icon: Users },
        { label: 'Mes ventes', path: '/cashier-sales', icon: Receipt },
        { label: 'Retours / annulations', path: '/returns', icon: RefreshCw },
        { label: 'Livraisons', path: '/deliveries', icon: Truck },
        { label: 'Étiquettes rayons', path: '/labels', icon: Tag },
      ]
    }
  ];

  const magasinierNavCategories: NavCategory[] = [
    {
      title: 'Vue Globale',
      items: [
        { label: 'Tableau de bord', path: '/', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Mouvements & Stocks',
      items: [
        { label: 'Mouvement de stock', path: '/stock', icon: TrendingUp },
        { label: 'Entrée de stock', path: '/stock/in', icon: ArrowDownToLine },
        { label: 'Sortie de stock', path: '/stock/out', icon: ArrowUpFromLine },
        { label: 'Inventaires', path: '/inventories', icon: ClipboardList },
      ]
    },
    {
      title: 'Commandes & Produits',
      items: [
        { label: 'Réceptions commandes', path: '/purchases', icon: PackageCheck },
        { label: 'Catalogue de produits', path: '/products', icon: Package },
        { label: 'Alertes ruptures', path: '/alerts', icon: AlertTriangle, highlight: true },
        { label: 'Étiquettes rayons', path: '/labels', icon: Tag },
      ]
    }
  ];

  const livreurNavCategories: NavCategory[] = [
    {
      title: 'Navigation',
      items: [
        { label: 'Tableau de bord', path: '/', icon: LayoutDashboard },
        { label: 'Mes livraisons', path: '/deliveries', icon: Package },
      ]
    }
  ];

  let currentNavCategories = adminNavCategories;
  if (role === 'caissier') currentNavCategories = caissierNavCategories;
  if (role === 'magasinier') currentNavCategories = magasinierNavCategories;
  if (role === 'livreur') currentNavCategories = livreurNavCategories;

  // Formatage de la date en français avec majuscule
  const rawDateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const formattedDate = rawDateStr.charAt(0).toUpperCase() + rawDateStr.slice(1);
  const formattedTime = now.toLocaleTimeString('fr-FR');

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar (Desktop Detached & Mobile Flush Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 h-full rounded-l-none rounded-r-3xl border-y-0 border-l-0 border-r-2 border-[#0055b8] md:static md:my-3 md:ml-3 md:rounded-3xl md:border-2 md:border-[#0055b8] md:h-[calc(100vh-1.5rem)] flex flex-col justify-between transition-all duration-300 select-none bg-white shadow-2xl md:shadow-xl md:shadow-blue-500/10 overflow-hidden flex-shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-[76px] w-72' : 'w-72 md:w-64'}`}
      >
        {/* Top Header: Logo and Store Name + Close button on mobile */}
        <div
          className={`border-b border-blue-50 flex items-center justify-between transition-all relative ${
            collapsed ? 'md:py-3 md:px-1 py-4 px-3' : 'py-3.5 px-3'
          }`}
        >
          <div className="w-full flex flex-col items-center justify-center">
            <Logo size={collapsed ? 38 : 56} />
            {(!collapsed || mobileOpen) && (
              <span className="text-[11px] font-black text-slate-800 tracking-tight text-center uppercase truncate max-w-[190px] mt-1.5 leading-tight">
                {settings.company_name || 'GESTiMAG'}
              </span>
            )}
          </div>

          {/* Close Button on Mobile Drawer */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden absolute right-3 top-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            title="Fermer le menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links Grouped by Categories */}
        <div
          className={`flex-1 overflow-y-auto space-y-3 transition-all scrollbar-thin scrollbar-thumb-slate-200 ${
            collapsed ? 'md:px-1.5 md:py-3 px-2.5 py-3' : 'px-2.5 py-3'
          }`}
        >
          {currentNavCategories.map((cat, catIdx) => (
            <div key={cat.title || catIdx} className="space-y-1">
              {/* Category Title */}
              {cat.title && (
                <>
                  {(!collapsed || mobileOpen) ? (
                    <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                      {cat.title}
                    </div>
                  ) : (
                    catIdx > 0 && <div className="my-2 border-t border-slate-100" />
                  )}
                </>
              )}

              {/* Items in Category */}
              {cat.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={item.label}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center rounded-2xl font-bold text-[13px] transition-all group relative ${
                      collapsed
                        ? 'md:justify-center md:w-11 md:h-11 md:mx-auto gap-2.5 px-3 py-2.5 w-full'
                        : 'gap-2.5 px-3 py-2.5 w-full'
                    } ${
                      isActive
                        ? 'bg-[#0055b8] text-white shadow-md shadow-[#0055b8]/25'
                        : item.highlight
                        ? 'bg-blue-50 text-[#0055b8] hover:bg-blue-100/70 border border-blue-200/60'
                        : 'text-slate-700 hover:text-[#0055b8] hover:bg-slate-50'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                        isActive
                          ? 'text-white scale-110'
                          : 'text-slate-400 group-hover:text-[#0055b8] group-hover:scale-110'
                      }`}
                    />

                    {(!collapsed || mobileOpen) && (
                      <span className="truncate font-bold">{item.label}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Couche Bleue en Bas: Date et Heure en direct */}
        <div className="bg-[#0055b8] text-white p-3 border-t border-blue-400/30 flex-shrink-0">
          {(!collapsed || mobileOpen) ? (
            <div className="flex flex-col gap-1 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold tracking-wider">
                <Clock className="w-3.5 h-3.5 text-blue-200 animate-pulse" />
                <span>{formattedTime}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-blue-100/90 font-medium">
                <Calendar className="w-3 h-3 text-blue-200" />
                <span className="truncate">{formattedDate}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-0.5 text-center" title={`${formattedTime} - ${formattedDate}`}>
              <Clock className="w-4 h-4 text-blue-100 mb-0.5 animate-pulse" />
              <span className="text-[9px] font-mono font-bold text-white leading-tight">
                {formattedTime.substring(0, 5)}
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  ShoppingCart,
  User,
  LogOut,
  ChevronDown,
  Shield,
  CheckCircle2,
  AlertCircle,
  Menu,
  Clock,
  Settings
} from 'lucide-react';
import Swal from 'sweetalert2';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout, switchRole } = useAuth();
  const { status, syncNow } = useSync();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString('fr-FR'));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('fr-FR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleManualSync = async () => {
    const result = await syncNow();
    if (result.success) {
      // Aucun pop-up bloquant au milieu de l'écran !
      setSyncFeedback('Synchronisé !');
      setTimeout(() => setSyncFeedback(null), 2000);
    } else {
      setSyncFeedback('Mode hors-ligne');
      setTimeout(() => setSyncFeedback(null), 2500);
    }
  };

  return (
    <header className="my-3 mr-3 ml-3 md:ml-0 px-4 sm:px-6 bg-[#0055b8] text-white rounded-3xl border-2 border-white shadow-xl shadow-blue-900/15 sticky top-3 z-20 flex items-center justify-between h-16 select-none flex-shrink-0">
      {/* Left side: White Burger Toggle Button Only */}
      <div className="flex items-center">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2.5 rounded-2xl bg-white text-[#0055b8] hover:bg-slate-100 shadow-md transition active:scale-95 flex items-center justify-center"
            title="Réduire / Agrandir le menu"
          >
            <Menu className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Right side: En Ligne, Bouton Sync avec Compteur, Horloge & Profil */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        
        {/* 1. BADGE D'ÉTAT DU RÉSEAU (SÉPARÉ) */}
        <div 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold border transition shadow-xs ${
            status.isOnline 
              ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30' 
              : 'bg-rose-500/25 text-rose-100 border-rose-400/30'
          }`}
          title={status.isOnline ? 'Serveur connecté et opérationnel' : 'Serveur distant inaccessible - Mode hors-ligne actif'}
        >
          {status.isOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Wifi className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden sm:inline">En ligne</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <WifiOff className="w-3.5 h-3.5 text-rose-300" />
              <span className="hidden sm:inline">Hors-ligne</span>
            </>
          )}
        </div>

        {/* 2. BOUTON DE SYNCHRONISATION SÉPARÉ AVEC BADGE DE COMPTEUR */}
        <div className="relative">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={status.isSyncing}
            className={`relative p-2.5 rounded-2xl border transition active:scale-95 shadow-xs flex items-center justify-center group ${
              status.isSyncing
                ? 'bg-white/30 border-white/40 text-cyan-200 cursor-wait'
                : status.unsyncedCount > 0
                ? 'bg-white/20 hover:bg-white/30 border-amber-300/40 text-white'
                : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
            }`}
            title={
              status.isSyncing
                ? 'Synchronisation en cours...'
                : status.unsyncedCount > 0
                ? `${status.unsyncedCount} élément(s) non synchronisé(s). Cliquez pour envoyer les données.`
                : 'Toutes les données sont synchronisées. Cliquez pour vérifier.'
            }
          >
            <RefreshCw
              className={`w-4 h-4 transition-transform duration-300 ${
                status.isSyncing ? 'animate-spin text-cyan-300' : 'group-hover:rotate-180'
              }`}
            />

            {/* BADGE COMPTEUR DES NON SYNCHRONISÉS */}
            {status.unsyncedCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-mono font-black text-[10px] flex items-center justify-center border-2 border-[#0055b8] shadow-md animate-pulse">
                {status.unsyncedCount > 99 ? '99+' : status.unsyncedCount}
              </span>
            )}
          </button>

          {/* Feedback discret sous le bouton sans pop-up bloquant */}
          {syncFeedback && (
            <div className="absolute right-0 top-full mt-1.5 px-2.5 py-1 bg-slate-900/95 text-white text-[10px] font-bold rounded-xl border border-white/20 shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 z-50">
              {syncFeedback}
            </div>
          )}
        </div>

        {/* Real-time Clock */}
        <div className="hidden sm:flex items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-1.5 rounded-2xl text-white font-mono text-xs font-bold shadow-xs">
          <Clock className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>{time}</span>
        </div>

        {/* User Profile Button displaying user's Name */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 py-1 px-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 transition text-white shadow-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-white text-[#0055b8] flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0 overflow-hidden border border-white/40">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className="text-left hidden sm:block">
              <span className="block text-xs font-bold leading-tight truncate max-w-[150px]">
                {user?.name || 'Utilisateur'}
              </span>
              <span className="block text-[10px] text-blue-100 font-medium capitalize leading-tight">
                {user?.role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-blue-200" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-60 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0055b8] text-white flex items-center justify-center font-black text-xs flex-shrink-0 overflow-hidden shadow-xs border border-blue-200">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Connecté en tant que</p>
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email || user?.phone}</p>
                </div>
              </div>

              <div className="p-1 space-y-0.5">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Mon Profil</span>
                </button>

                {user?.role === 'admin' && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Paramètres</span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

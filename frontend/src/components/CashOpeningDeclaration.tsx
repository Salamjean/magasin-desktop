import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, CashRegister, CashSession } from '../db/db';
import { syncService } from '../db/syncService';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Laptop, ArrowLeft, Check, Info, Store, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

interface CashOpeningDeclarationProps {
  onSessionOpened?: (session: CashSession) => void;
}

export const CashOpeningDeclaration: React.FC<CashOpeningDeclarationProps> = ({ onSessionOpened }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const currency = settings.currency || 'FCFA';

  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState<number | null>(null);
  const [openingAmount, setOpeningAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadRegisters();
  }, []);

  const loadRegisters = async () => {
    try {
      const registers = await db.cash_registers.toArray();
      const mapByCode = new Map<string, CashRegister>();
      const duplicateIds: number[] = [];

      for (const reg of registers) {
        const key = (reg.code || reg.name || '').trim().toUpperCase();
        if (!mapByCode.has(key)) {
          mapByCode.set(key, { ...reg });
        } else {
          if (reg.id) duplicateIds.push(reg.id);
          const existing = mapByCode.get(key)!;
          // Si l'un des doublons est désactivé, propager la désactivation
          const isDeactivated =
            reg.is_active === false ||
            (reg.is_active as any) === 0 ||
            (reg.is_active as any) === '0' ||
            (reg.is_active as any) === 'false' ||
            reg.is_active === null ||
            reg.is_active === undefined;

          if (isDeactivated) {
            existing.is_active = false;
            if (existing.id) {
              await db.cash_registers.update(existing.id, {
                is_active: false,
                synced: 0
              });
            }
          }
        }
      }

      // Nettoyer les doublons
      if (duplicateIds.length > 0) {
        await db.cash_registers.bulkDelete(duplicateIds);
      }

      const allConsolidated = Array.from(mapByCode.values());

      // FILTRE STRICT : UNIQUEMENT LES CAISSES STRICTEMENT ACTIVES
      const activeRegs = allConsolidated.filter((r) => {
        if (
          r.is_active === false ||
          (r.is_active as any) === 0 ||
          (r.is_active as any) === '0' ||
          (r.is_active as any) === 'false' ||
          r.is_active === null ||
          r.is_active === undefined
        ) {
          return false;
        }
        return true;
      });

      setCashRegisters(activeRegs);
      if (activeRegs.length > 0) {
        setSelectedRegisterId((prev) =>
          prev && activeRegs.some((r) => r.id === prev) ? prev : activeRegs[0].id || null
        );
      } else {
        setSelectedRegisterId(null);
      }
    } catch (err) {
      console.error('Erreur chargement caisses:', err);
    }
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegisterId) {
      Swal.fire({
        icon: 'warning',
        title: 'Poste de caisse requis',
        text: 'Veuillez sélectionner un poste de caisse actif pour démarrer.',
        confirmButtonColor: '#0055b8'
      });
      return;
    }

    setLoading(true);
    try {
      const selectedReg = cashRegisters.find((r) => r.id === selectedRegisterId);
      if (!selectedReg) {
        throw new Error('La caisse sélectionnée est introuvable ou inactive.');
      }

      const newSession: Omit<CashSession, 'id'> = {
        cash_register_id: Number(selectedRegisterId),
        user_id: user?.id || 1,
        opening_amount: Number(openingAmount) || 0,
        status: 'open',
        opened_at: new Date().toISOString(),
        notes: notes.trim() || undefined,
        synced: 0
      };

      const newId = await db.cash_sessions.add(newSession as CashSession);
      const createdSession = await db.cash_sessions.get(newId);

      // Synchronisation immédiate vers MySQL
      syncService.pushToRemote().catch((e) => console.warn('Sync error:', e));

      await Swal.fire({
        icon: 'success',
        title: 'Caisse Ouverte !',
        text: `Session démarrée avec un fond de ${Number(openingAmount).toLocaleString('fr-FR')} ${currency}`,
        timer: 1600,
        showConfirmButton: false
      });

      if (onSessionOpened && createdSession) {
        onSessionOpened(createdSession);
      }
      navigate('/pos');
    } catch (err: any) {
      Swal.fire('Erreur', err.message || "Impossible d'ouvrir la caisse", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-4 px-2 sm:px-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center border border-blue-100 shadow-sm">
              <Store className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Déclaration d'Ouverture de Caisse
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Sélectionnez votre poste à gauche et saisissez votre fond de caisse à droite
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-bold transition self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour au Tableau de Bord</span>
          </button>
        </div>

        <form onSubmit={handleStartSession} className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
          {/* SECTION 1: POSTE DE CAISSE (GAUCHE) */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#0055b8] text-white font-black text-[11px] flex items-center justify-center">
                1
              </span>
              <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Poste de Caisse <span className="text-rose-500">*</span>
              </h2>
            </div>

            {cashRegisters.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {cashRegisters.map((reg) => {
                  const isSelected = selectedRegisterId === reg.id;
                  return (
                    <div
                      key={reg.id || reg.code}
                      onClick={() => setSelectedRegisterId(reg.id || null)}
                      className={`rounded-2xl p-4 border transition cursor-pointer flex flex-col justify-between min-h-[115px] ${
                        isSelected
                          ? 'border-2 border-[#0055b8] bg-blue-50/20 shadow-sm ring-1 ring-[#0055b8]/20'
                          : 'border border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
                            isSelected
                              ? 'bg-[#0055b8] text-white shadow-sm'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Laptop className="w-4 h-4" />
                        </div>

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Disponible
                        </span>
                      </div>

                      <div className="mt-3">
                        <h4 className="font-extrabold text-slate-900 text-xs tracking-tight">
                          {reg.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Code : {reg.code}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Aucun poste de caisse actif disponible. Veuillez activer un poste dans la gestion des caisses.</span>
              </div>
            )}
          </div>

          {/* SECTION 2 & 3: FOND DE CAISSE ET NOTES (DROITE) */}
          <div className="space-y-5">
            {/* 2. FOND DE CAISSE INITIAL PHYSIQUE */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0055b8] text-white font-black text-[11px] flex items-center justify-center">
                  2
                </span>
                <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Fond de Caisse Initial Physique <span className="text-rose-500">*</span>
                </h2>
              </div>

              {/* Grand champ montant */}
              <div className="bg-slate-50/80 border border-slate-200 focus-within:border-[#0055b8] focus-within:bg-white rounded-2xl px-4 py-3 flex items-center justify-between transition">
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={openingAmount || ''}
                  onChange={(e) => setOpeningAmount(Number(e.target.value))}
                  placeholder="0"
                  className="text-2xl sm:text-3xl font-black text-slate-900 bg-transparent outline-none w-full font-mono tracking-tight"
                />
                <span className="text-xs sm:text-sm font-extrabold text-slate-400 uppercase tracking-wider ml-2">
                  {currency}
                </span>
              </div>

              {/* Raccourcis rapides */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mr-1">
                  Raccourcis :
                </span>
                {[0, 25000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setOpeningAmount(amt)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      openingAmount === amt
                        ? 'bg-[#0055b8] text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {amt === 0 ? '0 F' : `${amt.toLocaleString('fr-FR')} F`}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5 font-medium">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>Montant présent physiquement dans le tiroir au démarrage.</span>
              </p>
            </div>

            {/* 3. NOTES DE PRISE DE SERVICE */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0055b8] text-white font-black text-[11px] flex items-center justify-center">
                  3
                </span>
                <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Notes de Prise de Service (Optionnel)
                </h2>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Prise de poste matin, tiroir et rouleaux de monnaie vérifiés..."
                className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs text-slate-700 bg-slate-50/50 focus:bg-white focus:border-[#0055b8] outline-none transition resize-none h-20 placeholder:text-slate-400 font-medium"
              />
            </div>

            {/* BOUTON VALIDATION */}
            <button
              type="submit"
              disabled={loading || !selectedRegisterId || cashRegisters.length === 0}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#0055b8] hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition active:scale-[0.99]"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Valider & Démarrer ma Session de Caisse</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

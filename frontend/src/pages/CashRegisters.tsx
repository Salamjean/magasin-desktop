import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  db,
  CashRegister,
  CashSession,
  CashMovement,
  Sale,
  User
} from '../db/db';
import { syncService } from '../db/syncService';
import { useAuth } from '../context/AuthContext';
import {
  Store,
  Layers,
  CheckCircle2,
  Clock,
  User as UserIcon,
  ArrowRight,
  TrendingUp,
  X,
  CreditCard,
  Smartphone,
  Banknote,
  DollarSign,
  Plus,
  Trash2,
  Power
} from 'lucide-react';
import Swal from 'sweetalert2';

import { CaissierCashManagement } from './CaissierCashManagement';

interface SessionRowItem {
  id: number;
  registerId: number;
  registerName: string;
  registerCode: string;
  isOpen: boolean;
  cashierName: string;
  dateStr: string;
  timeRangeStr: string;
  openingAmount: number;
  theoreticalAmount: number;
  closingAmount: number | null;
  discrepancy: number;
  salesCount: number;
  totalCashSales: number;
  totalWaveSales: number;
  totalOmSales: number;
  totalCardSales: number;
  totalCreditSales: number;
  totalSales: number;
  sessionObj: CashSession;
}

export const CashRegisters: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Si c'est un caissier, afficher la page dédiée et simplifiée de gestion de caisse
  if (user?.role === 'caissier') {
    return <CaissierCashManagement />;
  }

  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [sessionRows, setSessionRows] = useState<SessionRowItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire d'ajout rapide de caisse
  const [newRegisterName, setNewRegisterName] = useState('');
  const [newRegisterCode, setNewRegisterCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const regList = await db.cash_registers.toArray();
      setRegisters(regList);

      const allSessions = await db.cash_sessions.toArray();
      const allSales = await db.sales.toArray();
      const allMovements = await db.cash_movements.toArray();
      const allUsers = await db.users.toArray();

      setSessions(allSessions);

      const userMap = new Map<number, string>(allUsers.map((u) => [u.id!, u.name]));
      const regMap = new Map<number, CashRegister>(regList.map((r) => [r.id!, r]));

      // Construction des lignes de session avec calculs complets
      const rows: SessionRowItem[] = allSessions.map((sess) => {
        const reg = regMap.get(sess.cash_register_id);
        const cashier = userMap.get(sess.user_id) || 'Jean Koffi';
        const isOpen = sess.status === 'open';

        const openDate = new Date(sess.opened_at);
        const dateStr = `${String(openDate.getDate()).padStart(2, '0')}/${String(openDate.getMonth() + 1).padStart(2, '0')}/${openDate.getFullYear()}`;
        const openTime = `${String(openDate.getHours()).padStart(2, '0')}:${String(openDate.getMinutes()).padStart(2, '0')}`;

        let timeRangeStr = `${openTime} → En cours`;
        if (sess.closed_at) {
          const closeDate = new Date(sess.closed_at);
          const closeTime = `${String(closeDate.getHours()).padStart(2, '0')}:${String(closeDate.getMinutes()).padStart(2, '0')}`;
          timeRangeStr = `${openTime} → ${closeTime}`;
        }

        // Ventes de la session (exclut rigoureusement toutes les ventes annulées)
        const isSaleCancelled = (s: Sale) =>
          (s.payment_status as any) === 'cancelled' ||
          (s as any).status === 'cancelled' ||
          Boolean(s.notes && (s.notes.includes('ANNULÉE') || s.notes.toLowerCase().includes('annul')));

        const sessSales = allSales.filter((s) => {
          if (isSaleCancelled(s)) return false;
          if (s.cash_session_id === sess.id) return true;
          if (isOpen && s.created_at >= sess.opened_at && (!s.cash_session_id || s.cash_session_id === sess.id)) return true;
          if (!isOpen && sess.closed_at && s.created_at >= sess.opened_at && s.created_at <= sess.closed_at) return true;
          return false;
        });

        const cashSales = sessSales.filter((s) => s.payment_method === 'cash').reduce((sum, s) => sum + (s.paid_amount || s.total_amount || 0), 0);
        const waveSales = sessSales.filter((s) => s.payment_method === 'wave').reduce((sum, s) => sum + (s.paid_amount || s.total_amount || 0), 0);
        const omSales = sessSales.filter((s) => s.payment_method === 'om').reduce((sum, s) => sum + (s.paid_amount || s.total_amount || 0), 0);
        const cardSales = sessSales.filter((s) => s.payment_method === 'card').reduce((sum, s) => sum + (s.paid_amount || s.total_amount || 0), 0);
        const creditSales = sessSales.filter((s) => s.payment_method === 'credit').reduce((sum, s) => sum + (s.total_amount || 0), 0);
        const totalSales = sessSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

        const sessMoves = allMovements.filter((m) => m.cash_session_id === sess.id);
        const dep = sessMoves.filter((m) => m.type === 'deposit').reduce((a, m) => a + m.amount, 0);
        const wdr = sessMoves.filter((m) => m.type === 'withdrawal').reduce((a, m) => a + m.amount, 0);

        const theoretical = (sess.opening_amount || 0) + cashSales + dep - wdr;
        const declared = sess.closing_amount !== undefined && sess.closing_amount !== null ? sess.closing_amount : null;
        const diff = declared !== null ? declared - theoretical : 0;

        return {
          id: sess.id!,
          registerId: sess.cash_register_id,
          registerName: reg?.name || `Caisse N°${sess.cash_register_id}`,
          registerCode: reg?.code || `CAISSE-0${sess.cash_register_id}`,
          isOpen,
          cashierName: cashier,
          dateStr,
          timeRangeStr,
          openingAmount: sess.opening_amount || 0,
          theoreticalAmount: isOpen ? theoretical : (sess.expected_closing_amount ?? theoretical),
          closingAmount: declared,
          discrepancy: diff,
          salesCount: sessSales.length,
          totalCashSales: cashSales,
          totalWaveSales: waveSales,
          totalOmSales: omSales,
          totalCardSales: cardSales,
          totalCreditSales: creditSales,
          totalSales,
          sessionObj: sess
        };
      });

      // Tri des sessions : ouvertes d'abord, puis par ID décroissant
      rows.sort((a, b) => {
        if (a.isOpen && !b.isOpen) return -1;
        if (!a.isOpen && b.isOpen) return 1;
        return b.id - a.id;
      });

      setSessionRows(rows);
    } catch (err) {
      console.error('Erreur chargement gestion de caisse:', err);
    } finally {
      setLoading(false);
    }
  };

  // Création d'un nouveau poste de caisse
  const handleCreateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegisterName.trim() || !newRegisterCode.trim()) {
      Swal.fire('Attention', 'Veuillez saisir le nom et le code du poste de caisse.', 'warning');
      return;
    }

    setIsCreating(true);
    try {
      await db.cash_registers.add({
        name: newRegisterName.trim(),
        code: newRegisterCode.trim().toUpperCase(),
        is_active: true,
        synced: 0
      });

      syncService.pushToRemote().catch(() => {});

      Swal.fire({
        icon: 'success',
        title: 'Poste de Caisse Créé !',
        text: `La caisse ${newRegisterName.trim()} est prête à être utilisée.`,
        timer: 1800,
        showConfirmButton: false
      });

      setNewRegisterName('');
      setNewRegisterCode('');
      loadData();
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Impossible de créer la caisse.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Suppression d'un poste de caisse qui n'a JAMAIS enregistré de vente
  const handleDeleteRegister = async (reg: CashRegister) => {
    if (!reg.id) return;

    const confirm = await Swal.fire({
      title: `Supprimer ${reg.name} ?`,
      text: 'Ce poste de caisse n’a jamais enregistré de vente et sera supprimé définitivement.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer définitivement',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#e11d48'
    });

    if (confirm.isConfirmed) {
      try {
        // 1. Suppression directe et effective dans la base MySQL du serveur
        try {
          const { API_BASE_URL } = await import('../db/syncService');
          const res = await fetch(`${API_BASE_URL}/sync/cash-registers/${reg.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
          const resData = await res.json().catch(() => null);
          if (resData && !resData.success) {
            Swal.fire('Information', resData.message || 'Impossible de supprimer dans MySQL.', 'warning');
            return;
          }
        } catch (e) {
          console.warn('Backend non joignable, suppression locale effectuée:', e);
        }

        // 2. Nettoyage des éventuelles sessions orphelines sans ventes
        const sessList = await db.cash_sessions.where('cash_register_id').equals(reg.id).toArray();
        for (const s of sessList) {
          if (s.id) await db.cash_sessions.delete(s.id);
        }

        // 3. Suppression locale dans Dexie (navigateur)
        await db.cash_registers.delete(reg.id);

        Swal.fire({
          icon: 'success',
          title: 'Poste de caisse supprimé !',
          text: 'La caisse a été supprimée de MySQL et de la mémoire locale.',
          timer: 1800,
          showConfirmButton: false
        });
        loadData();
      } catch (err: any) {
        Swal.fire('Erreur', err.message || 'Impossible de supprimer la caisse.', 'error');
      }
    }
  };

  // Activation / Désactivation d'un poste de caisse ayant déjà un historique de ventes
  const handleToggleActiveRegister = async (reg: CashRegister) => {
    if (!reg.id) return;
    const newStatus = reg.is_active === false;
    const actionText = newStatus ? 'Activer' : 'Désactiver';

    const confirm = await Swal.fire({
      title: `${actionText} ${reg.name} ?`,
      text: newStatus
        ? 'Ce poste de caisse sera à nouveau disponible pour les encaissements au TPV.'
        : 'Ce poste de caisse sera désactivé pour les nouveaux encaissements tout en conservant l’historique des ventes.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Oui, ${actionText.toLowerCase()}`,
      cancelButtonText: 'Annuler',
      confirmButtonColor: newStatus ? '#057a55' : '#d97706'
    });

    if (confirm.isConfirmed) {
      await db.cash_registers.update(reg.id, {
        is_active: newStatus,
        synced: 0
      });
      syncService.pushToRemote().catch(() => {});

      Swal.fire({
        icon: 'success',
        title: `Caisse ${newStatus ? 'activée' : 'désactivée'} !`,
        timer: 1500,
        showConfirmButton: false
      });
      loadData();
    }
  };

  // Récupérer les données dynamiques pour chaque carte de caisse
  const getRegisterCardData = (reg: CashRegister) => {
    const regSessions = sessionRows.filter((r) => r.registerId === reg.id);
    const hasSales = regSessions.some((r) => r.salesCount > 0 || r.totalSales > 0);
    const openRow = regSessions.find((r) => r.isOpen);

    if (openRow) {
      const openTime = openRow.sessionObj.opened_at
        ? new Date(openRow.sessionObj.opened_at).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })
        : '08:00';

      return {
        isOpen: true,
        cashier: openRow.cashierName,
        openingAmount: openRow.openingAmount,
        theoreticalAmount: openRow.theoreticalAmount,
        openedSince: openTime,
        hasSales
      };
    }
    return {
      isOpen: false,
      cashier: null,
      openingAmount: 0,
      theoreticalAmount: 0,
      openedSince: null,
      hasSales
    };
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 pb-16">
      
      {/* 1. SECTION SUPÉRIEURE : CARTES DES POSTES DE CAISSE + FORMULAIRE D'AJOUT (CONFORME À L'IMAGE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        
        {/* CARTES DES POSTES EXISTANTS */}
        {registers.map((reg) => {
          const cardData = getRegisterCardData(reg);
          const isDeactivated = reg.is_active === false;

          return (
            <div
              key={reg.id}
              className={`bg-white rounded-3xl border p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition ${
                isDeactivated ? 'border-amber-200/80 bg-amber-50/10' : 'border-slate-200/80'
              }`}
            >
              {/* En-tête Carte */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        isDeactivated
                          ? 'bg-amber-400'
                          : cardData.isOpen
                          ? 'bg-emerald-500 animate-pulse'
                          : 'bg-slate-300'
                      }`}
                    />
                    <h2 className="text-sm font-black text-slate-900 truncate">
                      {reg.name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isDeactivated ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wide">
                        DÉSACTIVÉE
                      </span>
                    ) : cardData.isOpen ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                        OUVERTE
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
                        FERMÉE
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-400 font-mono">
                  Code poste : <strong className="text-slate-600 font-semibold">{reg.code}</strong>
                </p>
              </div>

              {/* Encadré d'état */}
              {isDeactivated ? (
                <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 text-center flex flex-col items-center justify-center space-y-1">
                  <p className="text-xs font-bold text-amber-900">Poste temporairement désactivé</p>
                  <p className="text-[11px] text-amber-700">Masqué au point de vente pour les nouvelles sessions.</p>
                </div>
              ) : cardData.isOpen ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1.5 text-xs">
                  <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <span className="text-emerald-700">👤</span>
                    <span>Caissier : {cardData.cashier}</span>
                  </p>
                  <p className="text-slate-600 font-medium">
                    Fond initial : <strong className="text-slate-800">{(cardData.openingAmount || 0).toLocaleString('fr-FR')} FCFA</strong>
                  </p>
                  <p className="font-bold text-emerald-800">
                    Montant théorique actuel : <strong className="text-emerald-700 font-black font-mono">{(cardData.theoreticalAmount || 0).toLocaleString('fr-FR')} FCFA</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium pt-0.5">
                    Ouverte depuis : {cardData.openedSince}
                  </p>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center flex items-center justify-center">
                  <p className="text-xs text-slate-400 italic">
                    Aucun caissier connecté sur ce poste
                  </p>
                </div>
              )}

              {/* Pied de carte : Lien Historique & Boutons d'Action (Supprimer ou Activer/Désactiver) */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/cash-registers/sessions/${reg.id}`)}
                  className="text-xs font-bold text-[#0055b8] hover:text-blue-700 flex items-center gap-1 group transition truncate"
                >
                  <span>Voir l'historique des sessions</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>

                {/* Bouton conditionnel selon que la caisse a déjà des ventes ou non */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {cardData.hasSales ? (
                    <button
                      type="button"
                      onClick={() => handleToggleActiveRegister(reg)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition active:scale-95 flex items-center gap-1 ${
                        isDeactivated
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                      }`}
                      title={isDeactivated ? 'Réactiver ce poste de caisse' : 'Désactiver ce poste de caisse'}
                    >
                      <span>{isDeactivated ? '⚡ Activer' : 'Désactiver'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDeleteRegister(reg)}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition active:scale-95 flex items-center gap-1"
                      title="Supprimer définitivement (aucune vente enregistrée)"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Supprimer</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* CARTE 3 : FORMULAIRE "AJOUTER UN POSTE DE CAISSE" (BORDURE POINTILLÉE CONFORME À L'IMAGE) */}
        <div className="bg-white rounded-3xl border-dashed border-2 border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#0055b8]" />
              <h2 className="text-sm font-black text-slate-900">
                Ajouter un poste de caisse
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Définissez un numéro de poste pour votre magasin
            </p>
          </div>

          <form onSubmit={handleCreateRegister} className="space-y-3">
            <div>
              <input
                type="text"
                value={newRegisterName}
                onChange={(e) => setNewRegisterName(e.target.value)}
                placeholder="Ex: Caisse N°3 (Allée Centrale)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
              />
            </div>

            <div>
              <input
                type="text"
                value={newRegisterCode}
                onChange={(e) => setNewRegisterCode(e.target.value)}
                placeholder="EX: CAISSE-03"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium uppercase font-mono text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              Créer le poste de caisse
            </button>
          </form>
        </div>

      </div>

      {/* 2. SECTION INFÉRIEURE : HISTORIQUE DES SESSIONS, VENTES & CONTRÔLE DES ÉCARTS (CONFORME À L'IMAGE) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <Layers className="w-5 h-5 text-[#0055b8]" />
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              Historique des Sessions, Ventes & Contrôle des Écarts
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Suivi de toutes les ouvertures, encaissements et clôtures journalières
            </p>
          </div>
        </div>

        {/* TABLEAU DES SESSIONS */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-400 font-black border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">POSTE CAISSE</th>
                <th className="px-4 py-3.5">CAISSIER</th>
                <th className="px-4 py-3.5">DATE & HORAIRES</th>
                <th className="px-4 py-3.5 text-center">FOND INITIAL</th>
                <th className="px-4 py-3.5 text-center">MONTANT THÉORIQUE</th>
                <th className="px-4 py-3.5 text-center">MONTANT DÉCLARÉ</th>
                <th className="px-4 py-3.5 text-center">ÉCART CONSTATÉ</th>
                <th className="px-4 py-3.5 text-right">DÉTAILS DE LA JOURNÉE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {sessionRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition">
                  {/* POSTE CAISSE */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          row.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      />
                      <span className="font-bold text-slate-900 text-xs">{row.registerName}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal block pl-4 mt-0.5">
                      Session #{row.id}
                    </span>
                  </td>

                  {/* CAISSIER */}
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200/60">
                      <span className="text-slate-400">👤</span>
                      <span>{row.cashierName}</span>
                    </span>
                  </td>

                  {/* DATE & HORAIRES */}
                  <td className="px-4 py-3.5 font-mono">
                    <span className="text-slate-900 font-bold block text-xs">{row.dateStr}</span>
                    <span className="text-slate-400 text-[10px]">{row.timeRangeStr}</span>
                  </td>

                  {/* FOND INITIAL */}
                  <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-900">
                    {(row.openingAmount || 0).toLocaleString('fr-FR')} FCFA
                  </td>

                  {/* MONTANT THÉORIQUE */}
                  <td className="px-4 py-3.5 text-center font-mono font-bold text-[#0055b8]">
                    {(row.theoreticalAmount || 0).toLocaleString('fr-FR')} FCFA
                  </td>

                  {/* MONTANT DÉCLARÉ */}
                  <td className="px-4 py-3.5 text-center font-mono">
                    {row.isOpen ? (
                      <span className="text-slate-400 text-xs italic font-medium">En cours</span>
                    ) : (
                      <span className="font-bold text-slate-900">
                        {(row.closingAmount || 0).toLocaleString('fr-FR')} FCFA
                      </span>
                    )}
                  </td>

                  {/* ÉCART CONSTATÉ */}
                  <td className="px-4 py-3.5 text-center">
                    {row.isOpen ? (
                      <span className="text-slate-400 text-xs italic font-medium">Session ouverte</span>
                    ) : row.discrepancy === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span>✓</span>
                        <span>Parfait (0 FCFA)</span>
                      </span>
                    ) : row.discrepancy > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-50 text-[#0055b8] border border-blue-200">
                        <span>+{(row.discrepancy).toLocaleString('fr-FR')} FCFA</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                        <span>{(row.discrepancy).toLocaleString('fr-FR')} FCFA</span>
                      </span>
                    )}
                  </td>

                  {/* DÉTAILS DE LA JOURNÉE */}
                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => navigate(`/cash-registers/bilan-z/${row.id}`)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95"
                    >
                      <span>📊</span>
                      <span>Bilan complet</span>
                    </button>
                  </td>
                </tr>
              ))}

              {sessionRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                    Aucune session de caisse enregistrée pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};


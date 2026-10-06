import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  db,
  CashRegister,
  CashSession,
  CashMovement,
  Sale
} from '../db/db';
import { syncService } from '../db/syncService';
import { useAuth } from '../context/AuthContext';
import { CashOpeningDeclaration } from '../components/CashOpeningDeclaration';
import {
  Store,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Printer,
  TrendingUp,
  X,
  AlertCircle
} from 'lucide-react';
import Swal from 'sweetalert2';

interface ClosedSessionRow {
  id: number;
  registerName: string;
  registerCode: string;
  periodStr: string;
  openingAmount: number;
  theoreticalAmount: number;
  closingAmount: number | null;
  discrepancy: number;
}

export const CaissierCashManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [closedSessions, setClosedSessions] = useState<ClosedSessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // État de l'ouverture de caisse (si fermée)
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);

  // État de clôture de caisse
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [countedCash, setCountedCash] = useState<string | number>('');
  const [closingNotes, setClosingNotes] = useState('');
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);

  // Statistiques en temps réel
  const [theoreticalCash, setTheoreticalCash] = useState(0);

  useEffect(() => {
    loadCashData();
  }, [user]);

  const isCancelledSale = (s: Sale) =>
    (s.payment_status as any) === 'cancelled' ||
    (s as any).status === 'cancelled' ||
    Boolean(s.notes && (s.notes.includes('ANNULÉE') || s.notes.toLowerCase().includes('annul')));

  const loadCashData = async () => {
    setLoading(true);
    try {
      const allRegs = await db.cash_registers.toArray();
      const regMap = new Map<number, CashRegister>(allRegs.map((r) => [r.id!, r]));

      const allSessions = await db.cash_sessions.toArray();
      const allSales = await db.sales.toArray();
      const allMovements = await db.cash_movements.toArray();

      // 1. Trouver la session active (ouverte) pour ce caissier ou globale
      const openSession = allSessions.find(
        (s) => s.status === 'open' && (!user || s.user_id === user.id)
      ) || allSessions.find((s) => s.status === 'open');

      if (openSession) {
        setActiveSession(openSession);
        const reg = regMap.get(openSession.cash_register_id);
        setActiveRegister(reg || { name: `Caisse N°${openSession.cash_register_id}`, code: `CAISSE-0${openSession.cash_register_id}`, is_active: true, synced: 1 });

        // Calculs des ventes de cette session ouverte
        const sessSales = allSales.filter((s) => {
          if (isCancelledSale(s)) return false;
          if (s.cash_session_id === openSession.id) return true;
          if (s.created_at >= openSession.opened_at && (!s.cash_session_id || s.cash_session_id === openSession.id)) return true;
          return false;
        });

        const cashSales = sessSales
          .filter((s) => s.payment_method === 'cash')
          .reduce((sum, s) => sum + (s.paid_amount || s.total_amount || 0), 0);

        const sessMoves = allMovements.filter((m) => m.cash_session_id === openSession.id);
        const dep = sessMoves.filter((m) => m.type === 'deposit').reduce((a, m) => a + m.amount, 0);
        const wdr = sessMoves.filter((m) => m.type === 'withdrawal').reduce((a, m) => a + m.amount, 0);

        const theoretical = (openSession.opening_amount || 0) + cashSales + dep - wdr;
        setTheoreticalCash(theoretical);
        setCountedCash(theoretical);
      } else {
        setActiveSession(null);
        setActiveRegister(null);
        setTheoreticalCash(0);
      }

      // 2. Récupérer les dernières sessions clôturées
      const userClosedSessions = allSessions.filter(
        (s) => s.status === 'closed' && (!user || s.user_id === user.id || user.role === 'admin')
      );

      const rows: ClosedSessionRow[] = userClosedSessions.map((sess) => {
        const reg = regMap.get(sess.cash_register_id);
        const openDate = new Date(sess.opened_at);
        const dateStr = `${String(openDate.getDate()).padStart(2, '0')}/${String(openDate.getMonth() + 1).padStart(2, '0')}/${openDate.getFullYear()}`;
        const openTime = `${String(openDate.getHours()).padStart(2, '0')}:${String(openDate.getMinutes()).padStart(2, '0')}`;

        let periodStr = `${dateStr} ${openTime}`;
        if (sess.closed_at) {
          const closeDate = new Date(sess.closed_at);
          const closeTime = `${String(closeDate.getHours()).padStart(2, '0')}:${String(closeDate.getMinutes()).padStart(2, '0')}`;
          periodStr = `${dateStr} ${openTime} → ${closeTime}`;
        }

        const sessSales = allSales.filter((s) => {
          if (isCancelledSale(s)) return false;
          if (s.cash_session_id === sess.id) return true;
          if (sess.closed_at && s.created_at >= sess.opened_at && s.created_at <= sess.closed_at) return true;
          return false;
        });

        const cashSales = sessSales
          .filter((s) => s.payment_method === 'cash')
          .reduce((sum, s) => sum + (s.paid_amount || s.total_amount || 0), 0);

        const sessMoves = allMovements.filter((m) => m.cash_session_id === sess.id);
        const dep = sessMoves.filter((m) => m.type === 'deposit').reduce((a, m) => a + m.amount, 0);
        const wdr = sessMoves.filter((m) => m.type === 'withdrawal').reduce((a, m) => a + m.amount, 0);

        const theoretical = (sess.opening_amount || 0) + cashSales + dep - wdr;
        const declared = sess.closing_amount !== undefined && sess.closing_amount !== null ? sess.closing_amount : null;
        const diff = declared !== null ? declared - theoretical : 0;

        return {
          id: sess.id!,
          registerName: reg?.name || `Caisse N°${sess.cash_register_id}`,
          registerCode: reg?.code || `CAISSE-0${sess.cash_register_id}`,
          periodStr,
          openingAmount: sess.opening_amount || 0,
          theoreticalAmount: sess.expected_closing_amount ?? theoretical,
          closingAmount: declared,
          discrepancy: diff
        };
      });

      rows.sort((a, b) => b.id - a.id);
      setClosedSessions(rows);
    } catch (err) {
      console.error('Erreur chargement caisse caissier:', err);
    } finally {
      setLoading(false);
    }
  };

  // Clôture de la session en cours
  const handleConfirmClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession?.id) return;

    const counted = Number(countedCash);
    if (isNaN(counted) || counted < 0) {
      Swal.fire('Attention', 'Veuillez saisir un montant réel valide compté en caisse.', 'warning');
      return;
    }

    const diff = counted - theoreticalCash;

    const confirm = await Swal.fire({
      title: 'Confirmer la Clôture de Caisse ?',
      html: `
        <div class="text-left text-xs space-y-2">
          <p><strong>Poste :</strong> ${activeRegister?.name || 'Caisse'}</p>
          <p><strong>Espèces théoriques attendues :</strong> ${theoreticalCash.toLocaleString('fr-FR')} FCFA</p>
          <p><strong>Espèces réelles déclarées :</strong> ${counted.toLocaleString('fr-FR')} FCFA</p>
          <p><strong>Écart constaté :</strong> <span style="color: ${diff === 0 ? 'green' : diff > 0 ? 'blue' : 'red'}; font-weight: bold;">${diff >= 0 ? '+' : ''}${diff.toLocaleString('fr-FR')} FCFA</span></p>
        </div>
      `,
      icon: diff === 0 ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, clôturer la caisse',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#e11d48'
    });

    if (!confirm.isConfirmed) return;

    setIsSubmittingClose(true);
    try {
      await db.cash_sessions.update(activeSession.id, {
        status: 'closed',
        closing_amount: counted,
        expected_closing_amount: theoreticalCash,
        closed_at: new Date().toISOString(),
        notes: closingNotes.trim() || undefined,
        synced: 0
      });

      syncService.pushToRemote().catch(() => {});

      await Swal.fire({
        icon: 'success',
        title: 'Caisse Clôturée avec Succès !',
        text: 'La session est fermée. Le Bilan Z a été archivé.',
        timer: 1800,
        showConfirmButton: false
      });

      setIsClosingModalOpen(false);
      setClosingNotes('');
      loadCashData();
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Impossible de clôturer la caisse.', 'error');
    } finally {
      setIsSubmittingClose(false);
    }
  };

  const openDate = activeSession ? new Date(activeSession.opened_at) : null;
  const openDateFormatted = openDate
    ? `Ouverte le ${String(openDate.getDate()).padStart(2, '0')}/${String(openDate.getMonth() + 1).padStart(2, '0')}/${openDate.getFullYear()} à ${String(openDate.getHours()).padStart(2, '0')}:${String(openDate.getMinutes()).padStart(2, '0')} • Fond initial : ${(activeSession?.opening_amount || 0).toLocaleString('fr-FR')} FCFA`
    : '';

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 pb-16">
      
      {/* 1. CARTE SUPÉRIEURE : ÉTAT DE LA CAISSE EN SERVICE (CONFORME À L'IMAGE) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {activeSession ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <h1 className="text-base sm:text-lg font-black text-slate-900">
                {activeRegister?.name || 'Caisse Principale'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                En service
              </span>
            </div>

            <p className="text-xs text-slate-400 font-medium">
              {openDateFormatted}
            </p>

            <p className="text-xs font-black text-[#4338ca] pt-0.5">
              Montant théorique en caisse : <strong className="font-mono">{theoreticalCash.toLocaleString('fr-FR')} FCFA</strong>
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 flex-shrink-0" />
              <h1 className="text-base sm:text-lg font-black text-slate-900">
                Aucune caisse ouverte
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-600 border border-slate-200">
                Fermée
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Déclarez votre fond de caisse initial pour démarrer vos encaissements au TPV.
            </p>
          </div>
        )}

        {/* Boutons d'Action à droite */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-shrink-0">
          {activeSession ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/pos')}
                className="px-4 py-2.5 rounded-xl bg-[#057a55] hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Aller au TPV</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/cash-session')}
                className="px-4 py-2.5 rounded-xl bg-[#fee2e2]/60 hover:bg-rose-100 text-[#be123c] font-bold text-xs border border-rose-200 transition active:scale-95"
              >
                Clôturer la caisse
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpeningModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Ouvrir une session de caisse</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SECTION INFÉRIEURE : MES DERNIÈRES CLÔTURES DE CAISSE (CONFORME À L'IMAGE) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="pb-1 border-b border-slate-100">
          <h2 className="text-sm sm:text-base font-black text-slate-900">
            Mes Dernières Clôtures de Caisse
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-400 font-black border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">POSTE CAISSE</th>
                <th className="px-4 py-3.5">PÉRIODE</th>
                <th className="px-4 py-3.5 text-center">FOND INITIAL</th>
                <th className="px-4 py-3.5 text-center">THÉORIQUE</th>
                <th className="px-4 py-3.5 text-center">RÉEL DÉCLARÉ</th>
                <th className="px-4 py-3.5 text-center">ÉCART CONSTATÉ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {closedSessions.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => navigate(`/cash-registers/bilan-z/${row.id}`)}
                  className="hover:bg-slate-50/60 transition cursor-pointer group"
                  title="Cliquer pour voir le Bilan Z complet"
                >
                  <td className="px-4 py-3.5">
                    <span className="font-bold text-slate-900 text-xs group-hover:text-[#0055b8] transition">
                      {row.registerName}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 font-mono text-slate-500 text-xs">
                    {row.periodStr}
                  </td>

                  <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-800">
                    {row.openingAmount.toLocaleString('fr-FR')} FCFA
                  </td>

                  <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-900">
                    {row.theoreticalAmount.toLocaleString('fr-FR')} FCFA
                  </td>

                  <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-900">
                    {row.closingAmount !== null ? `${row.closingAmount.toLocaleString('fr-FR')} FCFA` : '—'}
                  </td>

                  <td className="px-4 py-3.5 text-center font-mono font-black">
                    {row.discrepancy === 0 ? (
                      <span className="text-[#059669]">0 FCFA</span>
                    ) : row.discrepancy > 0 ? (
                      <span className="text-blue-700">+{row.discrepancy.toLocaleString('fr-FR')} FCFA</span>
                    ) : (
                      <span className="text-rose-600">{row.discrepancy.toLocaleString('fr-FR')} FCFA</span>
                    )}
                  </td>
                </tr>
              ))}

              {closedSessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                    Aucune clôture de caisse passée pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL D'OUVERTURE DE SESSION SI AUCUNE SESSION ACTIVE */}
      {isOpeningModalOpen && (
        <CashOpeningDeclaration
          onSessionOpened={() => {
            setIsOpeningModalOpen(false);
            loadCashData();
          }}
        />
      )}

    </div>
  );
};
export default CaissierCashManagement;

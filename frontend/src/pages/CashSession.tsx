import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, CashSession, CashMovement, Sale, CashRegister } from '../db/db';
import { syncService } from '../db/syncService';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { CashOpeningDeclaration } from '../components/CashOpeningDeclaration';
import {
  Lock,
  ArrowLeft,
  Check,
  Calculator,
  Laptop,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Smartphone,
  CreditCard,
  Users,
  Clock,
  Printer,
  X,
  ShoppingCart
} from 'lucide-react';
import Swal from 'sweetalert2';

export const CashSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const currency = settings.currency || 'FCFA';

  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [sessionSales, setSessionSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Clôture form state
  const [closingPhysicalCash, setClosingPhysicalCash] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState('');
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);

  // Calculette modal state
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [denominations, setDenominations] = useState<{ [key: number]: number }>({
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    25: 0
  });

  // Cash In / Out modal state
  const [isMovementModalActive, setIsMovementModalActive] = useState(false);
  const [movementType, setMovementType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [movementAmount, setMovementAmount] = useState<number>(0);
  const [movementReason, setMovementReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Find open session
      const currentOpen = await db.cash_sessions.where('status').equals('open').first();
      setActiveSession(currentOpen || null);

      if (currentOpen) {
        const reg = await db.cash_registers.get(currentOpen.cash_register_id);
        setActiveRegister(reg || null);

        const moves = await db.cash_movements.where('cash_session_id').equals(currentOpen.id!).toArray();
        setMovements(moves);

        // Sales for this session
        const allSales = await db.sales.toArray();
        const sales = allSales.filter(
          (s) =>
            s.cash_session_id === currentOpen.id ||
            (s.created_at >= currentOpen.opened_at && (!s.cash_session_id || s.cash_session_id === currentOpen.id))
        );
        setSessionSales(sales);

        // Calculate initial expected cash (en excluant rigoureusement les ventes annulées)
        const isCancelledSale = (s: Sale) =>
          (s.payment_status as any) === 'cancelled' ||
          (s as any).status === 'cancelled' ||
          Boolean(s.notes && (s.notes.includes('ANNULÉE') || s.notes.toLowerCase().includes('annul')));

        const cashSales = sales
          .filter((s) => !isCancelledSale(s) && s.payment_method === 'cash')
          .reduce((acc, s) => acc + (s.paid_amount || s.total_amount || 0), 0);
        const dep = moves.filter((m) => m.type === 'deposit').reduce((a, m) => a + m.amount, 0);
        const wdr = moves.filter((m) => m.type === 'withdrawal').reduce((a, m) => a + m.amount, 0);
        const expected = (currentOpen.opening_amount || 0) + cashSales + dep - wdr;

        setClosingPhysicalCash(expected);
      }
    } catch (err) {
      console.error('Erreur chargement session:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- STATS DE LA SESSION ---
  const openingAmount = activeSession?.opening_amount || 0;
  const openedAtStr = activeSession?.opened_at
    ? new Date(activeSession.opened_at).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : '08:00';

  // Ventes valides (exclut rigoureusement les ventes annulées)
  const isCancelledSale = (s: Sale) =>
    (s.payment_status as any) === 'cancelled' ||
    (s as any).status === 'cancelled' ||
    Boolean(s.notes && (s.notes.includes('ANNULÉE') || s.notes.toLowerCase().includes('annul')));

  const validSessionSales = sessionSales.filter((s) => !isCancelledSale(s));

  // Espèces
  const cashSalesList = validSessionSales.filter((s) => s.payment_method === 'cash');
  const cashSalesTotal = cashSalesList.reduce(
    (acc, s) => acc + (s.paid_amount || s.total_amount || 0),
    0
  );
  const cashSalesCount = cashSalesList.length;

  // Crédit
  const creditSalesList = validSessionSales.filter((s) => s.payment_method === 'credit');
  const creditSalesTotal = creditSalesList.reduce((acc, s) => acc + (s.total_amount || 0), 0);
  const creditSalesCount = creditSalesList.length;

  // Mobile Money
  const mobileSalesList = validSessionSales.filter(
    (s) => s.payment_method === 'wave' || s.payment_method === 'om'
  );
  const mobileSalesTotal = mobileSalesList.reduce(
    (acc, s) => acc + (s.paid_amount || s.total_amount || 0),
    0
  );
  const mobileSalesCount = mobileSalesList.length;

  // Carte
  const cardSalesList = validSessionSales.filter((s) => s.payment_method === 'card');
  const cardSalesTotal = cardSalesList.reduce(
    (acc, s) => acc + (s.paid_amount || s.total_amount || 0),
    0
  );
  const cardSalesCount = cardSalesList.length;

  // Mouvements
  const totalDeposits = movements
    .filter((m) => m.type === 'deposit')
    .reduce((sum, m) => sum + m.amount, 0);
  const totalWithdrawals = movements
    .filter((m) => m.type === 'withdrawal')
    .reduce((sum, m) => sum + m.amount, 0);

  // Tiroir théorique
  const theoreticalCash = openingAmount + cashSalesTotal + totalDeposits - totalWithdrawals;

  // Écart
  const difference = closingPhysicalCash - theoreticalCash;

  // Clôture Handler
  const handleConfirmClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession?.id) return;

    const result = await Swal.fire({
      title: 'Confirmer la Clôture ?',
      html: `
        <div class="text-left text-xs space-y-2">
          <p><strong>Tiroir théorique :</strong> ${theoreticalCash.toLocaleString('fr-FR')} ${currency}</p>
          <p><strong>Montant compté :</strong> ${closingPhysicalCash.toLocaleString('fr-FR')} ${currency}</p>
          <p><strong>Écart de caisse :</strong> <span style="color: ${difference === 0 ? 'green' : difference > 0 ? 'blue' : 'red'}; font-weight: bold;">${difference >= 0 ? '+' : ''}${difference.toLocaleString('fr-FR')} ${currency}</span></p>
        </div>
      `,
      icon: difference === 0 ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Oui, clôturer la caisse',
      cancelButtonText: 'Annuler'
    });

    if (!result.isConfirmed) return;

    setIsSubmittingClose(true);
    try {
      await db.cash_sessions.update(activeSession.id, {
        status: 'closed',
        closing_amount: Number(closingPhysicalCash),
        expected_closing_amount: theoreticalCash,
        closed_at: new Date().toISOString(),
        notes: closingNotes.trim() || undefined,
        synced: 0
      });

      // Synchronisation immédiate vers MySQL
      syncService.pushToRemote().catch((e) => console.warn('Sync error:', e));

      const closedSessionId = activeSession.id;
      setActiveSession(null);

      const actionChoice = await Swal.fire({
        icon: 'success',
        title: 'Caisse Clôturée avec Succès !',
        text: 'La session est maintenant fermée. Souhaitez-vous consulter et imprimer le Bilan Z complet ?',
        showCancelButton: true,
        confirmButtonText: 'Voir le Bilan Z',
        cancelButtonText: 'Gestion de caisse',
        confirmButtonColor: '#0055b8',
        cancelButtonColor: '#475569'
      });

      if (actionChoice.isConfirmed) {
        navigate(`/cash-registers/bilan-z/${closedSessionId}`);
      } else {
        navigate('/cash-registers');
      }
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Impossible de clôturer la caisse', 'error');
    } finally {
      setIsSubmittingClose(false);
    }
  };

  // Mouvements Handler
  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession?.id || movementAmount <= 0) return;

    try {
      await db.cash_movements.add({
        cash_session_id: activeSession.id,
        type: movementType,
        amount: Number(movementAmount),
        reason: movementReason || 'Mouvement de caisse',
        created_at: new Date().toISOString(),
        synced: 0
      });

      // Synchronisation immédiate vers MySQL
      syncService.pushToRemote().catch((e) => console.warn('Sync error:', e));

      Swal.fire({
        icon: 'success',
        title: 'Mouvement enregistré !',
        timer: 1500,
        showConfirmButton: false
      });

      setIsMovementModalActive(false);
      setMovementAmount(0);
      setMovementReason('');
      loadData();
    } catch (err: any) {
      Swal.fire('Erreur', err.message, 'error');
    }
  };

  // Calcul du total de la calculette
  const calcTotal = Object.entries(denominations).reduce(
    (sum, [denom, count]) => sum + Number(denom) * (Number(count) || 0),
    0
  );

  const applyCalcTotal = () => {
    setClosingPhysicalCash(calcTotal);
    setIsCalcOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0055b8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- VUE 1 : SI AUCUNE SESSION OUVERTE, AFFICHER LA DÉCLARATION D'OUVERTURE ---
  if (!activeSession) {
    return (
      <CashOpeningDeclaration
        onSessionOpened={(session) => {
          setActiveSession(session);
          navigate('/pos');
        }}
      />
    );
  }

  // --- VUE 2 : SI SESSION OUVERTE, AFFICHER LA CLÔTURE DE SESSION & ARRÊTÉ DES COMPTES ---
  return (
    <div className="max-w-5xl mx-auto py-4 px-2 sm:px-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm">
              <Lock className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Clôture de Session & Arrêté des Comptes
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Vérifiez les totaux de votre journée et saisissez le montant compté pour clôturer.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/cash-registers')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMovementType('deposit');
                setIsMovementModalActive(true);
              }}
              className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Dépôt
            </button>

            <button
              type="button"
              onClick={() => {
                setMovementType('withdrawal');
                setIsMovementModalActive(true);
              }}
              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Minus className="w-3.5 h-3.5" /> Retrait
            </button>

            <button
              type="button"
              onClick={() => navigate('/pos')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0055b8] text-xs font-bold transition active:scale-95 shadow-xs"
              title="Retourner à la caisse pour continuer à enregistrer des ventes"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Aller à la Caisse (TPV)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* SECTION 1: BILAN DU CHIFFRE D'AFFAIRES (GAUCHE - 6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#0055b8] text-white font-black text-[11px] flex items-center justify-center">
                1
              </span>
              <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Bilan du Chiffre d'Affaires de la Session
              </h2>
            </div>

            {/* Carte du poste de caisse actif */}
            <div className="rounded-2xl p-4 border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-sm">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    {activeRegister?.name || 'Caisse Principale N°1'}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Code: {activeRegister?.code || 'CAISSE-01'} • Ouverte à {openedAtStr}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                Session Active
              </span>
            </div>

            {/* 4 Cartes de ventilation en grille 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              {/* Espèces */}
              <div className="bg-emerald-50/40 rounded-2xl p-3.5 border border-emerald-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
                    Espèces
                  </span>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="mt-2">
                  <p className="text-lg font-black text-emerald-800">
                    {cashSalesTotal.toLocaleString('fr-FR')}{' '}
                    <span className="text-xs font-normal text-emerald-600">{currency}</span>
                  </p>
                  <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                    {cashSalesCount} ticket(s) au comptoir
                  </p>
                </div>
              </div>

              {/* Crédit */}
              <div className="bg-purple-50/40 rounded-2xl p-3.5 border border-purple-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider">
                    Crédit
                  </span>
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="mt-2">
                  <p className="text-lg font-black text-purple-800">
                    {creditSalesTotal.toLocaleString('fr-FR')}{' '}
                    <span className="text-xs font-normal text-purple-600">{currency}</span>
                  </p>
                  <p className="text-[10px] text-purple-700 font-medium mt-0.5">
                    {creditSalesCount} vente(s) à crédit
                  </p>
                </div>
              </div>

              {/* Mobile Money */}
              <div className="bg-amber-50/40 rounded-2xl p-3.5 border border-amber-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
                    Mobile Money
                  </span>
                  <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="mt-2">
                  <p className="text-lg font-black text-amber-800">
                    {mobileSalesTotal.toLocaleString('fr-FR')}{' '}
                    <span className="text-xs font-normal text-amber-600">{currency}</span>
                  </p>
                  <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                    {mobileSalesCount} encaissement(s) Mobile Money
                  </p>
                </div>
              </div>

              {/* Carte Bancaire */}
              <div className="bg-blue-50/40 rounded-2xl p-3.5 border border-blue-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">
                    Carte Bancaire
                  </span>
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="mt-2">
                  <p className="text-lg font-black text-blue-800">
                    {cardSalesTotal.toLocaleString('fr-FR')}{' '}
                    <span className="text-xs font-normal text-blue-600">{currency}</span>
                  </p>
                  <p className="text-[10px] text-blue-700 font-medium mt-0.5">
                    {cardSalesCount} transaction(s) par TPE
                  </p>
                </div>
              </div>
            </div>

            {/* Cadre Bleu Tiroir Théorique Attendu */}
            <div className="bg-gradient-to-r from-[#0055b8] via-[#004ea8] to-[#003d85] rounded-2xl p-4 text-white shadow-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200">
                  Tiroir Théorique Espèces Attendu
                </span>
                <p className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {theoreticalCash.toLocaleString('fr-FR')}{' '}
                  <span className="text-xs font-normal text-blue-200">{currency}</span>
                </p>
                <p className="text-[10px] text-blue-200 mt-1">
                  (Fond initial : {openingAmount.toLocaleString('fr-FR')} F + Espèces nettes :{' '}
                  {cashSalesTotal.toLocaleString('fr-FR')} F)
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/15 text-[11px] space-y-1 self-start sm:self-auto min-w-[150px]">
                <div className="flex justify-between text-blue-100">
                  <span>Fond initial :</span>
                  <strong className="text-white">{openingAmount.toLocaleString('fr-FR')} F</strong>
                </div>
                <div className="flex justify-between text-blue-100">
                  <span>+ Encaiss. nettes :</span>
                  <strong className="text-white">+{cashSalesTotal.toLocaleString('fr-FR')} F</strong>
                </div>
                {totalDeposits > 0 && (
                  <div className="flex justify-between text-emerald-300">
                    <span>+ Dépôts :</span>
                    <strong>+{totalDeposits.toLocaleString('fr-FR')} F</strong>
                  </div>
                )}
                {totalWithdrawals > 0 && (
                  <div className="flex justify-between text-rose-300">
                    <span>- Retraits :</span>
                    <strong>-{totalWithdrawals.toLocaleString('fr-FR')} F</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2 & 3: MONTANT RÉEL COMPTÉ ET CLÔTURE (DROITE - 6 cols) */}
          <form onSubmit={handleConfirmClose} className="lg:col-span-6 space-y-5">
            {/* 2. MONTANT RÉEL COMPTÉ */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0055b8] text-white font-black text-[11px] flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Montant Réel Compté Dans le Tiroir <span className="text-rose-500">*</span>
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCalcOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
                >
                  <Calculator className="w-3.5 h-3.5 text-[#0055b8]" />
                  <span>Calculette de Monnaie</span>
                </button>
              </div>

              {/* Champ montant réel */}
              <div className="bg-slate-50/80 border border-slate-200 focus-within:border-[#0055b8] focus-within:bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between transition">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={closingPhysicalCash || ''}
                  onChange={(e) => setClosingPhysicalCash(Number(e.target.value))}
                  placeholder="0"
                  className="text-2xl sm:text-3xl font-black text-slate-900 bg-transparent outline-none w-full font-mono tracking-tight"
                />
                <span className="text-sm font-extrabold text-slate-400 uppercase tracking-wider ml-2">
                  {currency}
                </span>
              </div>

              {/* Indicateur d'Écart en temps réel */}
              <div>
                {difference === 0 ? (
                  <div className="bg-emerald-50/90 border border-emerald-200 text-emerald-900 rounded-2xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span className="text-xs font-extrabold">Caisse Parfaitement Équilibrée</span>
                    </div>
                    <span className="text-xs font-black text-emerald-700">0 {currency} (Écart nul)</span>
                  </div>
                ) : difference > 0 ? (
                  <div className="bg-blue-50/90 border border-blue-200 text-blue-900 rounded-2xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span className="text-xs font-extrabold">Excédent de Caisse</span>
                    </div>
                    <span className="text-xs font-black text-blue-700">
                      +{difference.toLocaleString('fr-FR')} {currency} (Surplus)
                    </span>
                  </div>
                ) : (
                  <div className="bg-rose-50/90 border border-rose-200 text-rose-900 rounded-2xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span className="text-xs font-extrabold">Déficit / Manquant de Caisse</span>
                    </div>
                    <span className="text-xs font-black text-rose-700">
                      -{Math.abs(difference).toLocaleString('fr-FR')} {currency} (Manquant)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. OBSERVATIONS DE FIN DE SERVICE */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0055b8] text-white font-black text-[11px] flex items-center justify-center">
                  3
                </span>
                <h2 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Observations de Fin de Service (Optionnel)
                </h2>
              </div>

              <textarea
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Ex: Prise de poste terminée, tiroir et rouleaux de monnaie vérifiés..."
                className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs text-slate-700 bg-slate-50/50 focus:bg-white focus:border-[#0055b8] outline-none transition resize-none h-20 placeholder:text-slate-400 font-medium"
              />
            </div>

            {/* BOUTON CONFIRMER CLÔTURE */}
            <button
              type="submit"
              disabled={isSubmittingClose}
              className="w-full py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition active:scale-[0.99]"
            >
              <Lock className="w-4 h-4" />
              <span>Confirmer la Clôture & Déconnecter la Caisse</span>
            </button>
          </form>
        </div>
      </div>

      {/* MODAL CALCULETTE DE MONNAIE */}
      {isCalcOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Calculette de Billets & Pièces</h3>
              </div>
              <button
                onClick={() => setIsCalcOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {[10000, 5000, 2000, 1000, 500, 200, 100, 50, 25].map((denom) => (
                <div
                  key={denom}
                  className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 flex flex-col justify-between"
                >
                  <span className="text-[11px] font-extrabold text-slate-700">
                    {denom.toLocaleString('fr-FR')} {currency}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={denominations[denom] || ''}
                    onChange={(e) =>
                      setDenominations({
                        ...denominations,
                        [denom]: Math.max(0, parseInt(e.target.value, 10) || 0)
                      })
                    }
                    placeholder="0"
                    className="w-full mt-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-900 text-right outline-none focus:border-[#0055b8]"
                  />
                </div>
              ))}
            </div>

            <div className="bg-blue-50 rounded-2xl p-3.5 flex items-center justify-between border border-blue-200">
              <span className="text-xs font-bold text-[#0055b8]">Total Compté :</span>
              <span className="text-lg font-black text-[#0055b8]">
                {calcTotal.toLocaleString('fr-FR')} {currency}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCalcOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={applyCalcTotal}
                className="flex-1 py-2.5 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs transition shadow-md"
              >
                Appliquer le Montant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOUVEMENT DE CAISSE (DÉPÔT / RETRAIT) */}
      {isMovementModalActive && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">
                {movementType === 'deposit' ? '➕ Dépôt de Monnaie' : '➖ Retrait de Caisse'}
              </h3>
              <button
                onClick={() => setIsMovementModalActive(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Montant ({currency}) *</label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={movementAmount || ''}
                  onChange={(e) => setMovementAmount(Number(e.target.value))}
                  placeholder="0"
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 outline-none focus:border-[#0055b8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Motif / Justification</label>
                <input
                  type="text"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="Ex: Monnaie d'appoint, paiement coursier..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#0055b8]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMovementModalActive(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={movementAmount <= 0}
                  className={`flex-1 py-2.5 rounded-xl text-white font-bold text-xs transition shadow-md ${
                    movementType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

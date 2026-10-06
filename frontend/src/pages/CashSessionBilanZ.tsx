import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  db,
  CashRegister,
  CashSession,
  CashMovement,
  Sale,
  SaleItem,
  User,
  Customer,
  Product
} from '../db/db';
import {
  ArrowLeft,
  Store,
  Calendar,
  Clock,
  User as UserIcon,
  Printer,
  Layers,
  Banknote,
  Smartphone,
  CreditCard,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileText,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Swal from 'sweetalert2';

interface SaleWithDetails extends Sale {
  customerName?: string;
  items?: (SaleItem & { productName?: string })[];
}

export const CashSessionBilanZ: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<CashSession | null>(null);
  const [register, setRegister] = useState<CashRegister | null>(null);
  const [cashier, setCashier] = useState<User | null>(null);
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Recherche dans les ventes
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);

  useEffect(() => {
    loadSessionDetails();
  }, [id]);

  const loadSessionDetails = async () => {
    if (!id) {
      navigate('/cash-registers');
      return;
    }

    setLoading(true);
    try {
      const sessionId = Number(id);
      const sess = await db.cash_sessions.get(sessionId);
      if (!sess) {
        Swal.fire('Erreur', 'Session de caisse introuvable.', 'error');
        navigate('/cash-registers');
        return;
      }
      setSession(sess);

      // Caisse
      const reg = await db.cash_registers.get(sess.cash_register_id);
      setRegister(reg || null);

      // Caissier
      const userObj = await db.users.get(sess.user_id);
      setCashier(userObj || null);

      // Mouvements
      const moves = await db.cash_movements
        .where('cash_session_id')
        .equals(sessionId)
        .sortBy('created_at');
      setMovements(moves);

      // Ventes de la session
      const allSales = await db.sales.toArray();
      const allCustomers = await db.customers.toArray();
      const customerMap = new Map(allCustomers.map((c) => [c.id!, c.name]));

      const allItems = await db.sale_items.toArray();

      const isOpen = sess.status === 'open';
      const allSessSalesRaw = allSales.filter((s) => {
        if (s.cash_session_id === sessionId) return true;
        if (isOpen && s.created_at >= sess.opened_at && (!s.cash_session_id || s.cash_session_id === sessionId)) return true;
        if (!isOpen && sess.closed_at && s.created_at >= sess.opened_at && s.created_at <= sess.closed_at) return true;
        return false;
      });

      const enrichedSales: SaleWithDetails[] = allSessSalesRaw.map((s) => {
        const saleItems = allItems.filter((it) => it.sale_id === s.id);
        return {
          ...s,
          customerName: s.customer_id ? customerMap.get(s.customer_id) || 'Client Comptoir' : 'Client Comptoir',
          items: saleItems.map((it) => ({ ...it, productName: it.product_name }))
        };
      });

      enrichedSales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSales(enrichedSales);
    } catch (err) {
      console.error('Erreur chargement Bilan Z:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper de détection rigoureuse des ventes annulées
  const isCancelledSale = (s: Sale) =>
    (s.payment_status as any) === 'cancelled' ||
    (s as any).status === 'cancelled' ||
    Boolean(s.notes && (s.notes.includes('ANNULÉE') || s.notes.toLowerCase().includes('annul')));

  // Ventes valides (non annulées) utilisées pour les calculs comptables et d'espèces
  const validSales = sales.filter((s) => !isCancelledSale(s));
  const cancelledSales = sales.filter((s) => isCancelledSale(s));

  // Calculs financiers réels
  const totalSalesCount = validSales.length;
  const totalCashSales = validSales.filter((s) => s.payment_method === 'cash').reduce((sum, s) => sum + (s.paid_amount || s.total_amount || 0), 0);
  const totalWaveSales = validSales.filter((s) => s.payment_method === 'wave').reduce((sum, s) => sum + (s.paid_amount || s.total_amount || 0), 0);
  const totalOmSales = validSales.filter((s) => s.payment_method === 'om').reduce((sum, s) => sum + (s.paid_amount || s.total_amount || 0), 0);
  const totalCardSales = validSales.filter((s) => s.payment_method === 'card').reduce((sum, s) => sum + (s.paid_amount || s.total_amount || 0), 0);
  const totalCreditSales = validSales.filter((s) => s.payment_method === 'credit').reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalRevenue = validSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

  const totalCancelledCount = cancelledSales.length;
  const totalCancelledAmount = cancelledSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

  const totalDeposits = movements.filter((m) => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0);
  const totalWithdrawals = movements.filter((m) => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0);

  const openingAmount = session?.opening_amount || 0;
  const theoreticalCash = openingAmount + totalCashSales + totalDeposits - totalWithdrawals;
  const declaredCash = session?.closing_amount !== undefined && session?.closing_amount !== null ? session.closing_amount : null;
  const discrepancy = declaredCash !== null ? declaredCash - theoreticalCash : 0;

  const isOpen = session?.status === 'open';

  // Formatage dates
  const openDate = session ? new Date(session.opened_at) : null;
  const openDateStr = openDate
    ? `${String(openDate.getDate()).padStart(2, '0')}/${String(openDate.getMonth() + 1).padStart(2, '0')}/${openDate.getFullYear()} à ${String(openDate.getHours()).padStart(2, '0')}:${String(openDate.getMinutes()).padStart(2, '0')}`
    : '-';

  const closeDate = session?.closed_at ? new Date(session.closed_at) : null;
  const closeDateStr = closeDate
    ? `${String(closeDate.getDate()).padStart(2, '0')}/${String(closeDate.getMonth() + 1).padStart(2, '0')}/${closeDate.getFullYear()} à ${String(closeDate.getHours()).padStart(2, '0')}:${String(closeDate.getMinutes()).padStart(2, '0')}`
    : 'Session en cours';

  // Filtrage des ventes
  const filteredSales = sales.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.invoice_number.toLowerCase().includes(q) ||
      (s.customerName && s.customerName.toLowerCase().includes(q)) ||
      s.payment_method.toLowerCase().includes(q) ||
      String(s.total_amount).includes(q)
    );
  });

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-[#0055b8] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-600">Chargement des détails et du Bilan Z...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 pb-20 print:p-0 print:m-0 print:space-y-4">
      
      {/* 1. EN-TÊTE PRINCIPAL AVEC ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs print:border-none print:shadow-none print:p-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/cash-registers')}
            className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition active:scale-95 print:hidden"
            title="Retour à la gestion de caisse"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-900">
                Détails & Bilan Z — Session #{session?.id}
              </h1>
              {isOpen ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>En cours (Ouverte)</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wide">
                  Clôturée
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Poste : <strong className="text-slate-800">{register?.name || `Caisse #${session?.cash_register_id}`}</strong> ({register?.code || 'N/A'}) • Caissier : <strong className="text-slate-800">{cashier?.name || 'Jean Koffi'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer le Bilan Z</span>
          </button>
        </div>
      </div>

      {/* 2. GRILLE DES KPIS CLÉS DU BILAN Z */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Fond initial */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            Fond Initial
          </span>
          <p className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {openingAmount.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-slate-400">FCFA</span>
          </p>
          <span className="text-[11px] text-slate-400 font-medium block truncate">
            Ouvert le {openDateStr.split(' à ')[0]}
          </span>
        </div>

        {/* Chiffre d'Affaires Réalisé */}
        <div className="bg-white p-4 rounded-3xl border border-blue-100 bg-blue-50/20 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#0055b8] tracking-wider">
            Chiffre d'Affaires
          </span>
          <p className="text-base sm:text-lg font-black text-[#0055b8] font-mono">
            {totalRevenue.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-blue-400">FCFA</span>
          </p>
          <span className="text-[11px] text-blue-600 font-medium block">
            {totalSalesCount} ticket{totalSalesCount > 1 ? 's' : ''} encaissé{totalSalesCount > 1 ? 's' : ''}
          </span>
        </div>

        {/* Espèces Théoriques Attendues */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            Espèces Théoriques
          </span>
          <p className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {theoreticalCash.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-slate-400">FCFA</span>
          </p>
          <span className="text-[11px] text-slate-400 font-medium block">
            Fond + Espèces + Dépôts - Retraits
          </span>
        </div>

        {/* Espèces Réelles Déclarées */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            Espèces Déclarées
          </span>
          <p className="text-base sm:text-lg font-black text-slate-900 font-mono">
            {declaredCash !== null ? (
              <>
                {declaredCash.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-slate-400">FCFA</span>
              </>
            ) : (
              <span className="text-xs italic text-slate-400 font-sans">Session ouverte</span>
            )}
          </p>
          <span className="text-[11px] text-slate-400 font-medium block truncate">
            {isOpen ? 'En attente de clôture' : `Clôturée à ${closeDateStr.split(' à ')[1] || ''}`}
          </span>
        </div>

        {/* Écart de caisse */}
        <div
          className={`p-4 rounded-3xl border shadow-xs space-y-1 col-span-2 sm:col-span-1 ${
            isOpen
              ? 'bg-slate-50 border-slate-200/80'
              : discrepancy === 0
              ? 'bg-emerald-50/50 border-emerald-200'
              : discrepancy > 0
              ? 'bg-blue-50/50 border-blue-200'
              : 'bg-rose-50/50 border-rose-200'
          }`}
        >
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            Écart Constaté
          </span>
          <p
            className={`text-base sm:text-lg font-black font-mono ${
              isOpen
                ? 'text-slate-500'
                : discrepancy === 0
                ? 'text-emerald-700'
                : discrepancy > 0
                ? 'text-blue-700'
                : 'text-rose-600'
            }`}
          >
            {declaredCash !== null ? (
              <>
                {discrepancy >= 0 ? '+' : ''}{discrepancy.toLocaleString('fr-FR')} <span className="text-xs font-semibold">FCFA</span>
              </>
            ) : (
              <span className="text-xs italic font-sans">0 FCFA</span>
            )}
          </p>
          <span className="text-[11px] font-bold block">
            {isOpen
              ? 'En cours'
              : discrepancy === 0
              ? '✓ Arrêté parfait'
              : discrepancy > 0
              ? 'Excédent de caisse'
              : 'Déficit de caisse'}
          </span>
        </div>
      </div>

      {/* 3. VENTILATION PAR MODE DE PAIEMENT & MOUVEMENTS DE CAISSE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CARTE : VENTILATION DES ENCAISSEMENTS */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <TrendingUp className="w-4 h-4 text-[#0055b8]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Répartition par Mode de Paiement
            </h2>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            {/* Espèces */}
            <div className="p-3 rounded-2xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2 font-sans font-bold text-slate-800">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Espèces (Cash)</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-emerald-800 block">{totalCashSales.toLocaleString('fr-FR')} F</span>
                <span className="text-[10px] text-emerald-600 font-sans font-medium">
                  {totalRevenue > 0 ? Math.round((totalCashSales / totalRevenue) * 100) : 0}% du total
                </span>
              </div>
            </div>

            {/* Mobile Money (Wave & Orange combinés) */}
            <div className="p-3 rounded-2xl bg-sky-50/40 border border-sky-100 flex items-center justify-between">
              <div className="flex items-center gap-2 font-sans font-bold text-slate-800">
                <Smartphone className="w-4 h-4 text-sky-600" />
                <span>Mobile Money</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-sky-800 block">{(totalWaveSales + totalOmSales).toLocaleString('fr-FR')} F</span>
                <span className="text-[10px] text-sky-600 font-sans font-medium">
                  {totalRevenue > 0 ? Math.round(((totalWaveSales + totalOmSales) / totalRevenue) * 100) : 0}% du total
                </span>
              </div>
            </div>

            {/* Carte Bancaire */}
            <div className="p-3 rounded-2xl bg-indigo-50/40 border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2 font-sans font-bold text-slate-800">
                <CreditCard className="w-4 h-4 text-indigo-500" />
                <span>Carte Bancaire</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-indigo-800 block">{totalCardSales.toLocaleString('fr-FR')} F</span>
                <span className="text-[10px] text-indigo-600 font-sans font-medium">
                  {totalRevenue > 0 ? Math.round((totalCardSales / totalRevenue) * 100) : 0}% du total
                </span>
              </div>
            </div>

            {/* Crédit Client */}
            <div className="p-3 rounded-2xl bg-rose-50/40 border border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2 font-sans font-bold text-slate-800">
                <DollarSign className="w-4 h-4 text-rose-500" />
                <span>Ventes à Crédit</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-rose-800 block">{totalCreditSales.toLocaleString('fr-FR')} F</span>
                <span className="text-[10px] text-rose-600 font-sans font-medium">
                  {totalRevenue > 0 ? Math.round((totalCreditSales / totalRevenue) * 100) : 0}% du total
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
            <span>Total Recettes Session :</span>
            <span className="font-mono text-sm text-[#0055b8]">{totalRevenue.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        {/* CARTE : MOUVEMENTS DE CAISSE (DÉPÔTS & RETRAITS) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0055b8]" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Mouvements de Caisse (Entrées / Sorties de Fonds)
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium font-mono">
              {movements.length} mouvement{movements.length > 1 ? 's' : ''}
            </span>
          </div>

          {movements.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              Aucun mouvement intermédiaire (dépôt ou retrait) enregistré durant cette session.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2.5">HEURE</th>
                    <th className="px-3 py-2.5">TYPE</th>
                    <th className="px-3 py-2.5">MOTIF / RAISON</th>
                    <th className="px-3 py-2.5 text-right">MONTANT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {movements.map((m) => {
                    const timeStr = new Date(m.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    const isDeposit = m.type === 'deposit';

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-3 py-2.5 font-mono text-slate-500 font-bold">{timeStr}</td>
                        <td className="px-3 py-2.5">
                          {isDeposit ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              + Entrée de fonds
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              - Sortie de fonds
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-800 font-semibold">{m.reason || 'Mouvement de caisse'}</td>
                        <td
                          className={`px-3 py-2.5 text-right font-mono font-bold ${
                            isDeposit ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {isDeposit ? '+' : '-'}{m.amount.toLocaleString('fr-FR')} FCFA
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 font-mono text-xs">
            <div className="p-3 rounded-2xl bg-emerald-50/30 border border-emerald-100 flex items-center justify-between">
              <span className="font-sans font-bold text-slate-700">Total Dépôts / Entrées :</span>
              <span className="font-bold text-emerald-700">+{totalDeposits.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50/30 border border-rose-100 flex items-center justify-between">
              <span className="font-sans font-bold text-slate-700">Total Retraits / Sorties :</span>
              <span className="font-bold text-rose-600">-{totalWithdrawals.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. JOURNAL COMPLET DES VENTES / TICKETS DE LA SESSION */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#0055b8]" />
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Journal des Ventes & Tickets de Caisse
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Détail de toutes les transactions encaissées pendant cette session
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-72 print:hidden">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher ticket, client, mode..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-3.5 py-3">N° FACTURE</th>
                <th className="px-3.5 py-3">HEURE</th>
                <th className="px-3.5 py-3">CLIENT</th>
                <th className="px-3.5 py-3">RÈGLEMENT</th>
                <th className="px-3.5 py-3 text-center">ARTICLES</th>
                <th className="px-3.5 py-3 text-right">TOTAL VENTE</th>
                <th className="px-3.5 py-3 text-right print:hidden">DÉTAIL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredSales.map((s) => {
                const timeStr = new Date(s.created_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                const isCancelled = isCancelledSale(s);
                const isExpanded = expandedSaleId === s.id;

                return (
                  <React.Fragment key={s.id}>
                    <tr
                      className={`hover:bg-slate-50/60 transition cursor-pointer ${
                        isCancelled ? 'bg-rose-50/30 opacity-80' : ''
                      }`}
                      onClick={() => setExpandedSaleId(isExpanded ? null : s.id!)}
                    >
                      <td className="px-3.5 py-3 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{s.invoice_number}</span>
                          {isCancelled && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200 uppercase">
                              Annulée
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 font-mono text-slate-500 font-bold">
                        {timeStr}
                      </td>
                      <td className="px-3.5 py-3">
                        <span className="text-slate-800">{s.customerName}</span>
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isCancelled
                              ? 'bg-rose-50 text-rose-700 border-rose-200 line-through'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {s.payment_method}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center font-mono">
                        {s.items?.length || 0} art.
                      </td>
                      <td
                        className={`px-3.5 py-3 text-right font-mono font-black ${
                          isCancelled ? 'text-rose-500 line-through' : 'text-[#0055b8]'
                        }`}
                      >
                        {(s.total_amount || 0).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-3.5 py-3 text-right print:hidden">
                        <button
                          type="button"
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Détails des lignes d'articles vendus */}
                    {isExpanded && s.items && s.items.length > 0 && (
                      <tr className="bg-blue-50/20">
                        <td colSpan={7} className="px-6 py-3">
                          <div className="bg-white rounded-2xl p-3 border border-blue-100 space-y-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                              Articles vendus sur le ticket {s.invoice_number}
                            </span>
                            <div className="space-y-1 text-xs">
                              {s.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-slate-700 border-b border-slate-50 pb-1">
                                  <span>
                                    <strong className="text-slate-900">{item.quantity}x</strong> {item.product_name}
                                  </span>
                                  <span className="font-mono text-slate-900 font-bold">
                                    {(item.subtotal || item.quantity * item.unit_price).toLocaleString('fr-FR')} FCFA
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                    Aucune vente enregistrée pour cette session.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. TICKET RÉCAPITULATIF FISCAL / BILAN Z (FORMAT IMPRIMANTE THERMIQUE & RAPPORT COMPTABLE) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4 max-w-xl mx-auto print:max-w-none print:border-none print:shadow-none print:p-0">
        <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300">
          <h3 className="text-base font-black tracking-wider text-slate-900 uppercase">
            BILAN Z JOURNALIER DE CAISSE
          </h3>
          <p className="text-xs font-bold text-slate-600">
            {register?.name} ({register?.code})
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            Session #{session?.id} • Date d'édition : {new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR')}
          </p>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-slate-600">Caissier responsable :</span>
            <span className="font-bold text-slate-900">{cashier?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Ouverture de session :</span>
            <span className="font-bold text-slate-900">{openDateStr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Clôture de session :</span>
            <span className="font-bold text-slate-900">{closeDateStr}</span>
          </div>
          
          <div className="pt-2 border-t border-dashed border-slate-200 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-600">FOND INITIAL :</span>
              <span className="font-bold text-slate-900">{openingAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">TOTAL VENTES ESPÈCES :</span>
              <span className="font-bold text-slate-900">{totalCashSales.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">TOTAL VENTES MOBILE MONEY :</span>
              <span className="font-bold text-slate-900">{(totalWaveSales + totalOmSales).toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">TOTAL VENTES CARTE :</span>
              <span className="font-bold text-slate-900">{totalCardSales.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">TOTAL VENTES CRÉDIT :</span>
              <span className="font-bold text-slate-900">{totalCreditSales.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">ENTRÉES DE FONDS (DÉPÔTS) :</span>
              <span className="font-bold text-emerald-700">+{totalDeposits.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span>FONDS RETIRÉS (DÉCAISSEMENTS) :</span>
              <span className="font-bold">-{totalWithdrawals.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-rose-600 font-semibold pt-1 border-t border-dashed border-rose-200">
              <span>FONDS / VENTES ANNULÉES ({totalCancelledCount} ticket{totalCancelledCount > 1 ? 's' : ''}) :</span>
              <span className="font-bold">-{totalCancelledAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>

          <div className="pt-3 border-t-2 border-slate-900 space-y-1.5">
            <div className="flex justify-between text-sm font-black text-slate-900">
              <span>CHIFFRE D'AFFAIRES NET TOTAL :</span>
              <span>{totalRevenue.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-xs font-black text-slate-900 bg-slate-100 p-2 rounded-lg">
              <span>MONTANT GLOBAL D'ESPÈCES DE FIN ATTENDU :</span>
              <span className="font-mono text-[#0055b8]">{theoreticalCash.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-800">
              <span>ESPÈCES RÉELLES DÉCLARÉES / COMPTÉES :</span>
              <span>
                {declaredCash !== null ? `${declaredCash.toLocaleString('fr-FR')} FCFA` : 'Session en cours'}
              </span>
            </div>
            <div className="flex justify-between text-xs font-black pt-1 border-t border-dashed border-slate-300">
              <span className="uppercase">Écart de caisse :</span>
              <span
                className={
                  discrepancy === 0
                    ? 'text-emerald-700'
                    : discrepancy > 0
                    ? 'text-blue-700'
                    : 'text-rose-600'
                }
              >
                {declaredCash !== null ? `${discrepancy >= 0 ? '+' : ''}${discrepancy.toLocaleString('fr-FR')} FCFA` : '0 FCFA'}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-8 grid grid-cols-2 gap-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="border-t border-slate-300 pt-2">
            Signature Caissier
          </div>
          <div className="border-t border-slate-300 pt-2">
            Signature Responsable / Admin
          </div>
        </div>
      </div>

    </div>
  );
};
export default CashSessionBilanZ;

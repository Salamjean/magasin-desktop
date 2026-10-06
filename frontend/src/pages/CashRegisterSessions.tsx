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
import { useAuth } from '../context/AuthContext';
import {
  DollarSign,
  Printer,
  ArrowLeft,
  Clock,
  UserCheck,
  Layers,
  Banknote,
  CreditCard,
  Phone,
  Coins,
  Receipt,
  TrendingUp,
  Building2,
  Eye,
  Calendar,
  CheckCircle2,
  Search
} from 'lucide-react';
import Swal from 'sweetalert2';

interface SessionWithFullDetails extends CashSession {
  registerName?: string;
  registerCode?: string;
  cashierName?: string;
  salesCount: number;
  totalCashSales: number;
  totalWaveSales: number;
  totalOmSales: number;
  totalCardSales: number;
  totalCreditSales: number;
  totalSalesAmount: number;
  totalDeposits: number;
  totalWithdrawals: number;
  theoreticalCash: number;
  cashDiscrepancy: number;
  sales: (Sale & { customerName?: string; itemSummary?: string; itemCount: number })[];
  movements: CashMovement[];
}

export const CashRegisterSessions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [register, setRegister] = useState<CashRegister | null>(null);
  const [sessions, setSessions] = useState<SessionWithFullDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'closed' | 'open'>('all');

  // Session sélectionnée pour afficher la vue complète (comme sur l'image)
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  // Formulaire d'ajout de mouvement dans la session ouverte (Entrée / Sortie)
  const [movementType, setMovementType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [movementAmount, setMovementAmount] = useState<string | number>('');
  const [movementReason, setMovementReason] = useState('');
  const [savingMovement, setSavingMovement] = useState(false);

  useEffect(() => {
    loadRegisterAndSessions();
  }, [id]);

  const loadRegisterAndSessions = async () => {
    if (!id) {
      navigate('/cash-registers');
      return;
    }
    const regId = Number(id);
    setLoading(true);

    try {
      const reg = await db.cash_registers.get(regId);
      if (!reg) {
        Swal.fire('Erreur', 'Poste de caisse introuvable.', 'error');
        navigate('/cash-registers');
        return;
      }
      setRegister(reg);

      const allSessions = await db.cash_sessions.where('cash_register_id').equals(regId).toArray();
      const allMovements = await db.cash_movements.toArray();
      const allSales = await db.sales.toArray();
      const allSaleItems = await db.sale_items.toArray();
      const allProducts = await db.products.toArray();
      const allUsers = await db.users.toArray();
      const allCustomers = await db.customers.toArray();

      const userMap = new Map<number, string>(allUsers.map((u) => [u.id!, u.name]));
      const customerMap = new Map<number, string>(allCustomers.map((c) => [c.id!, c.name]));
      const productMap = new Map<number, string>(allProducts.map((p) => [p.id!, p.name]));

      const enrichedSessions: SessionWithFullDetails[] = allSessions.map((sess) => {
        const cashier = userMap.get(sess.user_id) || 'Opérateur TPV';

        const sessMovements = allMovements
          .filter((m) => m.cash_session_id === sess.id)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const sessSalesRaw = allSales.filter((s) => {
          if (s.cash_session_id && s.cash_session_id === sess.id) return true;
          if (!s.cash_session_id) {
            const saleTime = new Date(s.created_at).getTime();
            const openTime = new Date(sess.opened_at).getTime();
            const closeTime = sess.closed_at ? new Date(sess.closed_at).getTime() : Date.now();
            return saleTime >= openTime && saleTime <= closeTime;
          }
          return false;
        });

        const sessSales = sessSalesRaw
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map((s) => {
            const items = allSaleItems.filter((it) => it.sale_id === s.id);
            const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);
            const itemNames = items
              .slice(0, 3)
              .map((it) => `${productMap.get(it.product_id) || 'Article'} (x${it.quantity})`)
              .join(', ');
            const itemSummary =
              items.length > 3 ? `${itemNames} + ${items.length - 3} autre(s)` : itemNames || 'Articles divers';

            return {
              ...s,
              customerName: s.customer_id ? customerMap.get(s.customer_id) : 'Client Standard / Comptoir',
              itemSummary,
              itemCount
            };
          });

        const isSaleCancelled = (s: Sale) =>
          (s.payment_status as any) === 'cancelled' ||
          (s as any).status === 'cancelled' ||
          Boolean(s.notes && (s.notes.includes('ANNULÉE') || s.notes.toLowerCase().includes('annul')));

        const validSessSales = sessSales.filter((s) => !isSaleCancelled(s));

        const totalCashSales = validSessSales
          .filter((s) => s.payment_method === 'cash')
          .reduce((sum, s) => sum + s.total_amount, 0);

        const totalWaveSales = validSessSales
          .filter((s) => s.payment_method === 'wave')
          .reduce((sum, s) => sum + s.total_amount, 0);

        const totalOmSales = validSessSales
          .filter((s) => s.payment_method === 'om')
          .reduce((sum, s) => sum + s.total_amount, 0);

        const totalCardSales = validSessSales
          .filter((s) => s.payment_method === 'card')
          .reduce((sum, s) => sum + s.total_amount, 0);

        const totalCreditSales = validSessSales
          .filter((s) => s.payment_method === 'credit')
          .reduce((sum, s) => sum + s.total_amount, 0);

        const totalSalesAmount = validSessSales.reduce((sum, s) => sum + s.total_amount, 0);

        const totalDeposits = sessMovements
          .filter((m) => m.type === 'deposit')
          .reduce((sum, m) => sum + m.amount, 0);

        const totalWithdrawals = sessMovements
          .filter((m) => m.type === 'withdrawal')
          .reduce((sum, m) => sum + m.amount, 0);

        const theoreticalCash =
          (sess.opening_amount || 0) + totalCashSales + totalDeposits - totalWithdrawals;

        const declaredCash = sess.closing_amount ?? (sess.status === 'open' ? null : 0);
        const cashDiscrepancy =
          declaredCash !== null ? declaredCash - theoreticalCash : 0;

        return {
          ...sess,
          registerName: reg.name,
          registerCode: reg.code,
          cashierName: cashier,
          salesCount: validSessSales.length,
          totalCashSales,
          totalWaveSales,
          totalOmSales,
          totalCardSales,
          totalCreditSales,
          totalSalesAmount,
          totalDeposits,
          totalWithdrawals,
          theoreticalCash,
          cashDiscrepancy,
          sales: sessSales,
          movements: sessMovements
        };
      });

      enrichedSessions.sort(
        (a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
      );

      setSessions(enrichedSessions);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Mouvement exceptionnel dans la session
  const handleAddMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) return;

    const amount = Number(movementAmount);
    if (!amount || amount <= 0) {
      Swal.fire('Attention', 'Veuillez saisir un montant supérieur à 0 FCFA.', 'warning');
      return;
    }

    setSavingMovement(true);
    try {
      await db.cash_movements.add({
        cash_session_id: selectedSessionId,
        type: movementType,
        amount: amount,
        reason: movementReason.trim() || (movementType === 'deposit' ? 'Dépôt exceptionnel' : 'Retrait exceptionnel'),
        created_at: new Date().toISOString(),
        synced: 0
      });

      await Swal.fire({
        icon: 'success',
        title: 'Mouvement enregistré !',
        text: `${movementType === 'deposit' ? 'Entrée (+)' : 'Sortie (-)'} de ${amount.toLocaleString('fr-FR')} FCFA.`,
        timer: 1800,
        showConfirmButton: false
      });

      setMovementAmount('');
      setMovementReason('');
      loadRegisterAndSessions();
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Une erreur est survenue.', 'error');
    } finally {
      setSavingMovement(false);
    }
  };

  // Impression Rapport Z
  const handlePrintZReport = (sess: SessionWithFullDetails) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bilan Z — ${sess.registerName} — Session #${sess.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #1e293b; font-size: 13px; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 15px; margin-bottom: 15px; }
            .title { font-size: 18px; font-weight: 900; margin: 0 0 5px 0; }
            .subtitle { font-size: 12px; color: #64748b; }
            .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 15px; margin-bottom: 8px; }
            .grid { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .label { color: #64748b; font-weight: 600; }
            .val { font-weight: 800; font-family: monospace; }
            .total-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-top: 15px; }
            .big-val { font-size: 16px; font-weight: 900; }
            .success { color: #059669; }
            .danger { color: #e11d48; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { text-align: left; padding: 6px; border-bottom: 1px solid #f1f5f9; }
            th { background: #f8fafc; font-weight: 800; color: #475569; text-transform: uppercase; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">RAPPORT DE CLÔTURE DE CAISSE (BILAN Z)</h1>
            <p class="subtitle">${sess.registerName} (${sess.registerCode}) — Session #${sess.id}</p>
            <p class="subtitle">Caissier : <strong>${sess.cashierName}</strong></p>
            <p class="subtitle">Ouverte le : ${new Date(sess.opened_at).toLocaleString('fr-FR')} ${
      sess.closed_at ? `| Clôturée le : ${new Date(sess.closed_at).toLocaleString('fr-FR')}` : '(En cours)'
    }</p>
          </div>

          <div class="section-title">SYNTHÈSE FINANCIÈRE DE LA SESSION</div>
          <div class="grid"><span class="label">Fond de Caisse Initial :</span><span class="val">+${sess.opening_amount.toLocaleString('fr-FR')} FCFA</span></div>
          <div class="grid"><span class="label">Total Recettes Ventes :</span><span class="val">${sess.totalSalesAmount.toLocaleString('fr-FR')} FCFA (${sess.salesCount} tickets)</span></div>
          <div class="grid"><span class="label">Entrées / Dépôts de Fonds :</span><span class="val success">+${sess.totalDeposits.toLocaleString('fr-FR')} FCFA</span></div>
          <div class="grid"><span class="label">Fonds Retirés / Décaissements :</span><span class="val danger">-${sess.totalWithdrawals.toLocaleString('fr-FR')} FCFA</span></div>

          <div class="section-title">VENTILATION PAR MODE DE RÈGLEMENT</div>
          <div class="grid"><span class="label">Espèces :</span><span class="val">${sess.totalCashSales.toLocaleString('fr-FR')} FCFA</span></div>
          <div class="grid"><span class="label">Mobile Money (Wave / OM) :</span><span class="val">${(sess.totalWaveSales + sess.totalOmSales).toLocaleString('fr-FR')} FCFA</span></div>
          <div class="grid"><span class="label">Carte Bancaire :</span><span class="val">${sess.totalCardSales.toLocaleString('fr-FR')} FCFA</span></div>
          <div class="grid"><span class="label">Prises de Crédit :</span><span class="val">${sess.totalCreditSales.toLocaleString('fr-FR')} FCFA</span></div>

          <div class="total-box">
            <div class="grid"><span class="label">Montant Global d'Espèces de Fin Attendu :</span><span class="val big-val">${sess.theoreticalCash.toLocaleString('fr-FR')} FCFA</span></div>
            ${
              sess.closing_amount !== undefined && sess.closing_amount !== null
                ? `
              <div class="grid" style="margin-top: 6px;"><span class="label">Montant Réel Déclaré à la Clôture :</span><span class="val big-val">${sess.closing_amount.toLocaleString('fr-FR')} FCFA</span></div>
              <div class="grid" style="margin-top: 6px;"><span class="label">Écart de Caisse :</span><span class="val big-val ${sess.cashDiscrepancy >= 0 ? 'success' : 'danger'}">${sess.cashDiscrepancy >= 0 ? '+' : ''}${sess.cashDiscrepancy.toLocaleString('fr-FR')} FCFA</span></div>
            `
                : ''
            }
          </div>

          <div class="section-title">JOURNAL DES VENTES (${sess.sales.length} VENTES)</div>
          <table>
            <thead>
              <tr>
                <th>N° Ticket</th>
                <th>Heure</th>
                <th>Client</th>
                <th>Moyen</th>
                <th style="text-align: right;">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${sess.sales
                .map(
                  (s) => `
                <tr>
                  <td style="font-family: monospace; font-weight: bold;">${s.invoice_number}</td>
                  <td>${new Date(s.created_at).toLocaleTimeString('fr-FR')}</td>
                  <td>${s.customerName}</td>
                  <td>${s.payment_method.toUpperCase()}</td>
                  <td style="text-align: right; font-family: monospace; font-weight: bold;">${s.total_amount.toLocaleString('fr-FR')} F</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      (s.cashierName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      `session #${s.id}`.includes(searchQuery.toLowerCase()) ||
      (s.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'closed' && s.status === 'closed') ||
      (statusFilter === 'open' && s.status === 'open');

    return matchesSearch && matchesStatus;
  });

  const activeSelectedSession = sessions.find((s) => s.id === selectedSessionId) || null;
  const currentOpenSession = sessions.find((s) => s.status === 'open');
  const totalVolume = sessions.reduce((sum, s) => sum + s.totalSalesAmount, 0);

  if (loading || !register) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0055b8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 pb-16">
      {/* 1. SI UNE SESSION EST SÉLECTIONNÉE -> AFFICHER LA VUE DÉTAILLÉE COMPLÈTE */}
      {activeSelectedSession ? (
        <div className="space-y-6 animate-in fade-in">
          {/* EN-TÊTE DE LA SESSION (CONFORME À L'IMAGE) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-lg shadow-blue-500/25 mt-0.5">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {activeSelectedSession.registerName} — Session #{activeSelectedSession.id}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                      activeSelectedSession.status === 'open'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        activeSelectedSession.status === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    <span>
                      {activeSelectedSession.status === 'open'
                        ? 'Session Ouverte (En cours)'
                        : 'Session Clôturée'}
                    </span>
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-semibold flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    Code poste :{' '}
                    <strong className="text-slate-800 font-mono">
                      {activeSelectedSession.registerCode}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Caissier responsable :{' '}
                    <strong className="text-slate-800">
                      {activeSelectedSession.cashierName}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Ouverte le :{' '}
                    <strong className="text-slate-800">
                      {new Date(activeSelectedSession.opened_at).toLocaleDateString('fr-FR')} à{' '}
                      {new Date(activeSelectedSession.opened_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </strong>
                  </span>
                  {activeSelectedSession.closed_at && (
                    <>
                      <span>•</span>
                      <span>
                        Fermée le :{' '}
                        <strong className="text-slate-800">
                          {new Date(activeSelectedSession.closed_at).toLocaleDateString('fr-FR')} à{' '}
                          {new Date(activeSelectedSession.closed_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Boutons d'actions */}
            <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
              <button
                type="button"
                onClick={() => handlePrintZReport(activeSelectedSession)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs shadow-xs transition active:scale-95"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Imprimer le Bilan (Z)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSessionId(null)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour aux sessions</span>
              </button>
            </div>
          </div>

          {/* 6 CARTES INDICATEURS (CONFORMES À L'IMAGE) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* 1. FOND INITIAL */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                FOND INITIAL
              </span>
              <div className="my-1.5">
                <p className="text-base sm:text-lg font-black font-mono text-slate-900">
                  {activeSelectedSession.opening_amount.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Monnaie de départ</p>
            </div>

            {/* 2. RECETTES VENTES */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                RECETTES VENTES
              </span>
              <div className="my-1.5">
                <p className="text-base sm:text-lg font-black font-mono text-slate-900">
                  {activeSelectedSession.totalSalesAmount.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                {activeSelectedSession.salesCount} ticket(s) validé(s)
              </p>
            </div>

            {/* 3. MONTANT THÉORIQUE */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                MONTANT THÉORIQUE
              </span>
              <div className="my-1.5">
                <p className="text-base sm:text-lg font-black font-mono text-slate-900">
                  {activeSelectedSession.theoreticalCash.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Attendu en espèces</p>
            </div>

            {/* 4. MONTANT DÉCLARÉ */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                MONTANT DÉCLARÉ
              </span>
              <div className="my-1.5">
                <p className="text-base sm:text-lg font-black font-mono text-slate-900">
                  {activeSelectedSession.closing_amount !== undefined &&
                  activeSelectedSession.closing_amount !== null
                    ? `${activeSelectedSession.closing_amount.toLocaleString('fr-FR')} FCFA`
                    : 'En cours'}
                </p>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Comptage physique</p>
            </div>

            {/* 5. ÉCART DE CAISSE */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                ÉCART DE CAISSE
              </span>
              <div className="my-1.5">
                <p
                  className={`text-base sm:text-lg font-black font-mono ${
                    activeSelectedSession.status === 'open'
                      ? 'text-slate-500'
                      : activeSelectedSession.cashDiscrepancy === 0
                      ? 'text-emerald-600'
                      : activeSelectedSession.cashDiscrepancy > 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {activeSelectedSession.status === 'open'
                    ? 'En cours de session'
                    : `${activeSelectedSession.cashDiscrepancy >= 0 ? '+' : ''}${activeSelectedSession.cashDiscrepancy.toLocaleString(
                        'fr-FR'
                      )} FCFA`}
                </p>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Calculé à la clôture</p>
            </div>

            {/* 6. PRISES DE CRÉDIT */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-slate-400" />
                PRISES DE CRÉDIT
              </span>
              <div className="my-1.5">
                <p className="text-base sm:text-lg font-black font-mono text-slate-900">
                  {activeSelectedSession.totalCreditSales.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                {activeSelectedSession.totalCreditSales.toLocaleString('fr-FR')} FCFA en crédit
              </p>
            </div>
          </div>

          {/* 2 COLONNES PRINCIPALES : VENTILATION + MOUVEMENTS EXCEPTIONNELS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* COLONNE GAUCHE : VENTILATION DES ENCAISSEMENTS DU JOUR */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-[#0055b8]">
                  <Layers className="w-4 h-4" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    VENTILATION DES ENCAISSEMENTS DU JOUR
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  {activeSelectedSession.salesCount} ventes validées
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Espèces reçues */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100/90 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Espèces reçues</span>
                  </div>
                  <p className="text-lg font-black font-mono text-slate-900">
                    {activeSelectedSession.totalCashSales.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>

                {/* Mobile Money */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100/90 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                    <Phone className="w-4 h-4 text-amber-600" />
                    <span>Mobile Money (Wave / OM)</span>
                  </div>
                  <p className="text-lg font-black font-mono text-slate-900">
                    {(
                      activeSelectedSession.totalWaveSales + activeSelectedSession.totalOmSales
                    ).toLocaleString('fr-FR')}{' '}
                    FCFA
                  </p>
                </div>

                {/* Carte Bancaire */}
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100/90 space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-800 text-xs font-bold">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Carte Bancaire</span>
                  </div>
                  <p className="text-lg font-black font-mono text-slate-900">
                    {activeSelectedSession.totalCardSales.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>

                {/* Virement / Autre / Crédit */}
                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100/90 space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-800 text-xs font-bold">
                    <Coins className="w-4 h-4 text-purple-600" />
                    <span>Prises de Crédit</span>
                  </div>
                  <p className="text-lg font-black font-mono text-slate-900">
                    {activeSelectedSession.totalCreditSales.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>
            </div>

            {/* COLONNE DROITE : MOUVEMENTS EXCEPTIONNELS DE FONDS */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-[#0055b8]">
                  <TrendingUp className="w-4 h-4" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    MOUVEMENTS EXCEPTIONNELS DE FONDS
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold">
                  <span className="text-emerald-600">
                    +{activeSelectedSession.totalDeposits.toLocaleString('fr-FR')} FCFA
                  </span>{' '}
                  /{' '}
                  <span className="text-rose-600">
                    -{activeSelectedSession.totalWithdrawals.toLocaleString('fr-FR')} FCFA
                  </span>
                </span>
              </div>

              {/* Liste des mouvements */}
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {activeSelectedSession.movements.map((m) => {
                  const isDeposit = m.type === 'deposit';
                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isDeposit
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {isDeposit ? '+' : '-'}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800">{m.reason}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(m.created_at).toLocaleTimeString('fr-FR')} • Opérateur :{' '}
                            {activeSelectedSession.cashierName}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-mono font-black text-xs ${
                          isDeposit ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isDeposit ? '+' : '-'}
                        {m.amount.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  );
                })}

                {activeSelectedSession.movements.length === 0 && (
                  <p className="text-center py-6 text-xs text-slate-400 font-medium">
                    Aucun mouvement exceptionnel enregistré.
                  </p>
                )}
              </div>

              {/* Formulaire d'enregistrement de mouvement (si session ouverte) */}
              {activeSelectedSession.status === 'open' && (
                <form
                  onSubmit={handleAddMovementSubmit}
                  className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2"
                >
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value as any)}
                    className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0055b8]"
                  >
                    <option value="deposit">Entrée (+)</option>
                    <option value="withdrawal">Sortie (-)</option>
                  </select>

                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    placeholder="Montant FCFA"
                    className="w-full sm:w-32 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black font-mono text-slate-900 focus:outline-none focus:border-[#0055b8]"
                  />

                  <input
                    type="text"
                    value={movementReason}
                    onChange={(e) => setMovementReason(e.target.value)}
                    placeholder="Motif"
                    className="flex-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0055b8]"
                  />

                  <button
                    type="submit"
                    disabled={savingMovement}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95 disabled:opacity-50 whitespace-nowrap"
                  >
                    {savingMovement ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* TABLEAU INFÉRIEUR : JOURNAL COMPLET DES VENTES DE LA SESSION */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-[#0055b8]">
                  <Receipt className="w-4 h-4" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    JOURNAL COMPLET DES VENTES DE LA SESSION
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Tickets de caisse émis, clients, modes de règlement et totaux
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">
                {activeSelectedSession.sales.length} vente(s) enregistrée(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-extrabold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">N° TICKET & HEURE</th>
                    <th className="px-5 py-3.5">CLIENT</th>
                    <th className="px-5 py-3.5">ARTICLES VENDUS</th>
                    <th className="px-5 py-3.5">MOYEN PAIEMENT</th>
                    <th className="px-5 py-3.5 text-right">MONTANT TOTAL</th>
                    <th className="px-5 py-3.5 text-center">STATUT</th>
                    <th className="px-5 py-3.5 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {activeSelectedSession.sales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      {/* N° Ticket & Heure */}
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-black text-slate-900">
                          {s.invoice_number || `#TICKET-${s.id}`}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {new Date(s.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                      </td>

                      {/* Client */}
                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        {s.customerName}
                      </td>

                      {/* Articles */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-800">{s.itemCount} article(s)</div>
                        <p className="text-[10px] text-slate-400 font-normal truncate max-w-xs">
                          {s.itemSummary}
                        </p>
                      </td>

                      {/* Moyen Paiement */}
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold">
                          {s.payment_method === 'cash' ? (
                            <>
                              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Espèces</span>
                            </>
                          ) : s.payment_method === 'wave' || s.payment_method === 'om' ? (
                            <>
                              <Phone className="w-3.5 h-3.5 text-amber-600" />
                              <span>{s.payment_method === 'wave' ? 'Wave' : 'Orange Money'}</span>
                            </>
                          ) : s.payment_method === 'card' ? (
                            <>
                              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                              <span>Carte</span>
                            </>
                          ) : (
                            <>
                              <Coins className="w-3.5 h-3.5 text-purple-600" />
                              <span>Crédit</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Montant Total */}
                      <td className="px-5 py-3.5 text-right font-mono font-black text-slate-900 text-sm">
                        {(s.total_amount || 0).toLocaleString('fr-FR')} FCFA
                      </td>

                      {/* Statut */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          Payé / Validé
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => {
                            Swal.fire({
                              title: `Ticket ${s.invoice_number}`,
                              html: `
                                <div class="text-left text-xs space-y-2">
                                  <p><strong>Client :</strong> ${s.customerName}</p>
                                  <p><strong>Articles :</strong> ${s.itemSummary}</p>
                                  <p><strong>Total :</strong> ${s.total_amount.toLocaleString('fr-FR')} FCFA</p>
                                  <p><strong>Paiement :</strong> ${s.payment_method.toUpperCase()}</p>
                                </div>
                              `,
                              icon: 'info',
                              confirmButtonText: 'Fermer'
                            });
                          }}
                          className="p-1.5 bg-blue-50 text-[#0055b8] hover:bg-[#0055b8] hover:text-white rounded-xl transition shadow-xs"
                          title="Voir le ticket"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {activeSelectedSession.sales.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-14 space-y-2">
                        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                          <Receipt className="w-6 h-6" />
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                          Aucune vente enregistrée lors de cette session
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* 2. VUE LISTE DES SESSIONS DE CETTE CAISSE */
        <div className="space-y-6">
          {/* EN-TÊTE DU POSTE DE CAISSE */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-lg shadow-blue-500/25">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <span>Caisses TPV</span>
                  <span>/</span>
                  <span className="text-slate-600 font-bold">{register.name}</span>
                </div>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">{register.name}</h1>
                  <span className="text-xs font-mono font-bold text-[#0055b8] bg-blue-50 px-2.5 py-0.5 rounded-lg uppercase">
                    {register.code}
                  </span>
                  <span
                    className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                      register.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {register.is_active ? '✓ Active' : 'Désactivée'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/cash-registers')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95 self-start sm:self-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour aux caisses</span>
            </button>
          </div>

          {/* 3 STATS RAPIDES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-subtle flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Sessions</p>
                <p className="text-base font-black text-slate-900">{sessions.length} session(s)</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-subtle flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Volume Total Encaissé</p>
                <p className="text-base font-black text-slate-900">{totalVolume.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-subtle flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold flex-shrink-0 ${
                  currentOpenSession ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">État Actuel</p>
                <p className="text-xs font-black text-slate-900">
                  {currentOpenSession ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Session en cours ({currentOpenSession.cashierName})
                    </span>
                  ) : (
                    'Prête / Disponible'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* TABLEAU DES SESSIONS DE CETTE CAISSE */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#0055b8]" />
                  <span>HISTORIQUE DES SESSIONS DE CE POSTE</span>
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  Cliquez sur une session pour ouvrir son bilan Z complet et son journal de ventes
                </p>
              </div>

              {/* Filtres */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher caissier..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0055b8]"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0055b8]"
                >
                  <option value="all">Toutes ({sessions.length})</option>
                  <option value="closed">Clôturées</option>
                  <option value="open">En cours</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">SESSION</th>
                      <th className="px-5 py-3.5">CAISSIER</th>
                      <th className="px-5 py-3.5">OUVERTURE & CLÔTURE</th>
                      <th className="px-5 py-3.5 text-right">FOND INITIAL</th>
                      <th className="px-5 py-3.5 text-right">TOTAL RECETTES</th>
                      <th className="px-5 py-3.5 text-right">MONTANT DÉCLARÉ</th>
                      <th className="px-5 py-3.5 text-right">ÉCART DE CAISSE</th>
                      <th className="px-5 py-3.5 text-center">STATUT</th>
                      <th className="px-5 py-3.5 text-center">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {filteredSessions.map((s) => {
                      const isOpen = s.status === 'open';

                      return (
                        <tr
                          key={s.id}
                          onClick={() => setSelectedSessionId(s.id!)}
                          className="hover:bg-blue-50/50 cursor-pointer transition group"
                        >
                          <td className="px-5 py-3.5">
                            <span className="font-mono font-black text-slate-900 group-hover:text-[#0055b8] transition">
                              Session #{s.id}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-slate-800 font-bold">
                            {s.cashierName}
                          </td>

                          <td className="px-5 py-3.5 text-slate-500">
                            <div>
                              {new Date(s.opened_at).toLocaleDateString('fr-FR')} à{' '}
                              {new Date(s.opened_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            {s.closed_at ? (
                              <div className="text-[10px] text-slate-400">
                                Clôturée le {new Date(s.closed_at).toLocaleDateString('fr-FR')}
                              </div>
                            ) : (
                              <div className="text-[10px] text-emerald-600 font-bold">En cours...</div>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-800">
                            {s.opening_amount.toLocaleString('fr-FR')} F
                          </td>

                          <td className="px-5 py-3.5 text-right font-mono font-black text-slate-900">
                            {s.totalSalesAmount.toLocaleString('fr-FR')} F
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {s.salesCount} ticket(s)
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-800">
                            {s.closing_amount !== undefined && s.closing_amount !== null
                              ? `${s.closing_amount.toLocaleString('fr-FR')} F`
                              : '—'}
                          </td>

                          <td className="px-5 py-3.5 text-right font-mono font-black">
                            {isOpen ? (
                              <span className="text-slate-400 font-normal text-[11px]">En cours</span>
                            ) : (
                              <span
                                className={
                                  s.cashDiscrepancy === 0
                                    ? 'text-emerald-600'
                                    : s.cashDiscrepancy > 0
                                    ? 'text-emerald-600'
                                    : 'text-rose-600'
                                }
                              >
                                {s.cashDiscrepancy >= 0 ? '+' : ''}
                                {s.cashDiscrepancy.toLocaleString('fr-FR')} F
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                                isOpen
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isOpen ? 'bg-emerald-600 animate-pulse' : 'bg-slate-500'
                                }`}
                              />
                              <span>{isOpen ? 'Ouverte' : 'Clôturée'}</span>
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => navigate(`/cash-registers/bilan-z/${s.id}`)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-[#0055b8] hover:bg-[#0055b8] hover:text-white rounded-xl transition text-xs font-bold shadow-xs"
                                title="Ouvrir la nouvelle page Détails & Bilan Z"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Détails & Bilan Z</span>
                              </button>

                              <button
                                onClick={() => navigate(`/cash-registers/bilan-z/${s.id}`)}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white rounded-xl transition shadow-xs"
                                title="Imprimer le Bilan Z"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredSessions.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-400 font-medium">
                          Aucune session enregistrée pour ce poste de caisse.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

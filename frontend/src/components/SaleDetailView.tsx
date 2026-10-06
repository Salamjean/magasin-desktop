import React, { useState, useEffect } from 'react';
import {
  Sale,
  SaleItem,
  Customer,
  Product,
  CashRegister,
  CashSession,
  User,
  db
} from '../db/db';
import {
  Printer,
  ArrowLeft,
  Bike,
  Trash2,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw
} from 'lucide-react';
import Swal from 'sweetalert2';

interface SaleWithDetails extends Sale {
  customerName?: string;
  customerPhone?: string;
  itemCount?: number;
  items?: (SaleItem & { product?: Product })[];
  cashierName?: string;
}

interface SaleDetailViewProps {
  sale: SaleWithDetails;
  onBack: () => void;
  onPrint: (sale: SaleWithDetails) => void;
  onDelivery: (sale: SaleWithDetails) => void;
  onSaleCancelled: () => void;
}

export const SaleDetailView: React.FC<SaleDetailViewProps> = ({
  sale,
  onBack,
  onPrint,
  onDelivery,
  onSaleCancelled
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [saleItems, setSaleItems] = useState<(SaleItem & { product?: Product })[]>([]);
  const [cashierName, setCashierName] = useState<string>('Jean Koffi');
  const [registerName, setRegisterName] = useState<string>('Caisse Principale N°1 (Allée A)');
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadSaleFullData();
  }, [sale]);

  const loadSaleFullData = async () => {
    setLoading(true);
    try {
      // 1. Client
      if (sale.customer_id) {
        const c = await db.customers.get(sale.customer_id);
        if (c) setCustomer(c);
      }

      // 2. Caissier
      if (sale.user_id) {
        const u = await db.users.get(sale.user_id);
        if (u) setCashierName(u.name);
      } else if (sale.cashierName) {
        setCashierName(sale.cashierName);
      }

      // 3. Caisse
      if (sale.cash_session_id) {
        const sess = await db.cash_sessions.get(sale.cash_session_id);
        if (sess?.cash_register_id) {
          const reg = await db.cash_registers.get(sess.cash_register_id);
          if (reg) setRegisterName(reg.name);
        }
      } else {
        const firstReg = await db.cash_registers.toCollection().first();
        if (firstReg) setRegisterName(firstReg.name);
      }

      // 4. Articles de la vente
      if (sale.id) {
        const items = await db.sale_items.where('sale_id').equals(sale.id).toArray();
        const prods = await db.products.toArray();
        const prodMap = new Map<number, Product>(prods.map((p) => [p.id!, p]));

        const enrichedItems = items.map((it) => ({
          ...it,
          product: prodMap.get(it.product_id)
        }));
        setSaleItems(enrichedItems);
      } else if (sale.items && sale.items.length > 0) {
        setSaleItems(sale.items);
      }
    } catch (err) {
      console.error('Erreur chargement détails vente:', err);
    } finally {
      setLoading(false);
    }
  };

  const isCancelled =
    (sale.payment_status as any) === 'cancelled' ||
    (sale as any).status === 'cancelled' ||
    (sale.notes && sale.notes.includes('ANNULÉE'));

  // Formatage date "05/10/2026 à 19:16:34"
  const formatSaleDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} à ${hours}:${minutes}:${seconds}`;
    } catch {
      return isoString;
    }
  };

  // Calculs financiers
  const grossSubtotal = saleItems.reduce(
    (sum, it) => sum + (it.unit_price || 0) * (it.quantity || 1),
    0
  );
  const discountTotal = sale.discount_amount || Math.max(0, grossSubtotal - (sale.total_amount || 0));
  const netTotal = sale.total_amount || grossSubtotal - discountTotal;
  const receivedAmount = sale.paid_amount || (sale.payment_method === 'cash' ? (sale.paid_amount || netTotal) : netTotal);
  const changeAmount = sale.change_amount || Math.max(0, (receivedAmount || 0) - netTotal);

  // Annulation directe
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCancelled) {
      Swal.fire('Information', 'Cette vente est déjà marquée comme annulée.', 'info');
      return;
    }

    const result = await Swal.fire({
      title: 'Confirmer l\'annulation ?',
      text: `Voulez-vous vraiment annuler la vente #${sale.invoice_number} ? Les articles seront remis en stock.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Oui, annuler définitivement',
      cancelButtonText: 'Conserver'
    });

    if (!result.isConfirmed || !sale.id) return;

    setIsSubmittingCancel(true);
    try {
      // 1. Réintégrer les articles en stock
      for (const item of saleItems) {
        if (item.product_id) {
          const product = await db.products.get(item.product_id);
          if (product) {
            const newStock = (product.stock_quantity || 0) + item.quantity;
            await db.products.update(product.id!, {
              stock_quantity: newStock,
              synced: 0
            });

            // Mouvement de stock de type "return"
            await db.stock_movements.add({
              product_id: product.id!,
              type: 'return',
              quantity: item.quantity,
              reference: sale.invoice_number,
              reason: cancelReason.trim()
                ? `Annulation vente #${sale.invoice_number} (${cancelReason.trim()})`
                : `Annulation vente #${sale.invoice_number}`,
              user_id: sale.user_id || 1,
              created_at: new Date().toISOString(),
              synced: 0
            });
          }
        }
      }

      // 2. Annulation dette si vente à crédit
      if (sale.payment_method === 'credit' && sale.customer_id) {
        const cust = await db.customers.get(sale.customer_id);
        if (cust) {
          const newDebt = Math.max(0, (cust.current_debt || 0) - sale.total_amount);
          await db.customers.update(cust.id!, {
            current_debt: newDebt,
            synced: 0
          });
        }
      }

      // 3. Mettre à jour la vente
      const noteSuffix = cancelReason.trim()
        ? `[ANNULÉE : ${cancelReason.trim()}]`
        : `[ANNULÉE LE ${new Date().toLocaleDateString('fr-FR')}]`;

      await db.sales.update(sale.id, {
        payment_status: 'cancelled' as any,
        notes: sale.notes ? `${sale.notes} ${noteSuffix}` : noteSuffix,
        synced: 0
      });

      // 4. Synchronisation distante
      import('../db/syncService').then(({ syncService }) => {
        syncService.pushToRemote().catch((err) => console.warn('Sync error:', err));
      });

      await Swal.fire({
        icon: 'success',
        title: 'Vente Annulée !',
        text: 'Les articles ont été réintégrés et votre caisse a été ajustée.',
        confirmButtonColor: '#0055b8'
      });

      onSaleCancelled();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Erreur', err.message || 'Impossible d\'annuler la vente', 'error');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  return (
    <div className="space-y-4 pb-8 select-none animate-in fade-in duration-200">
      {/* 1. EN-TÊTE : NUMÉRO DE VENTE, STATUT, DATE & ACTIONS */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Gauche: Numéro de vente & Date */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
              {sale.invoice_number}
            </h1>
            {isCancelled ? (
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Annulé
              </span>
            ) : sale.payment_status === 'pending' || sale.payment_method === 'credit' ? (
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                À crédit
              </span>
            ) : (
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Vendu
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Enregistrée le {formatSaleDate(sale.created_at)}
          </p>
        </div>

        {/* Droite: 3 Boutons d'actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Bouton 1: Programmer Livraison */}
          <button
            onClick={() => onDelivery(sale)}
            className="bg-[#0055b8] hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition active:scale-[0.98]"
          >
            <Bike className="w-4 h-4" />
            <span>Programmer Livraison</span>
          </button>

          {/* Bouton 2: Réimprimer */}
          <button
            onClick={() => onPrint(sale)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>Réimprimer</span>
          </button>

          {/* Bouton 3: Retour */}
          <button
            onClick={onBack}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
        </div>
      </div>

      {/* 2. LIGNE DES 3 CARTES : INFOS CAISSE / INFOS CLIENT / RÈGLEMENT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* CARTE 1 : INFORMATIONS CAISSE */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] sm:text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-3">
              INFORMATIONS CAISSE
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Caissier :</span>
                <strong className="text-slate-900 font-bold">{cashierName}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Caisse :</span>
                <strong className="text-slate-900 font-bold">{registerName}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Mode :</span>
                <strong className="text-slate-900 font-extrabold uppercase font-mono">
                  {sale.payment_method === 'cash'
                    ? 'CASH'
                    : sale.payment_method === 'wave' || sale.payment_method === 'om'
                    ? 'MOBILE MONEY'
                    : sale.payment_method === 'card'
                    ? 'CARTE'
                    : sale.payment_method === 'credit'
                    ? 'CRÉDIT'
                    : 'AUTRE'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* CARTE 2 : INFORMATIONS CLIENT */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] sm:text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-3">
              INFORMATIONS CLIENT
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Nom :</span>
                <strong className="text-slate-900 font-bold">
                  {customer?.name || sale.customerName || 'Client Comptoir Standard'}
                </strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Téléphone :</span>
                <strong className="text-slate-900 font-bold font-mono">
                  {customer?.phone || sale.customerPhone || '—'}
                </strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Dette actuelle :</span>
                <strong
                  className={`font-black ${
                    (customer?.current_debt || 0) > 0 ? 'text-amber-800' : 'text-amber-700'
                  }`}
                >
                  {(customer?.current_debt || 0).toLocaleString('fr-FR')} FCFA
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* CARTE 3 : RÈGLEMENT */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] sm:text-[11px] font-extrabold uppercase text-slate-400 tracking-wider mb-3">
              RÈGLEMENT
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Vente :</span>
                <strong className="text-slate-900 font-black font-mono">
                  {netTotal.toLocaleString('fr-FR')} FCFA
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Montant reçu :</span>
                <strong className="text-slate-900 font-black font-mono">
                  {receivedAmount.toLocaleString('fr-FR')} FCFA
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Monnaie rendue :</span>
                <strong className="text-emerald-700 font-black font-mono">
                  {changeAmount.toLocaleString('fr-FR')} FCFA
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABLEAU DES ARTICLES DU PANIER */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <h3 className="text-xs sm:text-sm font-black text-slate-900 mb-4">
          Articles du Panier ({saleItems.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-3">ARTICLE</th>
                <th className="py-3 px-3 text-center">QUANTITÉ</th>
                <th className="py-3 px-3 text-right">PRIX UNITAIRE</th>
                <th className="py-3 px-3 text-center">REMISE</th>
                <th className="py-3 px-3 text-right">TOTAL LIGNE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {saleItems.map((item, idx) => {
                const lineGross = (item.unit_price || 0) * (item.quantity || 1);
                const lineNet = item.subtotal || lineGross;
                const lineDiscount = lineGross - lineNet;

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {item.product_name}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 font-semibold">
                      {(item.unit_price || 0).toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {lineDiscount > 0 ? (
                        <span className="text-rose-600 font-bold">
                          -{lineDiscount.toLocaleString('fr-FR')} FCFA
                        </span>
                      ) : (
                        <span className="text-slate-300 font-bold">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                      {lineNet.toLocaleString('fr-FR')} FCFA
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totaux en bas à droite */}
        <div className="border-t border-slate-100 pt-4 mt-2 flex flex-col items-end space-y-1.5 text-xs">
          <div className="flex items-center gap-8 text-slate-600">
            <span className="font-medium">Sous-total Brut :</span>
            <strong className="font-mono font-bold text-slate-900 min-w-[100px] text-right">
              {grossSubtotal.toLocaleString('fr-FR')} FCFA
            </strong>
          </div>

          {discountTotal > 0 && (
            <div className="flex items-center gap-8 text-rose-600">
              <span className="font-semibold">Remise Globale :</span>
              <strong className="font-mono font-bold min-w-[100px] text-right">
                -{discountTotal.toLocaleString('fr-FR')} FCFA
              </strong>
            </div>
          )}

          <div className="flex items-center gap-8 pt-2">
            <span className="font-black text-xs text-slate-900 uppercase">TOTAL NET :</span>
            <strong className="font-mono font-black text-lg text-[#0055b8] min-w-[100px] text-right">
              {netTotal.toLocaleString('fr-FR')} FCFA
            </strong>
          </div>
        </div>
      </div>

      {/* 4. SECTION D'ANNULATION DIRECTE */}
      <div className="bg-rose-50/40 border border-rose-200/80 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-rose-800 font-black text-xs">
          <AlertOctagon className="w-4 h-4 text-rose-600" />
          <span>Annulation Directe de cette Vente</span>
        </div>
        <p className="text-[11px] text-rose-600/90 font-medium mt-1">
          L'annulation réintègre immédiatement les articles dans le stock et réajuste votre caisse.
        </p>

        {isCancelled ? (
          <div className="mt-3.5 bg-rose-100/60 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-rose-800 text-xs font-bold">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>Cette vente a déjà été annulée. Les articles ont été remis en stock.</span>
          </div>
        ) : (
          <form onSubmit={handleConfirmCancel} className="mt-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motif de l'annulation (ex: erreur de saisie, client a changé d'avis...)"
              className="flex-1 bg-white border border-rose-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400 shadow-2xs transition"
            />
            <button
              type="submit"
              disabled={isSubmittingCancel}
              className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.98] whitespace-nowrap disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isSubmittingCancel ? 'Annulation...' : 'Annuler cette vente'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

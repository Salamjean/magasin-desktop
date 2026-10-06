import React, { useState, useEffect } from 'react';
import { db, Sale, SaleItem, Product, Customer } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { syncService } from '../db/syncService';
import {
  RotateCcw,
  Ban,
  Trash2,
  CheckCircle2,
  Search,
  Banknote,
  Smartphone,
  CreditCard,
  Coins
} from 'lucide-react';
import Swal from 'sweetalert2';

interface SaleRow {
  id: number;
  invoice_number: string;
  created_at: string;
  itemCount: number;
  payment_method: string;
  total_amount: number;
  customer_id?: number;
}

export const Returns: React.FC = () => {
  const { user } = useAuth();

  const [ticketQuery, setTicketQuery] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [recentSales, setRecentSales] = useState<SaleRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRecentSales();
  }, [user]);

  const loadRecentSales = async () => {
    try {
      let salesList = await db.sales.reverse().toArray();
      // Filtrer les ventes validées (non annulées)
      salesList = salesList.filter(
        (s) =>
          (s.payment_status as any) !== 'cancelled' &&
          (s as any).status !== 'cancelled' &&
          !(s.notes && s.notes.includes('ANNULÉE'))
      );

      // Si caissier, afficher ses ventes récentes ou toutes les ventes
      if (user?.id && user?.role === 'caissier') {
        const userSales = salesList.filter((s) => s.user_id === user.id);
        if (userSales.length > 0) {
          salesList = userSales;
        }
      }

      const allItems = await db.sale_items.toArray();

      const rows: SaleRow[] = salesList.slice(0, 15).map((s) => {
        const items = allItems.filter((it) => it.sale_id === s.id);
        const count = items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
        return {
          id: s.id!,
          invoice_number: s.invoice_number,
          created_at: s.created_at,
          itemCount: count || items.length || 1,
          payment_method: s.payment_method,
          total_amount: s.total_amount,
          customer_id: s.customer_id
        };
      });

      setRecentSales(rows);
    } catch (err) {
      console.error('Erreur chargement ventes:', err);
    }
  };

  const formatSaleDateTime = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return isoDate;
    }
  };

  const renderPaymentBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span>Cash</span>
          </span>
        );
      case 'wave':
      case 'om':
      case 'mobile_money':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span>Mobile_money</span>
          </span>
        );
      case 'card':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span>Carte</span>
          </span>
        );
      case 'credit':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <span>Crédit</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span>{method || 'Espèces'}</span>
          </span>
        );
    }
  };

  // Pré-remplir le formulaire lors du clic sur le bouton Annuler du tableau
  const handleSelectSaleForCancel = (sale: SaleRow) => {
    setTicketQuery(sale.invoice_number);
    setCancelReason('Erreur de saisie / Retour client');
    // Scroll fluide vers le formulaire
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Traiter l'annulation directe
  const handleDirectCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const query = ticketQuery.trim();
    if (!query) {
      Swal.fire('Champ requis', 'Veuillez renseigner le N° de vente ou ticket.', 'warning');
      return;
    }

    if (!cancelReason.trim()) {
      Swal.fire('Champ requis', 'Veuillez préciser le motif de l\'annulation.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Rechercher la vente correspondante
      const allMatching = await db.sales.toArray();
      const sale = allMatching.find(
        (s) =>
          (s.invoice_number && s.invoice_number.trim().toLowerCase() === query.toLowerCase()) ||
          `TICKET-${s.id}`.toLowerCase() === query.toLowerCase() ||
          String(s.id) === query
      );

      if (!sale || !sale.id) {
        Swal.fire('Introuvable', `Aucune vente trouvée avec le numéro "${query}".`, 'error');
        setSubmitting(false);
        return;
      }

      if ((sale.payment_status as any) === 'cancelled') {
        Swal.fire('Information', 'Cette vente a déjà été annulée.', 'info');
        setSubmitting(false);
        return;
      }

      // Confirmation SweetAlert2
      const confirm = await Swal.fire({
        title: 'Confirmer l\'Annulation ?',
        html: `
          <div class="text-left text-xs space-y-2">
            <p><strong>N° Vente :</strong> ${sale.invoice_number}</p>
            <p><strong>Montant :</strong> ${sale.total_amount.toLocaleString('fr-FR')} FCFA</p>
            <p><strong>Motif :</strong> ${cancelReason.trim()}</p>
            <p class="text-rose-600 font-semibold mt-2">
              ⚠️ Les articles seront immédiatement réintégrés en stock.
            </p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Oui, annuler la vente',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b'
      });

      if (!confirm.isConfirmed) {
        setSubmitting(false);
        return;
      }

      // 2. Réintégrer le stock des articles
      const saleItems = await db.sale_items.where('sale_id').equals(sale.id).toArray();
      for (const it of saleItems) {
        if (it.product_id) {
          const prod = await db.products.get(it.product_id);
          if (prod) {
            const newStock = (prod.stock_quantity || 0) + (Number(it.quantity) || 1);
            await db.products.update(prod.id!, {
              stock_quantity: newStock,
              synced: 0
            });

            // Enregistrer un mouvement de stock de retour
            await db.stock_movements.add({
              product_id: prod.id!,
              type: 'return',
              quantity: it.quantity,
              reference: sale.invoice_number,
              reason: `Annulation vente #${sale.invoice_number} : ${cancelReason.trim()}`,
              user_id: user?.id || sale.user_id || 1,
              created_at: new Date().toISOString(),
              synced: 0
            });
          }
        }
      }

      // 3. Réajuster la dette client si vente à crédit
      if (sale.payment_method === 'credit' && sale.customer_id) {
        const customer = await db.customers.get(sale.customer_id);
        if (customer) {
          const currentDebt = customer.current_debt || 0;
          const newDebt = Math.max(0, currentDebt - sale.total_amount);
          await db.customers.update(customer.id!, {
            current_debt: newDebt,
            synced: 0
          });
        }
      }

      // 4. Mettre à jour le statut de la vente
      await db.sales.update(sale.id, {
        payment_status: 'cancelled' as any,
        notes: sale.notes
          ? `${sale.notes} [ANNULÉE : ${cancelReason.trim()}]`
          : `Annulée : ${cancelReason.trim()}`,
        synced: 0
      });

      // 5. Synchronisation vers MySQL
      syncService.pushToRemote().catch((err) => console.warn('Sync error:', err));

      await Swal.fire({
        icon: 'success',
        title: 'Vente Annulée avec Succès !',
        text: 'Les articles ont été remis en stock et la transaction est invalidée.',
        timer: 2000,
        showConfirmButton: false
      });

      setTicketQuery('');
      setCancelReason('');
      loadRecentSales();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Erreur', err.message || 'Une erreur est survenue lors de l\'annulation.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-150 pb-16">
      {/* 1. BANDEAU D'INFORMATION SUPÉRIEUR (CONFORME À L'IMAGE) */}
      <div className="bg-blue-50/70 rounded-2xl border border-blue-200/80 p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <RotateCcw className="w-4 h-4 stroke-[2.2]" />
        </div>
        <div>
          <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
            Annulation Directe de Vente par le Caissier
          </h2>
          <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
            Vous pouvez annuler directement une vente enregistrée lors d'une erreur ou d'un retour client. L'annulation réintègre automatiquement les articles vendus dans les stocks et réajuste immédiatement le montant de votre session de caisse ainsi que le compte client si un crédit avait été accordé.
          </p>
        </div>
      </div>

      {/* 2. DEUX COLONNES PRINCIPALES : FORMULAIRE D'ANNULATION & VENTES RÉCENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLONNE GAUCHE (5 cols) : Formulaire "Annuler un Ticket / Vente" */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Ban className="w-4 h-4 text-rose-600" />
            <h3 className="text-xs sm:text-sm font-black text-slate-900">
              Annuler un Ticket / Vente
            </h3>
          </div>

          <form onSubmit={handleDirectCancelSubmit} className="space-y-4">
            {/* Champ N° de Vente / Ticket */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase text-slate-700 tracking-wider block">
                N° DE VENTE / TICKET <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={ticketQuery}
                onChange={(e) => setTicketQuery(e.target.value)}
                placeholder="Ex: VNT-20261005-XXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-mono text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 transition"
              />
            </div>

            {/* Champ Motif de l'Annulation */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase text-slate-700 tracking-wider block">
                MOTIF DE L'ANNULATION <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Erreur de saisie d'article, client a changé d'avis avant d'emporter, produit défectueux..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 transition resize-none leading-relaxed font-medium"
              />
            </div>

            {/* Bouton Valider l'Annulation Immédiate */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-[#e11d48] hover:bg-[#be123c] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{submitting ? 'Traitement...' : 'Valider l\'Annulation Immédiate'}</span>
            </button>
          </form>
        </div>

        {/* COLONNE DROITE (7 cols) : Tableau "Mes Ventes Récentes Validées" */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900">
              Mes Ventes Récentes Validées
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Cliquez sur « Annuler » pour annuler directement un ticket.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-400 font-extrabold border-b border-slate-200/80 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3.5 py-3">N° VENTE</th>
                  <th className="px-3.5 py-3">DATE & HEURE</th>
                  <th className="px-3.5 py-3 text-center">ARTICLES</th>
                  <th className="px-3.5 py-3 text-center">MODE PAIEMENT</th>
                  <th className="px-3.5 py-3 text-right">MONTANT TOTAL</th>
                  <th className="px-3.5 py-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/75 transition">
                    {/* N° VENTE */}
                    <td className="px-3.5 py-3 font-mono font-bold text-slate-900">
                      {sale.invoice_number}
                    </td>

                    {/* DATE & HEURE */}
                    <td className="px-3.5 py-3 font-mono text-slate-500 text-[11px]">
                      {formatSaleDateTime(sale.created_at)}
                    </td>

                    {/* ARTICLES */}
                    <td className="px-3.5 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {sale.itemCount} art.
                      </span>
                    </td>

                    {/* MODE PAIEMENT */}
                    <td className="px-3.5 py-3 text-center">
                      {renderPaymentBadge(sale.payment_method)}
                    </td>

                    {/* MONTANT TOTAL */}
                    <td className="px-3.5 py-3 text-right font-mono font-black text-slate-900 text-xs">
                      {sale.total_amount.toLocaleString('fr-FR')} FCFA
                    </td>

                    {/* ACTION (Bouton rose/rouge Annuler) */}
                    <td className="px-3.5 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleSelectSaleForCancel(sale)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition active:scale-95 shadow-xs"
                      >
                        <Ban className="w-3 h-3" />
                        <span>Annuler</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {recentSales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                      Aucune vente récente à annuler.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

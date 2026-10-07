import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Sale, SaleItem, Customer, Product, User } from '../db/db';
import { syncService } from '../db/syncService';
import {
  Receipt,
  Search,
  Printer,
  Calendar,
  Eye,
  CreditCard,
  Banknote,
  Smartphone,
  Coins,
  Bike,
  Ban,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  UserCheck,
  Package,
  Layers,
  ShoppingBag,
  Store
} from 'lucide-react';
import { ReceiptModal } from '../components/ReceiptModal';
import { SaleDetailView } from '../components/SaleDetailView';
import Swal from 'sweetalert2';

interface SaleWithDetails extends Sale {
  customerName?: string;
  customerPhone?: string;
  itemCount?: number;
  items?: (SaleItem & { product?: Product })[];
  cashierName?: string;
  deliveryStatus?: 'delivered' | 'in_transit' | 'pending' | 'none';
}

export const Sales: React.FC = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    method: 'all',
    date: ''
  });

  // Modal Impression Reçu
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<Sale | null>(null);
  const [selectedSaleItemsForPrint, setSelectedSaleItemsForPrint] = useState<SaleItem[]>([]);
  const [selectedCustomerForPrint, setSelectedCustomerForPrint] = useState<Customer | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Modal Détail Vente
  const [detailSale, setDetailSale] = useState<SaleWithDetails | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const rawSales = await db.sales.reverse().toArray();
      const rawItems = await db.sale_items.toArray();
      const rawCustomers = await db.customers.toArray();
      const rawProducts = await db.products.toArray();
      const rawUsers = await db.users.toArray();
      const rawDeliveries = await db.deliveries.toArray();

      const custMap = new Map<number, Customer>(rawCustomers.map((c) => [c.id!, c]));
      const userMap = new Map<number, string>(rawUsers.map((u) => [u.id!, u.name]));
      const prodMap = new Map<number, Product>(rawProducts.map((p) => [p.id!, p]));

      const enriched: SaleWithDetails[] = rawSales.map((s) => {
        const cust = s.customer_id ? custMap.get(s.customer_id) : null;
        const saleItems = rawItems
          .filter((it) => it.sale_id === s.id)
          .map((it) => ({
            ...it,
            product: prodMap.get(it.product_id)
          }));

        const totalQty = saleItems.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);

        const saleDeliveries = rawDeliveries.filter((d) => d.sale_id === s.id);
        let delivStatus: 'delivered' | 'in_transit' | 'pending' | 'none' = 'none';
        if (saleDeliveries.some((d) => d.status === 'delivered')) {
          delivStatus = 'delivered';
        } else if (saleDeliveries.some((d) => d.status === 'in_transit')) {
          delivStatus = 'in_transit';
        } else if (saleDeliveries.some((d) => d.status === 'pending')) {
          delivStatus = 'pending';
        }

        return {
          ...s,
          customerName: cust?.name || 'Client Comptoir Standard',
          customerPhone: cust?.phone || '',
          itemCount: totalQty || saleItems.length || 1,
          items: saleItems,
          cashierName: userMap.get(s.user_id) || 'Caissier',
          deliveryStatus: delivStatus
        };
      });

      setSales(enriched);
      setCustomers(rawCustomers);
    } catch (err) {
      console.error('Erreur chargement ventes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedFilters({
      search: searchQuery,
      method: methodFilter,
      date: dateFilter
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setMethodFilter('all');
    setDateFilter('');
    setAppliedFilters({
      search: '',
      method: 'all',
      date: ''
    });
  };

  const filteredSales = sales.filter((s) => {
    const q = appliedFilters.search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (s.invoice_number && s.invoice_number.toLowerCase().includes(q)) ||
      (s.customerName && s.customerName.toLowerCase().includes(q)) ||
      (s.customerPhone && s.customerPhone.includes(q));

    const matchesMethod =
      appliedFilters.method === 'all' ||
      s.payment_method === appliedFilters.method ||
      (appliedFilters.method === 'mobile_money' && (s.payment_method === 'wave' || s.payment_method === 'om'));

    let matchesDate = true;
    if (appliedFilters.date) {
      const saleDate = s.created_at ? s.created_at.substring(0, 10) : '';
      matchesDate = saleDate === appliedFilters.date;
    }

    return matchesSearch && matchesMethod && matchesDate;
  });

  // Formatage de la date en "05/10/2026 à 19:16"
  const formatSaleDateTime = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} à ${hours}:${minutes}`;
    } catch {
      return isoDate;
    }
  };

  // Badge du Moyen de Paiement
  const renderPaymentBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cash</span>
          </span>
        );
      case 'wave':
      case 'om':
      case 'mobile_money':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Smartphone className="w-3.5 h-3.5 text-amber-600" />
            <span>Mobile_money</span>
          </span>
        );
      case 'card':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            <span>Carte</span>
          </span>
        );
      case 'credit':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Coins className="w-3.5 h-3.5 text-purple-600" />
            <span>Crédit</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span>{method || 'Espèces'}</span>
          </span>
        );
    }
  };

  // Action 1 : Détail de la vente
  const handleOpenDetail = (sale: SaleWithDetails) => {
    setDetailSale(sale);
  };

  // Action 2 : Livraison (Redirection vers création de livraison préremplie si non livrée)
  const handleOpenDelivery = (sale: SaleWithDetails) => {
    if (sale.deliveryStatus === 'delivered') {
      Swal.fire({
        icon: 'warning',
        title: 'Commande Déjà Livrée',
        text: 'Cette vente a déjà été marquée comme LIVRÉE au destinataire par le livreur. Il n\'est pas possible de reprogrammer une livraison pour cet article.',
        confirmButtonColor: '#0055b8'
      });
      return;
    }
    if (sale.deliveryStatus === 'in_transit' || sale.deliveryStatus === 'pending') {
      Swal.fire({
        icon: 'info',
        title: 'Livraison en cours',
        text: 'Une livraison est déjà en cours pour cette vente.',
        confirmButtonColor: '#0055b8'
      });
      return;
    }
    navigate('/deliveries/new', { state: { saleId: sale.id } });
  };

  // Action 3 : Imprimer le Ticket de Caisse
  const handleOpenReceipt = async (sale: SaleWithDetails) => {
    if (!sale.id) return;
    const items = await db.sale_items.where('sale_id').equals(sale.id).toArray();
    const cust = sale.customer_id ? await db.customers.get(sale.customer_id) : null;
    setSelectedSaleForPrint(sale);
    setSelectedSaleItemsForPrint(items);
    setSelectedCustomerForPrint(cust || null);
    setIsReceiptOpen(true);
  };

  // Action 4 : Annuler la Vente
  const handleCancelSale = async (sale: SaleWithDetails) => {
    const isAlreadyCancelled =
      sale.payment_status === ('cancelled' as any) ||
      (sale as any).status === 'cancelled' ||
      (sale.notes && sale.notes.includes('ANNULÉE'));

    if (isAlreadyCancelled) {
      Swal.fire('Info', 'Cette vente a déjà été annulée.', 'info');
      return;
    }

    const confirm = await Swal.fire({
      title: 'Annuler cette vente ?',
      html: `
        <div class="text-left text-xs space-y-2">
          <p><strong>N° Ticket :</strong> ${sale.invoice_number}</p>
          <p><strong>Client :</strong> ${sale.customerName}</p>
          <p><strong>Montant :</strong> ${sale.total_amount.toLocaleString('fr-FR')} FCFA</p>
          <p class="text-rose-600 font-semibold mt-2">
            ⚠️ Les articles vendus seront réintégrés dans le stock. Si la vente était à crédit, la dette du client sera diminuée en conséquence.
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, annuler la vente',
      cancelButtonText: 'Non, conserver',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b'
    });

    if (!confirm.isConfirmed || !sale.id) return;

    try {
      // 1. Réintégrer le stock de chaque article
      for (const item of sale.items) {
        if (item.product_id) {
          const product = await db.products.get(item.product_id);
          if (product) {
            const newStock = (product.stock_quantity || 0) + item.quantity;
            await db.products.update(product.id!, {
              stock_quantity: newStock,
              synced: 0
            });

            // Enregistrer un mouvement de stock de type "return"
            await db.stock_movements.add({
              product_id: product.id!,
              type: 'return',
              quantity: item.quantity,
              reference: sale.invoice_number,
              reason: `Annulation vente #${sale.invoice_number}`,
              user_id: sale.user_id || 1,
              created_at: new Date().toISOString(),
              synced: 0
            });
          }
        }
      }

      // 2. Si vente à crédit, annuler la dette client rattachée
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

      // 3. Mettre à jour le statut de la vente
      await db.sales.update(sale.id, {
        payment_status: 'cancelled' as any,
        notes: sale.notes ? `${sale.notes} [ANNULÉE LE ${new Date().toLocaleDateString('fr-FR')}]` : `Annulée le ${new Date().toLocaleString('fr-FR')}`,
        synced: 0
      });

      // 4. Synchronisation automatique vers MySQL
      syncService.pushToRemote().catch((e) => console.warn('Sync error:', e));

      await Swal.fire({
        icon: 'success',
        title: 'Vente Annulée avec Succès !',
        text: 'Les stocks ont été réintégrés et la transaction a été invalidée.',
        timer: 1800,
        showConfirmButton: false
      });

      loadData();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Erreur', err.message || 'Impossible d\'annuler la vente.', 'error');
    }
  };

  if (detailSale) {
    return (
      <div className="w-full animate-in fade-in duration-150 pb-16">
        <SaleDetailView
          sale={detailSale}
          onBack={() => setDetailSale(null)}
          onPrint={(s) => handleOpenReceipt(s)}
          onDelivery={(s) => handleOpenDelivery(s)}
          onSaleCancelled={() => {
            loadData();
            setDetailSale(null);
          }}
        />

        {/* MODAL TICKET DE CAISSE THERMIQUE 80MM */}
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          sale={selectedSaleForPrint}
          items={selectedSaleItemsForPrint}
          customer={selectedCustomerForPrint}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-150 pb-16">
      {/* 1. EN-TÊTE PRINCIPAL (CONFORME À L'IMAGE) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Mes Ventes Réalisées
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Consultez l'historique complet des tickets émis lors de vos sessions.
          </p>
        </div>
      </div>

      {/* 2. BARRE DE FILTRES BLANCHE (CONFORME À L'IMAGE) */}
      <form
        onSubmit={handleApplyFilter}
        className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-end gap-3.5"
      >
        {/* Champ RECHERCHE */}
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
            RECHERCHE
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="N° Ticket ou Client..."
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition"
            />
          </div>
        </div>

        {/* Sélecteur MOYEN DE PAIEMENT */}
        <div className="w-full md:w-64 space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
            MOYEN DE PAIEMENT
          </label>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400 transition cursor-pointer"
          >
            <option value="all">Tous les modes</option>
            <option value="cash">💵 Cash (Espèces)</option>
            <option value="mobile_money">📱 Mobile Money (Wave / OM)</option>
            <option value="card">💳 Carte Bancaire</option>
            <option value="credit">📑 À Crédit</option>
          </select>
        </div>

        {/* Input DATE */}
        <div className="w-full md:w-56 space-y-1.5">
          <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
            DATE
          </label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-slate-400 transition cursor-pointer"
          />
        </div>

        {/* Boutons Filtrer & Reset */}
        <div className="flex items-center gap-2 pt-2 md:pt-0">
          <button
            type="submit"
            className="flex-1 md:flex-none px-8 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold text-xs shadow-xs transition active:scale-95 whitespace-nowrap"
          >
            Filtrer
          </button>

          <button
            type="button"
            onClick={handleResetFilters}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition active:scale-95 shadow-xs"
            title="Réinitialiser les filtres"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* 3. TABLEAU DES VENTES (CONFORME À L'IMAGE) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 text-slate-400 font-extrabold border-b border-slate-200/80 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">N° TICKET & HEURE</th>
                <th className="px-5 py-3.5">CLIENT</th>
                <th className="px-5 py-3.5 text-center">ARTICLES</th>
                <th className="px-5 py-3.5 text-center">MOYEN DE PAIEMENT</th>
                <th className="px-5 py-3.5 text-right">MONTANT TOTAL</th>
                <th className="px-5 py-3.5 text-center">STATUT</th>
                <th className="px-5 py-3.5 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredSales.map((s) => {
                const isCancelled =
                  s.payment_status === ('cancelled' as any) ||
                  (s as any).status === 'cancelled' ||
                  (s.notes && s.notes.includes('ANNULÉE'));

                return (
                  <tr
                    key={s.id}
                    className={`hover:bg-slate-50/75 transition ${
                      isCancelled ? 'bg-rose-50/20 opacity-70' : ''
                    }`}
                  >
                    {/* N° TICKET & HEURE */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs font-mono">
                            {s.invoice_number || `TICKET-${s.id}`}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {formatSaleDateTime(s.created_at)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* CLIENT */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 text-xs">
                        {s.customerName}
                      </div>
                      {s.customerPhone && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {s.customerPhone}
                        </div>
                      )}
                    </td>

                    {/* ARTICLES */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                        {s.itemCount} art.
                      </span>
                    </td>

                    {/* MOYEN DE PAIEMENT */}
                    <td className="px-5 py-3.5 text-center">
                      {renderPaymentBadge(s.payment_method)}
                    </td>

                    {/* MONTANT TOTAL */}
                    <td className="px-5 py-3.5 text-right font-black font-mono text-xs text-slate-900">
                      {s.total_amount.toLocaleString('fr-FR')} FCFA
                    </td>

                    {/* STATUT */}
                    <td className="px-5 py-3.5 text-center">
                      {isCancelled ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          <span>Annulé</span>
                        </span>
                      ) : s.payment_method === 'credit' || s.payment_status === 'pending' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                          <span>À crédit</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>Vendu</span>
                        </span>
                      )}
                    </td>

                    {/* ACTIONS (SEULEMENT DÉTAIL SI ANNULÉ, SINON LES 4 BOUTONS) */}
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* 1. Bouton Détail (toujours visible) */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(s)}
                          className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition shadow-xs"
                          title="Voir le détail de la vente"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {!isCancelled && (
                          <>
                            {/* 2. Bouton Livraison (avec état livré / en cours / à programmer) */}
                            {s.deliveryStatus === 'delivered' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenDelivery(s)}
                                className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition shadow-xs"
                                title="Commande Déjà Livrée (Non reprogrammable)"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              </button>
                            ) : s.deliveryStatus === 'in_transit' || s.deliveryStatus === 'pending' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenDelivery(s)}
                                className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-[#0055b8] flex items-center justify-center transition shadow-xs"
                                title="Livraison en cours"
                              >
                                <Bike className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenDelivery(s)}
                                className="w-7 h-7 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-600 flex items-center justify-center transition shadow-xs"
                                title="Créer / Assigner une livraison pour cette vente"
                              >
                                <Bike className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* 3. Bouton Imprimer Ticket (imprimante grise) */}
                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(s)}
                              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition shadow-xs"
                              title="Imprimer le ticket thermique 80mm"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* 4. Bouton Annuler (sens interdit / croix rouge) */}
                            <button
                              type="button"
                              onClick={() => handleCancelSale(s)}
                              className="w-7 h-7 rounded-full flex items-center justify-center transition shadow-xs bg-rose-50 hover:bg-rose-100 text-rose-600"
                              title="Annuler cette vente et réintégrer le stock"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-slate-400 font-medium">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span>Aucune vente trouvée correspondant à vos critères de recherche.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TICKET DE CAISSE THERMIQUE 80MM */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={selectedSaleForPrint}
        items={selectedSaleItemsForPrint}
        customer={selectedCustomerForPrint}
      />
    </div>
  );
};

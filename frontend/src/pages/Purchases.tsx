import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Purchase, Supplier, Product, User } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Plus, Search, CheckCircle2, UserCheck, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

export const Purchases: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await db.purchases.reverse().toArray();
      const sups = await db.suppliers.toArray();
      const prods = await db.products.toArray();
      const userList = await db.users.toArray();

      setPurchases(list);
      setSuppliers(sups);
      setProducts(prods);
      setUsers(userList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveStock = async (purchase: Purchase) => {
    if (!purchase.id) return;

    const receiverName = user?.name || 'Administrateur';
    const receiverId = user?.id || 1;

    const confirm = await Swal.fire({
      title: 'Valider la Réception du Stock ?',
      html: `
        <div class="text-left text-xs space-y-2 p-2">
          <p><strong>Bon de commande :</strong> ${purchase.reference}</p>
          <p><strong>Réceptionnaire :</strong> <span class="text-[#0055b8] font-bold">${receiverName}</span> (${user?.role || 'Utilisateur'})</p>
          <p class="text-slate-500">Les quantités commandées seront automatiquement ajoutées au stock actuel et enregistrées sous votre nom.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Oui, réceptionner (${receiverName})`,
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#059669'
    });

    if (confirm.isConfirmed) {
      const items = await db.purchase_items.where('purchase_id').equals(purchase.id).toArray();
      const now = new Date().toISOString();

      for (const item of items) {
        const prod = await db.products.get(item.product_id);
        if (prod) {
          const newQty = prod.stock_quantity + item.quantity;
          await db.products.update(prod.id!, {
            stock_quantity: newQty,
            purchase_price: item.unit_price,
            synced: 0
          });

          await db.stock_movements.add({
            product_id: prod.id!,
            type: 'in',
            quantity: item.quantity,
            reference: purchase.reference,
            reason: `Réception Bon Commande ${purchase.reference} par ${receiverName}`,
            user_id: receiverId,
            created_at: now,
            synced: 0
          });
        }
      }

      await db.purchases.update(purchase.id, {
        status: 'received',
        received_at: now,
        received_by_user_id: receiverId,
        received_by: receiverName,
        synced: 0
      });

      await Swal.fire({
        icon: 'success',
        title: 'Stock Réceptionné !',
        html: `Réception enregistrée avec succès par <strong>${receiverName}</strong>.`,
        timer: 2200,
        showConfirmButton: false
      });

      loadData();
    }
  };

  const handleDeletePurchase = async (purchase: Purchase) => {
    if (!purchase.id) return;

    if (purchase.status === 'received') {
      Swal.fire({
        icon: 'warning',
        title: 'Suppression impossible',
        text: 'Cette commande a déjà été réceptionnée en magasin. Elle ne peut plus être supprimée pour préserver la cohérence des stocks.',
        confirmButtonColor: '#0055b8'
      });
      return;
    }

    const confirm = await Swal.fire({
      title: 'Supprimer ce bon de commande ?',
      text: `La commande ${purchase.reference} (${purchase.total_amount.toLocaleString('fr-FR')} FCFA) sera supprimée.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#e11d48'
    });

    if (confirm.isConfirmed) {
      await db.purchase_items.where('purchase_id').equals(purchase.id).delete();
      await db.purchases.delete(purchase.id);

      Swal.fire({
        icon: 'success',
        title: 'Commande supprimée !',
        timer: 1800,
        showConfirmButton: false
      });
      loadData();
    }
  };

  const userMap = new Map(users.map((u) => [u.id!, u.name]));

  const filteredPurchases = purchases.filter((p) => {
    const sup = suppliers.find((s) => s.id === p.supplier_id);
    const receiver = p.received_by || (p.received_by_user_id ? userMap.get(p.received_by_user_id) : '');
    const creator = userMap.get(p.user_id) || '';
    const q = searchQuery.toLowerCase().trim();

    return (
      p.reference.toLowerCase().includes(q) ||
      (sup?.name || '').toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q) ||
      receiver.toLowerCase().includes(q) ||
      creator.toLowerCase().includes(q) ||
      p.total_amount.toString().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150 pb-12">
      {/* En-tête Moderne avec Recherche au Centre */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Titre & Icône */}
        <div className="flex items-center gap-3.5 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {user?.role === 'magasinier'
                ? 'Réceptions de Commandes Fournisseurs'
                : 'Achats & Réceptions Fournisseurs'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {user?.role === 'magasinier'
                ? 'Contrôle, pointage et validation des réceptions de marchandises en magasin'
                : 'Bons de commande, approvisionnements et réceptions de marchandises'}
            </p>
          </div>
        </div>

        {/* Champ de Recherche au Centre */}
        <div className="flex-1 max-w-md w-full mx-auto md:mx-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par référence, fournisseur, réceptionnaire..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50/90 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Actions & Bouton Nouvelle Commande (Admin Uniquement) */}
        <div className="flex items-center gap-2.5 flex-shrink-0 self-end md:self-auto">
          <span className="hidden sm:inline-flex text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-2xl whitespace-nowrap">
            {filteredPurchases.length} commande(s)
          </span>

          {user?.role !== 'magasinier' && (
            <button
              onClick={() => navigate('/purchases/new')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Commande</span>
            </button>
          )}
        </div>
      </div>

      {/* Tableau des Achats et Réceptions */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5 text-center">RÉFÉRENCE</th>
                <th className="px-5 py-3.5 text-center">DATE COMMANDE</th>
                <th className="px-5 py-3.5 text-center">FOURNISSEUR</th>
                <th className="px-5 py-3.5 text-center">MONTANT TOTAL</th>
                <th className="px-5 py-3.5 text-center">STATUT & RÉCEPTION</th>
                <th className="px-5 py-3.5 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredPurchases.map((p) => {
                const sup = suppliers.find((s) => s.id === p.supplier_id);
                const receiverName = p.received_by || (p.received_by_user_id ? userMap.get(p.received_by_user_id) : null);
                const creatorName = userMap.get(p.user_id) || 'Opérateur';

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    {/* RÉFÉRENCE */}
                    <td className="px-5 py-3.5 font-bold font-mono text-slate-900 text-center">
                      {p.reference}
                    </td>

                    {/* DATE COMMANDE */}
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-center">
                      <div>{new Date(p.created_at).toLocaleDateString('fr-FR')}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Par : {creatorName}
                      </div>
                    </td>

                    {/* FOURNISSEUR */}
                    <td className="px-5 py-3.5 text-slate-800 font-bold text-center">
                      {sup?.name || 'Fournisseur inconnu'}
                    </td>

                    {/* MONTANT TOTAL */}
                    <td className="px-5 py-3.5 text-center font-mono font-black text-slate-900">
                      {p.total_amount.toLocaleString('fr-FR')} FCFA
                    </td>

                    {/* STATUT & RÉCEPTION (AVEC NOM DU RÉCEPTIONNAIRE) */}
                    <td className="px-5 py-3.5 text-center">
                      {p.status === 'received' ? (
                        <div className="space-y-1">
                          <span className="px-3 py-1 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1 bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span>Réceptionné</span>
                          </span>
                          <div className="text-[11px] text-slate-600 font-semibold flex items-center justify-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span>
                              Par : <strong className="text-slate-900 font-bold">{receiverName || 'Administrateur'}</strong>
                            </span>
                          </div>
                          {p.received_at && (
                            <div className="text-[10px] text-slate-400">
                              Le {new Date(p.received_at).toLocaleDateString('fr-FR')} à{' '}
                              {new Date(p.received_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="px-3 py-1 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1 bg-amber-100 text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                            <span>En attente</span>
                          </span>
                          <div className="text-[10px] text-slate-400 font-normal">
                            Non réceptionné
                          </div>
                        </div>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {p.status !== 'received' ? (
                          <>
                            <button
                              onClick={() => navigate(`/purchases/receive/${p.id}`)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition active:scale-95 whitespace-nowrap inline-flex items-center gap-1"
                              title={`Pointer et réceptionner la commande ${p.reference}`}
                            >
                              <span>Réceptionner Stock</span>
                            </button>
                            {user?.role !== 'magasinier' && (
                              <button
                                onClick={() => handleDeletePurchase(p)}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition shadow-xs font-bold"
                                title="Supprimer ce bon de commande en attente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => navigate(`/purchases/receive/${p.id}`)}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition active:scale-95 whitespace-nowrap inline-flex items-center gap-1"
                            title="Consulter la feuille de pointage (Lecture seule)"
                          >
                            <span>Voir Pointage</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredPurchases.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-slate-400 font-medium">
                    Aucune commande fournisseur enregistrée.
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

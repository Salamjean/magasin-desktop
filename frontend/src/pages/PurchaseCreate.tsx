import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Supplier, Product } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, Trash2, Calendar, ChevronDown } from 'lucide-react';
import Swal from 'sweetalert2';

interface PurchaseOrderItem {
  productId: number | '';
  quantity: number;
  unitPrice: number;
}

export const PurchaseCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseOrderItem[]>([
    { productId: '', quantity: 1, unitPrice: 0 }
  ]);

  useEffect(() => {
    if (user?.role === 'magasinier') {
      Swal.fire({
        icon: 'info',
        title: 'Accès Réservé',
        text: 'L\'émission de nouvelles commandes fournisseurs est réservée à l\'administrateur. En tant que magasinier, vous êtes habilité à réceptionner les marchandises.',
        confirmButtonColor: '#0055b8'
      });
      navigate('/purchases');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const sups = await db.suppliers.toArray();
      const allProds = await db.products.toArray();
      const activeProds = allProds.filter(
        (p) =>
          p.is_active !== false &&
          (p.is_active as any) !== 0 &&
          (p.is_active as any) !== '0' &&
          (p.is_active as any) !== 'false'
      );
      setSuppliers(sups);
      setProducts(activeProds);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = () => {
    setItems((prev) => [...prev, { productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, pId: number | '') => {
    const selectedProd = products.find((p) => p.id === Number(pId));
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: pId,
        unitPrice: selectedProd ? selectedProd.purchase_price : 0
      };
      return copy;
    });
  };

  const handleQuantityChange = (index: number, qty: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], quantity: qty };
      return copy;
    });
  };

  const handlePriceChange = (index: number, price: number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], unitPrice: price };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      Swal.fire('Attention', 'Veuillez sélectionner un fournisseur partenaire.', 'warning');
      return;
    }

    const validItems = items.filter((it) => it.productId !== '' && it.quantity > 0);
    if (validItems.length === 0) {
      Swal.fire('Attention', 'Veuillez ajouter au moins un produit avec une quantité valide.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const ref = `CMD-${Date.now().toString().slice(-6)}`;
      const totalAmount = validItems.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

      const purchaseId = await db.purchases.add({
        reference: ref,
        supplier_id: Number(supplierId),
        total_amount: totalAmount,
        status: 'ordered',
        user_id: user?.id || 1,
        notes: notes.trim() || undefined,
        created_at: orderDate ? `${orderDate}T${new Date().toISOString().split('T')[1]}` : new Date().toISOString(),
        synced: 0
      });

      for (const it of validItems) {
        await db.purchase_items.add({
          purchase_id: Number(purchaseId),
          product_id: Number(it.productId),
          quantity: Number(it.quantity),
          unit_price: Number(it.unitPrice),
          subtotal: Number(it.quantity) * Number(it.unitPrice),
          synced: 0
        });
      }

      await Swal.fire({
        icon: 'success',
        title: 'Commande validée !',
        text: `Bon de commande ${ref} enregistré (${totalAmount.toLocaleString('fr-FR')} FCFA).`,
        timer: 1800,
        showConfirmButton: false
      });

      navigate('/purchases');
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Impossible d\'enregistrer la commande.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150 pb-16">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle space-y-6">
        {/* HEADER DE LA PAGE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Commande auprès d'un fournisseur
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Sélectionnez le fournisseur et ajoutez les articles avec prix d'achat convenus
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/purchases')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95 self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
        </div>

        {/* FORMULAIRE PRINCIPAL */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* LIGNE 1 : FOURNISSEUR & DATE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* FOURNISSEUR */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                FOURNISSEUR <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#4849e8] transition appearance-none cursor-pointer pr-10"
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.phone ? `(${s.phone})` : ''}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* DATE DE COMMANDE */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                DATE DE COMMANDE <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#4849e8] transition"
                />
              </div>
            </div>
          </div>

          {/* LIGNE 2 : NOTES & INSTRUCTIONS POUR LA LIVRAISON */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
              NOTES & INSTRUCTIONS POUR LA LIVRAISON
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Livraison demandée pour jeudi matin..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#4849e8] transition resize-none"
            />
          </div>

          {/* SECTION ARTICLES À COMMANDER */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                ARTICLES À COMMANDER
              </h2>

              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 text-[#0055b8] border border-blue-200/60 font-bold text-xs transition active:scale-95 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une ligne</span>
              </button>
            </div>

            {/* LIGNES D'ARTICLES */}
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end"
                >
                  {/* PRODUIT */}
                  <div className="md:col-span-6">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Produit
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={it.productId}
                        onChange={(e) =>
                          handleProductChange(idx, e.target.value ? Number(e.target.value) : '')
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#0055b8] transition appearance-none cursor-pointer pr-10"
                      >
                        <option value="">Choisir un produit</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.purchase_price ? `(${p.purchase_price.toLocaleString('fr-FR')} F)` : ''}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* QUANTITÉ COMMANDÉE */}
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Quantité commandée
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={it.quantity}
                      onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#0055b8] transition"
                    />
                  </div>

                  {/* PRIX ACHAT UNITAIRE */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Prix Achat unitaire (FCFA)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={it.unitPrice}
                      onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#0055b8] transition"
                    />
                  </div>

                  {/* BOUTON SUPPRIMER LA LIGNE */}
                  <div className="md:col-span-1 flex justify-center md:pb-1">
                    {items.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                        title="Supprimer cette ligne"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="w-8 h-8" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ACTIONS DU FORMULAIRE */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/purchases')}
              className="px-6 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
            >
              {saving ? 'Validation en cours...' : 'Valider la commande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

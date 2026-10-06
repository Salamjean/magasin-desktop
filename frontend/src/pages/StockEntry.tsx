import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Product, Category } from '../db/db';
import { useAuth } from '../context/AuthContext';
import {
  ArrowDown,
  ArrowLeft,
  Package,
  ListOrdered,
  Search,
  Check,
  Building2,
  Barcode
} from 'lucide-react';
import Swal from 'sweetalert2';

export const StockEntry: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState<string>('Réception commande fournisseur');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [allProds, allCats] = await Promise.all([
      db.products.toArray(),
      db.categories.toArray()
    ]);
    setProducts(allProds);
    setCategories(allCats);
  };

  const selectedProduct = products.find((p) => p.id === Number(selectedProductId));
  const productCategory = categories.find((c) => c.id === selectedProduct?.category_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId) {
      Swal.fire('Attention', 'Veuillez sélectionner un article.', 'warning');
      return;
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      Swal.fire('Attention', 'Veuillez saisir une quantité valide supérieure à 0.', 'warning');
      return;
    }

    if (!reason.trim()) {
      Swal.fire('Attention', 'Veuillez préciser le motif de l\'entrée en stock.', 'warning');
      return;
    }

    if (!selectedProduct || !selectedProduct.id) return;

    setLoading(true);
    try {
      const newStock = (selectedProduct.stock_quantity || 0) + qty;

      // 1. Mise à jour du stock du produit
      await db.products.update(selectedProduct.id, {
        stock_quantity: newStock,
        synced: 0
      });

      // 2. Création du mouvement de stock
      const ref = invoiceNumber.trim()
        ? `IN-${invoiceNumber.trim()}`
        : `IN-${Date.now().toString(36).toUpperCase()}`;

      await db.stock_movements.add({
        product_id: selectedProduct.id,
        type: 'in',
        quantity: qty,
        reference: ref,
        reason: reason.trim() + (notes.trim() ? ` (${notes.trim()})` : ''),
        user_id: user?.id || 1,
        created_at: new Date().toISOString(),
        synced: 0
      });

      await Swal.fire({
        icon: 'success',
        title: 'Entrée de stock validée !',
        text: `+${qty} ${selectedProduct.unit || 'pcs'} ajouté(s) à "${selectedProduct.name}". Nouveau stock : ${newStock} ${selectedProduct.unit || 'pcs'}.`,
        timer: 2000,
        showConfirmButton: false
      });

      navigate('/stock');
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Une erreur est survenue lors de l\'enregistrement.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-150">
      {/* En-tête de la Page */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0 border border-emerald-100">
            <ArrowDown className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">
              Stocks <span className="mx-1">/</span> <span className="text-slate-600">Entrée manuelle</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Réception & Entrée en Stock</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Opérateur : {user?.name || 'Administrateur'}</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/stock')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux mouvements</span>
          </button>
        </div>
      </div>

      {/* Formulaire en 2 Colonnes */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* COLONNE GAUCHE : SÉLECTION DE L'ARTICLE */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
          {/* Titre de section */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">SÉLECTION DE L'ARTICLE</h2>
              <p className="text-[11px] text-slate-400 font-medium">Produit à réapprovisionner</p>
            </div>
          </div>

          {/* Select Produit */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Choisir un produit dans le catalogue <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
                className="w-full pl-10 pr-8 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0055b8] focus:bg-white transition appearance-none cursor-pointer"
              >
                <option value="">Sélectionnez un produit à approvisionner</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — (Réf: {p.reference} • Stock actuel: {p.stock_quantity} {p.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fiche d'état actuel de l'article */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200/70 p-4 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              ÉTAT ACTUEL DE L'ARTICLE
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Nom :</span>
                <span className="font-bold text-slate-900">
                  {selectedProduct?.name || '—'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Rayon :</span>
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  {productCategory ? (
                    <>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: productCategory.color || '#0055b8' }}
                      />
                      <span>{productCategory.name}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Code-barres :</span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedProduct?.barcode || '—'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-slate-700 font-bold">Stock disponible :</span>
                <span className="font-black text-sm text-emerald-600 font-mono">
                  {selectedProduct ? `${selectedProduct.stock_quantity} ${selectedProduct.unit}` : '0'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : DÉTAILS DU MOUVEMENT */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
          {/* Titre de section */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">DÉTAILS DU MOUVEMENT</h2>
              <p className="text-[11px] text-slate-400 font-medium">Quantité ajoutée et justification</p>
            </div>
          </div>

          {/* Quantité à faire entrer */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Quantité à faire entrer <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-emerald-600 text-sm">+</span>
              <input
                type="number"
                min="1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ex: 50"
                required
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Motif de l'entrée en stock */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Motif de l'entrée en stock <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Réception commande fournisseur"
              required
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
            />
          </div>

          {/* N° Bon de Livraison / Facture */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              N° Bon de Livraison / Facture <span className="text-slate-400 font-normal">(Optionnel)</span>
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Ex: BL-2026-0894"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
            />
          </div>

          {/* Remarques ou observations */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Remarques ou observations
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observations éventuelles..."
              className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition resize-none"
            />
          </div>

          {/* Boutons d'action */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/stock')}
              className="px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs transition active:scale-95"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{loading ? 'Enregistrement...' : "Valider l'Entrée de Stock"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

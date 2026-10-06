import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Product, Category, User } from '../db/db';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardCheck,
  ArrowLeft,
  Search,
  Check,
  AlertTriangle,
  FileText,
  Layers,
  Plus,
  Minus,
  RotateCcw,
  Boxes,
  TrendingDown,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import Swal from 'sweetalert2';

interface InventoryRow {
  product: Product;
  theoretical: number;
  real: number;
  difference: number;
  reason: string;
}

export const InventoryCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [inventoryRef] = useState<string>(
    () => `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`
  );

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

    const initialItems: InventoryRow[] = allProds.map((p) => ({
      product: p,
      theoretical: p.stock_quantity || 0,
      real: p.stock_quantity || 0,
      difference: 0,
      reason: ''
    }));

    setItems(initialItems);
  };

  const handleUpdateRealQty = (productId: number, val: number) => {
    const validVal = isNaN(val) || val < 0 ? 0 : val;
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const diff = validVal - item.theoretical;
          return { ...item, real: validVal, difference: diff };
        }
        return item;
      })
    );
  };

  const handleUpdateReason = (productId: number, val: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return { ...item, reason: val };
        }
        return item;
      })
    );
  };

  const handleQuickAdjust = (productId: number, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const newReal = Math.max(0, item.real + delta);
          return { ...item, real: newReal, difference: newReal - item.theoretical };
        }
        return item;
      })
    );
  };

  const handleResetToTheoretical = (productId: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return { ...item, real: item.theoretical, difference: 0, reason: '' };
        }
        return item;
      })
    );
  };

  const totalItemsCount = items.length;
  const itemsWithDiscrepancy = items.filter((i) => i.difference !== 0);
  const itemsSurplus = items.filter((i) => i.difference > 0);
  const itemsLoss = items.filter((i) => i.difference < 0);
  const itemsConforming = items.filter((i) => i.difference === 0);

  const filteredItems = items.filter((item) => {
    const p = item.product;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);

    const matchesCategory =
      selectedCategory === 'all' || p.category_id === Number(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  const handleSubmitInventory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      Swal.fire('Erreur', 'Aucun article à inventorier.', 'error');
      return;
    }

    const confirm = await Swal.fire({
      title: 'Clôturer et Valider cet Inventaire ?',
      html: `
        <div class="text-left text-xs space-y-2">
          <p><strong>Référence :</strong> ${inventoryRef}</p>
          <p><strong>Articles comptés :</strong> ${items.length}</p>
          <p><strong>Écarts constatés :</strong> <span class="${itemsWithDiscrepancy.length > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}">${itemsWithDiscrepancy.length} article(s)</span></p>
          <p class="text-slate-500 pt-1 border-t">Les stocks réels enregistrés écraseront les quantités théoriques actuelles et généreront les mouvements d'ajustement.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, valider l\'inventaire',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#059669'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      const now = new Date().toISOString();

      // 1. Enregistrement de l'entête de l'inventaire
      const invId = await db.inventories.add({
        reference: inventoryRef,
        status: 'validated',
        user_id: user?.id || 1,
        date: now,
        notes: notes.trim() || undefined,
        synced: 0
      });

      // 2. Enregistrement des lignes d'inventaire et mise à jour des stocks
      for (const item of items) {
        const costVariance = item.difference * (item.product.purchase_price || 0);

        await db.inventory_items.add({
          inventory_id: Number(invId),
          product_id: item.product.id!,
          theoretical_quantity: item.theoretical,
          real_quantity: item.real,
          difference: item.difference,
          cost_variance: costVariance,
          reason: item.reason.trim() || undefined,
          synced: 0
        });

        // Si écart constaté, mise à jour du stock et log dans stock_movements
        if (item.difference !== 0) {
          await db.products.update(item.product.id!, {
            stock_quantity: item.real,
            synced: 0
          });

          const movementReason = item.reason.trim()
            ? `Inventaire ${inventoryRef} : ${item.reason.trim()} (${item.difference > 0 ? '+' : ''}${item.difference} ${item.product.unit || 'pcs'})`
            : `Inventaire ${inventoryRef} : Ajustement (${item.difference > 0 ? '+' : ''}${item.difference} ${item.product.unit || 'pcs'})`;

          await db.stock_movements.add({
            product_id: item.product.id!,
            type: 'adjustment',
            quantity: item.real,
            reference: inventoryRef,
            reason: movementReason,
            user_id: user?.id || 1,
            created_at: now,
            synced: 0
          });
        }
      }

      await Swal.fire({
        icon: 'success',
        title: 'Inventaire Validé avec Succès !',
        text: `L'inventaire ${inventoryRef} a été enregistré et tous les stocks ont été synchronisés.`,
        timer: 2200,
        showConfirmButton: false
      });

      navigate(`/inventories/${invId}`);
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Une erreur est survenue lors de l\'enregistrement.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 pb-12">
      {/* 1. EN-TÊTE DE LA PAGE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-lg shadow-blue-500/25">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">
              Stocks <span className="mx-1">/</span> <span className="text-slate-600">Comptage physique</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Fiche d'Inventaire Physique — <span className="font-mono text-[#0055b8]">{inventoryRef}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-blue-50 border border-blue-100 text-xs font-bold text-[#0055b8]">
            <span className="w-2 h-2 rounded-full bg-[#0055b8] animate-pulse" />
            <span>Opérateur : {user?.name || 'Administrateur'}</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/inventories')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
        </div>
      </div>

      {/* 2. STATISTIQUES EN TEMPS RÉEL */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total articles */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">TOTAL ARTICLES</p>
            <p className="text-lg font-black text-slate-900">{totalItemsCount}</p>
          </div>
        </div>

        {/* Conformes */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">CONFORMES (SANS ÉCART)</p>
            <p className="text-lg font-black text-emerald-700">{itemsConforming.length}</p>
          </div>
        </div>

        {/* Écarts Positifs (Surplus) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">SURPLUS (+)</p>
            <p className="text-lg font-black text-indigo-700">{itemsSurplus.length}</p>
          </div>
        </div>

        {/* Écarts Négatifs (Manquants / Pertes) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">MANQUANTS / PERTES (-)</p>
            <p className="text-lg font-black text-rose-700">{itemsLoss.length}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitInventory} className="space-y-6">
        {/* 3. TABLEAU DE COMPTAGE */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
          {/* Barre d'outils du tableau */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par article, référence, code-barres..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0055b8]"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0055b8]"
              >
                <option value="all">Tous les rayons</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-xl">
                {filteredItems.length} article(s) affiché(s)
              </span>
            </div>
          </div>

          {/* Grille des articles */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Article & Réf</th>
                  <th className="px-5 py-3.5">Rayon</th>
                  <th className="px-5 py-3.5 text-center">Stock Théorique</th>
                  <th className="px-5 py-3.5 text-center min-w-[200px]">Stock Réel Compté</th>
                  <th className="px-5 py-3.5 text-center">Écart Constaté</th>
                  <th className="px-5 py-3.5 min-w-[260px]">Justification / Motif d'écart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredItems.map((item) => {
                  const p = item.product;
                  const cat = categories.find((c) => c.id === p.category_id);
                  const isConforming = item.difference === 0;
                  const isSurplus = item.difference > 0;
                  const isLoss = item.difference < 0;

                  return (
                    <tr
                      key={p.id}
                      className={`transition ${
                        !isConforming ? (isSurplus ? 'bg-indigo-50/20' : 'bg-rose-50/20') : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Article & Réf */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">Réf : {p.reference} • CB : {p.barcode}</div>
                      </td>

                      {/* Rayon */}
                      <td className="px-5 py-3.5">
                        {cat ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white"
                            style={{ backgroundColor: cat.color || '#0055b8' }}
                          >
                            <Layers className="w-3 h-3" />
                            {cat.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">Général</span>
                        )}
                      </td>

                      {/* Stock Théorique */}
                      <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-600">
                        {item.theoretical} {p.unit || 'pcs'}
                      </td>

                      {/* Stock Réel Compté (Contrôles interactifs) */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5 max-w-[180px] mx-auto">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(p.id!, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black transition active:scale-95"
                            title="Diminuer de 1"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.real}
                            onChange={(e) => handleUpdateRealQty(p.id!, parseFloat(e.target.value))}
                            className={`w-20 py-1.5 px-2 text-center rounded-xl border text-xs font-black font-mono focus:outline-none transition ${
                              isConforming
                                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#0055b8] focus:bg-white'
                                : isSurplus
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                                : 'bg-rose-50 border-rose-300 text-rose-800'
                            }`}
                          />

                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(p.id!, +1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black transition active:scale-95"
                            title="Augmenter de 1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Écart Constaté */}
                      <td className="px-5 py-3.5 text-center font-mono font-black">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] ${
                            isConforming
                              ? 'bg-emerald-100 text-emerald-800'
                              : isSurplus
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isConforming ? '0' : `${isSurplus ? '+' : ''}${item.difference}`} {p.unit || 'pcs'}
                        </span>
                      </td>

                      {/* Justification / Motif d'écart par produit */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.reason}
                            onChange={(e) => handleUpdateReason(p.id!, e.target.value)}
                            placeholder={
                              isConforming
                                ? 'Conforme (aucun écart)'
                                : isSurplus
                                ? 'Ex: Surplus livraison, don...'
                                : 'Ex: Casse, Produit périmé, Vol...'
                            }
                            className={`w-full px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none transition ${
                              !isConforming
                                ? 'bg-white border-amber-300 text-slate-900 placeholder-slate-400 focus:border-[#0055b8] shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 placeholder-slate-400 focus:bg-white focus:border-[#0055b8]'
                            }`}
                          />

                          {!isConforming && (
                            <button
                              type="button"
                              onClick={() => handleResetToTheoretical(p.id!)}
                              className="p-1.5 text-slate-400 hover:text-[#0055b8] hover:bg-blue-50 rounded-lg transition flex-shrink-0"
                              title="Rétablir au stock théorique"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                      Aucun produit trouvé dans cette sélection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. NOTE DE CLÔTURE ET OBSERVATIONS FINALES */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
            <FileText className="w-4 h-4 text-[#0055b8]" />
            <span>NOTE DE SYNTHÈSE & OBSERVATIONS DE CLÔTURE D'INVENTAIRE</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Ajoutez un compte-rendu, justifiez les écarts constatés ou mentionnez les actions correctives à retenir pour ce comptage.
          </p>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex : Comptage trimestriel effectué par l'équipe du magasin. Les écarts constatés sur le rayon boissons sont dus à des avaries non déclarées..."
            className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0055b8] focus:bg-white transition resize-none"
          />
        </div>

        {/* 5. PIED DE PAGE : BOUTONS DE VALIDATION */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white rounded-3xl border border-slate-200/80 shadow-subtle">
          <div className="text-xs text-slate-500 font-medium">
            <span>Total : <strong>{items.length}</strong> article(s) • Écarts constatés : <strong className={itemsWithDiscrepancy.length > 0 ? 'text-rose-600' : 'text-emerald-600'}>{itemsWithDiscrepancy.length}</strong></span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => navigate('/inventories')}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{loading ? 'Clôture en cours...' : '✓ Clôturer et Valider l\'Inventaire'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

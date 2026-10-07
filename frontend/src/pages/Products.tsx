import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Product, Category } from '../db/db';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Barcode,
  Filter,
  Layers,
  Eye,
  Power,
  Tag
} from 'lucide-react';
import Swal from 'sweetalert2';
import { syncService, API_BASE_URL } from '../db/syncService';

export const Products: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allProds = await db.products.toArray();
    const allCats = await db.categories.toArray();
    setProducts(allProds);
    setCategories(allCats);
  };

  const handleToggleActive = async (p: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!p.id) return;
    const newStatus = !p.is_active;

    await db.products.update(p.id, {
      is_active: newStatus,
      synced: 0
    });

    loadData();

    syncService.syncNow().catch((err) => console.warn('Sync error:', err));

    Swal.fire({
      icon: 'success',
      title: newStatus ? 'Article activé' : 'Article désactivé',
      text: newStatus
        ? `L'article "${p.name}" est maintenant disponible à la vente.`
        : `L'article "${p.name}" est masqué de la vente.`,
      timer: 1600,
      showConfirmButton: false
    });
  };

  const handleDeleteProduct = async (p: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!p.id) return;
    const confirm = await Swal.fire({
      title: 'Supprimer ce produit ?',
      text: `L'article "${p.name}" sera définitivement supprimé.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#e11d48'
    });

    if (confirm.isConfirmed) {
      await db.products.delete(p.id);
      try {
        await fetch(`${API_BASE_URL}/sync/products/${p.id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Erreur suppression distante produit:', err);
      }
      loadData();
      Swal.fire({ icon: 'success', title: 'Produit supprimé.', timer: 1800, showConfirmButton: false });
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);

    const matchesCategory =
      categoryFilter === 'all' || p.category_id === Number(categoryFilter);

    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'low' && p.stock_quantity <= p.min_stock && p.stock_quantity > 0) ||
      (stockFilter === 'out' && p.stock_quantity <= 0);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.is_active !== false) ||
      (statusFilter === 'inactive' && p.is_active === false);

    return matchesSearch && matchesCategory && matchesStock && matchesStatus;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* En-tête Moderne avec Recherche au Centre */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Titre & Icône */}
        <div className="flex items-center gap-3.5 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Catalogue Produits & Articles</h1>
            <p className="text-xs text-slate-500 font-medium">Gestion des prix, codes-barres, seuils d'alerte et stocks</p>
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
              placeholder="Rechercher par désignation, référence ou code-barres..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50/90 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Boutons d'Action & Badge Compteur */}
        <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-auto">
          <span className="hidden sm:inline-flex text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-2xl whitespace-nowrap">
            {filteredProducts.length} article(s)
          </span>

          <button
            onClick={() => navigate('/labels')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95 whitespace-nowrap"
            title="Imprimer des étiquettes de rayon pour vos articles"
          >
            <Tag className="w-4 h-4 text-[#0055b8]" />
            <span>Étiquettes Rayons</span>
          </button>

          <button
            onClick={() => navigate('/products/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvel Article</span>
          </button>
        </div>
      </div>

      {/* Barre de Filtres par Catégorie et État de Stock */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#0055b8]" />
            <span>Filtres :</span>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0055b8]"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0055b8]"
          >
            <option value="all">Tous les états de stock</option>
            <option value="low">⚠️ Stock Faible / Alerte</option>
            <option value="out">⛔ Rupture de Stock</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0055b8]"
          >
            <option value="all">Tous les statuts (Actifs & Inactifs)</option>
            <option value="active">Actifs uniquement</option>
            <option value="inactive">Désactivés uniquement</option>
          </select>
        </div>

        <div className="text-[11px] font-bold text-slate-400">
          Affichage de {filteredProducts.length} sur {products.length} produit(s)
        </div>
      </div>

      {/* Tableau des Produits */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Article</th>
                <th className="px-5 py-3.5">Réf & Code-barres</th>
                <th className="px-5 py-3.5">Rayon / Catégorie</th>
                <th className="px-5 py-3.5 text-right">Prix Vente</th>
                <th className="px-5 py-3.5 text-center">Stock Actuel</th>
                <th className="px-5 py-3.5 text-center">État</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredProducts.map((p) => {
                const category = categories.find((c) => c.id === p.category_id);
                const isOutOfStock = p.stock_quantity <= 0;
                const isLowStock = p.stock_quantity <= p.min_stock;
                const isActive = p.is_active !== false;

                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/products/${p.id}`)}
                    className="hover:bg-blue-50/40 transition cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-xs">
                          {p.image && p.image.trim() ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-contain rounded-lg" />
                          ) : (
                            <div className="w-full h-full rounded-lg bg-[#0055b8] text-white flex items-center justify-center font-black text-xs uppercase">
                              {(p.name.slice(0, 2) || 'PR').toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm hover:text-[#0055b8] transition">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal">Unité : {p.unit}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <div className="text-slate-800 font-bold">{p.reference}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Barcode className="w-3.5 h-3.5 text-[#0055b8]" />
                        <span>{p.barcode}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {category ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white"
                          style={{ backgroundColor: category.color || '#0055b8' }}
                        >
                          <Layers className="w-3 h-3" />
                          {category.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Non classé</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-[#0055b8] font-mono text-sm">
                      {p.selling_price.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full font-black text-[11px] ${
                          isOutOfStock
                            ? 'bg-rose-100 text-rose-700'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.stock_quantity} {p.unit}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleToggleActive(p, e)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black transition ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                        }`}
                        title={isActive ? "Cliquez pour désactiver" : "Cliquez pour activer"}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                        <span>{isActive ? 'Actif' : 'Désactivé'}</span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Bouton Détails en bleu */}
                        <button
                          onClick={() => navigate(`/products/${p.id}`)}
                          className="p-1.5 bg-blue-50 text-[#0055b8] hover:bg-[#0055b8] hover:text-white rounded-xl transition shadow-xs"
                          title="Détails du produit"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Bouton Activer / Désactiver coloré */}
                        <button
                          onClick={(e) => handleToggleActive(p, e)}
                          className={`p-1.5 rounded-xl transition shadow-xs ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                              : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white'
                          }`}
                          title={isActive ? 'Désactiver le produit' : 'Activer le produit'}
                        >
                          <Power className="w-4 h-4" />
                        </button>

                        {/* Bouton Modifier en orange / ambre */}
                        <button
                          onClick={() => navigate(`/products/edit/${p.id}`)}
                          className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-xl transition shadow-xs"
                          title="Modifier l'article"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Bouton Supprimer en rouge */}
                        <button
                          onClick={(e) => handleDeleteProduct(p, e)}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition shadow-xs"
                          title="Supprimer l'article"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                    Aucun produit trouvé correspondant à vos critères.
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

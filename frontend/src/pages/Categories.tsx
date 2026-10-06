import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Category, Product } from '../db/db';
import { Layers, Plus, Edit2, Trash2, Eye, Search } from 'lucide-react';
import Swal from 'sweetalert2';

export const Categories: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const cats = await db.categories.toArray();
    const prods = await db.products.toArray();
    setCategories(cats);
    setProducts(prods);
  };

  const handleDelete = async (c: Category, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!c.id) return;
    const hasProducts = products.some((p) => p.category_id === c.id);
    if (hasProducts) {
      Swal.fire('Attention', 'Impossible de supprimer cette catégorie car des articles y sont rattachés.', 'warning');
      return;
    }

    const confirm = await Swal.fire({
      title: 'Supprimer ?',
      text: `Supprimer la catégorie "${c.name}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#e11d48'
    });

    if (confirm.isConfirmed) {
      await db.categories.delete(c.id);
      loadData();
      Swal.fire({ icon: 'success', title: 'Supprimée.', timer: 1800, showConfirmButton: false });
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* En-tête Moderne avec Recherche au Centre */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Titre & Icône */}
        <div className="flex items-center gap-3.5 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Catégories & Rayons</h1>
            <p className="text-xs text-slate-500 font-medium">Organisation et classification des articles en boutique</p>
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
              placeholder="Rechercher un rayon ou une catégorie..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50/90 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Bouton Nouvelle Catégorie & Badge Compteur */}
        <div className="flex items-center gap-2.5 flex-shrink-0 self-end md:self-auto">
          <span className="hidden sm:inline-flex text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-2xl whitespace-nowrap">
            {filteredCategories.length} catégorie(s)
          </span>

          <button
            onClick={() => navigate('/categories/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Catégorie</span>
          </button>
        </div>
      </div>

      {/* Grille Compacte sur 4 Colonnes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {filteredCategories.map((c) => {
          const count = products.filter((p) => p.category_id === c.id).length;
          return (
            <div
              key={c.id}
              className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between group cursor-pointer"
              onClick={() => navigate(`/categories/${c.id}`)}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
                    style={{ backgroundColor: c.color || '#0055b8' }}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {count} article(s)
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#0055b8] transition truncate" title={c.name}>
                    {c.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5" title={c.description}>
                    {c.description || 'Aucune description'}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/categories/${c.id}`);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-[#0055b8] text-[#0055b8] hover:text-white font-bold text-[11px] transition duration-150"
                  title="Ouvrir la catégorie et voir tous les articles"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Voir articles</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/categories/edit/${c.id}`);
                    }}
                    className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-xl transition shadow-xs"
                    title="Modifier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(c, e)}
                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition shadow-xs"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

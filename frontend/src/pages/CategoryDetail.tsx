import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, Category, Product } from '../db/db';
import { Layers, ArrowLeft, Package, Search, ShoppingBag, Edit2, Plus } from 'lucide-react';

export const CategoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategoryAndProducts();
  }, [id]);

  const loadCategoryAndProducts = async () => {
    if (!id) {
      navigate('/categories');
      return;
    }
    const cat = await db.categories.get(Number(id));
    if (!cat) {
      navigate('/categories');
      return;
    }
    const allProds = await db.products.toArray();
    const catProds = allProds.filter((p) => p.category_id === Number(id));

    setCategory(cat);
    setProducts(catProds);
    setLoading(false);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.reference || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.barcode || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStock = products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
  const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity || 0) * (p.selling_price || 0), 0);

  if (loading || !category) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0056A6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* En-tête de la page */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-md flex-shrink-0"
            style={{ backgroundColor: category.color || '#0056A6' }}
          >
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <span>Rayons & Catégories</span>
              <span>/</span>
              <span className="text-slate-600 font-bold">{category.name}</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{category.name}</h1>
            <p className="text-xs text-slate-500 font-medium">
              {category.description || 'Consultation des articles classés dans ce rayon'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/categories/edit/${category.id}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-[#0056A6] font-bold text-xs transition active:scale-95"
          >
            <Edit2 className="w-4 h-4" />
            <span>Modifier le rayon</span>
          </button>
          <button
            onClick={() => navigate('/categories')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-sm transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux rayons</span>
          </button>
        </div>
      </div>

      {/* Statistiques clés */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-subtle flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0056A6] flex items-center justify-center font-bold">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Articles</p>
            <p className="text-lg font-black text-slate-900">{products.length} référence(s)</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-subtle flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock Total Disponible</p>
            <p className="text-lg font-black text-slate-900">{totalStock} unités</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-subtle flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Valeur Marchande</p>
            <p className="text-lg font-black text-slate-900">{totalValue.toLocaleString()} FCFA</p>
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Liste des Articles */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom d'article, référence ou code-barres..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0056A6] transition"
            />
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl whitespace-nowrap self-end sm:self-auto">
            {filteredProducts.length} article(s) trouvé(s)
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <Package className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">Aucun article dans ce rayon</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? 'Aucun article ne correspond à votre filtre de recherche.'
                : 'Ce rayon ne contient aucun article pour le moment.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Article</th>
                  <th className="py-3.5 px-5">Référence / Code</th>
                  <th className="py-3.5 px-5 text-right">Prix Achat</th>
                  <th className="py-3.5 px-5 text-right">Prix Vente</th>
                  <th className="py-3.5 px-5 text-center">Stock</th>
                  <th className="py-3.5 px-5 text-center">Unité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredProducts.map((p) => {
                  const isLowStock = (p.stock_quantity || 0) <= (p.min_stock || 5);
                  const isOutOfStock = (p.stock_quantity || 0) <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3.5 px-5 flex items-center gap-3">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[11px] text-slate-400 font-normal">
                            Min stock : {p.min_stock || 0}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 font-mono text-[11px]">
                        {p.reference || p.barcode || '-'}
                      </td>
                      <td className="py-3.5 px-5 text-right text-slate-500 font-medium">
                        {(p.purchase_price || 0).toLocaleString()} FCFA
                      </td>
                      <td className="py-3.5 px-5 text-right font-black text-[#0056A6]">
                        {(p.selling_price || 0).toLocaleString()} FCFA
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {p.stock_quantity || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center text-slate-500 uppercase text-[11px]">
                        {p.unit || 'pcs'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Supplier, Purchase, Product } from '../db/db';
import { Building2, Plus, Search, Edit2, Trash2, Phone, Eye } from 'lucide-react';
import Swal from 'sweetalert2';

export const Suppliers: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [list, allPurchases, allProds] = await Promise.all([
      db.suppliers.toArray(),
      db.purchases.toArray(),
      db.products.toArray()
    ]);
    setSuppliers(list);
    setPurchases(allPurchases);
    setProducts(allProds);
  };

  const handleDelete = async (s: Supplier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!s.id) return;
    const confirm = await Swal.fire({
      title: 'Supprimer ?',
      text: `Supprimer le fournisseur "${s.name}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#e11d48'
    });

    if (confirm.isConfirmed) {
      await db.suppliers.delete(s.id);
      loadData();
      Swal.fire({ icon: 'success', title: 'Fournisseur supprimé.', timer: 1800, showConfirmButton: false });
    }
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contact_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.phone || '').includes(searchQuery) ||
    (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* En-tête Moderne avec Recherche au Centre */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Titre & Icône */}
        <div className="flex items-center gap-3.5 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Fournisseurs & Grossistes</h1>
            <p className="text-xs text-slate-500 font-medium">Carnet d'adresses et partenaires de réapprovisionnement</p>
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
              placeholder="Rechercher par société, contact, téléphone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50/90 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Bouton Nouveau Fournisseur & Badge Compteur */}
        <div className="flex items-center gap-2.5 flex-shrink-0 self-end md:self-auto">
          <span className="hidden sm:inline-flex text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-2xl whitespace-nowrap">
            {filteredSuppliers.length} fournisseur(s)
          </span>

          <button
            onClick={() => navigate('/suppliers/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Fournisseur</span>
          </button>
        </div>
      </div>

      {/* Grille Compacte sur 4 Colonnes */}
      {filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3 shadow-subtle">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">Aucun fournisseur trouvé</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? 'Aucun fournisseur ne correspond à votre recherche.'
              : 'Commencez par ajouter votre premier fournisseur ou grossiste.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredSuppliers.map((s) => {
            const countOrders = purchases.filter((p) => p.supplier_id === s.id).length;
            const countProducts = products.filter((p) => p.supplier_id === s.id).length;

            return (
              <div
                key={s.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between group cursor-pointer"
                onClick={() => navigate(`/suppliers/${s.id}`)}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0055b8] group-hover:bg-[#0055b8] group-hover:text-white transition font-black text-xs flex items-center justify-center shadow-sm">
                      {s.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {countProducts > 0 ? `${countProducts} article(s)` : `${countOrders} bon(s)`}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#0055b8] transition truncate" title={s.name}>
                      {s.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5" title={s.contact_name || s.phone}>
                      {s.contact_name ? `Contact : ${s.contact_name}` : s.phone || 'Aucun contact'}
                    </p>
                  </div>

                  {s.phone && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 pt-1">
                      <Phone className="w-3 h-3 text-[#0055b8] flex-shrink-0" />
                      <span className="truncate">{s.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/suppliers/${s.id}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-blue-50 hover:bg-[#0055b8] text-[#0055b8] hover:text-white font-bold text-[11px] transition duration-150"
                    title="Voir la fiche détaillée et l'historique"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Voir détails</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/suppliers/edit/${s.id}`);
                      }}
                      className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-xl transition shadow-xs"
                      title="Modifier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(s, e)}
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
      )}
    </div>
  );
};

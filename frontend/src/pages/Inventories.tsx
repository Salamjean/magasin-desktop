import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Inventory, InventoryItem, User } from '../db/db';
import {
  ClipboardCheck,
  Plus,
  Search,
  Calendar,
  UserCheck,
  Eye,
  CheckCircle2,
  FileText,
  Boxes,
  Layers,
  TrendingDown,
  Trash2
} from 'lucide-react';
import Swal from 'sweetalert2';

export const Inventories: React.FC = () => {
  const navigate = useNavigate();
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [allInvs, allItems, allUsers] = await Promise.all([
      db.inventories.reverse().toArray(),
      db.inventory_items.toArray(),
      db.users.toArray()
    ]);
    setInventories(allInvs);
    setItems(allItems);
    setUsers(allUsers);
  };

  const handleDeleteInventory = async (inv: Inventory, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inv.id) return;

    const confirm = await Swal.fire({
      title: 'Supprimer cet inventaire ?',
      text: `L'inventaire ${inv.reference} sera supprimé de l'historique.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#e11d48'
    });

    if (confirm.isConfirmed) {
      await db.inventory_items.where('inventory_id').equals(inv.id).delete();
      await db.inventories.delete(inv.id);
      loadData();
      Swal.fire({ icon: 'success', title: 'Inventaire supprimé.', timer: 1800, showConfirmButton: false });
    }
  };

  const filteredInventories = inventories.filter((inv) => {
    const operator = users.find((u) => u.id === inv.user_id);
    const matchesSearch =
      inv.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (operator?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* En-tête Moderne avec Recherche au Centre */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Titre & Icône */}
        <div className="flex items-center gap-3.5 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Inventaires Physiques & Écarts</h1>
            <p className="text-xs text-slate-500 font-medium">Comptage de stock, comparaison théorique et procès-verbaux</p>
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
              placeholder="Rechercher par référence, note, opérateur..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50/90 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Bouton Nouvel Inventaire & Badge Compteur */}
        <div className="flex items-center gap-2.5 flex-shrink-0 self-end md:self-auto">
          <span className="hidden sm:inline-flex text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-2xl whitespace-nowrap">
            {filteredInventories.length} inventaire(s)
          </span>

          <button
            onClick={() => navigate('/inventories/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvel Inventaire</span>
          </button>
        </div>
      </div>

      {/* Tableau des Inventaires */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Référence & Date</th>
                <th className="px-5 py-3.5">Opérateur</th>
                <th className="px-5 py-3.5 text-center">Articles Comptés</th>
                <th className="px-5 py-3.5 text-center">Écarts Constatés</th>
                <th className="px-5 py-3.5">Note de Clôture</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredInventories.map((inv) => {
                const operator = users.find((u) => u.id === inv.user_id);
                const invItems = items.filter((i) => i.inventory_id === inv.id);
                const discrepancies = invItems.filter((i) => i.difference !== 0);

                return (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/inventories/${inv.id}`)}
                    className="hover:bg-blue-50/40 transition cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-mono">
                      <div className="font-bold text-slate-900 text-sm hover:text-[#0055b8] transition">
                        {inv.reference}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {new Date(inv.date).toLocaleString('fr-FR')}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0055b8]" />
                        {operator?.name || 'Administrateur'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-center font-bold text-slate-800 font-mono">
                      {invItems.length} article(s)
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                          discrepancies.length > 0
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {discrepancies.length > 0 ? `${discrepancies.length} écart(s)` : '0 écart (Conforme)'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 max-w-xs truncate">
                      {inv.notes ? (
                        <span className="text-slate-700 font-medium truncate block" title={inv.notes}>
                          {inv.notes}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">Aucune note</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/inventories/${inv.id}`)}
                          className="p-1.5 bg-blue-50 text-[#0055b8] hover:bg-[#0055b8] hover:text-white rounded-xl transition shadow-xs"
                          title="Consulter le rapport d'inventaire"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => handleDeleteInventory(inv, e)}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition shadow-xs"
                          title="Supprimer cet inventaire"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredInventories.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                    Aucun inventaire enregistré pour le moment.
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

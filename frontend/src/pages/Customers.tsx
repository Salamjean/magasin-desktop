import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Customer } from '../db/db';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Coins,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  HandCoins,
  X
} from 'lucide-react';
import Swal from 'sweetalert2';

export const Customers: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debtFilter, setDebtFilter] = useState<'all' | 'debt' | 'clear'>('all');

  // Modal Règlement de dette
  const [isPayDebtOpen, setIsPayDebtOpen] = useState(false);
  const [selectedDebtCustomer, setSelectedDebtCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const custs = await db.customers.toArray();
    setCustomers(custs);
  };

  const handleDeleteCustomer = async (c: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!c.id) return;

    const confirm = await Swal.fire({
      title: 'Supprimer ce client ?',
      text: `Le client "${c.name}" sera définitivement supprimé.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#e11d48'
    });

    if (confirm.isConfirmed) {
      await db.customers.delete(c.id);
      loadData();
      Swal.fire({ icon: 'success', title: 'Client supprimé.', timer: 1800, showConfirmButton: false });
    }
  };

  const handleOpenPayDebt = (c: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedDebtCustomer(c);
    setPaymentAmount(c.current_debt || 0);
    setIsPayDebtOpen(true);
  };

  const handleSettleDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtCustomer?.id || paymentAmount <= 0) return;

    try {
      const remainingDebt = Math.max(0, (selectedDebtCustomer.current_debt || 0) - paymentAmount);
      await db.customers.update(selectedDebtCustomer.id, {
        current_debt: remainingDebt,
        synced: 0
      });

      await Swal.fire({
        icon: 'success',
        title: 'Règlement enregistré !',
        text: `Nouveau solde de dette pour "${selectedDebtCustomer.name}" : ${remainingDebt.toLocaleString('fr-FR')} FCFA.`,
        timer: 2000,
        showConfirmButton: false
      });

      setIsPayDebtOpen(false);
      loadData();
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Une erreur est survenue.', 'error');
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone || '').includes(searchQuery) ||
      (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.address || '').toLowerCase().includes(searchQuery.toLowerCase());

    const hasDebt = (c.current_debt || 0) > 0;
    const matchesFilter =
      debtFilter === 'all' ||
      (debtFilter === 'debt' && hasDebt) ||
      (debtFilter === 'clear' && !hasDebt);

    return matchesSearch && matchesFilter;
  });

  const totalDebts = filteredCustomers.reduce((sum, c) => sum + (c.current_debt || 0), 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* En-tête Moderne avec Recherche au Centre */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Titre & Icône */}
        <div className="flex items-center gap-3.5 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Clients & Gestion des Crédits</h1>
            <p className="text-xs text-slate-500 font-medium">Suivi des comptes clients, dettes initiales et règlements</p>
          </div>
        </div>

        {/* Champ de Recherche & Sélecteur au Centre */}
        <div className="flex-1 max-w-xl w-full mx-auto md:mx-4 flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, téléphone, adresse..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50/90 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={debtFilter}
              onChange={(e) => setDebtFilter(e.target.value as any)}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-2xl bg-slate-50/90 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0055b8] focus:bg-white transition cursor-pointer whitespace-nowrap"
            >
              <option value="all">Tous les clients</option>
              <option value="debt">⚠️ Avec dettes en cours</option>
              <option value="clear">✅ Soldés / Sans dette</option>
            </select>

            <span className="hidden xl:inline-flex text-xs font-bold text-slate-400 bg-slate-100 px-3 py-2 rounded-2xl whitespace-nowrap">
              {filteredCustomers.length} client(s)
            </span>
          </div>
        </div>

        {/* Bouton Nouveau Client & Total Créances */}
        <div className="flex items-center gap-3 flex-shrink-0 self-end md:self-auto">
          {totalDebts > 0 && (
            <div className="hidden sm:flex px-3.5 py-2 bg-rose-50/80 rounded-2xl border border-rose-100 items-center gap-2 shadow-xs">
              <span className="text-[11px] font-bold text-rose-700">Total Dettes :</span>
              <span className="text-xs font-black text-rose-900 font-mono">
                {totalDebts.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          )}

          <button
            onClick={() => navigate('/customers/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Client</span>
          </button>
        </div>
      </div>

      {/* Tableau des Clients */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Client & Contact</th>
                <th className="px-5 py-3.5">Téléphone</th>
                <th className="px-5 py-3.5">Adresse</th>
                <th className="px-5 py-3.5 text-right">Dette / Créance en cours</th>
                <th className="px-5 py-3.5 text-center">État</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredCustomers.map((c) => {
                const debt = c.current_debt || 0;
                const hasDebt = debt > 0;

                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="hover:bg-blue-50/50 cursor-pointer transition group"
                  >
                    {/* Nom & Contact */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 text-sm group-hover:text-[#0055b8] transition">
                        {c.name}
                      </div>
                      {c.email && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </td>

                    {/* Téléphone */}
                    <td className="px-5 py-3.5 font-mono text-slate-800">
                      {c.phone ? (
                        <div className="flex items-center gap-1.5 font-bold">
                          <Phone className="w-3.5 h-3.5 text-[#0055b8]" />
                          <span>{c.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">Non renseigné</span>
                      )}
                    </td>

                    {/* Adresse */}
                    <td className="px-5 py-3.5 text-slate-600">
                      {c.address ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-xs">{c.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>

                    {/* Dette en cours */}
                    <td className="px-5 py-3.5 text-right font-mono font-black text-sm">
                      <span className={hasDebt ? 'text-rose-600' : 'text-emerald-700'}>
                        {debt.toLocaleString('fr-FR')} FCFA
                      </span>
                    </td>

                    {/* État */}
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                          hasDebt
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${hasDebt ? 'bg-rose-600' : 'bg-emerald-600'}`} />
                        <span>{hasDebt ? 'Dette en cours' : 'Compte Soldé'}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Bouton Fiche & Règlement */}
                        <button
                          onClick={() => navigate(`/customers/${c.id}`)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-[#0055b8] hover:bg-[#0055b8] hover:text-white rounded-xl transition text-xs font-bold shadow-xs"
                          title="Fiche client & Règlement de crédit"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Fiche / Règlement</span>
                        </button>

                        {/* Bouton Modifier */}
                        <button
                          onClick={() => navigate(`/customers/edit/${c.id}`)}
                          className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-xl transition shadow-xs"
                          title="Modifier le client"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Bouton Supprimer */}
                        <button
                          onClick={(e) => handleDeleteCustomer(c, e)}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition shadow-xs"
                          title="Supprimer le client"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                    Aucun client trouvé correspondant à vos critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Rapide d'Encaissement / Règlement de Dette */}
      {isPayDebtOpen && selectedDebtCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-5 bg-gradient-to-r from-[#0055b8] to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <HandCoins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight">Règlement de Dette Client</h3>
                  <p className="text-[11px] text-blue-100 font-medium">{selectedDebtCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPayDebtOpen(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleDebt} className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  SOLDE ACTUEL DU CLIENT :
                </span>
                <p className="text-xl font-black text-rose-600 font-mono">
                  {(selectedDebtCustomer.current_debt || 0).toLocaleString('fr-FR')} FCFA
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Montant encaissé / Remboursé (FCFA) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={selectedDebtCustomer.current_debt || undefined}
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full pl-4 pr-16 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-black font-mono text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                    FCFA
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayDebtOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-2xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white shadow-md shadow-emerald-600/25 transition active:scale-95"
                >
                  Valider l'Encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

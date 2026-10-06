import React, { useState, useEffect } from 'react';
import { db, Expense } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { Trash2, Paperclip, Calendar, ArrowUpDown, Search, Eye } from 'lucide-react';
import Swal from 'sweetalert2';

export const Expenses: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire d'enregistrement de dépense
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Électricité & Énergie');
  const [amount, setAmount] = useState<string | number>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Recherche optionnelle dans l'historique
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const list = await db.expenses.reverse().toArray();
      setExpenses(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = Number(amount);
    if (!title.trim()) {
      Swal.fire('Attention', 'Veuillez saisir un intitulé ou libellé pour la dépense.', 'warning');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      Swal.fire('Attention', 'Veuillez renseigner un montant valide supérieur à 0 FCFA.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await db.expenses.add({
        title: title.trim(),
        category: category,
        amount: parsedAmount,
        payment_method: 'Espèces',
        notes: notes.trim() || undefined,
        user_id: user?.id || 1,
        date: date || new Date().toISOString().split('T')[0],
        synced: 0
      });

      Swal.fire({
        icon: 'success',
        title: 'Dépense enregistrée !',
        text: `Montant : ${parsedAmount.toLocaleString('fr-FR')} FCFA`,
        timer: 1800,
        showConfirmButton: false
      });

      // Réinitialiser le formulaire
      setTitle('');
      setAmount('');
      setNotes('');
      setCategory('Électricité & Énergie');
      setDate(new Date().toISOString().split('T')[0]);

      loadExpenses();
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Impossible d\'enregistrer la dépense.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: Expense) => {
    if (!e.id) return;
    const confirm = await Swal.fire({
      title: 'Supprimer ce décaissement ?',
      text: `Dépense "${e.title}" de ${e.amount.toLocaleString('fr-FR')} FCFA`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#e11d48'
    });

    if (confirm.isConfirmed) {
      await db.expenses.delete(e.id);
      loadExpenses();
      Swal.fire({ icon: 'success', title: 'Dépense supprimée.', timer: 1800, showConfirmButton: false });
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      e.title.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.notes && e.notes.toLowerCase().includes(q)) ||
      e.amount.toString().includes(q)
    );
  });

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="w-full animate-in fade-in duration-150 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* COLONNE GAUCHE : FORMULAIRE D'ENREGISTREMENT DE DÉPENSE                   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-subtle">
          <div className="space-y-1 mb-6">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Enregistrer une dépense
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Électricité, transport, maintenance, salaires...
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* INTITULÉ / LIBELLÉ */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                INTITULÉ / LIBELLÉ <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Facture CIE, Réparation frigo..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#4849e8] transition"
              />
            </div>

            {/* CATÉGORIE DE CHARGE */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                CATÉGORIE DE CHARGE <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-[#4849e8] transition appearance-none cursor-pointer pr-10"
                >
                  <option value="Électricité & Énergie">Électricité & Énergie</option>
                  <option value="Transport & Logistique">Transport & Logistique</option>
                  <option value="Maintenance & Réparations">Maintenance & Réparations</option>
                  <option value="Salaires & Primes">Salaires & Primes</option>
                  <option value="Loyer & Charges locatives">Loyer & Charges locatives</option>
                  <option value="Fournitures & Emballages">Fournitures & Emballages</option>
                  <option value="Marketing & Communication">Marketing & Communication</option>
                  <option value="Impôts & Taxes">Impôts & Taxes</option>
                  <option value="Frais Bancaires / Télécoms">Frais Bancaires / Télécoms</option>
                  <option value="Charges Générales / Divers">Charges Générales / Divers</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                      fillRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* MONTANT DÉCAISSÉ (FCFA) */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                MONTANT DÉCAISSÉ (FCFA) <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 50000"
                className="w-full px-4 py-3 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#4849e8] transition"
              />
            </div>

            {/* DATE DE DÉPENSE */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                DATE DE DÉPENSE <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-[#4849e8] transition"
                />
              </div>
            </div>

            {/* NOTES & JUSTIFICATIF */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                NOTES & JUSTIFICATIF
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Numéro de reçu ou observations..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/70 border border-slate-200 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#4849e8] transition resize-none pr-10"
                />
                <Paperclip className="w-4 h-4 text-slate-400 absolute right-3.5 bottom-3.5 pointer-events-none" />
              </div>
            </div>

            {/* BOUTON ENREGISTRER */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition active:scale-[0.99] disabled:opacity-50"
              >
                {saving ? 'Enregistrement en cours...' : 'Enregistrer la dépense'}
              </button>
            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* COLONNE DROITE : HISTORIQUE DES DÉCAISSEMENTS                            */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-subtle space-y-5">
          {/* Header de la carte d'historique */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Historique des Décaissements
            </h2>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-100/80 text-rose-500 text-xs font-black">
                Total : {totalAmount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>

          {/* Tableau des décaissements */}
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead>
                <tr className="text-[11px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-3.5 font-bold text-center">DATE</th>
                  <th className="pb-3.5 font-bold text-center">LIBELLÉ</th>
                  <th className="pb-3.5 font-bold text-center">CATÉGORIE</th>
                  <th className="pb-3.5 font-bold text-center">MONTANT</th>
                  <th className="pb-3.5 font-bold text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition group">
                    {/* DATE */}
                    <td className="py-3.5 text-center text-slate-500 font-mono text-xs whitespace-nowrap">
                      {new Date(exp.date).toLocaleDateString('fr-FR')}
                    </td>

                    {/* LIBELLÉ */}
                    <td className="py-3.5 text-center">
                      <div className="font-bold text-slate-900">{exp.title}</div>
                      {exp.notes && (
                        <div className="text-[11px] text-slate-400 font-normal truncate max-w-xs mx-auto">
                          {exp.notes}
                        </div>
                      )}
                    </td>

                    {/* CATÉGORIE AVEC COULEUR */}
                    <td className="py-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                          exp.category.includes('Électricité') || exp.category.includes('Énergie')
                            ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
                            : exp.category.includes('Transport')
                            ? 'bg-sky-50 text-sky-800 border border-sky-200/80'
                            : exp.category.includes('Maintenance') || exp.category.includes('Réparation')
                            ? 'bg-orange-50 text-orange-800 border border-orange-200/80'
                            : exp.category.includes('Salaire') || exp.category.includes('Prime')
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                            : exp.category.includes('Loyer')
                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-200/80'
                            : exp.category.includes('Fourniture') || exp.category.includes('Emballage')
                            ? 'bg-teal-50 text-teal-800 border border-teal-200/80'
                            : exp.category.includes('Marketing') || exp.category.includes('Communication')
                            ? 'bg-pink-50 text-pink-800 border border-pink-200/80'
                            : exp.category.includes('Impôt') || exp.category.includes('Taxe')
                            ? 'bg-purple-50 text-purple-800 border border-purple-200/80'
                            : exp.category.includes('Bancaire') || exp.category.includes('Télécom')
                            ? 'bg-cyan-50 text-cyan-800 border border-cyan-200/80'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {exp.category}
                      </span>
                    </td>

                    {/* MONTANT */}
                    <td className="py-3.5 text-center font-mono font-black text-rose-600 text-xs whitespace-nowrap">
                      -{exp.amount.toLocaleString('fr-FR')} FCFA
                    </td>

                    {/* ACTIONS EN COULEURS */}
                    <td className="py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            Swal.fire({
                              title: exp.title,
                              html: `
                                <div class="text-left text-xs space-y-2 p-2">
                                  <p><strong>Date :</strong> ${new Date(exp.date).toLocaleDateString('fr-FR')}</p>
                                  <p><strong>Catégorie :</strong> ${exp.category}</p>
                                  <p><strong>Montant :</strong> ${exp.amount.toLocaleString('fr-FR')} FCFA</p>
                                  ${exp.notes ? `<p><strong>Notes / Justificatif :</strong> ${exp.notes}</p>` : ''}
                                </div>
                              `,
                              icon: 'info',
                              confirmButtonText: 'Fermer'
                            });
                          }}
                          className="p-1.5 bg-blue-50 text-[#0055b8] hover:bg-[#0055b8] hover:text-white rounded-xl transition shadow-xs font-bold"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(exp)}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition shadow-xs font-bold"
                          title="Supprimer ce décaissement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredExpenses.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center py-20 text-xs text-slate-400 font-medium">
                      Aucune dépense enregistrée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, Customer, Sale, SaleItem, Product } from '../db/db';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  ArrowLeft,
  Edit2,
  Coins,
  FileText,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShoppingCart,
  X,
  Check,
  CreditCard,
  Banknote,
  DollarSign,
  Receipt,
  UserCheck
} from 'lucide-react';
import Swal from 'sweetalert2';

interface SaleWithDetails extends Sale {
  itemSummary?: string;
  itemCount?: number;
}

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // État du formulaire de règlement / crédit
  const [opType, setOpType] = useState<'settle' | 'add'>('settle');
  const [opAmount, setOpAmount] = useState<string | number>('');
  const [opNote, setOpNote] = useState('');
  const [processing, setProcessing] = useState(false);

  // Modal / Tiroir de modification des infos client
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    last_name: '',
    first_name: '',
    phone: '',
    email: '',
    address: '',
    current_debt: 0
  });

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const loadCustomerData = async () => {
    if (!id) {
      navigate('/customers');
      return;
    }
    const custId = Number(id);
    const c = await db.customers.get(custId);
    if (!c) {
      Swal.fire('Erreur', 'Client introuvable.', 'error');
      navigate('/customers');
      return;
    }

    setCustomer(c);

    const parts = (c.name || '').trim().split(' ');
    const lastName = parts[0] || '';
    const firstName = parts.slice(1).join(' ') || '';

    setEditFormData({
      last_name: lastName,
      first_name: firstName,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      current_debt: c.current_debt || 0
    });

    // Charger l'historique des achats de ce client
    const allSales = await db.sales.toArray();
    const customerSales = allSales
      .filter((s) => s.customer_id === custId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const allSaleItems = await db.sale_items.toArray();
    const allProducts = await db.products.toArray();
    const productMap = new Map<number, string>(allProducts.map((p) => [p.id!, p.name]));

    const salesWithItems: SaleWithDetails[] = customerSales.map((s) => {
      const items = allSaleItems.filter((it) => it.sale_id === s.id);
      const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);
      const itemNames = items
        .slice(0, 3)
        .map((it) => `${productMap.get(it.product_id) || 'Article'} (x${it.quantity})`)
        .join(', ');

      const itemSummary =
        items.length > 3 ? `${itemNames} + ${items.length - 3} autre(s)` : itemNames || 'Articles divers';

      return {
        ...s,
        itemCount,
        itemSummary
      };
    });

    setSales(salesWithItems);
    setLoading(false);
  };

  // 1. Validation de l'opération de règlement ou d'ajout de dette
  const handleOperationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) return;

    const amount = Number(opAmount);
    if (!amount || amount <= 0) {
      Swal.fire('Attention', 'Veuillez saisir un montant supérieur à 0 FCFA.', 'warning');
      return;
    }

    const currentDebt = customer.current_debt || 0;
    let newDebt = currentDebt;

    if (opType === 'settle') {
      if (currentDebt <= 0) {
        Swal.fire('Information', 'Ce client n\'a aucune dette en cours.', 'info');
        return;
      }
      newDebt = Math.max(0, currentDebt - amount);
    } else {
      newDebt = currentDebt + amount;
    }

    const isSettle = opType === 'settle';
    const actionLabel = isSettle ? 'Règlement de dette' : 'Ajout de crédit / dette';

    const confirm = await Swal.fire({
      title: `${actionLabel} ?`,
      html: `
        <div class="text-left text-xs space-y-2 text-slate-600">
          <p><strong>Client :</strong> ${customer.name}</p>
          <p><strong>Montant opération :</strong> <span class="text-blue-600 font-bold">${amount.toLocaleString('fr-FR')} FCFA</span></p>
          <p><strong>Dette avant :</strong> ${currentDebt.toLocaleString('fr-FR')} FCFA</p>
          <p><strong>Nouveau solde dette :</strong> <span class="font-black ${newDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}">${newDebt.toLocaleString('fr-FR')} FCFA</span></p>
          ${opNote ? `<p><strong>Motif :</strong> ${opNote}</p>` : ''}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmer l\'opération',
      cancelButtonText: 'Annuler',
      confirmButtonColor: isSettle ? '#059669' : '#0055b8'
    });

    if (!confirm.isConfirmed) return;

    setProcessing(true);
    try {
      await db.customers.update(customer.id, {
        current_debt: newDebt,
        synced: 0
      });

      await Swal.fire({
        icon: 'success',
        title: 'Opération enregistrée !',
        text: `Le solde de dette a été actualisé à ${newDebt.toLocaleString('fr-FR')} FCFA.`,
        timer: 2000,
        showConfirmButton: false
      });

      setOpAmount('');
      setOpNote('');
      loadCustomerData();
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Une erreur est survenue.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // 2. Sauvegarde de la modification des informations client
  const handleSaveCustomerInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) return;

    const fullName = `${editFormData.last_name.trim()} ${editFormData.first_name.trim()}`.trim();

    if (!fullName) {
      Swal.fire('Attention', 'Le nom ou prénom du client est obligatoire.', 'warning');
      return;
    }

    try {
      await db.customers.update(customer.id, {
        name: fullName,
        phone: editFormData.phone.trim() || undefined,
        email: editFormData.email.trim() || undefined,
        address: editFormData.address.trim() || undefined,
        current_debt: Number(editFormData.current_debt) || 0,
        synced: 0
      });

      await Swal.fire({
        icon: 'success',
        title: 'Informations mises à jour !',
        text: `La fiche de "${fullName}" a été modifiée avec succès.`,
        timer: 1800,
        showConfirmButton: false
      });

      setIsEditModalOpen(false);
      loadCustomerData();
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Une erreur est survenue.', 'error');
    }
  };

  if (loading || !customer) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0055b8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentDebt = customer.current_debt || 0;
  const hasDebt = currentDebt > 0;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 pb-12">
      {/* 1. CARTE EN-TÊTE : INFOS CLIENT */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {customer.name}
            </h1>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-wide ${
                hasDebt
                  ? 'bg-rose-50 text-rose-600 border border-rose-200/80'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
              }`}
            >
              {hasDebt ? `Dette : ${currentDebt.toLocaleString('fr-FR')} FCFA` : 'Compte Soldé (0 FCFA)'}
            </span>
          </div>

          <div className="mt-2 text-xs font-semibold text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Téléphone :{' '}
              <strong className="text-slate-700 font-mono font-bold">
                {customer.phone || 'Non renseigné'}
              </strong>
            </span>
            <span>•</span>
            <span>
              Email :{' '}
              <strong className="text-slate-700">
                {customer.email || 'Non renseigné'}
              </strong>
            </span>
            <span>•</span>
            <span>
              Adresse :{' '}
              <strong className="text-slate-700">
                {customer.address || 'Non renseignée'}
              </strong>
            </span>
          </div>
        </div>

        {/* Boutons d'action : Modifier & Retour */}
        <div className="flex items-center gap-3 self-start md:self-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-blue-50/60 border border-blue-200 text-[#0055b8] font-bold text-xs shadow-xs transition active:scale-95"
          >
            <Edit2 className="w-4 h-4" />
            <span>Modifier</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
        </div>
      </div>

      {/* 2. CARTE RÈGLEMENT DE DETTE / CRÉDIT CLIENT */}
      <div className="bg-blue-50/40 rounded-3xl border border-blue-100/90 p-5 sm:p-6 shadow-subtle space-y-4">
        <div className="flex items-center gap-2.5 text-[#0055b8]">
          <Coins className="w-5 h-5 flex-shrink-0" />
          <h2 className="text-sm font-black tracking-tight text-slate-900">
            Règlement de dette / Crédit client
          </h2>
        </div>

        <form onSubmit={handleOperationSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Sélecteur du type d'opération */}
          <div className="flex-1 min-w-[240px]">
            <select
              value={opType}
              onChange={(e) => setOpType(e.target.value as 'settle' | 'add')}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0055b8] shadow-xs cursor-pointer transition"
            >
              <option value="settle">Règlement / Remboursement de dette (-)</option>
              <option value="add">Ajout d'une dette / Nouveau crédit (+)</option>
            </select>
          </div>

          {/* Champ Montant (FCFA) */}
          <div className="flex-1 min-w-[180px] relative">
            <input
              type="number"
              min="1"
              step="any"
              required
              value={opAmount}
              onChange={(e) => setOpAmount(e.target.value)}
              placeholder="Montant (FCFA)"
              className="w-full pl-4 pr-14 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-bold font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0055b8] shadow-xs transition"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              FCFA
            </span>
          </div>

          {/* Bouton Valider l'opération */}
          <button
            type="submit"
            disabled={processing}
            className="px-6 py-3 rounded-2xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition active:scale-95 disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
          >
            <span>{processing ? 'Traitement...' : "Valider l'opération"}</span>
          </button>
        </form>
      </div>

      {/* 3. CARTE HISTORIQUE DES ACHATS DE CE CLIENT */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[#0055b8]">
            <FileText className="w-5 h-5 flex-shrink-0" />
            <h2 className="text-sm font-black tracking-tight text-slate-900">
              Historique des Achats de ce Client
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">
            {sales.length} achat(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-extrabold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">N° VENTE</th>
                <th className="px-5 py-3.5">DATE</th>
                <th className="px-5 py-3.5">ARTICLES</th>
                <th className="px-5 py-3.5">MOYEN PAIEMENT</th>
                <th className="px-5 py-3.5 text-right">MONTANT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition">
                  {/* N° Vente */}
                  <td className="px-5 py-3.5 font-mono font-bold text-[#0055b8]">
                    {s.invoice_number || `#VENTE-${s.id}`}
                  </td>

                  {/* Date */}
                  <td className="px-5 py-3.5 text-slate-500 font-medium">
                    {new Date(s.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>

                  {/* Articles */}
                  <td className="px-5 py-3.5 text-slate-800">
                    <div>
                      <span className="font-bold">{s.itemCount} article(s)</span>
                      <p className="text-[11px] text-slate-400 font-normal truncate max-w-sm">
                        {s.itemSummary}
                      </p>
                    </div>
                  </td>

                  {/* Moyen Paiement */}
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold">
                      {s.payment_method === 'cash' ? (
                        <>
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Espèces</span>
                        </>
                      ) : s.payment_method === 'wave' || s.payment_method === 'om' ? (
                        <>
                          <Phone className="w-3.5 h-3.5 text-amber-600" />
                          <span>{s.payment_method === 'wave' ? 'Wave' : 'Orange Money'}</span>
                        </>
                      ) : s.payment_method === 'card' ? (
                        <>
                          <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                          <span>Carte</span>
                        </>
                      ) : (
                        <>
                          <Coins className="w-3.5 h-3.5 text-rose-600" />
                          <span>Crédit</span>
                        </>
                      )}
                    </span>
                  </td>

                  {/* Montant */}
                  <td className="px-5 py-3.5 text-right font-mono font-black text-slate-900 text-sm">
                    {(s.total_amount || 0).toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
              ))}

              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">
                    Aucun achat enregistré pour ce client.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL RAPIDE DE MODIFICATION DES INFOS DU CLIENT */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="p-5 bg-gradient-to-r from-[#0055b8] to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight">Modifier les Informations du Client</h3>
                  <p className="text-[11px] text-blue-100 font-medium">{customer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerInfo} className="p-6 space-y-4">
              {/* Ligne 1 : Nom et Prénom séparés sur la même ligne */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Nom de famille / Raison Sociale <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                    placeholder="Ex: Koné"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Prénom(s)
                  </label>
                  <input
                    type="text"
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                    placeholder="Ex: Ibrahim"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Ligne 2 : Téléphone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Numéro de téléphone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Ligne 3 : Email et Adresse sur la même ligne */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Adresse Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Adresse Géographique</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Ajustement de la dette actuelle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Solde de dette actuel (FCFA)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editFormData.current_debt}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, current_debt: Number(e.target.value) })
                    }
                    className="w-full pl-4 pr-16 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-black font-mono text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                    FCFA
                  </span>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-2xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-[#0055b8] hover:bg-blue-700 font-bold text-xs text-white shadow-md shadow-blue-500/25 transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

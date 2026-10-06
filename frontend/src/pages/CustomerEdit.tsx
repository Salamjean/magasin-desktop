import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, Customer } from '../db/db';
import {
  Users,
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Coins,
  Check,
  Building2
} from 'lucide-react';
import Swal from 'sweetalert2';

export const CustomerEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    last_name: '',
    first_name: '',
    phone: '',
    email: '',
    address: '',
    current_debt: 0
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    if (!id) {
      navigate('/customers');
      return;
    }
    const c = await db.customers.get(Number(id));
    if (!c) {
      Swal.fire('Erreur', 'Client introuvable.', 'error');
      navigate('/customers');
      return;
    }
    setCustomer(c);

    // Séparer le nom et le prénom pour les champs distincts
    const parts = (c.name || '').trim().split(' ');
    const lastName = parts[0] || '';
    const firstName = parts.slice(1).join(' ') || '';

    setFormData({
      last_name: lastName,
      first_name: firstName,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      current_debt: c.current_debt || 0
    });
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) return;

    const fullName = `${formData.last_name.trim()} ${formData.first_name.trim()}`.trim();

    if (!fullName) {
      Swal.fire('Attention', 'Veuillez renseigner le nom ou le prénom du client.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await db.customers.update(customer.id, {
        name: fullName,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        current_debt: Number(formData.current_debt) || 0,
        synced: 0
      });

      await Swal.fire({
        icon: 'success',
        title: 'Client mis à jour !',
        text: `Les informations de "${fullName}" ont été actualisées avec succès.`,
        timer: 1800,
        showConfirmButton: false
      });

      navigate('/customers');
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Une erreur est survenue.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !customer) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0055b8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 pb-12">
      {/* 1. EN-TÊTE DE LA PAGE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-lg shadow-blue-500/25">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">
              Clients & Crédits <span className="mx-1">/</span> <span className="text-slate-600">Modifier la fiche</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Modifier le Client — <span className="text-[#0055b8]">{customer.name}</span>
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95 self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour</span>
        </button>
      </div>

      {/* 2. FORMULAIRE EN 2 COLONNES */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* COLONNE GAUCHE : IDENTITÉ DU CLIENT */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">COORDONNÉES DU CLIENT</h2>
              <p className="text-[11px] text-slate-400 font-medium">Informations d'identification et de contact</p>
            </div>
          </div>

          {/* Ligne 1 : Nom et Prénom séparés sur la même ligne */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Nom de famille / Raison Sociale <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
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
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Ex: Ibrahim"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Ligne 2 : Téléphone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Numéro de téléphone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Ligne 3 : Email et Adresse sur la même ligne */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Adresse Email <span className="text-slate-400 font-normal">(Optionnel)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Adresse géographique / Ville
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : DETTE ACTUELLE */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">SITUATION FINANCIÈRE</h2>
              <p className="text-[11px] text-slate-400 font-medium">Solde de dette actuel</p>
            </div>
          </div>

          {/* Solde de dette */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">
              Solde de dette actuel (FCFA)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                value={formData.current_debt}
                onChange={(e) => setFormData({ ...formData, current_debt: Number(e.target.value) })}
                className="w-full pl-4 pr-16 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-black font-mono text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                FCFA
              </span>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{submitting ? 'Mise à jour...' : '✓ Mettre à Jour le Client'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Coins,
  Check,
  Building2,
  FileText
} from 'lucide-react';
import Swal from 'sweetalert2';

export const CustomerCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    last_name: '',
    first_name: '',
    phone: '',
    email: '',
    address: '',
    initial_debt: '' as number | string
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullName = `${formData.last_name.trim()} ${formData.first_name.trim()}`.trim();

    if (!fullName) {
      Swal.fire('Attention', 'Veuillez saisir le nom ou prénom du client.', 'warning');
      return;
    }

    const initialDebt = user?.role === 'admin' ? (Number(formData.initial_debt) || 0) : 0;

    setLoading(true);
    try {
      await db.customers.add({
        name: fullName,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        credit_limit: 0,
        current_debt: initialDebt,
        loyalty_points: 0,
        synced: 0
      });

      await Swal.fire({
        icon: 'success',
        title: 'Client enregistré !',
        text: `Le client "${fullName}" a été ajouté avec succès.${
          initialDebt > 0 ? ` Solde initial de dette : ${initialDebt.toLocaleString('fr-FR')} FCFA.` : ''
        }`,
        timer: 2000,
        showConfirmButton: false
      });

      navigate('/customers');
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Une erreur est survenue.', 'error');
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
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">
              Clients & Crédits <span className="mx-1">/</span> <span className="text-slate-600">Nouveau client</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Fiche Nouveau Client</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-blue-50 border border-blue-100 text-xs font-bold text-[#0055b8]">
            <span className="w-2 h-2 rounded-full bg-[#0055b8] animate-pulse" />
            <span>Opérateur : {user?.name || 'Administrateur'}</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
        </div>
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
                placeholder="Ex: Koné ou ETS Diomandé"
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
                placeholder="Ex: Ibrahim ou Amadou"
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
                placeholder="Ex: +225 07 00 00 00 00"
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
                  placeholder="contact@client.com"
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
                  placeholder="Ex: Abidjan, Marcory"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : CRÉDIT & SOLDE INITIAL (ADMIN SEULEMENT) */}
        {user?.role === 'admin' ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">GESTION DES CRÉANCES & DETTES</h2>
                <p className="text-[11px] text-slate-400 font-medium">Solde antérieur et suivi financier</p>
              </div>
            </div>

            {/* Solde initial de dette (si existant) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                Solde initial de dette (si existant)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.initial_debt}
                  onChange={(e) => setFormData({ ...formData, initial_debt: e.target.value })}
                  placeholder="0"
                  className="w-full pl-4 pr-16 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-black font-mono text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                  FCFA
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
                💡 <strong>Information :</strong> Si ce client a un reliquat ou une dette impayée antérieure à l'enregistrement sur le logiciel, renseignez le montant ici. Ce montant sera automatiquement inscrit dans son solde débiteur.
              </p>
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
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{loading ? 'Enregistrement...' : '✓ Enregistrer le Client'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">CRÉATION FICHE CLIENT</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Enregistrement des coordonnées</p>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed space-y-2">
                <p className="font-bold text-slate-800">🔒 Paramètres financiers réservés à la Direction</p>
                <p className="text-[11px] text-slate-500">
                  Le client sera enregistré avec ses coordonnées de contact. Les plafonds de crédit et créances initiales sont gérés exclusivement par l'administrateur.
                </p>
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
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{loading ? 'Enregistrement...' : '✓ Enregistrer le Client'}</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

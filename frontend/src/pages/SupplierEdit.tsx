import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db/db';
import { Building2, ArrowLeft, User, Phone, Mail, MapPin, Check, Hash } from 'lucide-react';
import Swal from 'sweetalert2';

export const SupplierEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    tax_number: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadSupplier();
  }, [id]);

  const loadSupplier = async () => {
    if (!id) {
      navigate('/suppliers');
      return;
    }
    const s = await db.suppliers.get(Number(id));
    if (!s) {
      Swal.fire('Erreur', 'Fournisseur introuvable.', 'error');
      navigate('/suppliers');
      return;
    }

    setFormData({
      name: s.name || '',
      contact_name: s.contact_name || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      tax_number: s.tax_number || '',
      notes: s.notes || ''
    });
    setInitialLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      Swal.fire('Attention', "Veuillez saisir le nom de l'entreprise ou du fournisseur.", 'warning');
      return;
    }

    setLoading(true);
    try {
      await db.suppliers.update(Number(id), {
        name: formData.name.trim(),
        contact_name: formData.contact_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        tax_number: formData.tax_number.trim(),
        notes: formData.notes.trim(),
        synced: 0
      });

      await Swal.fire({
        icon: 'success',
        title: 'Fournisseur mis à jour !',
        text: `Le fournisseur "${formData.name}" a été modifié avec succès.`,
        timer: 1800,
        showConfirmButton: false
      });

      navigate('/suppliers');
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Une erreur est survenue lors de la mise à jour.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0055b8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-150">
      {/* En-tête de la page */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center flex-shrink-0 border border-blue-100 shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <span>Fournisseurs & Partenaires</span>
              <span>/</span>
              <span className="text-slate-600 font-bold">Modifier</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Modifier le Fournisseur & Partenaire</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/suppliers')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-sm transition active:scale-95 self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux fournisseurs</span>
        </button>
      </div>

      {/* Conteneur principal du formulaire */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Colonne de gauche : Aperçu de la fiche partenaire */}
          <div className="lg:col-span-5 bg-slate-50/80 rounded-2xl border border-slate-200/70 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <h3 className="text-[11px] font-black tracking-wider text-slate-400 uppercase">
                APERÇU DE LA FICHE PARTENAIRE
              </h3>

              {/* Carte d'aperçu */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white font-black flex items-center justify-center shadow-md text-base flex-shrink-0">
                    {formData.name.trim() ? formData.name.trim().substring(0, 2).toUpperCase() : <Building2 className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-sm text-slate-900 truncate">
                      {formData.name.trim() || 'Nom de la société'}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium truncate">
                      {formData.contact_name.trim() ? `Contact : ${formData.contact_name.trim()}` : 'Partenaire de réapprovisionnement'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-3.5 h-3.5 text-[#0055b8] flex-shrink-0" />
                    <span className="truncate">{formData.phone.trim() || 'Numéro de téléphone non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-3.5 h-3.5 text-[#0055b8] flex-shrink-0" />
                    <span className="truncate">{formData.email.trim() || 'Email non renseigné'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0055b8] flex-shrink-0" />
                    <span className="truncate">{formData.address.trim() || 'Adresse non renseignée'}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Les coordonnées et données fiscales à jour facilitent l'édition des documents comptables et la gestion des approvisionnements.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100/80 text-[11px] font-semibold text-[#0055b8] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span>Modification en cours</span>
            </div>
          </div>

          {/* Colonne de droite : Champs du formulaire */}
          <div className="lg:col-span-7 space-y-5">
            {/* Nom de l'entreprise */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                NOM DE L'ENTREPRISE / FOURNISSEUR <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Grossiste Agro Alimentaire SARL"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                />
              </div>
            </div>

            {/* Contact & Téléphone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  NOM DU CONTACT / REPRÉSENTANT
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="Ex: M. Jean Dupont"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  NUMÉRO DE TÉLÉPHONE
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ex: +229 97 00 00 00"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* Email & Numéro Fiscal (IFU/NIF) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  ADRESSE EMAIL
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ex: contact@fournisseur.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  NUMÉRO FISCAL (IFU / NIF / RCCM)
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.tax_number}
                    onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                    placeholder="Ex: 3202100000000"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                ADRESSE GÉOGRAPHIQUE / VILLE
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ex: Zone Industrielle, Cotonou, Bénin"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                />
              </div>
            </div>

            {/* Notes & Conditions */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                NOTES & CONDITIONS COMMERCIALES <span className="text-slate-400 font-normal">(optionnelle)</span>
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ex: Délais de livraison habituels (48h), paiement à 30 jours, remises sur volume..."
                className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0055b8] focus:bg-white transition resize-none"
              />
            </div>
          </div>
        </div>

        {/* Boutons d'action en bas */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/suppliers')}
            className="px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{loading ? 'Mise à jour...' : 'Mettre à jour le fournisseur'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

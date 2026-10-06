import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { useAuth } from '../context/AuthContext';
import {
  DollarSign,
  ArrowLeft,
  Building2,
  FileText,
  Check,
  ShieldCheck,
  Hash
} from 'lucide-react';
import Swal from 'sweetalert2';

export const CashRegisterCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    notes: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.code.trim()) {
      Swal.fire('Attention', 'Veuillez saisir le nom et le code du poste de caisse.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await db.cash_registers.add({
        name: formData.name.trim(),
        code: formData.code.trim(),
        notes: formData.notes.trim() || undefined,
        is_active: formData.is_active,
        synced: 0
      });

      await Swal.fire({
        icon: 'success',
        title: 'Caisse enregistrée !',
        text: `Le poste de caisse "${formData.name}" (${formData.code}) a été créé avec succès.`,
        timer: 1800,
        showConfirmButton: false
      });

      navigate('/cash-registers');
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
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">
              Gestion des Caisses <span className="mx-1">/</span> <span className="text-slate-600">Nouveau terminal</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Fiche Nouveau Poste de Caisse</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-blue-50 border border-blue-100 text-xs font-bold text-[#0055b8]">
            <span className="w-2 h-2 rounded-full bg-[#0055b8] animate-pulse" />
            <span>Opérateur : {user?.name || 'Administrateur'}</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/cash-registers')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
        </div>
      </div>

      {/* 2. FORMULAIRE EN 2 COLONNES */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* COLONNE GAUCHE : IDENTIFICATION DU POSTE */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">IDENTIFICATION DU TERMINAL</h2>
              <p className="text-[11px] text-slate-400 font-medium">Nom, code et emplacement physique</p>
            </div>
          </div>

          {/* Ligne 1 : Nom et Code sur la même ligne */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Nom du Poste / Emplacement <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Post1 ou Caisse Principale"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Code Poste / Identifiant <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ex: 20001 ou CAISSE-01"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* Notes / Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Description / Remarques matérielles</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ex: Terminal tactile avec imprimante thermique Epson et tiroir-caisse automatique"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
            />
          </div>
        </div>

        {/* COLONNE DROITE : STATUT & VALIDATION */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">ÉTAT & DISPONIBILITÉ</h2>
              <p className="text-[11px] text-slate-400 font-medium">Activation pour les encaissements TPV</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 rounded-lg text-[#0055b8] focus:ring-[#0055b8] cursor-pointer"
              />
              <label htmlFor="is_active" className="text-xs font-bold text-slate-800 cursor-pointer">
                Poste actif (disponible pour l'ouverture de sessions et les ventes)
              </label>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed pl-8">
              Si ce poste est désactivé, les caissiers ne pourront pas le sélectionner pour ouvrir une session d'encaissement.
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/cash-registers')}
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
              <span>{loading ? 'Création...' : '✓ Enregistrer le Poste'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

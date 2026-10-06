import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { Layers, ArrowLeft, Tag, Check } from 'lucide-react';
import Swal from 'sweetalert2';

const COLOR_PRESETS = [
  '#0056A6', // Bleu GestMAG
  '#0284C7', // Bleu ciel
  '#0D9488', // Turquoise
  '#16A34A', // Vert
  '#EA580C', // Orange
  '#DC2626', // Rouge
  '#7C3AED', // Violet
  '#DB2777', // Rose
  '#334155'  // Ardoise
];

export const CategoryCreate: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#0056A6');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      Swal.fire('Attention', 'Veuillez saisir le nom de la catégorie.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await db.categories.add({
        name: name.trim(),
        description: description.trim(),
        color: color.toUpperCase(),
        synced: 0
      });

      await Swal.fire({
        icon: 'success',
        title: 'Catégorie créée !',
        text: `Le rayon "${name}" a été enregistré avec succès.`,
        timer: 1800,
        showConfirmButton: false
      });

      navigate('/categories');
    } catch (err: any) {
      Swal.fire('Erreur', err.message || "Une erreur est survenue lors de l'enregistrement.", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-150">
      {/* En-tête de la page */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0056A6] flex items-center justify-center flex-shrink-0 border border-blue-100 shadow-sm">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <span>Rayons & Catégories</span>
              <span>/</span>
              <span className="text-slate-600 font-bold">Nouveau</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Ajouter un Rayon & Catégorie</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/categories')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-sm transition active:scale-95 self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux rayons</span>
        </button>
      </div>

      {/* Conteneur principal du formulaire */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Colonne de gauche : Aperçu visuel en caisse */}
          <div className="lg:col-span-5 bg-slate-50/80 rounded-2xl border border-slate-200/70 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <h3 className="text-[11px] font-black tracking-wider text-slate-400 uppercase">
                APERÇU VISUEL EN CAISSE
              </h3>

              {/* Carte d'aperçu tactile */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black shadow-md flex-shrink-0 transition-colors duration-200"
                  style={{ backgroundColor: color }}
                >
                  <Layers className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-sm text-slate-900 truncate">
                    {name.trim() || 'Nom du rayon'}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">Affichage tactile caisse</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                La couleur sélectionnée permet aux caissiers d'identifier immédiatement la famille de produits lors de la vente rapide sur l'écran tactile.
              </p>
            </div>

            {/* Nuances rapides */}
            <div className="space-y-3 pt-4 border-t border-slate-200/60">
              <h4 className="text-[11px] font-black tracking-wider text-slate-400 uppercase">
                NUANCES RAPIDES :
              </h4>
              <div className="flex flex-wrap items-center gap-2.5">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setColor(preset)}
                    className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 shadow-sm border-2 ${
                      color.toUpperCase() === preset.toUpperCase()
                        ? 'border-slate-900 scale-110 ring-2 ring-blue-500/40'
                        : 'border-white'
                    }`}
                    style={{ backgroundColor: preset }}
                    title={preset}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Colonne de droite : Champs du formulaire */}
          <div className="lg:col-span-7 space-y-6">
            {/* Nom du rayon / catégorie */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                NOM DU RAYON / CATÉGORIE <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Boissons & Jus, Épicerie Salée, Boucherie..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0056A6] focus:bg-white transition"
                />
              </div>
            </div>

            {/* Code couleur hexadécimal */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                CODE COULEUR HEXADÉCIMAL
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex items-center">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value.toUpperCase())}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5 bg-white"
                  />
                </div>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value.toUpperCase())}
                  placeholder="#0056A6"
                  maxLength={7}
                  className="w-28 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200 text-xs font-mono font-bold text-slate-800 uppercase focus:outline-none focus:border-[#0056A6] focus:bg-white transition"
                />
                <span className="text-xs text-slate-400 font-medium">
                  Choisissez une couleur ou saisissez un code HEX
                </span>
              </div>
            </div>

            {/* Description du rayon */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                DESCRIPTION DU RAYON <span className="text-slate-400 font-normal">(optionnelle)</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brève description des types d'articles regroupés dans ce rayon..."
                className="w-full px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0056A6] focus:bg-white transition resize-none"
              />
            </div>
          </div>
        </div>

        {/* Boutons d'action en bas */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate('/categories')}
            className="px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0056A6] hover:bg-[#004485] text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{loading ? 'Enregistrement...' : 'Enregistrer la catégorie'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

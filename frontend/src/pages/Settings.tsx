import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import bcrypt from 'bcryptjs';
import { db } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { resizeImage } from '../utils/imageUtils';
import { syncService } from '../db/syncService';
import {
  SlidersHorizontal,
  KeyRound,
  Image as ImageIcon,
  UploadCloud,
  Store,
  Phone,
  Mail,
  MapPin,
  Coins,
  Receipt,
  Save,
  CheckCircle2,
  Trash2,
  Lock,
  X,
  User
} from 'lucide-react';
import Swal from 'sweetalert2';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings: globalSettings, updateSettings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États des paramètres généraux
  const [settings, setSettings] = useState<Record<string, string>>({
    company_name: globalSettings.company_name || 'Supermarché GestMagasin Prestige',
    company_phone: globalSettings.company_phone || '+225 27 22 00 00 00',
    company_email: globalSettings.company_email || 'contact@gestmagasin.com',
    company_address: globalSettings.company_address || 'Boulevard Latrille, Cocody Angré 8e Tranche, Abidjan',
    company_nif: globalSettings.company_nif || 'CI-ABJ-2026-B-12345',
    company_logo: globalSettings.company_logo || '',
    currency: globalSettings.currency || 'FCFA',
    min_stock_alert: globalSettings.min_stock_alert || '10',
    receipt_footer: globalSettings.receipt_footer || 'Merci pour votre visite et à très bientôt !'
  });

  const [saving, setSaving] = useState(false);

  // État Modal Mot de Passe
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [savingPassword, setSavingPassword] = useState(false);

  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      Swal.fire({
        icon: 'warning',
        title: 'Accès Réservé',
        text: 'La configuration des paramètres généraux du magasin est réservée aux administrateurs.',
        confirmButtonColor: '#0055b8'
      });
      navigate('/');
      return;
    }
    // Initialiser les champs une seule fois à l'ouverture de la page pour ne pas écraser la saisie en cours
    if (!isInitializedRef.current && globalSettings && Object.keys(globalSettings).length > 0) {
      setSettings((prev) => ({ ...prev, ...globalSettings }));
      isInitializedRef.current = true;
    }
  }, [globalSettings, user, navigate]);

  // Téléversement et optimisation du logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Fichier trop volumineux', 'Veuillez choisir une image de moins de 5 Mo.', 'warning');
      return;
    }

    try {
      const optimizedLogo = await resizeImage(file, 500, 500, 0.8);
      setSettings((prev) => ({ ...prev, company_logo: optimizedLogo }));
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setSettings((prev) => ({ ...prev, company_logo: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Supprimer le logo actuel
  const handleRemoveLogo = () => {
    setSettings((prev) => ({ ...prev, company_logo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Enregistrement des paramètres généraux
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(settings);

      await Swal.fire({
        icon: 'success',
        title: 'Paramètres enregistrés !',
        text: 'Les informations et l\'identité visuelle du magasin ont été appliquées avec succès.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Impossible d\'enregistrer les paramètres.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Modification du mot de passe utilisateur
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword.length < 4) {
      Swal.fire('Mot de passe court', 'Le mot de passe doit contenir au moins 4 caractères.', 'warning');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Swal.fire('Erreur', 'La confirmation du mot de passe ne correspond pas.', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      if (user?.id) {
        const hashedPassword = bcrypt.hashSync(passwordData.newPassword, 10);
        await db.users.update(user.id, {
          password: hashedPassword,
          synced: 0
        });
      }

      Swal.fire({
        icon: 'success',
        title: 'Mot de passe modifié !',
        text: 'Votre nouveau mot de passe a été enregistré avec succès.',
        timer: 2000,
        showConfirmButton: false
      });

      setIsPasswordModalOpen(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Impossible de modifier le mot de passe.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 pb-16">
      
      {/* 1. BANDEAU EN-TÊTE DE LA CONFIGURATION */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
            <SlidersHorizontal className="w-6 h-6 stroke-[2.2]" />
          </div>

          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-400">
              <span>Système & Administration</span> <span className="mx-1">/</span> <span className="text-slate-600">Configuration</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Paramètres Généraux du Magasin
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Gérez l'identité visuelle, les coordonnées, les mentions de facturation et les règles globales
            </p>
          </div>
        </div>

        {/* Bouton Modifier profil admin */}
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95 self-start sm:self-auto flex-shrink-0"
        >
          <User className="w-4 h-4 text-[#0055b8]" />
          <span>Modifier profil admin</span>
        </button>
      </div>

      {/* 2. FORMULAIRE EN 3 COLONNES */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* COLONNE 1 : IDENTITÉ VISUELLE & LOGO */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col justify-between space-y-5 h-full">
            <div className="space-y-5">
              {/* En-tête de section */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold flex-shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    IDENTITÉ VISUELLE & LOGO
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Logo affiché sur l'application et les tickets
                  </p>
                </div>
              </div>

              {/* Aperçu Actuel */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  APERÇU ACTUEL
                </span>

                <div className="flex items-center justify-center p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 min-h-[140px] relative group">
                  {settings.company_logo ? (
                    <>
                      <img
                        src={settings.company_logo}
                        alt="Logo du Magasin"
                        className="max-h-24 max-w-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute top-2 right-2 p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition shadow-xs"
                        title="Supprimer le logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-center p-2">
                      <img
                        src="./logo.png"
                        alt="Logo GESTiMAG"
                        className="max-h-20 max-w-full object-contain drop-shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="text-[10px] text-slate-400 font-medium">Logo par défaut</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Zone Téléversement */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Téléverser un nouveau logo <span className="text-slate-400 font-normal">(PNG, JPG, SVG, WebP)</span>
                </span>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/svg+xml, image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-slate-200 hover:border-[#0055b8] rounded-2xl bg-slate-50/50 hover:bg-blue-50/30 cursor-pointer transition text-center flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-white group-hover:bg-blue-100 group-hover:text-[#0055b8] text-slate-500 flex items-center justify-center transition shadow-xs">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-[#0055b8]">
                      Cliquez ici ou déposez votre fichier image
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Recommandé : image sur fond transparent pour un rendu optimal
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 italic text-center pt-2">
              Le logo sera intégré automatiquement sur vos reçus thermiques et factures A4.
            </div>
          </div>

          {/* COLONNE 2 : COORDONNÉES DE L'ÉTABLISSEMENT */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col justify-between space-y-5 h-full">
            <div className="space-y-4">
              {/* En-tête de section */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold flex-shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    COORDONNÉES DE L'ÉTABLISSEMENT
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Informations imprimées sur les tickets
                  </p>
                </div>
              </div>

              {/* Nom officiel de l'établissement */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Nom officiel de l'établissement <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={settings.company_name}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    placeholder="Supermarché GestMagasin Prestige"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                  />
                </div>
              </div>

              {/* Numéro de téléphone / WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Numéro de téléphone principal / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={settings.company_phone}
                    onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                    placeholder="+225 27 22 00 00 00"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                  />
                </div>
              </div>

              {/* Adresse e-mail */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Adresse e-mail de contact
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={settings.company_email}
                    onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                    placeholder="contact@gestmagasin.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                  />
                </div>
              </div>

              {/* Adresse géographique */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Adresse géographique / Localisation
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={settings.company_address}
                    onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                    placeholder="Boulevard Latrille, Cocody Angré 8e Tranche, Abidjan"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-500 font-medium">
              Ces coordonnées apparaîtront sur l'en-tête de tous les tickets de caisse remis aux clients.
            </div>
          </div>

          {/* COLONNE 3 : DEVISE, STOCKS & TICKETS */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col justify-between space-y-5 h-full">
            <div className="space-y-5">
              {/* SECTION 1 : DEVISE & RÈGLES DE STOCK */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      DEVISE & RÈGLES DE STOCK
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Unité monétaire et seuils automatiques
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Devise */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Devise monétaire <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.currency}
                      onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                      placeholder="FCFA"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                    />
                  </div>

                  {/* Seuil alerte stock */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Seuil alerte rupture <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        required
                        value={settings.min_stock_alert}
                        onChange={(e) => setSettings({ ...settings, min_stock_alert: e.target.value })}
                        placeholder="10"
                        className="w-full pl-3.5 pr-14 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                        unités
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2 : PERSONNALISATION DES REÇUS / TICKETS */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      PERSONNALISATION DES REÇUS / TICKETS
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Mentions de courtoisie en bas de ticket
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Message de pied de page sur ticket de caisse
                  </label>
                  <textarea
                    rows={3}
                    value={settings.receipt_footer}
                    onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                    placeholder="Merci pour votre visite et à très bientôt !"
                    className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 font-medium text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-100 text-[11px] text-amber-800 font-medium">
              Ce message sera imprimé au bas de chaque ticket remis à vos clients lors du passage en caisse.
            </div>
          </div>

        </div>

        {/* 3. BOUTON D'ENREGISTREMENT GLOBAL */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2.5 px-7 py-3 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Enregistrement...' : 'Enregistrer les Paramètres & le Logo'}</span>
          </button>
        </div>
      </form>

      {/* 4. MODAL MODIFICATION DU MOT DE PASSE */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            
            {/* En-tête Modal */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Modifier mon mot de passe
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sécurisation du compte utilisateur
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps Modal */}
            <form onSubmit={handleSavePassword} className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Nouveau mot de passe <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Confirmer le nouveau mot de passe <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2.5 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
                >
                  {savingPassword ? 'Modification...' : 'Enregistrer'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../db/db';
import {
  User,
  SlidersHorizontal,
  Mail,
  Phone,
  MapPin,
  Lock,
  Key,
  CheckCheck,
  Shield,
  Save,
  Eye,
  EyeOff,
  CheckCircle2
} from 'lucide-react';
import Swal from 'sweetalert2';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  // Décomposition du nom en nom et prénoms
  const initialNameParts = (user?.name || '').trim().split(' ');
  const initialLastName = initialNameParts[0] || '';
  const initialFirstName = initialNameParts.slice(1).join(' ') || '';

  const [lastName, setLastName] = useState(initialLastName);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState((user as any)?.address || 'Plateau, Abidjan');

  // Champs de sécurité / mot de passe
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Toggles visibilité mots de passe
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      const parts = (user.name || '').trim().split(' ');
      setLastName(parts[0] || '');
      setFirstName(parts.slice(1).join(' ') || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      if ((user as any).address) setAddress((user as any).address);
    }
  }, [user]);

  // Initiales de l'utilisateur
  const getInitials = () => {
    const fn = firstName ? firstName.charAt(0).toUpperCase() : '';
    const ln = lastName ? lastName.charAt(0).toUpperCase() : '';
    return fn && ln ? `${fn}${ln}` : (user?.name?.slice(0, 2).toUpperCase() || 'AD');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lastName.trim()) {
      Swal.fire('Champ requis', 'Veuillez renseigner votre nom de famille.', 'warning');
      return;
    }

    if (!email.trim()) {
      Swal.fire('Champ requis', 'Veuillez renseigner votre adresse e-mail.', 'warning');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        Swal.fire('Mot de passe court', 'Le nouveau mot de passe doit comporter au moins 6 caractères.', 'warning');
        return;
      }
      if (newPassword !== confirmPassword) {
        Swal.fire('Erreur de confirmation', 'Le nouveau mot de passe et sa confirmation ne correspondent pas.', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const fullName = `${lastName.trim()} ${firstName.trim()}`.trim();

      const payload: any = {
        name: fullName,
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim()
      };

      if (newPassword) {
        payload.password = newPassword;
      }

      await updateUser(payload);

      await Swal.fire({
        icon: 'success',
        title: 'Profil Administrateur Actualisé !',
        text: 'Vos coordonnées et vos paramètres de sécurité ont été mis à jour avec succès.',
        timer: 2000,
        showConfirmButton: false
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Impossible de mettre à jour le profil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 pb-16">
      
      {/* 1. BANDEAU SUPÉRIEUR : IDENTITÉ DE L'ADMINISTRATEUR */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Avatar avec initiales */}
          <div className="w-14 h-14 rounded-2xl bg-[#0055b8] text-white flex items-center justify-center font-black text-xl flex-shrink-0 shadow-md shadow-blue-500/20 tracking-wider">
            {getInitials()}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-[#7c3aed] uppercase tracking-wider border border-purple-100">
                {user?.role ? user.role.toUpperCase() : 'ADMIN'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Compte Actif</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {lastName} {firstName}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              {email}
            </p>
          </div>
        </div>

        {/* Bouton Paramètres Magasin (Admin Uniquement) */}
        {user?.role === 'admin' && (
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95 self-start sm:self-auto flex-shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>Paramètres Magasin</span>
          </button>
        )}
      </div>

      {/* 2. FORMULAIRE EN 2 COLONNES (INFORMATIONS PERSONNELLES & SÉCURITÉ) */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          {/* COLONNE 1 : INFORMATIONS PERSONNELLES */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col justify-between space-y-5 h-full">
            <div className="space-y-4">
              {/* En-tête de section */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    INFORMATIONS PERSONNELLES
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Vos coordonnées et identifiants de compte
                  </p>
                </div>
              </div>

              {/* Ligne 1 : Nom de famille * & Prénom(s) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Nom de famille <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Directeur"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Prénom(s)
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alain"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                  />
                </div>
              </div>

              {/* Ligne 2 : Adresse E-mail * & Téléphone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Adresse E-mail (Identifiant de connexion) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@gestmagasin.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Numéro de téléphone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+225 07 00 00 01"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                    />
                  </div>
                </div>
              </div>

              {/* Ligne 3 : Adresse géographique / Domicile */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Adresse géographique / Domicile
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Plateau, Abidjan"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-500 font-medium">
              Ces informations vous identifient en tant qu'administrateur lors de vos opérations sur le système.
            </div>
          </div>

          {/* COLONNE 2 : SÉCURITÉ & MODIFICATION DU MOT DE PASSE */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col justify-between space-y-5 h-full">
            <div className="space-y-4">
              {/* En-tête de section */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    SÉCURITÉ & MODIFICATION DU MOT DE PASSE
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Laissez ces champs vides si vous ne souhaitez pas modifier votre mot de passe
                  </p>
                </div>
              </div>

              {/* Mot de passe actuel */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Nouveau mot de passe & Confirmation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nouveau mot de passe */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 caractères"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmer le mot de passe */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <CheckCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Répétez le mot de passe"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-100 text-[11px] text-amber-800 font-medium">
              Pour des raisons de sécurité, choisissez un mot de passe robuste combinant lettres et chiffres.
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
            <span>{saving ? 'Enregistrement...' : 'Enregistrer les Modifications du Profil'}</span>
          </button>
        </div>
      </form>

    </div>
  );
};

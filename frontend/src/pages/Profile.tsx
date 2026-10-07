import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  Camera,
  Trash2,
  Upload
} from 'lucide-react';
import Swal from 'sweetalert2';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Décomposition du nom en nom et prénoms
  const initialNameParts = (user?.name || '').trim().split(' ');
  const initialLastName = initialNameParts[0] || '';
  const initialFirstName = initialNameParts.slice(1).join(' ') || '';

  const [lastName, setLastName] = useState(initialLastName);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState((user as any)?.address || 'Plateau, Abidjan');
  const [avatar, setAvatar] = useState(user?.avatar || '');

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
      setAvatar(user.avatar || '');
      if ((user as any).address) setAddress((user as any).address);
    }
  }, [user]);

  // Initiales de l'utilisateur
  const getInitials = () => {
    const fn = firstName ? firstName.charAt(0).toUpperCase() : '';
    const ln = lastName ? lastName.charAt(0).toUpperCase() : '';
    return fn && ln ? `${fn}${ln}` : (user?.name?.slice(0, 2).toUpperCase() || 'U');
  };

  // Téléversement et compression de la photo de profil
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Fichier trop volumineux', 'Veuillez sélectionner une image de moins de 5 Mo.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatar(compressedDataUrl);
        } else {
          setAvatar(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lastName.trim()) {
      Swal.fire('Champ requis', 'Veuillez renseigner votre nom de famille.', 'warning');
      return;
    }

    if (!email.trim() && user?.role === 'admin') {
      Swal.fire('Champ requis', 'Veuillez renseigner votre adresse e-mail.', 'warning');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 4) {
        Swal.fire('Mot de passe court', 'Le nouveau mot de passe doit comporter au moins 4 caractères.', 'warning');
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
        email: email.trim() || `${phone.trim() || 'user'}@gestmag.local`,
        phone: phone.trim(),
        address: address.trim(),
        avatar: avatar || undefined
      };

      if (newPassword) {
        payload.password = newPassword;
      }

      await updateUser(payload);

      // Tenter la synchronisation en arrière-plan vers MySQL si disponible
      try {
        const { syncService } = await import('../db/syncService');
        syncService.pushToRemote().catch(() => {});
      } catch {}

      await Swal.fire({
        icon: 'success',
        title: 'Profil Actualisé !',
        text: 'Votre photo, vos coordonnées et vos paramètres ont été mis à jour avec succès.',
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
      
      {/* 1. BANDEAU SUPÉRIEUR : IDENTITÉ & PHOTO DE PROFIL */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          
          {/* Avatar avec badge de modification photo */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-3xl bg-[#0055b8] text-white flex items-center justify-center font-black text-2xl flex-shrink-0 shadow-lg shadow-blue-500/20 tracking-wider overflow-hidden border-2 border-white ring-2 ring-blue-100">
              {avatar ? (
                <img src={avatar} alt="Photo de profil" className="w-full h-full object-cover" />
              ) : (
                getInitials()
              )}
            </div>

            {/* Bouton déclencheur caméra */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-2 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white shadow-md border-2 border-white transition active:scale-95 flex items-center justify-center"
              title="Changer ma photo de profil"
            >
              <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            {/* Input file caché */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-[#0055b8] uppercase tracking-wider border border-blue-100">
                {user?.role ? user.role.toUpperCase() : 'UTILISATEUR'}
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
              {email || phone || 'Identifiant actif'}
            </p>

            {/* Boutons d'actions rapides photo */}
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0055b8] text-[11px] font-bold transition active:scale-95"
              >
                <Upload className="w-3 h-3" />
                <span>{avatar ? 'Changer de photo' : 'Ajouter une photo'}</span>
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold transition active:scale-95"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Retirer</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bouton Paramètres Magasin (Admin Uniquement) */}
        {user?.role === 'admin' && (
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95 self-center sm:self-auto flex-shrink-0"
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

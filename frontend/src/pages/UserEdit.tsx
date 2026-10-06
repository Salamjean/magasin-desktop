import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import bcrypt from 'bcryptjs';
import { db, User } from '../db/db';
import { syncService } from '../db/syncService';
import {
  ArrowLeft,
  User as UserIcon,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  MapPin,
  Camera,
  ShieldCheck,
  Check,
  IdCard,
  Edit2
} from 'lucide-react';
import Swal from 'sweetalert2';

export const UserEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    email: '',
    role: 'caissier' as User['role'],
    active: true,
    password: '',
    confirmPassword: '',
    address: ''
  });

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    if (!id) return;
    try {
      const u = await db.users.get(Number(id));
      if (!u) {
        Swal.fire('Introuvable', 'Cet employé est introuvable.', 'error');
        navigate('/users');
        return;
      }

      // Découpage du nom complet en nom de famille et prénom
      const nameParts = (u.name || '').trim().split(' ');
      const lastName = nameParts[0] || '';
      const firstName = nameParts.slice(1).join(' ') || '';

      setFormData({
        lastName,
        firstName,
        phone: u.phone || '',
        email: u.email.endsWith('@gestmag.local') ? '' : u.email,
        role: u.role,
        active: u.active,
        password: '',
        confirmPassword: '',
        address: ''
      });
      if (u.avatar) {
        setPhotoPreview(u.avatar);
      }
      setLoading(false);
    } catch (err: any) {
      Swal.fire('Erreur', err.message, 'error');
      navigate('/users');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire({
          icon: 'error',
          title: 'Image trop volumineuse',
          text: 'La taille maximale acceptée est de 2 Mo.',
          timer: 2500,
          showConfirmButton: false
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!formData.lastName.trim()) {
      Swal.fire('Champ requis', 'Veuillez saisir le nom de famille.', 'warning');
      return;
    }

    if (!formData.phone.trim()) {
      Swal.fire('Champ requis', 'Veuillez saisir le numéro de téléphone (identifiant).', 'warning');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      Swal.fire('Erreur mot de passe', 'Les mots de passe ne correspondent pas.', 'error');
      return;
    }

    const fullName = formData.firstName.trim()
      ? `${formData.lastName.trim()} ${formData.firstName.trim()}`
      : formData.lastName.trim();

    try {
      const updatePayload: Partial<User> = {
        name: fullName,
        email: formData.email.trim() || `${formData.phone.replace(/[^0-9]/g, '')}@gestmag.local`,
        role: formData.role,
        phone: formData.phone.trim(),
        avatar: photoPreview || undefined,
        active: formData.active,
        synced: 0
      };

      if (formData.password.trim()) {
        updatePayload.password = bcrypt.hashSync(formData.password.trim(), 10);
      }

      await db.users.update(Number(id), updatePayload);

      // Synchronisation immédiate vers MySQL
      syncService.pushToRemote().catch((e) => console.warn('Sync error:', e));

      await Swal.fire({
        icon: 'success',
        title: 'Modifications enregistrées !',
        text: `Le profil de ${fullName} a été mis à jour avec succès.`,
        timer: 2000,
        showConfirmButton: false
      });

      navigate('/users');
    } catch (err: any) {
      Swal.fire('Erreur lors de la mise à jour', err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0055b8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* En-tête supérieur avec Breadcrumb et Retour */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Fil d'Ariane */}
          <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
            <Link to="/users" className="hover:text-[#0055b8] transition">
              Utilisateurs
            </Link>
            <span className="text-slate-300 font-bold">&gt;</span>
            <span className="text-slate-800 font-bold">Modifier l'employé</span>
          </div>

          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Modifier le compte de {formData.lastName} {formData.firstName}</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Mettez à jour les accès, coordonnées et permissions de l'employé.
          </p>
        </div>

        <Link
          to="/users"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition shadow-sm self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la liste</span>
        </Link>
      </div>

      {/* Formulaire Principal en 2 Colonnes */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonne Gauche : Photo de profil & Règles */}
        <div className="lg:col-span-4 space-y-6">
          {/* Bloc Photo de profil */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle flex flex-col items-center text-center space-y-4">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              PHOTO DE PROFIL
            </span>

            {/* Zone d'avatar */}
            <div className="relative">
              <div className="w-36 h-36 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/70 flex flex-col items-center justify-center overflow-hidden">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Aperçu du profil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-300">
                    <UserIcon className="w-14 h-14" />
                    <span className="text-[11px] font-semibold text-slate-400 mt-1">
                      Aucune photo
                    </span>
                  </div>
                )}
              </div>

              {/* Bouton Caméra */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-2xl bg-[#0055b8] text-white flex items-center justify-center shadow-md shadow-blue-500/30 hover:scale-105 transition"
                title="Prendre / Choisir une photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Formats acceptés : <strong className="text-slate-700">JPG, PNG</strong>
              <br />
              Taille max : <strong className="text-slate-700">2 Mo</strong>
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition shadow-sm"
            >
              Changer l'image
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Bloc Règles de Connexion */}
          <div className="bg-blue-50/60 rounded-3xl border border-blue-100 p-5 shadow-subtle space-y-2">
            <div className="flex items-center gap-2 text-[#0055b8] font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-[#0055b8]" />
              <span>Règles de connexion</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              L'employé utilise son numéro de téléphone et son mot de passe pour accéder à son poste sur l'application.
            </p>
          </div>
        </div>

        {/* Colonne Droite : Formulaire d'informations */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-subtle flex flex-col justify-between">
          <div className="space-y-6">
            {/* Titre de section */}
            <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold flex-shrink-0">
                <IdCard className="w-5 h-5 text-[#0055b8]" />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-black text-slate-900">
                  Informations personnelles & Connexion
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Modifiez les données avec précision
                </p>
              </div>
            </div>

            {/* Grille des Champs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nom de famille */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nom de famille <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Ex: Kouassi"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Prénom(s) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Prénom(s)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Ex: Jean-Marc"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Téléphone (Identifiant) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Téléphone (Identifiant) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    Obligatoire
                  </span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+225 07 00 00 00"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Adresse Email */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Adresse Email</label>
                  <span className="text-[10px] font-medium text-slate-400">Optionnel</span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="employe@gmail.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Rôle attribué */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Rôle attribué <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0055b8] focus:bg-white transition cursor-pointer appearance-none"
                  >
                    <option value="caissier">Caissier — (Ventes & Caisse TPV)</option>
                    <option value="magasinier">Magasinier — (Stock & Réceptions)</option>
                    <option value="livreur">Livreur — (Courses & Livraisons OTP)</option>
                  </select>
                </div>
              </div>

              {/* Statut du compte */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Statut du compte <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {formData.active ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    )}
                  </div>
                  <select
                    value={formData.active ? 'active' : 'blocked'}
                    onChange={(e) => setFormData({ ...formData, active: e.target.value === 'active' })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0055b8] focus:bg-white transition cursor-pointer appearance-none"
                  >
                    <option value="active">Actif (Accès autorisé)</option>
                    <option value="blocked">Bloqué (Accès refusé)</option>
                  </select>
                </div>
              </div>

              {/* Nouveau Mot de passe */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Nouveau mot de passe</label>
                  <span className="text-[10px] font-medium text-slate-400">Laisser vide pour ne pas changer</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmer le nouveau mot de passe */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Confirmer le mot de passe</label>
                  <span className="text-[10px] font-medium text-slate-400">Si mot de passe modifié</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Répéter le mot de passe"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Adresse géographique / Domicile */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Adresse géographique / Domicile
                  </label>
                  <span className="text-[10px] font-medium text-slate-400">Optionnel</span>
                </div>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Commune, quartier, indications..."
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0055b8] focus:bg-white transition resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pied du formulaire avec Boutons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
            <Link
              to="/users"
              className="px-6 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
            >
              Annuler
            </Link>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all active:scale-95 hover:shadow-xl hover:shadow-blue-500/30"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer les modifications</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db, User } from '../db/db';
import { syncService } from '../db/syncService';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Search,
  Users,
  Lock,
  Unlock,
  Eye
} from 'lucide-react';
import Swal from 'sweetalert2';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const list = await db.users.toArray();
    // Exclure les comptes administrateurs de la liste des employés
    setUsers(list.filter((u) => u.role !== 'admin'));
  };

  const handleToggleActive = async (u: User) => {
    if (!u.id) return;
    if (u.id === currentUser?.id) {
      Swal.fire({
        icon: 'warning',
        title: 'Action impossible',
        text: 'Vous ne pouvez pas bloquer votre propre compte connecté.',
        timer: 2500,
        showConfirmButton: false
      });
      return;
    }

    const nextActive = !u.active;
    const actionText = nextActive ? 'débloquer' : 'bloquer';

    const res = await Swal.fire({
      title: `${nextActive ? 'Débloquer' : 'Bloquer'} l'accès ?`,
      text: `Voulez-vous vraiment ${actionText} le compte de ${u.name} ?`,
      icon: nextActive ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: nextActive ? '#0055b8' : '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: nextActive ? 'Oui, débloquer' : 'Oui, bloquer',
      cancelButtonText: 'Annuler'
    });

    if (res.isConfirmed) {
      await db.users.update(u.id, { active: nextActive, synced: 0 });

      // Synchronisation immédiate vers MySQL
      syncService.pushToRemote().catch((e) => console.warn('Sync error:', e));

      Swal.fire({
        icon: nextActive ? 'success' : 'info',
        title: nextActive ? 'Compte débloqué !' : 'Compte bloqué !',
        text: nextActive ? `L'accès pour ${u.name} a été réactivé.` : `L'accès pour ${u.name} a été suspendu.`,
        timer: 1800,
        showConfirmButton: false
      });
      loadData();
    }
  };

  const handleDelete = async (u: User) => {
    if (!u.id) return;
    if (u.id === currentUser?.id) {
      Swal.fire({
        icon: 'warning',
        title: 'Action impossible',
        text: 'Vous ne pouvez pas supprimer votre propre compte.',
        timer: 2500,
        showConfirmButton: false
      });
      return;
    }

    const res = await Swal.fire({
      title: `Supprimer ${u.name} ?`,
      text: "Cette action supprimera définitivement le compte de cet utilisateur.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    });

    if (res.isConfirmed) {
      await db.users.delete(u.id);
      Swal.fire({
        icon: 'success',
        title: 'Utilisateur supprimé !',
        text: `Le compte de ${u.name} a été supprimé.`,
        timer: 1800,
        showConfirmButton: false
      });
      loadData();
    }
  };

  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);

  // Statistiques calculées uniquement sur les employés
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.active).length;
  const blockedCount = users.filter((u) => !u.active).length;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone || '').includes(searchQuery) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'active') return u.active;
    if (statusFilter === 'blocked') return !u.active;
    return true;
  });

  const getRoleBadge = (role: User['role']) => {
    switch (role) {
      case 'caissier':
        return { label: 'Caissier (TPV)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'magasinier':
        return { label: 'Magasinier', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'livreur':
        return { label: 'Livreur', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: role, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const getRoleDescription = (role: User['role']) => {
    switch (role) {
      case 'caissier':
        return 'Accès au TPV, sessions de caisse, encaissements et tickets clients.';
      case 'magasinier':
        return 'Gestion des stocks, inventaires, alertes de réapprovisionnement et réceptions.';
      case 'livreur':
        return 'Suivi des courses, livraisons clients et validation par code OTP.';
      default:
        return 'Accès standard aux fonctionnalités définies.';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Banner Haut de Gamme */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Comptes Utilisateurs & Rôles
              </h1>
              <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-[#0055b8] border border-blue-200/70">
                Sécurité & Droits
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 font-medium">
              Gestion des accès, permissions et collaborateurs du magasin
            </p>
          </div>
        </div>

        <Link
          to="/users/new"
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 self-start sm:self-auto flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvel Utilisateur</span>
        </Link>
      </div>

      {/* Barre de Recherche et Statistiques Intégrées sur la Même Ligne */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Champ de recherche */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, email, téléphone ou rôle..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-primary-500 transition"
          />
        </div>

        {/* Statistiques / Filtres rapides */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Total */}
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Total :</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-mono ${
              statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
            }`}>
              {totalCount}
            </span>
          </button>

          {/* Actifs */}
          <button
            onClick={() => setStatusFilter('active')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200/70 hover:bg-emerald-100/70'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Actifs :</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-mono ${
              statusFilter === 'active' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-800'
            }`}>
              {activeCount}
            </span>
          </button>

          {/* Bloqués / Inactifs */}
          <button
            onClick={() => setStatusFilter('blocked')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              statusFilter === 'blocked'
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                : 'bg-rose-50 text-rose-700 border-rose-200/70 hover:bg-rose-100/70'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Bloqués :</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[11px] font-mono ${
              statusFilter === 'blocked' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-800'
            }`}>
              {blockedCount}
            </span>
          </button>
        </div>
      </div>

      {/* Tableau des utilisateurs */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Collaborateur</th>
                <th className="px-5 py-3.5">Téléphone / Contact</th>
                <th className="px-5 py-3.5">Rôle & Permissions</th>
                <th className="px-5 py-3.5 text-center">Statut</th>
                <th className="px-5 py-3.5 text-center">Actions & Sécurité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                    Aucun employé ne correspond aux critères
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const badge = getRoleBadge(u.role);
                  const isCurrent = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-9 h-9 rounded-xl object-cover shadow-sm flex-shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-[#0055b8] text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-semibold">
                                  Vous
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">
                        {u.phone || 'Non renseigné'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {u.active ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Actif
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1 text-[10px] font-bold">
                            <Lock className="w-3 h-3 text-rose-500" /> Bloqué
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Bouton Moderne Bloquer / Débloquer */}
                          {!isCurrent && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`px-3 py-1 rounded-xl font-bold text-[11px] inline-flex items-center gap-1.5 transition active:scale-95 shadow-sm border ${
                                u.active
                                  ? 'bg-rose-50 hover:bg-rose-100/90 text-rose-700 border-rose-200/80 hover:border-rose-300'
                                  : 'bg-emerald-50 hover:bg-emerald-100/90 text-emerald-700 border-emerald-200/80 hover:border-emerald-300'
                              }`}
                              title={u.active ? 'Bloquer cet utilisateur' : 'Débloquer cet utilisateur'}
                            >
                              {u.active ? (
                                <>
                                  <Lock className="w-3 h-3 text-rose-500" />
                                  <span>Bloquer</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3 h-3 text-emerald-600" />
                                  <span>Débloquer</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Bouton Voir les Détails */}
                          <button
                            onClick={() => setSelectedUserForDetails(u)}
                            className="p-1.5 text-slate-500 hover:text-[#0055b8] hover:bg-blue-50 rounded-xl transition border border-transparent hover:border-blue-200"
                            title="Voir les détails de l'employé"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Bouton Modifier vers la page dédiée /users/edit/:id */}
                          <Link
                            to={`/users/edit/${u.id}`}
                            className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-xl transition border border-transparent hover:border-slate-200"
                            title="Modifier les informations"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Fiche Détails Collaborateur */}
      {selectedUserForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            {/* Header du Modal */}
            <div className="p-5 bg-gradient-to-r from-[#0055b8] to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-200" />
                <h3 className="font-bold text-sm">Fiche de l'Employé</h3>
              </div>
              <button
                onClick={() => setSelectedUserForDetails(null)}
                className="p-1.5 text-blue-200 hover:text-white rounded-full hover:bg-white/10 transition"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps du Modal */}
            <div className="p-6 space-y-5">
              {/* Profil & Avatar */}
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                {selectedUserForDetails.avatar ? (
                  <img
                    src={selectedUserForDetails.avatar}
                    alt={selectedUserForDetails.name}
                    className="w-16 h-16 rounded-2xl object-cover shadow-lg shadow-blue-500/20 flex-shrink-0 border border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-blue-500/25 flex-shrink-0">
                    {selectedUserForDetails.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-900">
                    {selectedUserForDetails.name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(selectedUserForDetails.role).bg}`}>
                      {getRoleBadge(selectedUserForDetails.role).label}
                    </span>
                    {selectedUserForDetails.active ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Actif
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Bloqué
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Informations détaillées */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold">Identifiant (Téléphone) :</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedUserForDetails.phone || 'Non renseigné'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold">Email :</span>
                  <span className="font-bold text-slate-800 truncate max-w-[200px]">
                    {selectedUserForDetails.email.endsWith('@gestmag.local') ? 'Non renseigné' : selectedUserForDetails.email}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                  <span className="text-[11px] font-bold text-[#0055b8] uppercase tracking-wider block">
                    Permissions accordées
                  </span>
                  <p className="text-xs text-slate-600 font-normal leading-relaxed">
                    {getRoleDescription(selectedUserForDetails.role)}
                  </p>
                </div>
              </div>

              {/* Boutons d'action du Modal */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUserForDetails(null)}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Fermer
                </button>
                <Link
                  to={`/users/edit/${selectedUserForDetails.id}`}
                  className="px-5 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Modifier ce compte</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

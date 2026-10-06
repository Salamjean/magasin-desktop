import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Delivery, User } from '../db/db';
import { useAuth } from '../context/AuthContext';
import {
  Bike,
  Plus,
  Search,
  Phone,
  MapPin,
  X,
  Eye,
  Trash2,
  Package,
  Calendar,
  DollarSign,
  UserCheck,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Swal from 'sweetalert2';

export const Deliveries: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [livreurs, setLivreurs] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal Détails de la livraison
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let list = await db.deliveries.reverse().toArray();
      if (list.length === 0) {
        const defaultDeliveries: Delivery[] = [
          {
            customer_name: 'Fatoumata Diallo',
            customer_phone: '+225 05 55 44 33 22',
            delivery_address: 'Riviera Palmeraie, Rue Ministre',
            amount_to_collect: 2300,
            livreur_id: user?.id || 4,
            status: 'pending',
            otp_code: '4589',
            notes: 'Appeler dès arrivée devant le portail vert.',
            items_json: JSON.stringify([
              { product_name: 'Eau Minérale Awa 1.5L', quantity: 4, unit_price: 400, total: 1600 },
              { product_name: 'Biscuits Oreo 154g', quantity: 1, unit_price: 700, total: 700 }
            ]),
            delivery_type: 'sale',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            synced: 1
          },
          {
            customer_name: 'Fatoumata Diallo',
            customer_phone: '+225 05 55 44 33 22',
            delivery_address: 'Riviera Palmeraie, Rue Ministre, Villa 12B Abidjan',
            amount_to_collect: 25500,
            livreur_id: user?.id || 4,
            status: 'in_transit',
            otp_code: '8821',
            notes: 'Appeler dès arrivée devant le portail vert.',
            items_json: JSON.stringify([
              { product_name: 'Riz Parfumé Dinor 5kg', quantity: 4, unit_price: 5500, total: 22000 },
              { product_name: 'Savon de Toilette Lux 100g', quantity: 7, unit_price: 500, total: 3500 }
            ]),
            delivery_type: 'sale',
            created_at: new Date(Date.now() - 7200000).toISOString(),
            synced: 1
          },
          {
            customer_name: "Clarisse N'Guessan",
            customer_phone: '+225 07 12 34 56 78',
            delivery_address: 'Marcory Zone 4, Rue du 7 Décembre, Immeuble Horizon',
            amount_to_collect: 18400,
            livreur_id: user?.id || 4,
            status: 'pending',
            otp_code: '9012',
            notes: 'Livrer au 2ème étage.',
            items_json: JSON.stringify([
              { product_name: 'Huile Végétale Dinor 1L', quantity: 8, unit_price: 1400, total: 11200 },
              { product_name: 'Coca-Cola 33cl (Canette)', quantity: 12, unit_price: 600, total: 7200 }
            ]),
            delivery_type: 'sale',
            created_at: new Date(Date.now() - 10800000).toISOString(),
            synced: 1
          }
        ];

        for (const d of defaultDeliveries) {
          const insertedId = await db.deliveries.add(d);
          d.id = insertedId;
        }
        list = await db.deliveries.reverse().toArray();
      }

      const livs = await db.users.where('role').equals('livreur').toArray();
      const allUsers = await db.users.toArray();

      setDeliveries(list);
      setLivreurs(livs.length > 0 ? livs : allUsers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Suppression d'un ordre de livraison
  const handleDeleteDelivery = async (delivery: Delivery) => {
    if (!delivery.id) return;

    const confirm = await Swal.fire({
      title: 'Supprimer cet ordre de livraison ?',
      html: `
        <div class="text-left text-xs space-y-2 p-2">
          <p><strong>Réf :</strong> #LIV-${delivery.id}</p>
          <p><strong>Destinataire :</strong> ${delivery.customer_name}</p>
          <p><strong>Adresse :</strong> ${delivery.delivery_address}</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#e11d48'
    });

    if (confirm.isConfirmed) {
      await db.deliveries.delete(delivery.id);
      Swal.fire({
        icon: 'success',
        title: 'Livraison supprimée !',
        timer: 1800,
        showConfirmButton: false
      });
      loadData();
    }
  };

  // Ouverture du modal de détails
  const handleOpenDetails = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setIsDetailModalOpen(true);
  };

  // Filtre statut livreur
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filtrage des livraisons
  const filteredDeliveries = deliveries.filter((d) => {
    if (user?.role === 'livreur') {
      const matchUser = !d.livreur_id || d.livreur_id === user.id || user?.role === 'livreur';
      if (!matchUser) return false;
      if (statusFilter !== 'all') {
        return d.status === statusFilter;
      }
      return true;
    }
    const liv = livreurs.find((l) => l.id === d.livreur_id);
    const q = searchQuery.toLowerCase().trim();
    return (
      d.customer_name.toLowerCase().includes(q) ||
      d.customer_phone.includes(q) ||
      d.delivery_address.toLowerCase().includes(q) ||
      `#liv-${d.id}`.includes(q) ||
      (liv && liv.name.toLowerCase().includes(q))
    );
  });

  // Parser les items JSON du colis
  const getDeliveryItems = (delivery: Delivery): any[] => {
    if (!delivery.items_json) return [];
    try {
      return JSON.parse(delivery.items_json);
    } catch {
      return [];
    }
  };

  // VUE SPÉCIFIQUE LIVREUR : JOURNAL DES LIVRAISONS
  if (user?.role === 'livreur') {
    return (
      <div className="w-full space-y-6 animate-in fade-in duration-150 pb-16">
        {/* 1. EN-TÊTE JOURNAL DES LIVRAISONS (CONFORME À L'IMAGE) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center border border-blue-100 flex-shrink-0">
              <Package className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Journal des Livraisons
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Historique et gestion complète de toutes vos courses assignées.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-xs transition active:scale-95 self-start sm:self-auto"
          >
            <Bike className="w-4 h-4 text-slate-500" />
            <span>Tableau de bord</span>
          </button>
        </div>

        {/* 2. BARRE DE FILTRES EN PILULES (TOUTES, À DÉMARRER, EN ROUTE, LIVRÉES, ÉCHECS) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'Toutes' },
            { key: 'pending', label: 'À Démarrer' },
            { key: 'in_transit', label: 'En Route' },
            { key: 'delivered', label: 'Livrées' },
            { key: 'cancelled', label: 'Échecs' }
          ].map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-5 py-2 rounded-full font-bold text-xs transition active:scale-95 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0055b8] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 3. GRILLE DE CARTES DE LIVRAISON EN 5 COLONNES COMPACTES */}
        {filteredDeliveries.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-medium">
            <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>Aucune course correspondant à ce filtre pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredDeliveries.map((d) => {
              const isPending = d.status === 'pending';
              const isInTransit = d.status === 'in_transit';
              const isDelivered = d.status === 'delivered';
              const isFailed = d.status === 'cancelled';

              const timeStr = d.created_at
                ? new Date(d.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit'
                  }) + ' ' + new Date(d.created_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : '06/10 13:04';

              const courseCode = `LIV-${d.created_at ? d.created_at.substring(0, 10).replace(/-/g, '') : '20261006'}-${String(d.id).padStart(4, '0')}`;

              return (
                <div
                  key={d.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col justify-between hover:shadow-md transition space-y-3"
                >
                  {/* LIGNE 1 : N° COURSE & BADGE STATUT */}
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono font-black text-[11px] text-slate-900 tracking-tight truncate">
                      {courseCode}
                    </span>
                    {isPending && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wide flex-shrink-0">
                        À DÉMARRER
                      </span>
                    )}
                    {isInTransit && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-[#0055b8] border border-blue-200 uppercase tracking-wide flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0055b8] animate-pulse" />
                        <span>EN ROUTE</span>
                      </span>
                    )}
                    {isDelivered && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide flex-shrink-0">
                        LIVRÉE
                      </span>
                    )}
                    {isFailed && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wide flex-shrink-0">
                        ÉCHEC
                      </span>
                    )}
                  </div>

                  {/* LIGNE 2 : DESTINATAIRE & BOUTON TÉLÉPHONE */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-slate-400 text-xs">👤</span>
                      <span className="font-bold text-[11px] text-slate-900 truncate">
                        {d.customer_name}
                      </span>
                    </div>
                    {d.customer_phone && (
                      <a
                        href={`tel:${d.customer_phone}`}
                        className="w-6 h-6 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 transition flex-shrink-0 shadow-2xs"
                        title={`Appeler ${d.customer_phone}`}
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* LIGNE 3 : ENCADRÉ ADRESSE */}
                  <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-100 text-slate-600 text-[10px] font-medium min-h-[38px] flex items-center">
                    <p className="line-clamp-2">{d.delivery_address || 'Adresse standard'}</p>
                  </div>

                  {/* LIGNE 4 : À ENCAISSER */}
                  <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                      À ENCAISSER :
                    </span>
                    <span className="font-black text-emerald-700 text-xs">
                      {(d.amount_to_collect || 0).toLocaleString('fr-FR')} F
                    </span>
                  </div>

                  {/* LIGNE 5 : PIED (HEURE & BOUTON FICHE) */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400 font-medium">
                      {timeStr}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/deliveries/view/${d.id}`)}
                      className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs transition active:scale-95 flex-shrink-0"
                    >
                      <span>Fiche</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL DÉTAILS LIVRAISON */}
        {isDetailModalOpen && selectedDelivery && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">
                      Détails de la course #LIV-{selectedDelivery.id}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Informations d'expédition et articles
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Destinataire */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Client & Destinataire
                  </span>
                  <p className="font-black text-slate-900 text-sm">{selectedDelivery.customer_name}</p>
                  <p className="text-xs font-semibold text-[#0055b8] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    <a href={`tel:${selectedDelivery.customer_phone}`} className="hover:underline">
                      {selectedDelivery.customer_phone}
                    </a>
                  </p>
                </div>

                {/* Adresse & Consignes */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Adresse / Repère
                    </span>
                    <p className="text-xs font-semibold text-slate-800 flex items-start gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                      <span>{selectedDelivery.delivery_address}</span>
                    </p>
                  </div>

                  {selectedDelivery.notes && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                        Instructions / Consignes particulières
                      </span>
                      <p className="text-xs text-slate-700 italic mt-0.5">
                        "{selectedDelivery.notes}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Montant à recouvrer */}
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">Montant à recouvrer :</span>
                  <span className="font-mono font-black text-sm text-emerald-700">
                    {selectedDelivery.amount_to_collect && selectedDelivery.amount_to_collect > 0
                      ? `${selectedDelivery.amount_to_collect.toLocaleString('fr-FR')} FCFA`
                      : '0 FCFA (Déjà réglé)'}
                  </span>
                </div>

                {/* Articles du colis */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#0055b8]" />
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Articles contenus dans le colis
                    </h4>
                  </div>

                  {(() => {
                    const items = getDeliveryItems(selectedDelivery);
                    if (items.length === 0) {
                      return (
                        <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                          Aucun article détaillé enregistré pour ce colis.
                        </p>
                      );
                    }

                    return (
                      <div className="border border-slate-100 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100">
                            <tr>
                              <th className="px-3 py-2">Article</th>
                              <th className="px-3 py-2 text-center">Qté</th>
                              <th className="px-3 py-2 text-right">P.U</th>
                              <th className="px-3 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                            {items.map((it: any, idx: number) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 text-slate-900">{it.product_name}</td>
                                <td className="px-3 py-2 text-center font-mono">{it.quantity}</td>
                                <td className="px-3 py-2 text-right font-mono text-slate-500">
                                  {it.unit_price?.toLocaleString('fr-FR')} F
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                                  {it.total?.toLocaleString('fr-FR')} F
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 pb-16">
      {/* 1. BANDEAU SUPÉRIEUR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
            <Bike className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Livraisons & Expéditions</h1>
            <p className="text-xs text-slate-500 font-medium">
              Suivi des courses, assignation des coursiers et historique des livraisons
            </p>
          </div>
        </div>

        {(user?.role as string) !== 'livreur' && (
          <button
            onClick={() => navigate('/deliveries/new')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 self-start sm:self-auto flex-shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Programmer une livraison</span>
          </button>
        )}
      </div>

      {/* 2. BARRE DE RECHERCHE & STATISTIQUES */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par client, tél, réf, livreur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0055b8]"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold self-end sm:self-auto">
          Total : <strong className="text-slate-900 font-bold">{filteredDeliveries.length}</strong> livraison(s)
        </div>
      </div>

      {/* 3. TABLEAU DES LIVRAISONS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-400 font-black border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5 text-center">RÉF & DATE</th>
                <th className="px-5 py-3.5">DESTINATAIRE & CONTACT</th>
                <th className="px-5 py-3.5">ADRESSE DE LIVRAISON</th>
                <th className="px-5 py-3.5 text-center">LIVREUR ASSIGNÉ</th>
                <th className="px-5 py-3.5 text-center">MONTANT À RECOUVRER</th>
                <th className="px-5 py-3.5 text-center">STATUT</th>
                <th className="px-5 py-3.5 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredDeliveries.map((d) => {
                const liv = livreurs.find((l) => l.id === d.livreur_id);
                const isDelivered = d.status === 'delivered';
                const isPending = d.status === 'pending';
                const isInTransit = d.status === 'in_transit';

                return (
                  <tr key={d.id} className="hover:bg-slate-50/60 transition">
                    {/* RÉF & DATE */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="font-mono font-black text-slate-900 text-xs block">
                        #LIV-{d.id}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {new Date(d.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </td>

                    {/* DESTINATAIRE & CONTACT */}
                    <td className="px-5 py-3.5">
                      <div className="font-black text-slate-900 text-xs">
                        {d.customer_name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span>{d.customer_phone}</span>
                      </div>
                    </td>

                    {/* ADRESSE DE LIVRAISON */}
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="flex items-start gap-1.5 text-slate-600 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{d.delivery_address}</span>
                      </div>
                    </td>

                    {/* LIVREUR ASSIGNÉ */}
                    <td className="px-5 py-3.5 text-center">
                      {liv ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#0055b8] border border-blue-100 font-bold text-[11px]">
                          <Bike className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{liv.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Non assigné</span>
                      )}
                    </td>

                    {/* MONTANT À RECOUVRER */}
                    <td className="px-5 py-3.5 text-center font-mono font-black text-slate-900">
                      {d.amount_to_collect && d.amount_to_collect > 0 ? (
                        <span className="text-emerald-700">
                          {d.amount_to_collect.toLocaleString('fr-FR')} FCFA
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal text-[11px]">0 FCFA (Payé)</span>
                      )}
                    </td>

                    {/* STATUT */}
                    <td className="px-5 py-3.5 text-center">
                      {isDelivered ? (
                        <span className="px-3 py-1 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1 bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>Livré</span>
                        </span>
                      ) : isInTransit ? (
                        <span className="px-3 py-1 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1 bg-sky-100 text-sky-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-pulse" />
                          <span>En transit</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1 bg-amber-100 text-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          <span>En attente</span>
                        </span>
                      )}
                    </td>

                    {/* ACTIONS : DÉTAILS ET SUPPRIMER */}
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Bouton Détails */}
                        <button
                          onClick={() => navigate(`/deliveries/${d.id}`)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-[#0055b8] hover:bg-[#0055b8] hover:text-white font-bold text-[11px] transition shadow-xs active:scale-95"
                          title="Consulter les détails du colis"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Détails</span>
                        </button>

                        {/* Bouton Supprimer */}
                        <button
                          onClick={() => handleDeleteDelivery(d)}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition shadow-xs font-bold active:scale-95"
                          title="Supprimer cette livraison"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredDeliveries.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-slate-400 font-medium">
                    Aucune livraison trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL DÉTAILS DE LA LIVRAISON */}
      {isDetailModalOpen && selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* En-tête Modal */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold flex-shrink-0">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Détails Livraison #LIV-{selectedDelivery.id}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Programmée le {new Date(selectedDelivery.created_at).toLocaleDateString('fr-FR')} à {new Date(selectedDelivery.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps Modal */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              {/* Informations Destinataire & Coursier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Destinataire
                  </span>
                  <p className="font-bold text-slate-900 text-xs">{selectedDelivery.customer_name}</p>
                  <p className="text-[11px] text-slate-600 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{selectedDelivery.customer_phone}</span>
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Coursier Assigné
                  </span>
                  {(() => {
                    const liv = livreurs.find((l) => l.id === selectedDelivery.livreur_id);
                    return liv ? (
                      <>
                        <p className="font-bold text-[#0055b8] text-xs">{liv.name}</p>
                        <p className="text-[11px] text-slate-600">{liv.phone || 'Pas de numéro'}</p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Non assigné</p>
                    );
                  })()}
                </div>
              </div>

              {/* Adresse & Consignes */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Adresse / Repère
                  </span>
                  <p className="text-xs font-semibold text-slate-800 flex items-start gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <span>{selectedDelivery.delivery_address}</span>
                  </p>
                </div>

                {selectedDelivery.notes && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Instructions / Consignes particulières
                    </span>
                    <p className="text-xs text-slate-700 italic mt-0.5">
                      "{selectedDelivery.notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Montant à recouvrer */}
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Montant à recouvrer :</span>
                <span className="font-mono font-black text-sm text-emerald-700">
                  {selectedDelivery.amount_to_collect && selectedDelivery.amount_to_collect > 0
                    ? `${selectedDelivery.amount_to_collect.toLocaleString('fr-FR')} FCFA`
                    : '0 FCFA (Déjà réglé)'}
                </span>
              </div>

              {/* Articles du colis */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#0055b8]" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Articles contenus dans le colis
                  </h4>
                </div>

                {(() => {
                  const items = getDeliveryItems(selectedDelivery);
                  if (items.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                        Aucun article détaillé enregistré pour ce colis.
                      </p>
                    );
                  }

                  return (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100">
                          <tr>
                            <th className="px-3 py-2">Article</th>
                            <th className="px-3 py-2 text-center">Qté</th>
                            <th className="px-3 py-2 text-right">P.U</th>
                            <th className="px-3 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {items.map((it: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 text-slate-900">{it.product_name}</td>
                              <td className="px-3 py-2 text-center font-mono">{it.quantity}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-500">
                                {it.unit_price?.toLocaleString('fr-FR')} F
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                                {it.total?.toLocaleString('fr-FR')} F
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Pied Modal */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

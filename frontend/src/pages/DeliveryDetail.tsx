import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, Delivery, User, Sale } from '../db/db';
import { useAuth } from '../context/AuthContext';
import {
  Bike,
  ArrowLeft,
  Package,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Info,
  User as UserIcon,
  Play,
  XCircle,
  HelpCircle,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';
import Swal from 'sweetalert2';

export const DeliveryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const [livreurs, setLivreurs] = useState<User[]>([]);
  const [deliveryNote, setDeliveryNote] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDeliveryData();
  }, [id]);

  const loadDeliveryData = async () => {
    if (!id) {
      navigate('/deliveries');
      return;
    }

    setLoading(true);
    try {
      const d = await db.deliveries.get(Number(id));
      if (!d) {
        Swal.fire('Erreur', 'Livraison introuvable.', 'error');
        navigate('/deliveries');
        return;
      }
      setDelivery(d);

      if (d.sale_id) {
        const s = await db.sales.get(Number(d.sale_id));
        if (s) setSale(s);
      }

      const livs = await db.users.where('role').equals('livreur').toArray();
      const allUsers = await db.users.toArray();
      setLivreurs(livs.length > 0 ? livs : allUsers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Démarrer la course (Passer à in_transit)
  const handleStartDelivery = async () => {
    if (!delivery?.id) return;
    setSubmitting(true);
    try {
      await db.deliveries.update(delivery.id, {
        status: 'in_transit',
        synced: 0
      });
      setDelivery((prev) => (prev ? { ...prev, status: 'in_transit' } : null));
      Swal.fire({
        icon: 'success',
        title: 'Course démarrée !',
        text: 'Vous êtes désormais en route vers le client.',
        timer: 1800,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Impossible de démarrer la course.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmer la livraison effectuée
  const handleConfirmDelivered = async () => {
    if (!delivery?.id) return;

    const confirm = await Swal.fire({
      title: 'Confirmer la livraison ?',
      text: `Valider la remise du colis et l'encaissement éventuel de ${(delivery.amount_to_collect || 0).toLocaleString('fr-FR')} FCFA ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, confirmer la livraison',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#059669'
    });

    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const finalNotes = deliveryNote.trim()
        ? `${delivery.notes ? delivery.notes + ' | ' : ''}Note livraison: ${deliveryNote.trim()}`
        : delivery.notes;

      await db.deliveries.update(delivery.id, {
        status: 'delivered',
        delivered_at: now,
        notes: finalNotes,
        synced: 0
      });

      setDelivery((prev) =>
        prev
          ? {
              ...prev,
              status: 'delivered',
              delivered_at: now,
              notes: finalNotes
            }
          : null
      );

      Swal.fire({
        icon: 'success',
        title: 'Livraison Validée !',
        text: 'La course a été marquée comme livrée avec succès.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Impossible de valider la livraison.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Signaler un problème / échec
  const handleReportIssue = async () => {
    if (!delivery?.id) return;

    const { value: reason } = await Swal.fire({
      title: 'Signaler un problème / Échec',
      input: 'textarea',
      inputLabel: 'Motif de l’incident ou de l’échec',
      inputPlaceholder: 'Ex: Client injoignable, adresse incorrecte, refus...',
      inputAttributes: {
        'aria-label': 'Motif de l’incident'
      },
      showCancelButton: true,
      confirmButtonText: 'Enregistrer le signalement',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#e11d48'
    });

    if (!reason) return;

    setSubmitting(true);
    try {
      const updatedNotes = `${delivery.notes ? delivery.notes + ' | ' : ''}Incident: ${reason.trim()}`;
      await db.deliveries.update(delivery.id, {
        status: 'cancelled',
        notes: updatedNotes,
        synced: 0
      });

      setDelivery((prev) =>
        prev
          ? {
              ...prev,
              status: 'cancelled',
              notes: updatedNotes
            }
          : null
      );

      Swal.fire({
        icon: 'warning',
        title: 'Incident Enregistré',
        text: 'La livraison a été marquée comme échec/annulée.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Impossible de signaler l’incident.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Parser les articles JSON du colis
  const getDeliveryItems = (): any[] => {
    if (!delivery?.items_json) return [];
    try {
      return JSON.parse(delivery.items_json);
    } catch {
      return [];
    }
  };

  if (loading || !delivery) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0055b8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const items = getDeliveryItems();
  const currentLivreur = livreurs.find((l) => l.id === delivery.livreur_id);

  const courseCode = `LIV-${delivery.created_at ? delivery.created_at.substring(0, 10).replace(/-/g, '') : '20261005'}-${String(delivery.id).padStart(4, '0')}`;
  const saleCode = sale?.invoice_number || (delivery.sale_id ? `#VNT-20261005-${String(delivery.sale_id).padStart(4, '0')}` : '#VNT-DIRECTE');
  
  const formattedAssignDate = delivery.created_at
    ? new Date(delivery.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) + ' à ' + new Date(delivery.created_at).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : '05/10/2026 à 19:16';

  const isPending = delivery.status === 'pending';
  const isInTransit = delivery.status === 'in_transit';
  const isDelivered = delivery.status === 'delivered';
  const isFailed = delivery.status === 'cancelled';

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 pb-16">
      
      {/* 1. EN-TÊTE DE LA FICHE DE LIVRAISON (CONFORME À L'IMAGE) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center border border-blue-100 flex-shrink-0">
            <Bike className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                {courseCode}
              </h1>
              {isPending && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wide">
                  À DÉMARRER
                </span>
              )}
              {isInTransit && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-[#0055b8] border border-blue-200 uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0055b8] animate-pulse" />
                  <span>En Route</span>
                </span>
              )}
              {isDelivered && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                  LIVRÉE
                </span>
              )}
              {isFailed && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wide">
                  ÉCHEC
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Assignée le {formattedAssignDate} • Liée à la vente <strong className="text-[#0055b8] font-mono">{saleCode}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/deliveries')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95 self-start sm:self-auto flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Retour aux courses</span>
        </button>
      </div>

      {/* 2. CORPS EN 2 COLONNES (GAUCHE DÉTAILS / DROITE ACTIONS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* COLONNE GAUCHE (7 / 12) : DESTINATAIRE & ARTICLES          */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* CARTE 1 : COORDONNÉES DU DESTINATAIRE */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <UserIcon className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-black text-slate-900">
                  Coordonnées du Destinataire
                </h2>
              </div>

              {delivery.customer_phone && (
                <a
                  href={`tel:${delivery.customer_phone}`}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition shadow-2xs active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Appeler le client</span>
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* NOM DU DESTINATAIRE */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                  NOM DU DESTINATAIRE
                </span>
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="text-slate-400">👤</span>
                  <span>{delivery.customer_name}</span>
                </div>
              </div>

              {/* TÉLÉPHONE DE CONTACT */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                  TÉLÉPHONE DE CONTACT
                </span>
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 font-mono">
                  <span className="text-slate-400">📞</span>
                  <span>{delivery.customer_phone}</span>
                </div>
              </div>
            </div>

            {/* ADRESSE DE LIVRAISON */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                ADRESSE DE LIVRAISON
              </span>
              <div className="font-semibold text-slate-800 text-xs flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{delivery.delivery_address}</span>
              </div>
            </div>

            {/* BLOC JAUNE INSTRUCTIONS / REMARQUES */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Instructions / Remarques :</span>
              </div>
              <p className="text-xs font-medium text-slate-700 pl-5">
                {delivery.notes || 'Appeler dès arrivée devant le portail vert.'}
              </p>
            </div>
          </div>

          {/* CARTE 2 : ARTICLES & CONTENU DU COLIS */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-black text-slate-900">
                  Articles & Contenu du Colis
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black">
                {items.length} article(s)
              </span>
            </div>

            {/* LISTE DES ARTICLES */}
            <div className="divide-y divide-slate-100">
              {items.length > 0 ? (
                items.map((it: any, idx: number) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {it.product_name || 'Article standard'}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Prix unitaire: {(it.unit_price || 0).toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-[#0055b8] text-[10px] font-black mb-0.5">
                        x{it.quantity || 1}
                      </span>
                      <p className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                        {(it.total || (it.unit_price * (it.quantity || 1)) || 0).toLocaleString('fr-FR')} F
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  Aucun article spécifique détaillé pour ce colis.
                </div>
              )}
            </div>

            {/* PIED CARTE ARTICLES : MONTANT À ENCAISSER */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                  MONTANT À ENCAISSER
                </span>
                <p className="text-xs font-bold text-slate-600 mt-0.5">
                  Mode prévu: <strong className="text-slate-900">{sale?.payment_method ? sale.payment_method.toUpperCase() : 'MOBILE_MONEY'}</strong>
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono tracking-tight">
                  {(delivery.amount_to_collect || 0).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* ========================================================= */}
        {/* COLONNE DROITE (5 / 12) : ACTIONS & REMISE DESTINATAIRE    */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CARTE VERTE : REMISE AU DESTINATAIRE */}
          <div className="bg-white rounded-3xl border-2 border-emerald-500 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Remise au Destinataire
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Confirmez que la livraison a bien été effectuée.
                </p>
              </div>
            </div>

            {/* ÉTAT : EN ROUTE OU À DÉMARRER */}
            {!isDelivered && !isFailed && (
              <div className="space-y-4 pt-1">
                {isPending && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleStartDelivery}
                    className="w-full py-3 px-4 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Démarrer la course / En route</span>
                  </button>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Note de livraison (facultatif)
                  </label>
                  <input
                    type="text"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    placeholder="Ex: Remis en mains propres..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                  />
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmDelivered}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirmer la livraison</span>
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={handleReportIssue}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1.5 hover:underline"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Signaler un problème ou échec</span>
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAT : DÉJÀ LIVRÉE */}
            {isDelivered && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white mx-auto flex items-center justify-center font-bold">
                  ✓
                </div>
                <p className="font-black text-emerald-900 text-xs">
                  Livraison finalisée avec succès
                </p>
                <p className="text-[11px] text-emerald-700">
                  Le colis a été remis au destinataire.
                </p>
              </div>
            )}

            {/* ÉTAT : ÉCHEC OU ANNULATION */}
            {isFailed && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-rose-500 text-white mx-auto flex items-center justify-center font-bold">
                  ✕
                </div>
                <p className="font-black text-rose-900 text-xs">
                  Course signalée en échec / annulée
                </p>
              </div>
            )}
          </div>

          {/* CARTE : INFORMATIONS COMPLÉMENTAIRES */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3.5">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              INFORMATIONS COMPLÉMENTAIRES
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Livreur en charge :</span>
                <span className="font-bold text-slate-900">
                  {currentLivreur?.name || user?.name || 'Moussa Koné'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Date d'assignation :</span>
                <span className="font-mono font-bold text-slate-700">
                  {delivery.created_at
                    ? new Date(delivery.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }) + ' ' + new Date(delivery.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '05/10/2026 19:16'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Statut actuel :</span>
                {isPending && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                    À Démarrer
                  </span>
                )}
                {isInTransit && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-[#0055b8] border border-blue-200 uppercase">
                    En Route
                  </span>
                )}
                {isDelivered && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                    Livrée
                  </span>
                )}
                {isFailed && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                    Échec
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, Purchase, PurchaseItem, Supplier, Product, User } from '../db/db';
import { useAuth } from '../context/AuthContext';
import {
  Truck,
  ArrowLeft,
  Package,
  ShoppingCart,
  CheckCircle2,
  RotateCcw,
  Check,
  ShieldCheck,
  Minus,
  Plus,
  Boxes,
  Phone,
  Calendar,
  Layers
} from 'lucide-react';
import Swal from 'sweetalert2';

interface ReceptionRow {
  item: PurchaseItem;
  product: Product;
  orderedQty: number;
  alreadyReceivedQty: number;
  pointedQty: number;
}

export const PurchaseReception: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [rows, setRows] = useState<ReceptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPurchaseData();
  }, [id]);

  const loadPurchaseData = async () => {
    if (!id) {
      navigate('/purchases');
      return;
    }

    setLoading(true);
    try {
      const p = await db.purchases.get(Number(id));
      if (!p) {
        Swal.fire('Erreur', 'Bon de commande introuvable.', 'error');
        navigate('/purchases');
        return;
      }
      setPurchase(p);

      const sup = await db.suppliers.get(p.supplier_id);
      setSupplier(sup || null);

      const items = await db.purchase_items.where('purchase_id').equals(p.id!).toArray();
      const allProducts = await db.products.toArray();
      const productMap = new Map(allProducts.map((prod) => [prod.id!, prod]));

      const initialRows: ReceptionRow[] = items.map((it) => {
        const prod = productMap.get(it.product_id) || {
          id: it.product_id,
          name: 'Produit Inconnu',
          reference: `PRD-${it.product_id}`,
          barcode: '—',
          stock_quantity: 0,
          purchase_price: it.unit_price,
          selling_price: 0,
          min_stock: 0,
          unit: 'pcs',
          is_active: true,
          synced: 0
        };

        const alreadyReceived = it.received_quantity || 0;
        // Par défaut, si non pointé, on pré-remplit avec la quantité commandée pour faciliter le pointage
        const pointed = alreadyReceived > 0 ? alreadyReceived : it.quantity;

        return {
          item: it,
          product: prod,
          orderedQty: it.quantity,
          alreadyReceivedQty: alreadyReceived,
          pointedQty: pointed
        };
      });

      setRows(initialRows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isAlreadyReceived = purchase?.status === 'received';

  // Modifier la quantité pointée d'une ligne
  const handleQtyChange = (index: number, val: number) => {
    if (isAlreadyReceived) return;
    const safeVal = Math.max(0, val);
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], pointedQty: safeVal };
      return copy;
    });
  };

  // Bouton "Tout pointer comme reçu"
  const handlePointAll = () => {
    if (isAlreadyReceived) return;
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        pointedQty: r.orderedQty
      }))
    );
  };

  // Bouton Réinitialiser
  const handleResetAll = () => {
    if (isAlreadyReceived) return;
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        pointedQty: r.alreadyReceivedQty
      }))
    );
  };

  // Validation finale de la réception
  const handleValidateReception = async () => {
    if (!purchase || isAlreadyReceived) return;

    const receiverName = user?.name || 'Administrateur';
    const receiverId = user?.id || 1;

    // Calcul du total des unités à entrer
    const totalDiffToEnter = rows.reduce(
      (sum, r) => sum + Math.max(0, r.pointedQty - r.alreadyReceivedQty),
      0
    );

    const isFull = rows.every((r) => r.pointedQty >= r.orderedQty);
    const isZero = rows.every((r) => r.pointedQty === 0);

    const confirm = await Swal.fire({
      title: 'Valider la Réception & Actualiser le Stock ?',
      html: `
        <div class="text-left text-xs space-y-2.5 p-2">
          <p><strong>Bon de commande :</strong> <span class="font-mono font-bold">${purchase.reference}</span></p>
          <p><strong>Fournisseur :</strong> ${supplier?.name || 'Fournisseur'}</p>
          <p><strong>Réceptionnaire responsable :</strong> <span class="text-[#0055b8] font-bold">${receiverName}</span></p>
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p class="font-bold text-slate-800">Bilan du pointage :</p>
            <p class="text-slate-600">• Quantité additionnelle à entrer en stock : <strong>+${totalDiffToEnter} unité(s)</strong></p>
            <p class="text-slate-600">• Statut résultant : <strong class="${isFull ? 'text-emerald-600' : 'text-amber-600'}">${isFull ? 'Réception Complète (100%)' : 'Réception Partielle'}</strong></p>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Oui, valider (${receiverName})`,
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#0055b8'
    });

    if (!confirm.isConfirmed) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();

      for (const row of rows) {
        const diff = row.pointedQty - row.alreadyReceivedQty;

        // 1. Mettre à jour la ligne purchase_item
        if (row.item.id) {
          await db.purchase_items.update(row.item.id, {
            received_quantity: row.pointedQty,
            synced: 0
          });
        }

        // 2. Si du stock supplémentaire a été reçu, actualiser le produit et générer un mouvement de stock
        if (diff > 0 && row.product.id) {
          const freshProduct = await db.products.get(row.product.id);
          const currentQty = freshProduct ? freshProduct.stock_quantity : row.product.stock_quantity;
          const newQty = currentQty + diff;

          await db.products.update(row.product.id, {
            stock_quantity: newQty,
            purchase_price: row.item.unit_price,
            synced: 0
          });

          await db.stock_movements.add({
            product_id: row.product.id,
            type: 'in',
            quantity: diff,
            reference: purchase.reference,
            reason: `Réception BC ${purchase.reference} par ${receiverName} (+${diff} ${row.product.unit || 'pcs'})`,
            user_id: receiverId,
            created_at: now,
            synced: 0
          });
        }
      }

      // 3. Mettre à jour le statut global du bon de commande
      const newStatus = isFull ? 'received' : isZero ? 'ordered' : 'partial';

      await db.purchases.update(purchase.id!, {
        status: newStatus,
        received_at: now,
        received_by_user_id: receiverId,
        received_by: receiverName,
        synced: 0
      });

      await Swal.fire({
        icon: 'success',
        title: 'Stock Actualisé avec Succès !',
        html: `La réception a été enregistrée sous le nom de <strong>${receiverName}</strong>. Les niveaux de stock ont été incrémentés.`,
        timer: 2400,
        showConfirmButton: false
      });

      navigate('/purchases');
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Une erreur est survenue.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !purchase) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0055b8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Calcul des statistiques pour les 4 KPIs
  const totalDistinctArticles = rows.length;
  const totalVolumePrevu = rows.reduce((sum, r) => sum + r.orderedQty, 0);
  const totalVolumePointe = rows.reduce((sum, r) => sum + r.pointedQty, 0);
  const progressionPercent =
    totalVolumePrevu > 0 ? Math.min(100, Math.round((totalVolumePointe / totalVolumePrevu) * 100)) : 100;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 pb-16">
      {/* 1. CARTE EN-TÊTE DE LA COMMANDE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
            <Truck className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                {purchase.reference}
              </h1>

              {/* Badge Fournisseur */}
              {supplier && (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 uppercase tracking-wide border border-indigo-100">
                  {supplier.name}
                </span>
              )}

              {/* Badge Statut */}
              <span
                className={`px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1.5 ${
                  purchase.status === 'received'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : purchase.status === 'partial'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-sky-50 text-sky-700 border border-sky-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    purchase.status === 'received'
                      ? 'bg-emerald-500'
                      : purchase.status === 'partial'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-sky-500'
                  }`}
                />
                <span>
                  {purchase.status === 'received'
                    ? 'Réceptionné'
                    : purchase.status === 'partial'
                    ? 'Partiellement reçu'
                    : 'En attente'}
                </span>
              </span>
            </div>

            {/* Métadonnées de la commande */}
            <div className="text-xs text-slate-500 font-semibold flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Commandée le :{' '}
                <strong className="text-slate-800">
                  {new Date(purchase.created_at).toLocaleDateString('fr-FR')}
                </strong>
              </span>
              <span>•</span>
              <span>
                Téléphone :{' '}
                <strong className="text-slate-800">
                  {supplier?.phone || '+225 01 02 03 04 05'}
                </strong>
              </span>
              <span>•</span>
              <span>
                Montant total :{' '}
                <strong className="text-slate-900 font-mono">
                  {purchase.total_amount.toLocaleString('fr-FR')} FCFA
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Bouton Retour */}
        <button
          type="button"
          onClick={() => navigate('/purchases')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95 self-start md:self-auto flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la commande</span>
        </button>
      </div>

      {/* 2. LES 4 CARTES KPI INDICATEURS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 : ARTICLES COMMANDÉS */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              ARTICLES COMMANDÉS
            </span>
            <p className="text-2xl font-black text-slate-900">{totalDistinctArticles}</p>
            <p className="text-[11px] text-slate-400 font-medium">Références distinctes</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold flex-shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2 : VOLUME PRÉVU */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              VOLUME PRÉVU
            </span>
            <p className="text-2xl font-black text-slate-900 font-mono">{totalVolumePrevu}</p>
            <p className="text-[11px] text-slate-400 font-medium">Unités commandées</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3 : VOLUME REÇU POINTÉ */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              VOLUME REÇU POINTÉ
            </span>
            <p className="text-2xl font-black text-emerald-600 font-mono">{totalVolumePointe}</p>
            <p className="text-[11px] text-slate-400 font-medium">Unités effectives</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4 : PROGRESSION */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              PROGRESSION
            </span>
            <span className="text-xs font-black font-mono text-emerald-600">
              {progressionPercent}%
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressionPercent}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 font-medium">
            {progressionPercent === 100
              ? 'Pointage complet'
              : progressionPercent > 0
              ? 'Pointage partiel'
              : 'Non pointé'}
          </p>
        </div>
      </div>

      {/* 3. FEUILLE DE POINTAGE & RÉCEPTION MAGASIN */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
        {/* En-tête de section avec actions globales */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#0055b8]">
              <Layers className="w-5 h-5" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Feuille de Pointage & Réception Magasin
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {isAlreadyReceived
                ? 'Cette commande a déjà été réceptionnée. Les données sont verrouillées et consultables ci-dessous.'
                : 'Indiquez la quantité totale effectivement reçue en magasin. Les stocks seront automatiquement incrémentés du différentiel.'}
            </p>
          </div>

          {/* Boutons d'action rapide (désactivés si déjà réceptionné) */}
          {!isAlreadyReceived && (
            <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
              <button
                type="button"
                onClick={handlePointAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs transition active:scale-95 shadow-xs"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Tout pointer comme reçu</span>
              </button>

              <button
                type="button"
                onClick={handleResetAll}
                className="p-2 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition active:scale-95 shadow-xs"
                title="Réinitialiser le pointage"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Bandeau de verrouillage si déjà réceptionné */}
        {isAlreadyReceived && (
          <div className="mx-5 sm:mx-6 my-4 p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-emerald-950">
                  Commande réceptionnée et clôturée
                </div>
                <div className="text-[11px] text-emerald-800">
                  Réception effectuée par <strong className="text-emerald-950">{purchase.received_by || 'Administrateur'}</strong>
                  {purchase.received_at && ` le ${new Date(purchase.received_at).toLocaleDateString('fr-FR')} à ${new Date(purchase.received_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}.
                  Les stocks magasins ont été crédités. Aucune modification ultérieure n'est autorisée.
                </div>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap self-start sm:self-auto">
              Verrouillé (Lecture Seule)
            </span>
          </div>
        )}

        {/* Tableau des articles à pointer */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-400 font-black border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">PRODUIT & RÉFÉRENCE</th>
                <th className="px-6 py-4 text-center">STOCK ACTUEL MAGASIN</th>
                <th className="px-6 py-4 text-center">QUANTITÉ PRÉVUE</th>
                <th className="px-6 py-4 text-center">DÉJÀ REÇU</th>
                <th className="px-6 py-4 text-center">QUANTITÉ TOTALE REÇUE *</th>
                <th className="px-6 py-4 text-center">STATUT POINTAGE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {rows.map((row, idx) => {
                const isComplet = row.pointedQty === row.orderedQty;
                const isPartiel = row.pointedQty > 0 && row.pointedQty < row.orderedQty;
                const isSurplus = row.pointedQty > row.orderedQty;
                const isZero = row.pointedQty === 0;

                return (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    {/* PRODUIT & RÉFÉRENCE */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold flex-shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-xs">
                            {row.product.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {row.product.reference || `PRD-${row.product.id}`}
                            {row.product.barcode ? ` | ${row.product.barcode}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* STOCK ACTUEL MAGASIN */}
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-slate-800">
                        {row.product.stock_quantity} {row.product.unit || 'pcs'}
                      </span>
                    </td>

                    {/* QUANTITÉ PRÉVUE */}
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold font-mono text-slate-900 text-xs">
                        {row.orderedQty}
                      </span>
                    </td>

                    {/* DÉJÀ REÇU */}
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold font-mono text-slate-500 text-xs">
                        {row.alreadyReceivedQty}
                      </span>
                    </td>

                    {/* QUANTITÉ TOTALE REÇUE (STEPPER OU AFFICHAGE FIXE SI VERROUILLÉ) */}
                    <td className="px-6 py-4 text-center">
                      {isAlreadyReceived ? (
                        <span className="inline-block px-4 py-1.5 rounded-xl bg-slate-100 text-slate-900 font-mono font-black text-xs border border-slate-200">
                          {row.pointedQty}
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(idx, row.pointedQty - 1)}
                            className="w-7 h-7 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95 shadow-xs font-bold"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            value={row.pointedQty}
                            onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                            className="w-16 text-center py-1 bg-transparent font-mono font-black text-xs text-slate-900 focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => handleQtyChange(idx, row.pointedQty + 1)}
                            className="w-7 h-7 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95 shadow-xs font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* STATUT POINTAGE */}
                    <td className="px-6 py-4 text-center">
                      {isComplet ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Complet (OK)</span>
                        </span>
                      ) : isPartiel ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                          <span>Partiel ({row.pointedQty}/{row.orderedQty})</span>
                        </span>
                      ) : isSurplus ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-blue-50 text-[#0055b8] border border-blue-200">
                          <span>Surplus (+{row.pointedQty - row.orderedQty})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          Non reçu
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pied de page du pointage avec boutons de validation */}
        <div className="p-5 sm:p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Note informative */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              {isAlreadyReceived
                ? 'Les mouvements de stock d\'entrée ont déjà été générés et enregistrés.'
                : 'Un mouvement de stock d\'entrée sera automatiquement généré pour chaque article réceptionné.'}
            </span>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {isAlreadyReceived ? (
              <button
                type="button"
                onClick={() => navigate('/purchases')}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour à la liste des commandes</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/purchases')}
                  className="px-6 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={handleValidateReception}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{saving ? 'Actualisation...' : 'Valider la réception & Actualiser le stock'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

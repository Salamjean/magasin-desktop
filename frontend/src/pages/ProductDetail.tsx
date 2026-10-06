import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, Product, Category, Supplier, StockMovement, User } from '../db/db';
import {
  Package,
  ArrowLeft,
  Edit2,
  Barcode,
  Download,
  Printer,
  FileText,
  History,
  Tag,
  Boxes,
  Bell,
  CheckCircle2,
  XCircle,
  Power,
  Layers,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import Swal from 'sweetalert2';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    loadProductData();
  }, [id]);

  const loadProductData = async () => {
    if (!id) {
      navigate('/products');
      return;
    }
    const prodId = Number(id);
    const prod = await db.products.get(prodId);
    if (!prod) {
      Swal.fire('Erreur', 'Article introuvable.', 'error');
      navigate('/products');
      return;
    }

    const [allCats, allSups, allMovs, allUsers] = await Promise.all([
      db.categories.toArray(),
      db.suppliers.toArray(),
      db.stock_movements.where('product_id').equals(prodId).reverse().toArray(),
      db.users.toArray()
    ]);

    const cat = allCats.find((c) => c.id === prod.category_id) || null;
    const sup = allSups.find((s) => s.id === prod.supplier_id) || null;

    setProduct(prod);
    setCategory(cat);
    setSupplier(sup);
    setMovements(allMovs);
    setUsers(allUsers);
    setLoading(false);
  };

  // Rendu du code-barres SVG
  useEffect(() => {
    if (product && product.barcode && barcodeSvgRef.current) {
      try {
        JsBarcode(barcodeSvgRef.current, product.barcode, {
          format: 'CODE128',
          width: 1.8,
          height: 52,
          displayValue: true,
          fontSize: 13,
          font: 'monospace',
          lineColor: '#0f172a',
          margin: 4
        });
      } catch (err) {
        // En cas d'erreur de format
      }
    }
  }, [product]);

  // Activer / Désactiver le produit
  const handleToggleActive = async () => {
    if (!product || !product.id) return;
    const newStatus = !product.is_active;

    await db.products.update(product.id, {
      is_active: newStatus,
      synced: 0
    });

    setProduct({ ...product, is_active: newStatus });

    Swal.fire({
      icon: 'success',
      title: newStatus ? 'Article activé' : 'Article désactivé',
      text: newStatus
        ? "L'article est maintenant disponible à la vente en caisse."
        : "L'article a été masqué de la vente en caisse.",
      timer: 1600,
      showConfirmButton: false
    });
  };

  // Télécharger le code-barres en SVG
  const handleDownloadBarcodeSVG = () => {
    if (!barcodeSvgRef.current || !product) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(barcodeSvgRef.current);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `code_barres_${product.barcode || product.reference}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Imprimer l'étiquette
  const handlePrintLabel = () => {
    if (!product) return;
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) return;

    const svgHtml = barcodeSvgRef.current ? barcodeSvgRef.current.outerHTML : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Impression Étiquette - ${product.name}</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .label { border: 2px solid #000; padding: 16px; width: 320px; text-align: center; border-radius: 8px; }
            .name { font-size: 16px; font-weight: bold; margin-bottom: 6px; }
            .price { font-size: 22px; font-weight: 900; margin: 8px 0; color: #0056a6; }
            .ref { font-size: 11px; color: #555; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="name">${product.name}</div>
            <div class="ref">Réf : ${product.reference} • ${category?.name || 'Général'}</div>
            <div style="margin: 10px 0;">${svgHtml}</div>
            <div class="price">${(product.selling_price || 0).toLocaleString('fr-FR')} FCFA</div>
          </div>
          <script>
            window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading || !product) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0055b8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isLowStock = (product.stock_quantity || 0) <= (product.min_stock || 5);
  const isOutOfStock = (product.stock_quantity || 0) <= 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-150">
      {/* 1. CARTE PRINCIPALE : EN-TÊTE DU PRODUIT */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Miniature du Produit */}
          <div className="w-24 h-24 rounded-3xl bg-slate-50 border border-slate-200/80 p-1.5 flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden">
            {product.image && product.image.trim() ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover rounded-2xl shadow-xs"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-[#0055b8] text-white flex items-center justify-center font-black text-2xl uppercase tracking-wider select-none shadow-xs">
                {(product.name.slice(0, 2) || 'PR').toUpperCase()}
              </div>
            )}
          </div>

          {/* Données Produit & Méta */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{product.name}</h1>

              {/* Badge Stock */}
              <span
                className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black ${
                  isOutOfStock
                    ? 'bg-rose-100 text-rose-700'
                    : isLowStock
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {isOutOfStock ? 'Rupture' : isLowStock ? 'Stock Faible' : 'En Stock'}
              </span>

              {/* Badge Actif / Inactif */}
              <span
                className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black ${
                  product.is_active !== false
                    ? 'bg-slate-100 text-slate-800 border border-slate-200'
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}
              >
                {product.is_active !== false ? 'Actif' : 'Désactivé'}
              </span>
            </div>

            {/* Ligne Référence • Rayon • Fournisseur */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
              <span>
                <strong className="text-slate-700 font-bold">Réf :</strong>{' '}
                <span className="font-mono">{product.reference}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <strong className="text-slate-700 font-bold">Rayon :</strong>
                {category ? (
                  <span className="inline-flex items-center gap-1 text-slate-800 font-bold">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: category.color || '#0055b8' }}
                    />
                    {category.name}
                  </span>
                ) : (
                  <span>Non classé</span>
                )}
              </span>
              <span>•</span>
              <span>
                <strong className="text-slate-700 font-bold">Fournisseur :</strong>{' '}
                {supplier ? (
                  <span className="text-slate-800 font-bold">{supplier.name}</span>
                ) : (
                  <span className="text-slate-400">Non assigné</span>
                )}
              </span>
              <span>•</span>
              <span>
                <strong className="text-slate-700 font-bold">Enregistré par :</strong>{' '}
                <span className="text-slate-800 font-bold">
                  {users.find((u) => u.id === product.user_id)?.name || 'Administrateur'}
                </span>
              </span>
            </div>

            {/* 3 Mini Badges Métriques */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {/* Prix de vente */}
              <div className="bg-blue-50/70 border border-blue-100/90 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-subtle">
                <div className="w-8 h-8 rounded-xl bg-[#0055b8] text-white flex items-center justify-center font-bold">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    PRIX DE VENTE UNITAIRE
                  </p>
                  <p className="text-sm font-black text-slate-900">
                    {(product.selling_price || 0).toLocaleString()} FCFA
                  </p>
                </div>
              </div>

              {/* Stock Actuel */}
              <div className="bg-emerald-50/70 border border-emerald-100/90 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-subtle">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    STOCK ACTUEL
                  </p>
                  <p className="text-sm font-black text-slate-900">
                    {product.stock_quantity || 0} {product.unit || 'pcs'}
                  </p>
                </div>
              </div>

              {/* Seuil d'Alerte */}
              <div className="bg-amber-50/70 border border-amber-100/90 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-subtle">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    SEUIL D'ALERTE
                  </p>
                  <p className="text-sm font-black text-slate-900">
                    {product.min_stock || 5} {product.unit || 'pcs'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'Action Haut Droit */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          <button
            type="button"
            onClick={handleToggleActive}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition active:scale-95 text-white shadow-md ${
              product.is_active !== false
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
            }`}
            title={product.is_active !== false ? "Désactiver de la caisse" : "Activer pour la caisse"}
          >
            <Power className="w-4 h-4" />
            <span>{product.is_active !== false ? 'Désactiver le produit' : 'Activer le produit'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/products/edit/${product.id}`)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95"
          >
            <Edit2 className="w-4 h-4" />
            <span>Modifier</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/products')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition active:scale-95 border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
        </div>
      </div>

      {/* 2. CARD : CODE-BARRES & ÉTIQUETAGE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Titre & Code */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold flex-shrink-0">
            <Barcode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Code-barres & Étiquetage</h3>
            <p className="text-xs text-slate-500 font-medium">
              Code produit : <span className="font-mono font-bold text-slate-800">{product.barcode}</span>
            </p>
          </div>
        </div>

        {/* SVG Code-barres interactif */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl px-6 py-2 flex items-center justify-center min-w-[220px]">
          {product.barcode ? (
            <svg ref={barcodeSvgRef} className="max-w-full" />
          ) : (
            <span className="text-xs text-slate-400 font-medium">Aucun code-barres</span>
          )}
        </div>

        {/* Boutons Télécharger & Imprimer */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadBarcodeSVG}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger (SVG)</span>
          </button>

          <button
            type="button"
            onClick={handlePrintLabel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition active:scale-95 whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer l'étiquette</span>
          </button>
        </div>
      </div>

      {/* 3. CARD : DESCRIPTION DU PRODUIT */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
          <FileText className="w-4 h-4 text-[#0055b8]" />
          <span>DESCRIPTION DU PRODUIT</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          {product.reference ? (product as any).description || 'Aucune description particulière pour cet article.' : 'Aucune description particulière pour cet article.'}
        </p>
      </div>

      {/* 4. CARD : HISTORIQUE DES MOUVEMENTS DE STOCK */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="p-6 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-slate-900 tracking-tight">
              <History className="w-4 h-4 text-[#0055b8]" />
              <span>Historique des Mouvements de Stock</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Traçabilité complète des entrées, sorties, ventes et ajustements
            </p>
          </div>

          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
            {movements.length} mouvement(s)
          </span>
        </div>

        {movements.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">Aucun mouvement pour le moment</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Les ventes en caisse, entrées d'approvisionnement et inventaires apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">DATE & HEURE</th>
                  <th className="py-3.5 px-5">TYPE DE MOUVEMENT</th>
                  <th className="py-3.5 px-5 text-center">QUANTITÉ</th>
                  <th className="py-3.5 px-5 text-center">ÉVOLUTION STOCK</th>
                  <th className="py-3.5 px-5">MOTIF & RÉFÉRENCE</th>
                  <th className="py-3.5 px-5">OPÉRATEUR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {movements.map((m) => {
                  const user = users.find((u) => u.id === m.user_id);
                  const isEntry = m.type === 'in' || m.type === 'return';

                  return (
                    <tr key={m.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3.5 px-5 text-slate-500 font-mono text-[11px]">
                        {new Date(m.created_at).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            isEntry
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {isEntry ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {m.type === 'in'
                            ? 'Entrée / Achat'
                            : m.type === 'out'
                            ? 'Sortie / Vente'
                            : m.type === 'return'
                            ? 'Retour Client'
                            : 'Ajustement'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center font-black">
                        <span className={isEntry ? 'text-emerald-700' : 'text-rose-700'}>
                          {isEntry ? `+${m.quantity}` : `-${m.quantity}`} {product.unit || 'pcs'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center font-mono font-bold text-slate-700 text-xs">
                        {m.reference?.startsWith('INIT-') || m.reason?.toLowerCase().includes('initial')
                          ? `0 ➔ ${m.quantity}`
                          : `${isEntry ? '+' : '-'}${m.quantity}`}
                      </td>
                      <td className="py-3.5 px-5">
                        <p className="text-slate-900 font-bold">{m.reason || 'Mouvement standard'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{m.reference || '-'}</p>
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 font-medium">
                        {user?.name || 'Système'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

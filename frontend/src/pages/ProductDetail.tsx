import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, Product, Category, Supplier, StockMovement, User } from '../db/db';
import { useSettings } from '../context/SettingsContext';
import {
  Package,
  ArrowLeft,
  Edit2,
  Barcode,
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
  RotateCcw,
  Plus,
  Minus
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import Swal from 'sweetalert2';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [printQuantity, setPrintQuantity] = useState<number>(1);

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
    setPrintQuantity(prod.stock_quantity && prod.stock_quantity > 0 ? prod.stock_quantity : 1);
    setLoading(false);
  };

  // Rendu du code-barres SVG à l'écran
  useEffect(() => {
    const code = product?.barcode?.trim() || product?.reference?.trim();
    if (code && barcodeSvgRef.current) {
      try {
        JsBarcode(barcodeSvgRef.current, code, {
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

  // Imprimer les étiquettes au format standard 45x26mm selon la quantité du produit
  const handlePrintLabel = async () => {
    if (!product) return;

    const barcodeValue = (product.barcode && product.barcode.trim()) || (product.reference && product.reference.trim());
    if (!barcodeValue) {
      Swal.fire({
        icon: 'warning',
        title: 'Données manquantes',
        text: 'Ce produit ne possède ni code-barres ni référence pour générer l’étiquette.'
      });
      return;
    }

    const maxStock = Math.max(1, Number(product.stock_quantity) || 1);
    const safeQty = Math.min(maxStock, Math.max(1, printQuantity));

    const labelWidth = Math.max(20, Math.min(150, parseInt(settings.label_width, 10) || 45));
    const labelHeight = Math.max(15, Math.min(150, parseInt(settings.label_height, 10) || 26));

    // Ratio d'échelle proportionnel pour adapter automatiquement tous les contenus
    const scale = Math.max(0.65, Math.min(2.5, Math.min(labelWidth / 45, labelHeight / 26)));
    const storeFontSize = Math.max(5, Math.min(11, Math.round(6 * scale * 10) / 10));
    const nameFontSize = Math.max(6.5, Math.min(16, Math.round(8 * scale * 10) / 10));
    const nameMaxHeight = Math.max(3.5, Math.min(15, Math.round(labelHeight * 0.22 * 10) / 10));
    const barcodeBoxHeight = Math.max(7, Math.min(45, Math.round(labelHeight * 0.44 * 10) / 10));
    const barcodeSvgMaxHeight = Math.max(6, Math.min(40, Math.round(labelHeight * 0.40 * 10) / 10));
    const barcodeSvgMaxWidth = Math.max(16, labelWidth - 3);
    const refFontSize = Math.max(5.5, Math.min(12, Math.round(7 * scale * 10) / 10));
    const priceFontSize = Math.max(8.5, Math.min(22, Math.round(11 * scale * 10) / 10));
    const padTopBottom = Math.max(0.6, Math.min(3, Math.round(1.2 * (labelHeight / 26) * 10) / 10));
    const padLeftRight = Math.max(0.8, Math.min(4, Math.round(1.5 * (labelWidth / 45) * 10) / 10));

    // Paramètres JsBarcode proportionnels
    const jsBarcodeHeight = Math.max(20, Math.min(80, Math.round(32 * (labelHeight / 26))));
    const jsBarcodeWidth = Math.max(1.1, Math.min(2.8, Math.round(1.5 * (labelWidth / 45) * 10) / 10));
    const jsBarcodeFont = Math.max(7.5, Math.min(14, Math.round(10 * scale)));

    const printWindow = window.open('', '_blank', 'width=700,height=600');
    if (!printWindow) {
      Swal.fire('Erreur', 'Impossible d’ouvrir la fenêtre d’impression. Veuillez autoriser les fenêtres pop-up.', 'error');
      return;
    }

    // Génération du SVG optimisé selon les dimensions définies
    let svgHtml = '';
    try {
      const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(tempSvg, barcodeValue, {
        format: 'CODE128',
        width: jsBarcodeWidth,
        height: jsBarcodeHeight,
        displayValue: true,
        fontSize: jsBarcodeFont,
        font: 'monospace',
        textAlign: 'center',
        textPosition: 'bottom',
        textMargin: 1,
        lineColor: '#000000',
        margin: 0
      });
      tempSvg.removeAttribute('width');
      tempSvg.removeAttribute('height');
      svgHtml = tempSvg.outerHTML;
    } catch (err) {
      console.warn('Erreur génération code-barres SVG:', err);
      svgHtml = barcodeSvgRef.current ? barcodeSvgRef.current.outerHTML : '';
    }

    const storeName = settings.company_name || settings.app_name || '';
    const currency = settings.currency || 'FCFA';
    const formattedPrice = (product.selling_price || 0).toLocaleString('fr-FR');

    const singleLabelHtml = `
      <div class="label-page">
        <div class="top-section">
          ${storeName ? `<div class="store-name">${storeName}</div>` : ''}
          <div class="product-name" title="${product.name}">${product.name}</div>
        </div>
        <div class="barcode-container">
          ${svgHtml}
        </div>
        <div class="bottom-row">
          ${product.reference ? `<span class="ref-text">Réf: ${product.reference}</span>` : ''}
          <span class="price-text" style="${!product.reference ? 'margin: 0 auto;' : ''}">${formattedPrice} ${currency}</span>
        </div>
      </div>
    `;

    const labelsHtml = Array(safeQty).fill(singleLabelHtml).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Étiquette ${labelWidth}x${labelHeight}mm - ${product.name}</title>
          <style>
            @page {
              size: ${labelWidth}mm ${labelHeight}mm;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              width: ${labelWidth}mm;
              height: ${labelHeight}mm;
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .label-page {
              width: ${labelWidth}mm;
              height: ${labelHeight}mm;
              max-width: ${labelWidth}mm;
              max-height: ${labelHeight}mm;
              box-sizing: border-box;
              padding: ${padTopBottom}mm ${padLeftRight}mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              text-align: center;
              page-break-after: always;
              page-break-inside: avoid;
              break-after: page;
              break-inside: avoid;
              overflow: hidden;
              background: #ffffff;
            }
            .label-page:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .top-section {
              width: 100%;
              text-align: center;
              line-height: 1.1;
              max-height: ${Math.round(labelHeight * 0.28 * 10) / 10}mm;
              overflow: hidden;
            }
            .store-name {
              font-size: ${storeFontSize}px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              color: #222;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 1;
              margin-bottom: 0.5px;
            }
            .product-name {
              font-size: ${nameFontSize}px;
              font-weight: 800;
              color: #000;
              line-height: 1.12;
              max-height: ${nameMaxHeight}mm;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              word-break: break-word;
            }
            .barcode-container {
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              flex: 1;
              max-height: ${barcodeBoxHeight}mm;
              margin: 0.3mm 0;
              overflow: hidden;
            }
            .barcode-container svg {
              width: 100% !important;
              max-width: ${barcodeSvgMaxWidth}mm !important;
              height: auto !important;
              max-height: ${barcodeSvgMaxHeight}mm !important;
              display: block;
              margin: 0 auto;
            }
            .bottom-row {
              width: 100%;
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              border-top: 0.6px solid #000;
              padding-top: 0.4mm;
              line-height: 1;
              margin-top: auto;
            }
            .ref-text {
              font-size: ${refFontSize}px;
              font-weight: 600;
              color: #111;
              font-family: monospace;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: ${Math.round(labelWidth * 0.45)}mm;
              text-align: left;
            }
            .price-text {
              font-size: ${priceFontSize}px;
              font-weight: 900;
              color: #000;
              white-space: nowrap;
              margin-left: auto;
              text-align: right;
            }
            @media screen {
              body {
                background: #f1f5f9;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
              }
              .label-page {
                box-shadow: 0 4px 12px rgba(0,0,0,0.12);
                border: 1px dashed #94a3b8;
                border-radius: 3px;
              }
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            };
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
  const maxStock = Math.max(1, Number(product.stock_quantity) || 1);

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

            {/* 3 Mini Badges Métriques sur la même ligne */}
            <div className="flex items-center gap-3 pt-1 flex-nowrap overflow-x-auto max-w-full">
              {/* Prix de vente */}
              <div className="bg-blue-50/70 border border-blue-100/90 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-subtle shrink-0">
                <div className="w-8 h-8 rounded-xl bg-[#0055b8] text-white flex items-center justify-center font-bold">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    PRIX DE VENTE UNITAIRE
                  </p>
                  <p className="text-sm font-black text-slate-900 whitespace-nowrap">
                    {(product.selling_price || 0).toLocaleString()} {settings.currency || 'FCFA'}
                  </p>
                </div>
              </div>

              {/* Stock Actuel */}
              <div className="bg-emerald-50/70 border border-emerald-100/90 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-subtle shrink-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    STOCK ACTUEL
                  </p>
                  <p className="text-sm font-black text-slate-900 whitespace-nowrap">
                    {product.stock_quantity || 0} {product.unit || 'pcs'}
                  </p>
                </div>
              </div>

              {/* Seuil d'Alerte */}
              <div className="bg-amber-50/70 border border-amber-100/90 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-subtle shrink-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    SEUIL D'ALERTE
                  </p>
                  <p className="text-sm font-black text-slate-900 whitespace-nowrap">
                    {product.min_stock || 5} {product.unit || 'pcs'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'Action Haut Droit sur la même ligne */}
        <div className="flex items-center gap-2.5 flex-nowrap shrink-0 self-start lg:self-center overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={handleToggleActive}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition active:scale-95 text-white shadow-md whitespace-nowrap shrink-0 ${
              product.is_active !== false
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
            }`}
            title={product.is_active !== false ? "Désactiver de la caisse" : "Activer pour la caisse"}
          >
            <Power className="w-4 h-4" />
            <span>{product.is_active !== false ? 'Désactiver' : 'Activer'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/products/edit/${product.id}`)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95 whitespace-nowrap shrink-0"
          >
            <Edit2 className="w-4 h-4" />
            <span>Modifier</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/products')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition active:scale-95 border border-slate-200 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
        </div>
      </div>

      {/* 2. CARD : CODE-BARRES & ÉTIQUETAGE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Titre & Code */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold flex-shrink-0">
            <Barcode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Code-barres & Étiquette Thermique</h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0055b8] border border-blue-200 font-extrabold text-[10px]">
                {settings.label_width || '45'} × {settings.label_height || '26'} mm
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Code produit : <span className="font-mono font-bold text-slate-800">{product.barcode || product.reference}</span>
            </p>
          </div>
        </div>

        {/* SVG Code-barres interactif */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl px-6 py-2 flex items-center justify-center min-w-[220px]">
          {product.barcode || product.reference ? (
            <svg ref={barcodeSvgRef} className="max-w-full" />
          ) : (
            <span className="text-xs text-slate-400 font-medium">Aucun code-barres</span>
          )}
        </div>

        {/* Sélecteur de quantité borné au stock & Bouton Imprimer */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sélecteur de quantité borné au stock du produit */}
          <div
            className="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200/80 shadow-xs"
            title={`Nombre d'étiquettes à imprimer (Stock disponible : ${maxStock})`}
          >
            <button
              type="button"
              onClick={() => setPrintQuantity((prev) => Math.max(1, prev - 1))}
              disabled={printQuantity <= 1}
              className={`w-7 h-7 flex items-center justify-center rounded-xl font-bold text-xs transition active:scale-95 shadow-xs ${
                printQuantity <= 1
                  ? 'bg-slate-200/70 text-slate-400 cursor-not-allowed'
                  : 'bg-white hover:bg-slate-200 text-slate-700'
              }`}
              title="Diminuer (minimum 1)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min={1}
              max={maxStock}
              value={printQuantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (isNaN(val)) {
                  setPrintQuantity(1);
                } else {
                  setPrintQuantity(Math.min(maxStock, Math.max(1, val)));
                }
              }}
              className="w-10 text-center text-xs font-black bg-transparent border-none outline-none focus:ring-0 text-slate-800 p-0"
              title={`Quantité (Max stock : ${maxStock})`}
            />
            <button
              type="button"
              onClick={() => setPrintQuantity((prev) => Math.min(maxStock, prev + 1))}
              disabled={printQuantity >= maxStock}
              className={`w-7 h-7 flex items-center justify-center rounded-xl font-bold text-xs transition active:scale-95 shadow-xs ${
                printQuantity >= maxStock
                  ? 'bg-slate-200/70 text-slate-400 cursor-not-allowed'
                  : 'bg-white hover:bg-slate-200 text-slate-700'
              }`}
              title={`Augmenter (ne peut pas dépasser le stock : ${maxStock})`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrintLabel}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition active:scale-95 whitespace-nowrap"
            title={`Imprimer au format étiquette thermique standard 45x26 mm (${printQuantity} sur ${maxStock} en stock)`}
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer l'étiquette ({printQuantity})</span>
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

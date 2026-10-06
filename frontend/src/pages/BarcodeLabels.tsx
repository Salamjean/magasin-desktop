import React, { useState, useEffect, useRef } from 'react';
import { db, Product, Category } from '../db/db';
import { useSettings } from '../context/SettingsContext';
import {
  Tag,
  Printer,
  Search,
  Plus,
  Minus,
  Trash2,
  Package,
  Sparkles,
  Store,
  ChevronDown,
  CheckSquare,
  X
} from 'lucide-react';
import Swal from 'sweetalert2';

interface SelectedProductLabel {
  product: Product;
  quantity: number;
}

export const BarcodeLabels: React.FC = () => {
  const { settings } = useSettings();
  const storeName = settings.company_name || settings.app_name || 'GestMAG Store';
  const currency = settings.currency || 'FCFA';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres de recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Articles sélectionnés pour l'impression
  const [selectedItems, setSelectedItems] = useState<SelectedProductLabel[]>([]);

  // Articles cochés dans la sélection multiple (catalog ou dropdown)
  const [checkedProductIds, setCheckedProductIds] = useState<number[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');

  // 2 Formats demandés :
  // 1. 'shelf_label' : Étiquette de rayon thermique 45x26mm sans code-barres avec gros prix
  // 2. 'product_price_only' : Étiquette du produit avec SEULEMENT le prix
  const [labelFormat, setLabelFormat] = useState<'shelf_label' | 'product_price_only'>('shelf_label');
  const [showStoreName, setShowStoreName] = useState(true);
  const [showReference, setShowReference] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allProds, allCats] = await Promise.all([
        db.products.toArray(),
        db.categories.toArray()
      ]);
      const validProds = allProds.filter(
        (p) => (p.is_active as any) !== false && (p.is_active as any) !== 0 && (p.is_active as any) !== '0'
      );
      setProducts(validProds.length > 0 ? validProds : allProds);
      setCategories(allCats);
    } catch (err) {
      console.error('Erreur chargement articles:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer la liste des articles
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.reference.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat =
      selectedCategory === 'all' || p.category_id === Number(selectedCategory);

    return matchesSearch && matchesCat;
  });

  // Ajouter un article à la sélection
  const handleAddProduct = (product: Product, defaultQty: number = 1) => {
    setSelectedItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + defaultQty }
            : item
        );
      }
      return [...prev, { product, quantity: defaultQty }];
    });
  };

  // Mettre à jour la quantité d'un article sélectionné
  const handleUpdateQuantity = (productId: number, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  // Supprimer un article de la liste
  const handleRemoveItem = (productId: number) => {
    setSelectedItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Tout vider
  const handleClearAll = () => {
    setSelectedItems([]);
  };

  // Toggle de cocher un article
  const handleToggleCheckProduct = (productId: number) => {
    setCheckedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  // Cocher / décocher tous les articles filtrés
  const handleToggleCheckAll = () => {
    const allFilteredIds = filteredProducts.map((p) => p.id!);
    const areAllChecked = allFilteredIds.every((id) => checkedProductIds.includes(id));

    if (areAllChecked) {
      setCheckedProductIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setCheckedProductIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // Ajouter tous les articles cochés à la planche d'impression
  const handleAddCheckedToPrint = (useStockQty: boolean = false) => {
    const selectedProds = products.filter((p) => checkedProductIds.includes(p.id!));
    if (selectedProds.length === 0) {
      Swal.fire('Information', 'Veuillez cocher au moins un article dans la liste.', 'info');
      return;
    }

    selectedProds.forEach((p) => {
      handleAddProduct(p, useStockQty ? Math.max(1, p.stock_quantity || 1) : 1);
    });

    Swal.fire({
      icon: 'success',
      title: 'Sélection ajoutée',
      text: `${selectedProds.length} article(s) ajouté(s) à la planche d'étiquettes.`,
      timer: 1500,
      showConfirmButton: false
    });

    setCheckedProductIds([]);
    setIsDropdownOpen(false);
  };

  // Total des étiquettes à imprimer
  const totalLabelsCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  // Rendu de l'impression
  const handlePrint = () => {
    if (selectedItems.length === 0) {
      Swal.fire('Attention', 'Veuillez sélectionner au moins un article à imprimer.', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      Swal.fire('Erreur', 'Impossible d’ouvrir la fenêtre d’impression. Autorisez les pop-ups.', 'error');
      return;
    }

    const isProductPriceOnly = labelFormat === 'product_price_only';

    // Génération des éléments HTML des étiquettes
    const labelsHtml = selectedItems
      .flatMap((item) => {
        let singleLabelHtml = '';

        if (isProductPriceOnly) {
          // FORMAT ÉTIQUETTE DU PRODUIT (PLANCHE A4 À DÉCOUPER) : SEULEMENT LE PRIX
          singleLabelHtml = `
            <div class="label-card product_price_only">
              <span class="cut-scissors">✂</span>
              <div class="product-price-only-wrapper">
                <span class="price-val">${item.product.selling_price.toLocaleString('fr-FR')}</span>
                <span class="price-cur">${currency}</span>
              </div>
            </div>
          `;
        } else {
          // FORMAT ÉTIQUETTE DE RAYON (45x26mm) : Le montant prend TOUTE la place disponible en haut, Nom & Magasin en bas
          singleLabelHtml = `
            <div class="label-card shelf_label">
              <div class="big-price-center">
                <span class="price-val">${item.product.selling_price.toLocaleString('fr-FR')}</span>
                <span class="price-cur">${currency}</span>
              </div>

              <div class="shelf-bottom-info">
                <div class="product-name" title="${item.product.name}">${item.product.name}</div>
                <div class="shelf-meta-row">
                  ${showStoreName ? `<span class="store-name">${storeName}</span>` : '<span></span>'}
                  ${showReference ? `<span class="ref">Réf: ${item.product.reference}</span>` : ''}
                </div>
              </div>
            </div>
          `;
        }

        return Array(item.quantity).fill(singleLabelHtml);
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Impression ${labelFormat === 'shelf_label' ? 'Étiquettes de Rayon (45x26mm)' : 'Planche A4 Étiquettes Produit (Découpage)'} - ${storeName}</title>
          <style>
            @page {
              size: ${labelFormat === 'product_price_only' ? 'A4 portrait' : 'auto'};
              margin: ${labelFormat === 'product_price_only' ? '6mm 6mm' : '1.5mm'};
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            body {
              background: #fff;
              color: #000;
              padding: 0;
            }

            /* 1. CONTENEUR RAYON : Défilement libre ou rouleau */
            .labels-container.shelf_mode {
              display: flex;
              flex-wrap: wrap;
              gap: 2mm;
              justify-content: flex-start;
              align-items: flex-start;
            }

            /* 2. CONTENEUR A4 PRODUIT : Grille optimisée 4 colonnes pour découpe massicot/ciseaux */
            .labels-container.a4_mode {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 2mm;
              width: 100%;
            }
            
            /* --- 1. FORMAT ÉTIQUETTE DE RAYON 45x26mm (LE MONTANT PREND TOUTE LA PLACE) --- */
            .label-card.shelf_label {
              width: 45mm;
              height: 26mm;
              border: 1px dashed #64748b;
              border-radius: 2px;
              padding: 1mm 1.5mm 0.5mm 1.5mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              text-align: center;
              page-break-inside: avoid;
              background: #fff;
              box-sizing: border-box;
              overflow: hidden;
            }

            /* MONTANT GÉANT OCCUPANT TOUT L'ESPACE DISPONIBLE */
            .big-price-center {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
              padding: 0;
              line-height: 0.8;
            }
            .big-price-center .price-val {
              font-size: 38px;
              font-weight: 900;
              color: #000;
              font-family: 'Arial Black', Impact, system-ui, -apple-system, sans-serif;
              letter-spacing: -2px;
              line-height: 0.8;
            }
            .big-price-center .price-cur {
              font-size: 11px;
              font-weight: 900;
              color: #000;
              margin-left: 2px;
              align-self: flex-end;
              margin-bottom: 2px;
              line-height: 1;
            }

            /* BAS DE L'ÉTIQUETTE RAYON : NOM PRODUIT ET MAGASIN */
            .shelf-bottom-info {
              border-top: 1.5px solid #000;
              padding-top: 1px;
              margin-top: auto;
            }
            .product-name {
              font-size: 9.5px;
              font-weight: 900;
              color: #000;
              text-align: center;
              line-height: 1.05;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              text-transform: uppercase;
            }
            .shelf-meta-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 7px;
              font-weight: 800;
              color: #334155;
              line-height: 1;
              margin-top: 0.5px;
            }
            .store-name {
              text-transform: uppercase;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .ref {
              font-family: monospace;
              white-space: nowrap;
            }

            /* --- 2. FORMAT PLANCHE A4 DU PRODUIT (DISPOSÉES SUR FEUILLE A4 AVEC POINTILLÉS DE DÉCOUPE) --- */
            .label-card.product_price_only {
              height: 24mm;
              border: 1px dashed #475569;
              border-radius: 2px;
              padding: 2mm 1mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              page-break-inside: avoid;
              background: #fff;
              position: relative;
              box-sizing: border-box;
            }

            .cut-scissors {
              position: absolute;
              top: 1px;
              left: 3px;
              font-size: 8px;
              color: #94a3b8;
              line-height: 1;
            }

            /* PRIX SEUL EN GROS DANS LA VIGNETTE A4 */
            .product-price-only-wrapper {
              display: flex;
              align-items: baseline;
              justify-content: center;
              gap: 2px;
              width: 100%;
            }
            .product-price-only-wrapper .price-val {
              font-size: 32px;
              font-weight: 900;
              color: #000;
              font-family: 'Arial Black', Impact, system-ui, -apple-system, sans-serif;
              letter-spacing: -1.5px;
              line-height: 0.9;
            }
            .product-price-only-wrapper .price-cur {
              font-size: 13px;
              font-weight: 900;
              color: #000;
              margin-left: 2px;
            }

            @media print {
              body {
                padding: 0;
              }
              .label-card {
                border: 1px dashed #64748b !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="labels-container ${labelFormat === 'product_price_only' ? 'a4_mode' : 'shelf_mode'}">
            ${labelsHtml}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 pb-16">
      
      {/* 1. EN-TÊTE DE LA PAGE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center border border-blue-100 shadow-xs flex-shrink-0">
            <Tag className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-900">
                Impression d'Étiquettes Prix & Rayons
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-[#0055b8] border border-blue-200">
                Caissier, Admin & Magasinier
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Générez et imprimez vos étiquettes de rayon (45x26mm) ou vos étiquettes de produit (seulement le prix).
            </p>
          </div>
        </div>

        {/* Bouton d'impression principal */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            disabled={selectedItems.length === 0}
            className="px-5 py-2.5 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer {totalLabelsCount > 0 ? `(${totalLabelsCount} étiquettes)` : ''}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 2. COLONNE GAUCHE : RECHERCHE & SÉLECTION DES ARTICLES (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#0055b8]" />
                <h2 className="text-sm font-black text-slate-900">
                  Catalogue des Articles ({products.length})
                </h2>
              </div>

              {/* MENU DÉROULANT MULTI-SÉLECTION */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0055b8] font-bold text-xs flex items-center gap-2 transition shadow-xs"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>
                    Sélection groupée{' '}
                    {checkedProductIds.length > 0 && `(${checkedProductIds.length} cochés)`}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* CONTENU DE LA LISTE DÉROULANTE */}
                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-black text-xs text-slate-900">
                        Sélectionner plusieurs articles
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(false)}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Recherche dans la liste déroulante */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        placeholder="Filtrer dans la liste..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#0055b8]"
                      />
                    </div>

                    {/* Actions Tout Cocher / Décocher */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <button
                        type="button"
                        onClick={handleToggleCheckAll}
                        className="font-bold text-[#0055b8] hover:underline"
                      >
                        {filteredProducts.every((p) => checkedProductIds.includes(p.id!))
                          ? 'Tout décocher'
                          : 'Tout cocher'}
                      </button>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {checkedProductIds.length} sélectionné(s)
                      </span>
                    </div>

                    {/* Liste scrollable des options déroulantes */}
                    <div className="max-h-60 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100">
                      {products
                        .filter(
                          (p) =>
                            p.name.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
                            (p.barcode && p.barcode.includes(dropdownSearch)) ||
                            p.reference.toLowerCase().includes(dropdownSearch.toLowerCase())
                        )
                        .map((p) => {
                          const isChecked = checkedProductIds.includes(p.id!);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition text-xs ${
                                isChecked ? 'bg-blue-50 font-bold' : 'hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCheckProduct(p.id!)}
                                className="w-4 h-4 rounded text-[#0055b8] focus:ring-0 cursor-pointer"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-slate-900 font-semibold">{p.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {p.selling_price.toLocaleString('fr-FR')} {currency} • Stock:{' '}
                                  {p.stock_quantity || 0}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                    </div>

                    {/* Boutons d'ajout depuis le menu déroulant */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={checkedProductIds.length === 0}
                        onClick={() => handleAddCheckedToPrint(false)}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs transition disabled:opacity-50"
                      >
                        Ajouter (1 ch.)
                      </button>
                      <button
                        type="button"
                        disabled={checkedProductIds.length === 0}
                        onClick={() => handleAddCheckedToPrint(true)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition disabled:opacity-50"
                      >
                        Ajouter (Tout Stock)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Barre de recherche et sélecteur déroulant rapide */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-8 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Recherche rapide (nom, code-barres, référence)..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                </div>

                <div className="sm:col-span-4">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  >
                    <option value="all">Toutes catégories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LISTE DÉROULANTE SIMPLE (SELECT) DES ARTICLES */}
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="text-xs font-bold text-slate-600 whitespace-nowrap">
                  Choisir un article :
                </label>
                <select
                  onChange={(e) => {
                    const prodId = Number(e.target.value);
                    if (!prodId) return;
                    const p = products.find((item) => item.id === prodId);
                    if (p) {
                      handleAddProduct(p, 1);
                    }
                    e.target.value = '';
                  }}
                  defaultValue=""
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0055b8]"
                >
                  <option value="" disabled>
                    -- Cliquez pour dérouler la liste des {products.length} articles --
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.selling_price.toLocaleString('fr-FR')} {currency} (Réf: {p.reference} | Stock: {p.stock_quantity || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* BANDEAU D'ACTION COLLECTIVE SI ARTICLES COCHÉS */}
            {checkedProductIds.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0055b8] animate-pulse"></span>
                  <span className="text-xs font-black text-[#0055b8]">
                    {checkedProductIds.length} article(s) coché(s)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddCheckedToPrint(false)}
                    className="px-3 py-1.5 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+1 étiquette chacun</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddCheckedToPrint(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition active:scale-95"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>+ Selon stock lot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCheckedProductIds([])}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-blue-100"
                    title="Tout décocher"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Liste scrollable des articles avec Cases à Cocher */}
            <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const isSelected = selectedItems.some((item) => item.product.id === p.id);
                const isChecked = checkedProductIds.includes(p.id!);

                return (
                  <div
                    key={p.id}
                    className={`pt-2 first:pt-0 flex items-center justify-between gap-3 p-2.5 rounded-2xl transition ${
                      isChecked
                        ? 'bg-blue-50/80 border border-blue-200'
                        : isSelected
                        ? 'bg-slate-50 border border-slate-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox pour sélection multiple simultanée */}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCheckProduct(p.id!)}
                        className="w-4 h-4 rounded text-[#0055b8] focus:ring-0 cursor-pointer flex-shrink-0"
                      />

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {p.name}
                          </span>
                          {p.barcode && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                              {p.barcode}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                          <span>Réf: <strong className="text-slate-600 font-mono">{p.reference}</strong></span>
                          <span>Stock: <strong className="text-slate-700 font-mono">{p.stock_quantity || 0}</strong></span>
                          <span className="font-black text-[#0055b8] font-mono">
                            {p.selling_price.toLocaleString('fr-FR')} {currency}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAddProduct(p, 1)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 transition active:scale-95"
                        title="Ajouter 1 étiquette"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>1</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddProduct(p, Math.max(1, p.stock_quantity || 1))}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95"
                        title="Ajouter pour tout le stock en rayon"
                      >
                        <span>Lot ({p.stock_quantity || 1})</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs font-medium">
                  Aucun article ne correspond à votre recherche.
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 3. COLONNE DROITE : SÉLECTION, OPTIONS & APERÇU (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Bloc Articles Sélectionnés */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#0055b8]" />
                <h2 className="text-sm font-black text-slate-900">
                  Étiquettes à Imprimer ({totalLabelsCount})
                </h2>
              </div>

              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Tout retirer</span>
                </button>
              )}
            </div>

            {/* Liste des sélectionnés */}
            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
              {selectedItems.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 truncate">
                      {item.product.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {item.product.selling_price.toLocaleString('fr-FR')} {currency}
                    </p>
                  </div>

                  {/* Contrôle Quantité */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.product.id!, item.quantity - 1)}
                      className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateQuantity(item.product.id!, parseInt(e.target.value, 10) || 1)
                      }
                      className="w-10 text-center font-mono font-bold text-xs bg-white border border-slate-200 rounded-md py-0.5 focus:outline-none focus:border-[#0055b8]"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.product.id!, item.quantity + 1)}
                      className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.product.id!)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {selectedItems.length === 0 && (
                <div className="py-6 text-center text-slate-400 text-xs font-medium">
                  Cliquez sur "+" sur un article pour l'ajouter à votre planche d'impression.
                </div>
              )}
            </div>

            {/* Options de format d'étiquette */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Choix du format d'étiquette :
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* 1. ÉTIQUETTE DE RAYON (45x26mm) */}
                <button
                  type="button"
                  onClick={() => setLabelFormat('shelf_label')}
                  className={`p-2.5 rounded-xl text-xs font-black border text-center transition flex flex-col items-center justify-center gap-1 ${
                    labelFormat === 'shelf_label'
                      ? 'bg-blue-50 border-[#0055b8] text-[#0055b8] shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>🏷️ Étiquette de rayon</span>
                  <span className="text-[10px] font-semibold text-slate-500">(45x26mm • Gros Prix)</span>
                </button>

                {/* 2. ÉTIQUETTE DU PRODUIT (SEULEMENT LE PRIX) */}
                <button
                  type="button"
                  onClick={() => setLabelFormat('product_price_only')}
                  className={`p-2.5 rounded-xl text-xs font-black border text-center transition flex flex-col items-center justify-center gap-1 ${
                    labelFormat === 'product_price_only'
                      ? 'bg-blue-50 border-[#0055b8] text-[#0055b8] shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>💰 Étiquette du produit</span>
                  <span className="text-[10px] font-semibold text-slate-500">(Prix seul • Planche à découper)</span>
                </button>
              </div>

              {/* Toggles d'affichage pour l'étiquette de rayon */}
              {labelFormat === 'shelf_label' && (
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-semibold text-slate-700 animate-in fade-in duration-100">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showStoreName}
                      onChange={(e) => setShowStoreName(e.target.checked)}
                      className="rounded text-[#0055b8] focus:ring-0"
                    />
                    <span>Nom du Magasin</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showReference}
                      onChange={(e) => setShowReference(e.target.checked)}
                      className="rounded text-[#0055b8] focus:ring-0"
                    />
                    <span>Référence article</span>
                  </label>
                </div>
              )}
            </div>

          </div>

          {/* Aperçu d'une étiquette (Live Preview) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-[#0055b8]" />
              <h3 className="text-xs font-black text-slate-900">
                Aperçu : {labelFormat === 'shelf_label' ? 'Étiquette de rayon (45x26mm)' : 'Étiquette du produit (Seulement le prix)'}
              </h3>
            </div>

            {selectedItems.length > 0 ? (
              <div className="flex justify-center py-3">
                {labelFormat === 'shelf_label' ? (
                  /* APERÇU ÉTIQUETTE DE RAYON 45x26mm (Montant Géant occupant tout l'espace haut, Nom & Magasin en bas) */
                  <div className="w-[200px] h-[120px] bg-white border-2 border-dashed border-slate-400 rounded-lg p-2 shadow-xs flex flex-col justify-between text-center">
                    {/* MONTANT OCCUPANT TOUT L'ESPACE */}
                    <div className="flex-1 flex items-center justify-center gap-1">
                      <span className="font-mono font-black text-4xl text-slate-950 tracking-tight leading-none">
                        {selectedItems[0].product.selling_price.toLocaleString('fr-FR')}
                      </span>
                      <span className="font-black text-xs text-slate-900 self-end mb-1">{currency}</span>
                    </div>

                    {/* NOM PRODUIT & MAGASIN EN BAS */}
                    <div className="border-t-2 border-slate-950 pt-1 space-y-0.5">
                      <div className="text-[10px] font-black uppercase text-slate-950 leading-tight truncate">
                        {selectedItems[0].product.name}
                      </div>
                      <div className="flex items-center justify-between text-[8px] font-bold text-slate-600">
                        {showStoreName && (
                          <span className="uppercase tracking-wider truncate max-w-[100px]">
                            {storeName}
                          </span>
                        )}
                        {showReference && (
                          <span className="font-mono text-slate-500">
                            Réf: {selectedItems[0].product.reference}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* APERÇU ÉTIQUETTE DU PRODUIT : PLANCHE A4 AVEC TRAIT DE DÉCOUPE */
                  <div className="w-[180px] h-[100px] bg-white border-2 border-dashed border-slate-500 rounded-lg p-3 shadow-xs relative flex items-center justify-center text-center">
                    <span className="absolute top-1 left-2 text-[10px] text-slate-400">✂ Découpe</span>
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span className="font-mono font-black text-3xl text-slate-950 tracking-tight leading-none">
                        {selectedItems[0].product.selling_price.toLocaleString('fr-FR')}
                      </span>
                      <span className="font-black text-xs text-slate-700">{currency}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs font-medium">
                Ajoutez un article pour voir l'aperçu réel de l'étiquette.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default BarcodeLabels;

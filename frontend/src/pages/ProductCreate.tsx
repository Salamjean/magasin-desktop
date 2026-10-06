import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Category, Supplier } from '../db/db';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  ArrowLeft,
  Barcode,
  Sparkles,
  ShoppingBag,
  Coins,
  Check,
  Camera,
  Scan,
  X
} from 'lucide-react';
import Swal from 'sweetalert2';
import { resizeImage } from '../utils/imageUtils';

export const ProductCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Étape : 'choose' (écran de scan préalable) ou 'form' (fiche produit complète)
  const [step, setStep] = useState<'choose' | 'form'>('choose');
  const [isManualBarcode, setIsManualBarcode] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Scan input dans l'écran de choix
  const [scannedBarcode, setScannedBarcode] = useState('');
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Données du formulaire
  const [formData, setFormData] = useState({
    name: '',
    reference: '',
    barcode: '',
    category_id: '',
    supplier_id: '',
    description: '',
    selling_price: '' as number | string,
    purchase_price: '' as number | string,
    stock_quantity: 0,
    min_stock: 5,
    unit: 'pièce',
    image: '',
    is_active: true
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategoriesAndSuppliers();
  }, []);

  // Autofocus sur le champ de scan quand on est sur l'écran 'choose'
  useEffect(() => {
    if (step === 'choose' && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [step]);

  const loadCategoriesAndSuppliers = async () => {
    const [cats, sups] = await Promise.all([
      db.categories.toArray(),
      db.suppliers.toArray()
    ]);
    setCategories(cats);
    setSuppliers(sups);
  };

  // Action : Scan validé
  const handleValidateScan = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      Swal.fire('Attention', 'Veuillez scanner ou saisir un code-barres.', 'warning');
      return;
    }

    // Vérifier si le produit existe déjà en base
    const existing = await db.products.where('barcode').equals(trimmed).first();
    if (existing) {
      const res = await Swal.fire({
        icon: 'info',
        title: 'Article déjà existant !',
        text: `Ce code-barres (${trimmed}) est déjà associé à l'article "${existing.name}". Souhaitez-vous continuer ou modifier l'existant ?`,
        showCancelButton: true,
        confirmButtonText: 'Continuer la création',
        cancelButtonText: 'Voir le produit',
        confirmButtonColor: '#0055b8'
      });

      if (!res.isConfirmed) {
        navigate(`/products/edit/${existing.id}`);
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      barcode: trimmed,
      reference: prev.reference || `ART-${Math.floor(1000 + Math.random() * 9000)}`
    }));
    setIsManualBarcode(false);
    setStep('form');
  };

  // Action : Choisir la saisie manuelle avec génération du code-barres en arrière-plan
  const handleChooseManual = () => {
    const randomBarcode = `618${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const randomRef = `ART-${Math.floor(1000 + Math.random() * 9000)}`;

    setFormData((prev) => ({
      ...prev,
      barcode: randomBarcode,
      reference: prev.reference || randomRef
    }));
    setIsManualBarcode(true);
    setStep('form');
  };

  // Gestion de l'image
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Image trop lourde', "La taille maximale de l'image est de 5 Mo.", 'warning');
        return;
      }
      try {
        const compressedDataUrl = await resizeImage(file, 800, 800, 0.85);
        setFormData((prev) => ({ ...prev, image: compressedDataUrl }));
      } catch (err) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFormData((prev) => ({ ...prev, image: event.target?.result as string }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Enregistrement final du produit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      Swal.fire('Attention', 'Veuillez renseigner le nom du produit.', 'warning');
      return;
    }

    const price = Number(formData.selling_price);
    if (!price || price <= 0) {
      Swal.fire('Attention', 'Veuillez définir un prix de vente valide supérieur à 0 FCFA.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const generatedRef = formData.reference.trim() || `PRD-${Date.now().toString(36).toUpperCase()}`;
      const stockQty = Number(formData.stock_quantity) || 0;

      const newProdId = await db.products.add({
        name: formData.name.trim(),
        reference: generatedRef,
        barcode: formData.barcode.trim(),
        category_id: formData.category_id ? Number(formData.category_id) : undefined,
        supplier_id: formData.supplier_id ? Number(formData.supplier_id) : undefined,
        purchase_price: Number(formData.purchase_price) || 0,
        selling_price: price,
        stock_quantity: stockQty,
        min_stock: Number(formData.min_stock) || 5,
        unit: formData.unit || 'pcs',
        image: formData.image || undefined,
        is_active: formData.is_active,
        user_id: user?.id || 1,
        created_at: new Date().toISOString(),
        synced: 0
      });

      // Création automatique du mouvement de stock initial si quantité définie
      if (stockQty > 0 && newProdId) {
        await db.stock_movements.add({
          product_id: Number(newProdId),
          type: 'in',
          quantity: stockQty,
          reference: `INIT-${generatedRef}`,
          reason: 'Stock initial à la création du produit',
          user_id: user?.id || 1,
          created_at: new Date().toISOString(),
          synced: 0
        });
      }

      await Swal.fire({
        icon: 'success',
        title: 'Article enregistré !',
        text: `L'article "${formData.name}" a été ajouté avec succès au catalogue.`,
        timer: 1800,
        showConfirmButton: false
      });

      navigate('/products');
    } catch (err: any) {
      Swal.fire('Erreur', err.message || "Une erreur est survenue lors de l'enregistrement.", 'error');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // ÉCRAN 1 : SCANNER OU ENREGISTREMENT MANUEL (DESIGN TERMINAL MODERNE)
  // --------------------------------------------------------------------------
  if (step === 'choose') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-150 py-2">
        {/* En-tête Moderne */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
              <Scan className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <span>Catalogue Produits</span>
                <span>/</span>
                <span className="text-slate-600 font-bold">Nouveau Produit</span>
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Identification de l'Article</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/products')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-sm transition active:scale-95 self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour au catalogue</span>
          </button>
        </div>

        {/* Bloc Central : Terminal de Scan Douchette (Thème Clair & Lumineux) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle space-y-6 text-center">
          {/* Viseur de Scan Stylisé Clair */}
          <div className="relative mx-auto max-w-md bg-gradient-to-b from-blue-50/90 via-white to-blue-50/50 rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden border-2 border-blue-200/80">
            {/* Ligne Laser de Scan Bleue Animée */}
            <div className="absolute inset-x-8 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-[#0055b8] to-transparent animate-pulse shadow-[0_0_14px_rgba(0,85,184,0.7)]" />

            {/* Coins de visée bleu roi */}
            <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-[#0055b8] rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-[#0055b8] rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-[#0055b8] rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-[#0055b8] rounded-br-lg" />

            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase tracking-wider shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Lecteur Actif • Prêt à scanner
              </div>

              <div className="py-2 flex justify-center">
                <Barcode className="w-16 h-16 text-[#0055b8]" />
              </div>

              <div>
                <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
                  Pointez votre douchette sur l'article
                </h3>
                <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto mt-0.5">
                  Le code-barres s'insère automatiquement dès le bip du scanner.
                </p>
              </div>
            </div>
          </div>

          {/* Champ de Scan / Saisie Rapide */}
          <div className="max-w-md mx-auto space-y-3">
            <div className="relative">
              <input
                ref={scanInputRef}
                type="text"
                value={scannedBarcode}
                onChange={(e) => setScannedBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleValidateScan(scannedBarcode);
                  }
                }}
                placeholder="Ex: 3017620422003..."
                className="w-full pl-5 pr-28 py-3.5 rounded-2xl bg-slate-50 border-2 border-blue-300 text-sm font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0055b8] focus:bg-white transition shadow-inner text-center sm:text-left"
              />

              <button
                type="button"
                onClick={() => handleValidateScan(scannedBarcode)}
                disabled={!scannedBarcode.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-[#0055b8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-40 shadow-sm"
              >
                Continuer
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Astuce : appuyez sur <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono font-bold text-slate-600">Entrée</kbd> pour valider instantanément.
            </p>
          </div>

          {/* Séparateur élégant */}
          <div className="relative py-2 max-w-lg mx-auto">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-400">
              <span className="bg-white px-4">OU SI L'ARTICLE N'A PAS DE CODE-BARRES</span>
            </div>
          </div>

          {/* Option : Génération automatique / Saisie manuelle */}
          <div className="max-w-lg mx-auto p-5 rounded-3xl bg-blue-50/50 border border-blue-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-left hover:border-blue-400 transition">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white text-amber-500 border border-blue-100 flex items-center justify-center font-bold shadow-sm flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Enregistrer manuellement</h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Attribution automatique d'un code-barres unique en arrière-plan.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleChooseManual}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95 whitespace-nowrap"
            >
              Créer sans code
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // ÉCRAN 2 : FICHE DU PRODUIT (DESIGN EXACT DU MOCKUP FOURNI)
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-150">
      {/* En-tête de la page */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-0.5">
            <button
              type="button"
              onClick={() => setStep('choose')}
              className="hover:text-[#0055b8] transition font-bold"
            >
              ← Re-scanner
            </button>
            <span>&gt;</span>
            <span className="text-slate-600 font-bold">Fiche produit</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Compléter les informations du produit
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Renseignez le nom, prix de vente et stock initial.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setScannedBarcode('');
            setStep('choose');
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs transition active:scale-95 self-start sm:self-auto border border-slate-200/80"
        >
          <Barcode className="w-4 h-4 text-slate-600" />
          <span>Changer / Re-scanner</span>
        </button>
      </div>

      {/* Formulaire Principal */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Colonne de Gauche : Image & Code-barres */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card : Image du produit */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle text-center space-y-4">
              <h3 className="text-[11px] font-black tracking-wider text-slate-400 uppercase">
                IMAGE DU PRODUIT
              </h3>

              {/* Zone d'image avec pointillés */}
              <div className="relative mx-auto w-44 h-44 rounded-3xl border-2 border-dashed border-blue-400 bg-blue-50/30 flex flex-col items-center justify-center p-4 overflow-hidden group">
                {formData.image ? (
                  <>
                    <img
                      src={formData.image}
                      alt="Aperçu"
                      className="w-full h-full object-contain rounded-2xl"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: '' })}
                      className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700 transition"
                      title="Supprimer la photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-300">
                      <Package className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-slate-400">Aucune image</span>
                  </div>
                )}

                {/* Bouton caméra sur le bord */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-[#0055b8] text-white flex items-center justify-center shadow-md hover:bg-blue-700 transition active:scale-95"
                  title="Téléverser une image"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />

              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-500">Formats : JPG, PNG, WebP</p>
                <p className="text-[10px] text-slate-400">Taille max : 2 Mo</p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
              >
                Choisir une image
              </button>
            </div>

            {/* Card : Code-barres */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-subtle space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Barcode className="w-4 h-4 text-[#0055b8]" />
                <span>{isManualBarcode ? 'Code-barres Automatique' : 'Code-barres Scanné'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-slate-800 truncate mr-2">
                  {isManualBarcode ? 'Attribution auto' : formData.barcode}
                </span>
                <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-[#0055b8] text-[10px] font-black whitespace-nowrap">
                  {isManualBarcode ? 'Généré Auto' : 'Code Scanné'}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                {isManualBarcode
                  ? "Code unique et étiquette générés automatiquement à l'enregistrement."
                  : 'Code-barres scanné enregistré et rattaché à cet article.'}
              </p>
            </div>
          </div>

          {/* Colonne de Droite : Fiche Informations & Tarification */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card : Désignation & Classification */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-subtle space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 tracking-tight">
                    Désignation & Classification
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Nom de l'article, catégorie et fournisseur
                  </p>
                </div>
              </div>

              {/* Nom du produit */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Nom du produit <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <ShoppingBag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Riz Parfumé Dinor 5Kg, Eau Minérale Awa 1.5L..."
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Rayon / Catégorie & Fournisseur */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Rayon / Catégorie
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3.5 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0055b8] focus:bg-white transition cursor-pointer"
                  >
                    <option value="">Sélectionner un rayon</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Fournisseur
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-3.5 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0055b8] focus:bg-white transition cursor-pointer"
                  >
                    <option value="">Aucun fournisseur associé</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Description <span className="text-slate-400 font-normal">(optionnelle)</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brève description ou caractéristiques du produit..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0055b8] focus:bg-white transition resize-none"
                />
              </div>
            </div>

            {/* Card : Tarification & Stock Initial */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-subtle space-y-5">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 tracking-tight">
                    Tarification & Stock Initial
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Définissez le prix de vente et les quantités de stock
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Prix Unitaire (Vente) */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Prix Unitaire (Vente) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                      placeholder="Ex: 1500"
                      className="w-full pl-3.5 pr-14 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs font-mono font-black text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      FCFA
                    </span>
                  </div>
                </div>

                {/* Stock Initial */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Stock Initial
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full pl-3.5 pr-14 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                      unités
                    </span>
                  </div>
                </div>

                {/* Seuil d'alerte rupture */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Seuil d'alerte rupture
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                      placeholder="5"
                      className="w-full pl-3.5 pr-14 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                      unités
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'action en bas */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-6 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{loading ? 'Enregistrement...' : 'Enregistrer le produit'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

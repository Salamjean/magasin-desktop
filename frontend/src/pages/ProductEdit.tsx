import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, Category, Supplier } from '../db/db';
import {
  Package,
  Barcode,
  ShoppingBag,
  Coins,
  Check,
  Camera,
  X,
  Lock
} from 'lucide-react';
import Swal from 'sweetalert2';
import { resizeImage } from '../utils/imageUtils';
import { syncService } from '../db/syncService';

export const ProductEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadProductAndData();
  }, [id]);

  const loadProductAndData = async () => {
    if (!id) {
      navigate('/products');
      return;
    }
    const [prod, cats, sups] = await Promise.all([
      db.products.get(Number(id)),
      db.categories.toArray(),
      db.suppliers.toArray()
    ]);

    if (!prod) {
      Swal.fire('Erreur', 'Article introuvable.', 'error');
      navigate('/products');
      return;
    }

    setCategories(cats);
    setSuppliers(sups);
    setFormData({
      name: prod.name || '',
      reference: prod.reference || '',
      barcode: prod.barcode || '',
      category_id: prod.category_id ? String(prod.category_id) : '',
      supplier_id: prod.supplier_id ? String(prod.supplier_id) : '',
      description: '',
      selling_price: prod.selling_price || '',
      purchase_price: prod.purchase_price || '',
      stock_quantity: prod.stock_quantity || 0,
      min_stock: prod.min_stock || 5,
      unit: prod.unit || 'pièce',
      image: prod.image || '',
      is_active: prod.is_active ?? true
    });
    setInitialLoading(false);
  };

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
      await db.products.update(Number(id), {
        name: formData.name.trim(),
        reference: formData.reference.trim(),
        barcode: formData.barcode.trim(),
        category_id: formData.category_id ? Number(formData.category_id) : undefined,
        supplier_id: formData.supplier_id ? Number(formData.supplier_id) : undefined,
        purchase_price: Number(formData.purchase_price) || 0,
        selling_price: price,
        min_stock: Number(formData.min_stock) || 5,
        unit: formData.unit || 'pièce',
        image: formData.image || undefined,
        is_active: formData.is_active,
        synced: 0
      });

      // Synchronisation immédiate avec le serveur
      syncService.syncNow().catch((err) => console.warn('Sync error:', err));

      await Swal.fire({
        icon: 'success',
        title: 'Article mis à jour !',
        text: `L'article "${formData.name}" a été modifié avec succès.`,
        timer: 1800,
        showConfirmButton: false
      });

      navigate('/products');
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Une erreur est survenue lors de la mise à jour.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0055b8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-150">
      {/* En-tête de la page */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-0.5">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="hover:text-[#0055b8] transition font-bold"
            >
              ← Catalogue Produits
            </button>
            <span>&gt;</span>
            <span className="text-slate-600 font-bold">Modifier l'article</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Modifier la Fiche Produit
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Mettez à jour les informations, prix de vente et stock.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/products')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-sm transition active:scale-95 self-start sm:self-auto"
        >
          <span>Retour au catalogue</span>
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
                Changer l'image
              </button>
            </div>

            {/* Card : Code-barres */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-subtle space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Barcode className="w-4 h-4 text-[#0055b8]" />
                <span>Code-barres Enregistré</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="font-mono font-bold text-xs text-slate-800 bg-transparent focus:outline-none w-full mr-2"
                />
                <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-[#0055b8] text-[10px] font-black whitespace-nowrap">
                  Code-barres
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Identifiant unique pour les scans caisse et l'impression des étiquettes.
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

                {/* Stock Actuel (Verrouillé) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                      Stock Actuel
                    </label>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <Lock className="w-2.5 h-2.5" />
                      Verrouillé
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      readOnly
                      disabled
                      value={formData.stock_quantity}
                      className="w-full pl-3.5 pr-14 py-3 rounded-2xl bg-slate-100/90 border border-slate-200 text-xs font-mono font-bold text-slate-500 cursor-not-allowed select-none"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {formData.unit || 'unités'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
                    Le stock s'ajuste via les entrées/réceptions, ventes ou inventaires.
                  </p>
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
            <span>{loading ? 'Mise à jour...' : 'Mettre à jour le produit'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

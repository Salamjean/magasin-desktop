import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, Supplier, Purchase, Product, Category } from '../db/db';
import {
  Building2,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Hash,
  ShoppingCart,
  Edit2,
  FileText,
  CheckCircle2,
  Clock,
  Package,
  Search,
  Layers
} from 'lucide-react';

interface SuppliedProductInfo {
  product: Product;
  category?: Category;
  totalQuantitySupplied: number;
  lastPurchasePrice: number;
  lastPurchaseDate?: string;
}

export const SupplierDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliedProducts, setSuppliedProducts] = useState<SuppliedProductInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'info'>('products');
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSupplierData();
  }, [id]);

  const loadSupplierData = async () => {
    if (!id) {
      navigate('/suppliers');
      return;
    }
    const supId = Number(id);
    const s = await db.suppliers.get(supId);
    if (!s) {
      navigate('/suppliers');
      return;
    }

    const allPurchases = await db.purchases.toArray();
    const supPurchases = allPurchases.filter((p) => p.supplier_id === supId);

    const allPurchaseItems = await db.purchase_items.toArray();
    const allProducts = await db.products.toArray();
    const allCategories = await db.categories.toArray();

    const purchaseIds = new Set(supPurchases.map((p) => p.id));
    const relevantItems = allPurchaseItems.filter((item) => purchaseIds.has(item.purchase_id));

    // Regrouper par produit
    const productsMap = new Map<number, SuppliedProductInfo>();

    // 1. Ajouter d'abord tous les produits directement rattachés à ce fournisseur
    allProducts
      .filter((p) => p.supplier_id === supId)
      .forEach((prod) => {
        const cat = allCategories.find((c) => c.id === prod.category_id);
        productsMap.set(prod.id!, {
          product: prod,
          category: cat,
          totalQuantitySupplied: prod.stock_quantity || 0,
          lastPurchasePrice: prod.purchase_price || 0
        });
      });

    // 2. Enrichir / Ajouter avec les achats enregistrés
    relevantItems.forEach((item) => {
      const prod = allProducts.find((p) => p.id === item.product_id);
      if (!prod) return;

      const parentPurchase = supPurchases.find((p) => p.id === item.purchase_id);
      const cat = allCategories.find((c) => c.id === prod.category_id);

      if (!productsMap.has(prod.id!)) {
        productsMap.set(prod.id!, {
          product: prod,
          category: cat,
          totalQuantitySupplied: item.quantity,
          lastPurchasePrice: item.unit_price,
          lastPurchaseDate: parentPurchase?.created_at
        });
      } else {
        const existing = productsMap.get(prod.id!)!;
        existing.totalQuantitySupplied += item.quantity;
        if (
          parentPurchase?.created_at &&
          (!existing.lastPurchaseDate || new Date(parentPurchase.created_at) > new Date(existing.lastPurchaseDate))
        ) {
          existing.lastPurchaseDate = parentPurchase.created_at;
          existing.lastPurchasePrice = item.unit_price;
        }
      }
    });

    // Si aucun achat n'a été enregistré mais qu'il y a des produits généraux, on peut aussi lister les produits
    setSupplier(s);
    setPurchases(supPurchases);
    setSuppliedProducts(Array.from(productsMap.values()));
    setLoading(false);
  };

  const totalSpent = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const totalItemsSupplied = suppliedProducts.reduce((sum, sp) => sum + sp.totalQuantitySupplied, 0);

  const filteredProducts = suppliedProducts.filter(
    (sp) =>
      sp.product.name.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
      (sp.product.reference || '').toLowerCase().includes(searchProductQuery.toLowerCase()) ||
      (sp.product.barcode || '').toLowerCase().includes(searchProductQuery.toLowerCase())
  );

  if (loading || !supplier) {
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
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white font-black flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0 text-base">
            {supplier.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <span>Fournisseurs & Partenaires</span>
              <span>/</span>
              <span className="text-slate-600 font-bold">{supplier.name}</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{supplier.name}</h1>
            <p className="text-xs text-slate-500 font-medium">
              {supplier.contact_name ? `Contact : ${supplier.contact_name}` : 'Partenaire de réapprovisionnement'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/suppliers/edit/${supplier.id}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-[#0055b8] font-bold text-xs transition active:scale-95"
          >
            <Edit2 className="w-4 h-4" />
            <span>Modifier la fiche</span>
          </button>
          <button
            onClick={() => navigate('/suppliers')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-sm transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux fournisseurs</span>
          </button>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-subtle flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Articles Fournis</p>
            <p className="text-lg font-black text-slate-900">{suppliedProducts.length} référence(s)</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-subtle flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Volume Total d'Achats</p>
            <p className="text-lg font-black text-slate-900">{totalSpent.toLocaleString()} FCFA</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-subtle flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Téléphone Contact</p>
            <p className="text-sm font-black text-slate-900 truncate">{supplier.phone || 'Non renseigné'}</p>
          </div>
        </div>
      </div>

      {/* Navigation par Onglets */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition ${
            activeTab === 'products'
              ? 'bg-[#0055b8] text-white shadow-md shadow-blue-500/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Produits Fournis ({suppliedProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition ${
            activeTab === 'orders'
              ? 'bg-[#0055b8] text-white shadow-md shadow-blue-500/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Bons d'Achat & Réceptions ({purchases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition ${
            activeTab === 'info'
              ? 'bg-[#0055b8] text-white shadow-md shadow-blue-500/25'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Coordonnées & Informations</span>
        </button>
      </div>

      {/* Contenu de l'onglet : Produits Fournis */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchProductQuery}
                onChange={(e) => setSearchProductQuery(e.target.value)}
                placeholder="Rechercher parmi les articles fournis par ce fournisseur..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#0055b8] transition"
              />
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl whitespace-nowrap self-end sm:self-auto">
              {filteredProducts.length} article(s) trouvé(s)
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <Package className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">Aucun produit rattaché</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {searchProductQuery
                  ? 'Aucun article ne correspond à votre recherche.'
                  : "Les articles livrés lors de l'enregistrement de bons d'achat avec ce fournisseur s'afficheront automatiquement ici."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Article Fourni</th>
                    <th className="py-3.5 px-5">Réf / Code-barres</th>
                    <th className="py-3.5 px-5">Rayon / Catégorie</th>
                    <th className="py-3.5 px-5 text-right">Dernier Prix Achat</th>
                    <th className="py-3.5 px-5 text-right">Prix Vente</th>
                    <th className="py-3.5 px-5 text-center">Quantité Livrée</th>
                    <th className="py-3.5 px-5 text-center">Stock Boutique</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredProducts.map(({ product: p, category, totalQuantitySupplied, lastPurchasePrice }) => (
                    <tr key={p.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3.5 px-5 flex items-center gap-3">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[11px] text-slate-400 font-normal">Unité : {p.unit || 'pièce'}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 font-mono text-[11px]">
                        {p.reference || p.barcode || '-'}
                      </td>
                      <td className="py-3.5 px-5">
                        {category ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white"
                            style={{ backgroundColor: category.color || '#0055b8' }}
                          >
                            <Layers className="w-3 h-3" />
                            {category.name}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right font-black text-slate-800">
                        {lastPurchasePrice ? `${lastPurchasePrice.toLocaleString()} FCFA` : `${(p.purchase_price || 0).toLocaleString()} FCFA`}
                      </td>
                      <td className="py-3.5 px-5 text-right font-black text-[#0055b8]">
                        {(p.selling_price || 0).toLocaleString()} FCFA
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-50 text-[#0055b8]">
                          {totalQuantitySupplied} {p.unit || 'pcs'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            (p.stock_quantity || 0) <= 0
                              ? 'bg-rose-100 text-rose-700'
                              : (p.stock_quantity || 0) <= (p.min_stock || 5)
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {p.stock_quantity || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Contenu de l'onglet : Bons d'Achat & Réceptions */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
          <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Historique des Approvisionnements</h3>
              <p className="text-xs text-slate-500">Bons d'achat et livraisons passées avec ce fournisseur</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
              {purchases.length} enregistrement(s)
            </span>
          </div>

          {purchases.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">Aucun achat enregistré</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Aucun bon d'achat n'a encore été rattaché à ce fournisseur.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Référence</th>
                    <th className="py-3.5 px-5">Date d'émission</th>
                    <th className="py-3.5 px-5 text-right">Montant Total</th>
                    <th className="py-3.5 px-5 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3.5 px-5 font-mono font-bold text-[#0055b8]">
                        {p.reference}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500">
                        {new Date(p.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-5 text-right font-black text-slate-900">
                        {(p.total_amount || 0).toLocaleString()} FCFA
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            p.status === 'received'
                              ? 'bg-emerald-100 text-emerald-700'
                              : p.status === 'ordered'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {p.status === 'received' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {p.status === 'received' ? 'Reçu' : p.status === 'ordered' ? 'Commandé' : 'Partiel'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Contenu de l'onglet : Coordonnées & Informations */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Coordonnées & Informations Commerciales
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
              <p className="text-[10px] text-slate-400 uppercase font-black">Téléphone</p>
              <p className="text-slate-800 flex items-center gap-1.5 font-bold">
                <Phone className="w-3.5 h-3.5 text-[#0055b8]" />
                {supplier.phone || '-'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
              <p className="text-[10px] text-slate-400 uppercase font-black">Email</p>
              <p className="text-slate-800 flex items-center gap-1.5 font-bold truncate">
                <Mail className="w-3.5 h-3.5 text-[#0055b8]" />
                {supplier.email || '-'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
              <p className="text-[10px] text-slate-400 uppercase font-black">Numéro Fiscal (IFU)</p>
              <p className="text-slate-800 flex items-center gap-1.5 font-bold">
                <Hash className="w-3.5 h-3.5 text-[#0055b8]" />
                {supplier.tax_number || '-'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
              <p className="text-[10px] text-slate-400 uppercase font-black">Adresse</p>
              <p className="text-slate-800 flex items-center gap-1.5 font-bold truncate">
                <MapPin className="w-3.5 h-3.5 text-[#0055b8]" />
                {supplier.address || '-'}
              </p>
            </div>
          </div>

          {supplier.notes && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
              <p className="text-[10px] text-slate-400 uppercase font-black">Notes & Conditions</p>
              <p className="text-xs text-slate-700 whitespace-pre-line font-medium leading-relaxed">
                {supplier.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

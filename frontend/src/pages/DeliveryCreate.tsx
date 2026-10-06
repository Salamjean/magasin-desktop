import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db, Product, Customer, User, Sale, SaleItem } from '../db/db';
import { useAuth } from '../context/AuthContext';
import {
  Bike,
  ArrowLeft,
  Package,
  Receipt,
  Gift,
  Plus,
  Trash2,
  MapPin,
  Send,
  UserCheck,
  Building,
  Phone,
  FileText,
  Search,
  ChevronDown,
  X,
  Check
} from 'lucide-react';
import Swal from 'sweetalert2';

interface DeliveryItemRow {
  product_id?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export const DeliveryCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mode de contenu : 'free' (Articles Non Achetés / Colis libre) ou 'sale' (Articles Achetés / Lié à une vente)
  const [deliveryType, setDeliveryType] = useState<'free' | 'sale'>('free');

  // Données de base
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [livreurs, setLivreurs] = useState<User[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Sélection d'article pour colis libre avec recherche intégrée
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [packageItems, setPackageItems] = useState<DeliveryItemRow[]>([]);

  // Sélection de vente liée
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');

  // Destinataire & Paramètres
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [amountToCollect, setAmountToCollect] = useState<number>(0);
  const [assignedLivreurId, setAssignedLivreurId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const location = useLocation();

  useEffect(() => {
    loadBaseData();
  }, []);

  const loadBaseData = async () => {
    setLoading(true);
    try {
      const prods = await db.products.toArray();
      const custs = await db.customers.toArray();
      const livs = await db.users.where('role').equals('livreur').toArray();
      const allUsers = await db.users.toArray();
      const sales = await db.sales.reverse().limit(50).toArray();

      setProducts(prods.filter((p) => p.is_active !== false));
      setCustomers(custs);
      setLivreurs(livs.length > 0 ? livs : allUsers);
      setRecentSales(sales);

      // Vérifier si un saleId a été transmis via location.state ou query params
      const searchParams = new URLSearchParams(window.location.search);
      const passedSaleId = (location.state as any)?.saleId || searchParams.get('sale_id');
      if (passedSaleId) {
        setDeliveryType('sale');
        setTimeout(() => {
          handleSaleSelect(String(passedSaleId));
        }, 100);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Sélection d'un client existant -> préremplir nom, téléphone et adresse
  const handleCustomerSelect = (custIdStr: string) => {
    setSelectedCustomerId(custIdStr);
    if (!custIdStr) return;

    const cust = customers.find((c) => c.id === Number(custIdStr));
    if (cust) {
      setCustomerName(cust.name || '');
      setCustomerPhone(cust.phone || '');
      if (cust.address && !deliveryAddress) {
        setDeliveryAddress(cust.address);
      }
    }
  };

  // Sélection d'une vente existante -> préremplir articles, montant ET sélectionner automatiquement le client lié
  const handleSaleSelect = async (saleIdStr: string) => {
    setSelectedSaleId(saleIdStr);
    if (!saleIdStr) {
      setPackageItems([]);
      setSelectedCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setAmountToCollect(0);
      return;
    }

    const saleId = Number(saleIdStr);
    const sale = recentSales.find((s) => s.id === saleId) || (await db.sales.get(saleId));

    if (sale) {
      // 1. Charger les articles du ticket
      const saleItems = await db.sale_items.where('sale_id').equals(sale.id!).toArray();
      const rows: DeliveryItemRow[] = saleItems.map((si) => ({
        product_id: si.product_id,
        product_name: si.product_name,
        quantity: si.quantity,
        unit_price: si.unit_price,
        total: si.subtotal
      }));
      setPackageItems(rows);

      // 2. Sélectionner automatiquement le client lié
      if (sale.customer_id) {
        setSelectedCustomerId(String(sale.customer_id));
        const cust = customers.find((c) => c.id === sale.customer_id) || (await db.customers.get(sale.customer_id));
        if (cust) {
          setCustomerName(cust.name || '');
          setCustomerPhone(cust.phone || '');
          if (cust.address) {
            setDeliveryAddress(cust.address);
          }
        }
      } else {
        setSelectedCustomerId('');
      }

      // 3. Montant restant à recouvrer (ou 0 si déjà payé)
      const remaining = Math.max(0, sale.total_amount - (sale.paid_amount || 0));
      setAmountToCollect(remaining);
    }
  };

  // Ajouter un article au colis (mode colis libre)
  const handleAddProductToPackage = () => {
    if (!selectedProductId) {
      Swal.fire('Attention', 'Veuillez sélectionner un produit du catalogue.', 'warning');
      return;
    }

    const prod = products.find((p) => p.id === Number(selectedProductId));
    if (!prod) return;

    const qty = Math.max(1, addQuantity || 1);

    const existingIndex = packageItems.findIndex((it) => it.product_id === prod.id);
    if (existingIndex > -1) {
      setPackageItems((prev) => {
        const copy = [...prev];
        const newQty = copy[existingIndex].quantity + qty;
        copy[existingIndex] = {
          ...copy[existingIndex],
          quantity: newQty,
          total: newQty * copy[existingIndex].unit_price
        };
        return copy;
      });
    } else {
      const newRow: DeliveryItemRow = {
        product_id: prod.id,
        product_name: prod.name,
        quantity: qty,
        unit_price: prod.selling_price || 0,
        total: qty * (prod.selling_price || 0)
      };
      setPackageItems((prev) => [...prev, newRow]);
    }

    setSelectedProductId('');
    setAddQuantity(1);
  };

  // Supprimer un article du colis
  const handleRemoveItem = (index: number) => {
    setPackageItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Modifier la quantité d'un article du colis
  const handleItemQtyChange = (index: number, newQty: number) => {
    const safeQty = Math.max(1, newQty || 1);
    setPackageItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        quantity: safeQty,
        total: safeQty * copy[index].unit_price
      };
      return copy;
    });
  };

  // Enregistrement de la programmation de livraison
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      Swal.fire('Champ requis', 'Veuillez renseigner le nom du destinataire.', 'warning');
      return;
    }

    if (!customerPhone.trim()) {
      Swal.fire('Champ requis', 'Veuillez renseigner le téléphone de contact du destinataire.', 'warning');
      return;
    }

    if (!deliveryAddress.trim()) {
      Swal.fire('Champ requis', 'Veuillez renseigner l\'adresse exacte ou un repère de livraison.', 'warning');
      return;
    }

    if (!assignedLivreurId) {
      Swal.fire('Champ requis', 'Veuillez obligatoirement sélectionner et assigner un coursier / livreur.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const now = new Date().toISOString();

      await db.deliveries.add({
        sale_id: deliveryType === 'sale' && selectedSaleId ? Number(selectedSaleId) : 0,
        customer_id: selectedCustomerId ? Number(selectedCustomerId) : undefined,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        delivery_address: deliveryAddress.trim(),
        amount_to_collect: Number(amountToCollect) || 0,
        livreur_id: assignedLivreurId ? Number(assignedLivreurId) : undefined,
        status: 'pending',
        otp_code: randomOtp,
        notes: notes.trim() || undefined,
        items_json: JSON.stringify(packageItems),
        delivery_type: deliveryType,
        created_at: now,
        synced: 0
      });

      await Swal.fire({
        icon: 'success',
        title: 'Ordre de Livraison Programmé !',
        html: `
          <div class="text-left text-xs space-y-2 p-2">
            <p><strong>Destinataire :</strong> ${customerName.trim()}</p>
            <p><strong>Téléphone :</strong> ${customerPhone.trim()}</p>
            <p><strong>Adresse :</strong> ${deliveryAddress.trim()}</p>
            <p><strong>Montant à recouvrer :</strong> <span class="font-mono font-bold">${Number(amountToCollect).toLocaleString('fr-FR')} FCFA</span></p>
          </div>
        `,
        confirmButtonText: 'Voir les Livraisons',
        confirmButtonColor: '#0055b8'
      });

      navigate('/deliveries');
    } catch (err: any) {
      Swal.fire('Erreur', err.message || 'Une erreur est survenue.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 pb-16">
      {/* 1. BANDEAU EN-TÊTE DE LA PAGE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
            <Bike className="w-6 h-6 stroke-[2.2]" />
          </div>

          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-400">
              <span>Livraisons</span> <span className="mx-1">/</span> <span className="text-slate-600">Nouvelle programmation</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Programmer un Ordre de Livraison
            </h1>
          </div>
        </div>

        {/* Bouton Retour */}
        <button
          type="button"
          onClick={() => navigate('/deliveries')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95 self-start sm:self-auto flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux livraisons</span>
        </button>
      </div>

      {/* 2. FORMULAIRE EN 2 COLONNES (ARTICLES & CONTENU / DESTINATAIRE & PARAMÈTRES) */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLONNE GAUCHE (ARTICLES & CONTENU) - 5 Cols */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle space-y-5">
            
            {/* Titre de section */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold flex-shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Articles & Contenu
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  Articles achetés ou colis libre non acheté
                </p>
              </div>
            </div>

            {/* 2 Grandes Cartes Onglets Sélecteurs de Mode */}
            <div className="grid grid-cols-2 gap-3">
              {/* Option 1 : Articles Non Achetés */}
              <button
                type="button"
                onClick={() => {
                  setDeliveryType('free');
                  setSelectedSaleId('');
                }}
                className={`p-4 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-2 ${
                  deliveryType === 'free'
                    ? 'bg-blue-50/50 border-[#0055b8] shadow-xs ring-1 ring-[#0055b8]/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    deliveryType === 'free'
                      ? 'bg-[#7c3aed] text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-xs font-black ${deliveryType === 'free' ? 'text-[#0055b8]' : 'text-slate-800'}`}>
                    Articles Non Achetés
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Course / Colis libre / Catalogue
                  </div>
                </div>
              </button>

              {/* Option 2 : Articles Achetés */}
              <button
                type="button"
                onClick={() => {
                  setDeliveryType('sale');
                  setPackageItems([]);
                }}
                className={`p-4 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-2 ${
                  deliveryType === 'sale'
                    ? 'bg-blue-50/50 border-[#0055b8] shadow-xs ring-1 ring-[#0055b8]/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    deliveryType === 'sale'
                      ? 'bg-[#0055b8] text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-xs font-black ${deliveryType === 'sale' ? 'text-[#0055b8]' : 'text-slate-800'}`}>
                    Articles Achetés
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Lié à une vente / ticket
                  </div>
                </div>
              </button>
            </div>

            {/* SI MODE VENTE LIÉE */}
            {deliveryType === 'sale' && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <label className="text-xs font-bold text-slate-700 block">
                  Sélectionner la vente / ticket lié :
                </label>
                <select
                  value={selectedSaleId}
                  onChange={(e) => handleSaleSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                >
                  <option value="">-- Choisir une vente récente ({recentSales.length}) --</option>
                  {recentSales.map((s) => {
                    const cust = s.customer_id ? customers.find((c) => c.id === s.customer_id) : null;
                    return (
                      <option key={s.id} value={s.id}>
                        Ticket #{s.invoice_number || s.id} — {cust ? `Client : ${cust.name} | ` : ''}
                        {s.total_amount.toLocaleString('fr-FR')} FCFA ({new Date(s.created_at).toLocaleDateString('fr-FR')})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* SI MODE COLIS LIBRE / NON ACHETÉ */}
            {deliveryType === 'free' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Ajouter un article du magasin au colis
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    ({products.length} produits disponibles)
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  {/* SELECTEUR AVEC RECHERCHE INTÉGRÉE */}
                  <div className="col-span-7 relative">
                    {/* Bouton d'ouverture du menu de sélection */}
                    <button
                      type="button"
                      onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-left text-slate-800 focus:outline-none focus:border-[#0055b8] flex items-center justify-between gap-2"
                    >
                      <span className="truncate">
                        {selectedProductId ? (
                          (() => {
                            const p = products.find((prod) => prod.id === Number(selectedProductId));
                            return p ? `${p.name} (${p.selling_price.toLocaleString('fr-FR')} FCFA)` : '-- Choisir un produit --';
                          })()
                        ) : (
                          <span className="text-slate-400 font-normal">
                            -- Rechercher ou choisir ({products.length}) --
                          </span>
                        )}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isProductDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* MENU DÉROULANT AVEC CHAMP DE RECHERCHE */}
                    {isProductDropdownOpen && (
                      <>
                        {/* Overlay transparent pour fermer au clic dehors */}
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setIsProductDropdownOpen(false)}
                        />

                        <div className="absolute top-full left-0 mt-1.5 w-full min-w-[320px] bg-white rounded-2xl shadow-xl border border-slate-200 z-30 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-100">
                          {/* CHAMP DE RECHERCHE */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              autoFocus
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              placeholder="Rechercher par nom, code-barres..."
                              className="w-full pl-8 pr-7 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                            />
                            {productSearch && (
                              <button
                                type="button"
                                onClick={() => setProductSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* LISTE DES PRODUITS FILTRÉS */}
                          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                            {products
                              .filter((p) => {
                                if (!productSearch.trim()) return true;
                                const q = productSearch.toLowerCase();
                                return (
                                  p.name.toLowerCase().includes(q) ||
                                  (p.barcode && p.barcode.toLowerCase().includes(q)) ||
                                  (p.reference && p.reference.toLowerCase().includes(q))
                                );
                              })
                              .map((p) => {
                                const isSelected = String(p.id) === selectedProductId;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedProductId(String(p.id));
                                      setIsProductDropdownOpen(false);
                                      setProductSearch('');
                                    }}
                                    className={`w-full p-2.5 rounded-xl text-left transition flex items-center justify-between gap-2 ${
                                      isSelected
                                        ? 'bg-purple-50 text-[#7c3aed] font-bold border border-purple-200'
                                        : 'hover:bg-slate-50 text-slate-800'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold truncate">
                                        {p.name}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                                        <span>Réf: {p.reference || `PRD-${p.id}`}</span>
                                        <span>•</span>
                                        <span className={p.stock_quantity <= p.min_stock ? 'text-amber-600 font-semibold' : 'text-slate-500'}>
                                          Stock: {p.stock_quantity} {p.unit || 'pcs'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="text-right flex-shrink-0 font-mono font-black text-xs text-slate-900">
                                      {p.selling_price.toLocaleString('fr-FR')} F
                                    </div>
                                  </button>
                                );
                              })}

                            {products.filter((p) => {
                              if (!productSearch.trim()) return true;
                              const q = productSearch.toLowerCase();
                              return (
                                p.name.toLowerCase().includes(q) ||
                                (p.barcode && p.barcode.toLowerCase().includes(q)) ||
                                (p.reference && p.reference.toLowerCase().includes(q))
                              );
                            }).length === 0 && (
                              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                                Aucun produit trouvé pour "{productSearch}".
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={addQuantity}
                      onChange={(e) => setAddQuantity(Number(e.target.value))}
                      className="w-full text-center px-2 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                      placeholder="1"
                    />
                  </div>

                  <div className="col-span-3">
                    <button
                      type="button"
                      onClick={handleAddProductToPackage}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-black text-xs transition active:scale-95 shadow-sm flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* LISTE DES ARTICLES DU COLIS */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Articles du colis
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-[#0055b8] border border-blue-100">
                  {packageItems.length} article(s)
                </span>
              </div>

              {/* TABLEAU DES ARTICLES */}
              {packageItems.length > 0 ? (
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] border-b border-slate-100">
                      <tr>
                        <th className="px-3 py-2.5">ARTICLE</th>
                        <th className="px-2 py-2.5 text-center">QTÉ</th>
                        <th className="px-2 py-2.5 text-right">P.U</th>
                        <th className="px-2 py-2.5 text-right">TOTAL</th>
                        <th className="px-2 py-2.5 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {packageItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 font-bold text-slate-900">
                            {item.product_name}
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            {deliveryType === 'free' ? (
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemQtyChange(idx, Number(e.target.value))}
                                className="w-12 text-center py-1 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs"
                              />
                            ) : (
                              <span className="font-mono font-bold">{item.quantity}</span>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-right font-mono text-[11px] text-slate-500">
                            {item.unit_price.toLocaleString('fr-FR')}
                          </td>
                          <td className="px-2 py-2.5 text-right font-mono font-bold text-slate-900 text-xs">
                            {item.total.toLocaleString('fr-FR')}
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            {deliveryType === 'free' && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 px-4 rounded-2xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Aucun article sélectionné. Choisissez des produits ci-dessus.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLONNE DROITE (DESTINATAIRE & PARAMÈTRES) - 7 Cols */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle space-y-5">
            
            {/* Titre de section */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Destinataire & Paramètres
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  Coordonnées de livraison, montant et coursier
                </p>
              </div>
            </div>

            {/* LIGNE 1 : Client existant (Optionnel) | Nom du destinataire * | Téléphone * */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Client existant */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block">
                  Client existant <span className="text-[10px] font-normal text-slate-400">(Optionnel)</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-xs text-slate-800 focus:outline-none focus:border-[#0055b8]"
                  >
                    <option value="">-- Choisir client --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nom du destinataire */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Nom du destinataire <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: Kouadio Marc"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                  />
                </div>
              </div>

              {/* Téléphone de contact */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Téléphone de contact <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Ex: +225 07 00 00 00"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                  />
                </div>
              </div>
            </div>

            {/* LIGNE 2 : Adresse exacte / Repère de livraison * */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Adresse exacte / Repère de livraison <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <textarea
                  required
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Commune, quartier, rue, repère ou indications pour le livreur..."
                  className="w-full pl-10 pr-3.5 py-3 rounded-2xl border border-slate-200 bg-slate-50 font-medium text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                />
              </div>
            </div>

            {/* LIGNE 3 : Montant à recouvrer * | Assigner un coursier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Montant à recouvrer */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Montant à recouvrer <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={amountToCollect}
                    onChange={(e) => setAmountToCollect(Number(e.target.value))}
                    className="w-full pl-4 pr-14 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-black text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
                    placeholder="0"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                    FCFA
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Mettre <strong>0 FCFA</strong> si déjà payé.
                </p>
              </div>

              {/* Assigner un coursier */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Assigner un coursier <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Bike className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    required
                    value={assignedLivreurId}
                    onChange={(e) => setAssignedLivreurId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-xs text-slate-800 focus:outline-none focus:border-[#0055b8]"
                  >
                    <option value="">-- Choisir un coursier obligatoire --</option>
                    {livreurs.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.phone || 'Coursier'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* LIGNE 4 : Instructions / Consignes particulières pour le livreur */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Instructions / Consignes particulières pour le livreur
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Appeler dès l'arrivée au portail, monnaie requise sur 10.000 FCFA..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 font-medium text-xs text-slate-900 focus:outline-none focus:border-[#0055b8]"
              />
            </div>

            {/* PIED DE FORMULAIRE : BOUTONS ANNULER / ENREGISTRER */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/deliveries')}
                className="px-6 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition active:scale-95"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Enregistrement...' : 'Enregistrer la programmation'}</span>
              </button>
            </div>

          </div>
        </div>

      </form>
    </div>
  );
};

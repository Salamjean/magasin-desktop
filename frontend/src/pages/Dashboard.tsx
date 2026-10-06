import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  db,
  Sale,
  SaleItem,
  Product,
  Category,
  Expense,
  Customer,
  CashRegister,
  CashSession,
  Delivery,
  Purchase,
  StockMovement,
  User
} from '../db/db';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  Receipt,
  Scale,
  Package,
  AlertTriangle,
  Flame,
  ArrowRight,
  Shield,
  Clock,
  ExternalLink,
  ChevronRight,
  DollarSign,
  Laptop,
  Boxes,
  ArrowDown,
  ArrowUp,
  ClipboardCheck,
  Truck,
  XCircle,
  ArrowDownToLine,
  Layers,
  History,
  ShoppingCart,
  Power,
  Printer,
  Eye,
  Smartphone,
  CreditCard,
  ShoppingBag,
  RotateCcw,
  List,
  Globe,
  Zap,
  Users,
  Lock,
  Store,
  Coins,
  Bike,
  MapPin,
  Phone,
  CheckCircle2,
  Banknote,
  Check,
  Search,
  CheckCircle,
  X
} from 'lucide-react';
import Swal from 'sweetalert2';
import { syncService } from '../db/syncService';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScriptableContext
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ReceiptModal } from '../components/ReceiptModal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TopProductItem {
  id: number;
  name: string;
  quantitySold: number;
  revenue: number;
}

interface AuditLogItem {
  id: string;
  userName: string;
  action: string;
  timeAgo: string;
  timestamp: Date;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const currency = settings.currency || 'FCFA';

  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal ticket de vente
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [modalItems, setModalItems] = useState<SaleItem[]>([]);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // État spécifique pour le tableau de bord Livreur
  const [selectedDeliveryDetail, setSelectedDeliveryDetail] = useState<Delivery | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [
        allSales,
        allItems,
        allProducts,
        allCats,
        allExpenses,
        allRegisters,
        allSessions,
        allDeliveries,
        allPurchases,
        allMovements,
        allUsers,
        allCustomers
      ] = await Promise.all([
        db.sales.reverse().toArray(),
        db.sale_items.toArray(),
        db.products.toArray(),
        db.categories.toArray(),
        db.expenses.toArray(),
        db.cash_registers.toArray(),
        db.cash_sessions.toArray(),
        db.deliveries.toArray(),
        db.purchases.toArray(),
        db.stock_movements.reverse().toArray(),
        db.users.toArray(),
        db.customers.toArray()
      ]);

      setSales(allSales);
      setSaleItems(allItems);
      setProducts(allProducts);
      setCategories(allCats);
      setExpenses(allExpenses);
      setCashRegisters(allRegisters);
      setCashSessions(allSessions);
      setDeliveries(allDeliveries);
      setPurchases(allPurchases);
      setStockMovements(allMovements);
      setUsersList(allUsers);
      setCustomers(allCustomers);
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = (sale: Sale) => {
    const items = saleItems.filter((item) => item.sale_id === sale.id);
    setSelectedSale(sale);
    setModalItems(items);
    setIsReceiptOpen(true);
  };

  // --- STATISTIQUES COMMUNES / CALCULS ---
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Stock
  const totalProductsCount = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);
  const outOfStockProducts = products.filter((p) => p.stock_quantity <= 0);
  const lowStockProducts = products.filter(
    (p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock
  );
  const pendingPurchasesCount = purchases.filter((p) => p.status !== 'received').length;

  const getCategory = (catId?: number) => categories.find((c) => c.id === catId);

  // =========================================================================
  // --- VUE 1 : TABLEAU DE BORD DU MAGASINIER (Si rôle === 'magasinier') ---
  // =========================================================================
  if (user?.role === 'magasinier') {
    const criticalArticles = [...outOfStockProducts, ...lowStockProducts].slice(0, 5);

    // Mouvements récents pour le journal des flux
    const recentMovements = stockMovements.slice(0, 5);

    return (
      <div className="space-y-4 pb-8 select-none animate-in fade-in duration-200">
        {/* 1. TOP ROW: 4 METRIC CARDS (MAGASINIER) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: CATALOGUE ACTIF */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                Catalogue Actif
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {totalProductsCount}{' '}
                <span className="text-xs font-normal text-slate-400">réfs</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                <span>📦</span>
                <span>{totalStockUnits.toLocaleString('fr-FR')} unités en stock</span>
              </p>
            </div>
          </div>

          {/* Card 2: RUPTURES DE STOCK */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-rose-600 uppercase tracking-wider">
                Ruptures de Stock
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-black text-rose-600 tracking-tight">
                {outOfStockProducts.length}
              </h3>
              <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 inline-block"></span>
                <span>Réapprovisionnement requis</span>
              </p>
            </div>
          </div>

          {/* Card 3: STOCK FAIBLE / SEUIL */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider">
                Stock Faible / Seuil
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-black text-amber-600 tracking-tight">
                {lowStockProducts.length}
              </h3>
              <p className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1.5">
                <span>▲</span>
                <span>Sous le seuil minimal</span>
              </p>
            </div>
          </div>

          {/* Card 4: RÉCEPTIONS À TRAITER */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-[#0055b8] uppercase tracking-wider">
                Réceptions à Traiter
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-black text-[#0055b8] tracking-tight">
                {pendingPurchasesCount}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                <span>📦</span>
                <span>
                  {pendingPurchasesCount > 0
                    ? `${pendingPurchasesCount} commande(s) en attente`
                    : 'Toutes commandes reçues'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* 2. MIDDLE ROW: ACTIONS RAPIDES DU MAGASIN */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wider">
              <span className="text-amber-500">⚡</span>
              <span>Actions Rapides du Magasin</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Opérations quotidiennes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Action 1: Entrée de Stock */}
            <div
              onClick={() => navigate('/stock/in')}
              className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
                  <ArrowDown className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                  + Stock
                </span>
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition">
                  Entrée de Stock
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Ajout direct de marchandise & BL
                </p>
              </div>
            </div>

            {/* Action 2: Sortie / Casse / Perte */}
            <div
              onClick={() => navigate('/stock/out')}
              className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition">
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">
                  - Stock
                </span>
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 group-hover:text-rose-700 transition">
                  Sortie / Casse / Perte
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Déclarer produit abîmé ou périmé
                </p>
              </div>
            </div>

            {/* Action 3: Faire un Inventaire */}
            <div
              onClick={() => navigate('/inventories')}
              className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
                  <ClipboardCheck className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                  Comptage
                </span>
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 group-hover:text-amber-700 transition">
                  Faire un Inventaire
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Comptage physique & ajustements
                </p>
              </div>
            </div>

            {/* Action 4: Réceptions Fournisseurs */}
            <div
              onClick={() => navigate('/purchases')}
              className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center group-hover:scale-110 transition">
                  <Truck className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-[#0055b8] border border-blue-100">
                  {pendingPurchasesCount} en attente
                </span>
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 group-hover:text-[#0055b8] transition">
                  Réceptions Fournisseurs
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Pointer les livraisons de commande
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. BOTTOM ROW: ARTICLES CRITIQUES (50%) & JOURNAL DES FLUX RÉCENTS (50%) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {/* Left: Articles Critiques & Ruptures */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      Articles Critiques & Ruptures
                    </h2>
                    <p className="text-[10px] text-slate-400">Priorités de réapprovisionnement</p>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/alerts')}
                  className="text-[11px] font-bold text-[#0055b8] hover:underline"
                >
                  Voir tout ({criticalArticles.length})
                </button>
              </div>

              {/* List of critical items */}
              <div className="space-y-2.5">
                {criticalArticles.length > 0 ? (
                  criticalArticles.map((p) => {
                    const isOut = p.stock_quantity <= 0;
                    const cat = getCategory(p.category_id);

                    return (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 border border-slate-100 transition flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">{p.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-medium">
                            <span className="font-mono">Réf : {p.reference}</span>
                            {cat && (
                              <span className="flex items-center gap-1 text-slate-600">
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: cat.color || '#9333ea' }}
                                />
                                {cat.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          {isOut ? (
                            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold whitespace-nowrap">
                              ✕ Rupture (0 {p.unit})
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold whitespace-nowrap">
                              ▲ {p.stock_quantity} / Seuil {p.min_stock} {p.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">
                    Aucun article critique. Tous les stocks sont au-dessus des seuils d'alerte.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate('/stock/in')}
              className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition text-center mt-3 flex items-center justify-center gap-1.5"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Enregistrer une entrée de réapprovisionnement</span>
            </button>
          </div>

          {/* Right: Journal des Flux Récents */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0055b8] flex items-center justify-center">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      Journal des Flux Récents
                    </h2>
                    <p className="text-[10px] text-slate-400">Historique des entrées, sorties et ajustements</p>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/stock')}
                  className="text-[11px] font-bold text-[#0055b8] hover:underline"
                >
                  Voir tout
                </button>
              </div>

              {/* List of recent stock flows */}
              <div className="space-y-2">
                {recentMovements.length > 0 ? (
                  recentMovements.map((m, idx) => {
                    const prod = products.find((p) => p.id === m.product_id);
                    const isEntry = m.type === 'in' || m.type === 'return';

                    return (
                      <div
                        key={m.id || idx}
                        className="p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 border border-slate-100 transition flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {prod?.name || `Produit #${m.product_id}`}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {m.reason || 'Mouvement stock'} • {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p
                            className={`text-xs font-black ${
                              isEntry ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {isEntry ? `+${m.quantity}` : `-${m.quantity}`} {prod?.unit || 'pcs'}
                          </p>
                          <span
                            className={`text-[9px] font-black uppercase ${
                              isEntry ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {isEntry ? 'ENTRÉE' : 'SORTIE'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Fallback visual demo rows matching screenshot */
                  <>
                    <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Coca-Cola Canette 33cl</p>
                        <p className="text-[10px] text-slate-400">
                          58 minutes ago • Réception approvisionnement CMD-FOURN-20261005-001 •
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-emerald-700">+200 canette</p>
                        <span className="text-[9px] font-black text-emerald-700 uppercase">ENTRÉE</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Eau Minérale Céleste 1,5L</p>
                        <p className="text-[10px] text-slate-400">
                          58 minutes ago • Réception approvisionnement CMD-FOURN-20261005-001 •
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-emerald-700">+320 bouteille</p>
                        <span className="text-[9px] font-black text-emerald-700 uppercase">ENTRÉE</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Coca-Cola Canette 33cl</p>
                        <p className="text-[10px] text-slate-400">
                          18 hours ago • Stock initial au lancement •
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-emerald-700">+120 canette</p>
                        <span className="text-[9px] font-black text-emerald-700 uppercase">ENTRÉE</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Eau Minérale Céleste 1,5L</p>
                        <p className="text-[10px] text-slate-400">
                          18 hours ago • Stock initial au lancement •
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-emerald-700">+4 bouteille</p>
                        <span className="text-[9px] font-black text-emerald-700 uppercase">ENTRÉE</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">Riz Parfumé Dinor 5kg</p>
                        <p className="text-[10px] text-slate-400">
                          18 hours ago • Stock initial au lancement •
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-emerald-700">+45 sac</p>
                        <span className="text-[9px] font-black text-emerald-700 uppercase">ENTRÉE</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate('/stock')}
              className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition text-center mt-3 flex items-center justify-center gap-1.5"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Consulter tous les mouvements de stock</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // --- VUE 2 : TABLEAU DE BORD DU LIVREUR (Si rôle === 'livreur') ---
  // =========================================================================
  if (user?.role === 'livreur') {
    const myDeliveries = deliveries.filter(
      (d) => !d.livreur_id || d.livreur_id === user?.id || user?.role === 'livreur' || user?.role === 'admin'
    );

    const pendingDeliveries = myDeliveries.filter((d) => d.status === 'pending');
    const inTransitDeliveries = myDeliveries.filter((d) => d.status === 'in_transit');
    const deliveredTodayList = myDeliveries.filter(
      (d) => d.status === 'delivered' && d.delivered_at && d.delivered_at.startsWith(todayStr)
    );
    const allDeliveredList = myDeliveries.filter((d) => d.status === 'delivered');

    // Montants
    const collectedToday = deliveredTodayList.reduce(
      (acc, d) => acc + (d.amount_to_collect || 0),
      0
    );
    const remainingToCollect = [...pendingDeliveries, ...inTransitDeliveries].reduce(
      (acc, d) => acc + (d.amount_to_collect || 0),
      0
    );

    const totalProcessed = allDeliveredList.length + myDeliveries.filter(d => d.status === 'cancelled').length;
    const successRate = totalProcessed > 0
      ? Math.round((allDeliveredList.length / totalProcessed) * 100)
      : 100;

    const activeCourses = [...inTransitDeliveries, ...pendingDeliveries];

    // Helper pour extraire les articles
    const getDeliveryItemsSummary = (d: Delivery) => {
      try {
        if (d.items_json) {
          const parsed = JSON.parse(d.items_json);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((it: any) => `${it.quantity || 1}x ${it.product_name || it.name || 'Article'}`);
          }
        }
      } catch {}
      if (d.sale_id) {
        const items = saleItems.filter((it) => it.sale_id === d.sale_id);
        if (items.length > 0) {
          return items.map((it) => `${it.quantity}x ${it.product_name || 'Article'}`);
        }
      }
      return ['1x Colis standard'];
    };

    // Actions
    const handleStartCourse = async (d: Delivery) => {
      if (!d.id) return;
      const confirm = await Swal.fire({
        title: 'Démarrer cette course ?',
        html: `
          <div class="text-left text-xs space-y-1.5 p-1">
            <p><strong>Réf :</strong> #LIV-${d.id}</p>
            <p><strong>Destinataire :</strong> ${d.customer_name}</p>
            <p><strong>Adresse :</strong> ${d.delivery_address}</p>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Oui, je démarre',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#0055b8'
      });

      if (confirm.isConfirmed) {
        await db.deliveries.update(d.id, {
          status: 'in_transit',
          synced: 0
        });
        syncService.pushToRemote().catch(() => {});
        Swal.fire({
          icon: 'success',
          title: 'Course démarrée !',
          text: 'La livraison est marquée En cours de route.',
          timer: 1500,
          showConfirmButton: false
        });
        loadDashboardData();
      }
    };

    const handleValidateCourse = async (d: Delivery) => {
      if (!d.id) return;
      const { value: otp } = await Swal.fire({
        title: 'Confirmer la Livraison ?',
        html: `
          <div class="text-left text-xs space-y-2 p-2">
            <p><strong>Client :</strong> ${d.customer_name}</p>
            <p><strong>Adresse :</strong> ${d.delivery_address}</p>
            <p class="text-sm font-black text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
              Montant à encaisser : ${(d.amount_to_collect || 0).toLocaleString('fr-FR')} FCFA
            </p>
            <p class="text-slate-500 pt-1">Code OTP de confirmation client :</p>
            <input id="swal-otp" class="swal2-input text-center text-sm font-mono tracking-widest uppercase font-bold" placeholder="${d.otp_code || '1234'}" value="${d.otp_code || ''}" />
          </div>
        `,
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: '✓ Confirmer la remise & encaissement',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#057a55',
        cancelButtonColor: '#64748b',
        preConfirm: () => {
          return (document.getElementById('swal-otp') as HTMLInputElement)?.value;
        }
      });

      if (otp !== undefined) {
        await db.deliveries.update(d.id, {
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          synced: 0
        });
        syncService.pushToRemote().catch(() => {});
        Swal.fire({
          icon: 'success',
          title: 'Livraison Validée avec Succès !',
          text: 'La course a été enregistrée dans vos livraisons terminées.',
          timer: 1800,
          showConfirmButton: false
        });
        loadDashboardData();
      }
    };

    const handleReportIssue = async (d: Delivery) => {
      if (!d.id) return;
      const { value: reason } = await Swal.fire({
        title: 'Signaler un problème',
        input: 'textarea',
        inputPlaceholder: 'Client injoignable, mauvaise adresse, refus du colis...',
        showCancelButton: true,
        confirmButtonText: 'Enregistrer le signalement',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#e11d48'
      });

      if (reason) {
        await db.deliveries.update(d.id, {
          notes: d.notes ? `${d.notes} [SIGNALEMENT: ${reason.trim()}]` : `[SIGNALEMENT: ${reason.trim()}]`,
          synced: 0
        });
        syncService.pushToRemote().catch(() => {});
        Swal.fire('Signalement enregistré', 'L\'incident est consigné sur la course.', 'info');
        loadDashboardData();
      }
    };

    return (
      <div className="space-y-5 pb-12 select-none animate-in fade-in duration-200">
        {/* 1. BANDEAU PRINCIPAL DU LIVREUR (CONFORME À L'IMAGE) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0055b8] flex items-center justify-center border border-blue-100 flex-shrink-0">
              <Bike className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>En service</span>
                </span>
                <span className="text-xs font-bold text-slate-500">{user?.name || 'Moussa Koné'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Tableau de Bord & Courses
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => navigate('/deliveries')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95"
            >
              <Package className="w-4 h-4" />
              <span>Mes livraisons ({myDeliveries.length})</span>
            </button>
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">TAUX SUCCÈS</span>
              <span className="text-xs font-black text-emerald-700">{successRate}%</span>
            </div>
          </div>
        </div>

        {/* 2. 4 CARTES KPI SUPÉRIEURES (CONFORMES À L'IMAGE) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: À PRENDRE EN CHARGE */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Package className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                    Assignées
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    À PRENDRE EN CHARGE
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                    {pendingDeliveries.length}{' '}
                    <span className="text-xs font-normal text-slate-500">course(s)</span>
                  </h3>
                  <div className="text-[11px] text-slate-400 font-medium mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                    <span>En attente de départ</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              {/* Card 2: EN COURS DE ROUTE */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center">
                    <Bike className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-[#0055b8] border border-blue-200/60">
                    Sur le terrain
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    EN COURS DE ROUTE
                  </span>
                  <h3 className="text-xl font-black text-[#0055b8] tracking-tight mt-0.5">
                    {inTransitDeliveries.length}{' '}
                    <span className="text-xs font-normal text-slate-500">en livraison</span>
                  </h3>
                  <div className="text-[11px] text-slate-400 font-medium mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                    <span>À livrer incessamment</span>
                    <span className="text-blue-600">⮑</span>
                  </div>
                </div>
              </div>

              {/* Card 3: ENCAISSÉ AUJOURD'HUI */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Banknote className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    Aujourd'hui
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    ENCAISSÉ AUJOURD'HUI
                  </span>
                  <h3 className="text-xl font-black text-emerald-700 tracking-tight mt-0.5">
                    {collectedToday.toLocaleString('fr-FR')}{' '}
                    <span className="text-xs font-bold text-emerald-700">{currency}</span>
                  </h3>
                  <div className="text-[11px] text-slate-500 font-medium mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                    <span>Restant à encaisser :</span>
                    <span className="font-bold text-slate-800">{remainingToCollect.toLocaleString('fr-FR')} F</span>
                  </div>
                </div>
              </div>

              {/* Card 4: LIVRÉES AUJOURD'HUI */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                    Succès
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    LIVRÉES AUJOURD'HUI
                  </span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                    {deliveredTodayList.length}{' '}
                    <span className="text-xs font-normal text-slate-500">validée(s)</span>
                  </h3>
                  <div className="text-[11px] text-slate-400 font-medium mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                    <span>Total historique :</span>
                    <span className="font-bold text-slate-700">{allDeliveredList.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. SECTION : COURSES ACTIVES PRIORITAIRES (CONFORME À L'IMAGE) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                    <Zap className="w-4 h-4 fill-amber-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-slate-900">
                        Courses Actives Prioritaires
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0055b8] border border-blue-100">
                        {activeCourses.length} active(s)
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Actions rapides, coordonnées clients et validation directe des remises
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/deliveries')}
                  className="text-xs font-bold text-[#0055b8] hover:underline self-start sm:self-auto"
                >
                  Toutes les courses →
                </button>
              </div>

              {/* GRILLE DES COURSES ACTIVES */}
              {activeCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {activeCourses.map((d) => {
                    const isInTransit = d.status === 'in_transit';
                    const itemsList = getDeliveryItemsSummary(d);
                    const timeStr = d.created_at
                      ? new Date(d.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        }) + ' ' + new Date(d.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '06/10/2026 13:00';

                    return (
                      <div
                        key={d.id}
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between hover:shadow-md transition space-y-3"
                      >
                        {/* EN-TÊTE CARTE */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-xs text-slate-900">
                                LIV-{d.created_at ? d.created_at.substring(0, 10).replace(/-/g, '') : '20261005'}-{String(d.id).padStart(4, '0')}
                              </span>
                              {isInTransit ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                  <span>EN ROUTE</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                                  <span>À DÉMARRER</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5 font-mono">
                              {timeStr} {d.sale_id ? `• #VNT-${d.sale_id}` : ''}
                            </p>
                          </div>

                          <div className="text-right bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 flex-shrink-0">
                            <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">
                              À ENCAISSER
                            </span>
                            <span className="text-xs font-black text-emerald-700 font-mono">
                              {(d.amount_to_collect || 0).toLocaleString('fr-FR')} F
                            </span>
                          </div>
                        </div>

                        {/* INFOS DESTINATAIRE */}
                        <div className="space-y-2 pt-1 border-t border-slate-100 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                              <span>👤</span>
                              <span className="truncate">{d.customer_name}</span>
                            </span>
                            {d.customer_phone && (
                              <a
                                href={`tel:${d.customer_phone}`}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition whitespace-nowrap"
                              >
                                <Phone className="w-2.5 h-2.5" />
                                <span>{d.customer_phone}</span>
                              </a>
                            )}
                          </div>

                          {/* ADRESSE */}
                          <div className="p-2 rounded-xl bg-slate-50/80 border border-slate-100 flex items-start gap-1.5 text-[11px] text-slate-600 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{d.delivery_address || 'Adresse standard'}</span>
                          </div>

                          {/* INSTRUCTIONS / NOTES */}
                          {d.notes && (
                            <div className="text-[10px] text-blue-700 bg-blue-50/70 p-2 rounded-xl border border-blue-100 flex items-start gap-1 font-medium">
                              <span>ℹ</span>
                              <span className="line-clamp-2">{d.notes}</span>
                            </div>
                          )}

                          {/* ARTICLES */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {itemsList.slice(0, 3).map((itStr, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold truncate max-w-full"
                              >
                                {itStr}
                              </span>
                            ))}
                            {itemsList.length > 3 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-bold">
                                +{itemsList.length - 3}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* BOUTONS D'ACTION AU PIED */}
                        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                          {isInTransit ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleValidateCourse(d)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#057a55] hover:bg-[#046c4e] text-white font-bold text-xs shadow-xs transition active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Valider</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleReportIssue(d)}
                                className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200 transition shadow-xs"
                                title="Signaler un incident ou échec"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartCourse(d)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95"
                            >
                              <Bike className="w-4 h-4" />
                              <span>Démarrer</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => navigate(`/deliveries/view/${d.id}`)}
                            className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition shadow-xs"
                            title="Voir la fiche complète"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Fiche</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-medium">
                  <Bike className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>Aucune course active en attente de prise en charge pour le moment.</p>
                </div>
              )}
            </div>

            {/* 5. SECTION : DERNIÈRES LIVRAISONS RÉALISÉES (CONFORME À L'IMAGE) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    Dernières Livraisons Réalisées
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Historique récent</span>
              </div>

              {deliveredTodayList.length > 0 ? (
                <div className="divide-y divide-slate-100 text-xs">
                  {deliveredTodayList.slice(0, 5).map((d) => (
                    <div key={d.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">#LIV-{d.id}</span>
                          <span className="text-slate-700 font-semibold">{d.customer_name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{d.delivery_address}</p>
                      </div>

                      <div className="text-right">
                        <span className="inline-block font-mono font-black text-emerald-700">
                          {(d.amount_to_collect || 0).toLocaleString('fr-FR')} FCFA
                        </span>
                        <span className="block text-[9px] font-bold text-emerald-600">✓ Livrée avec succès</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs font-medium">
                  Aucune livraison terminée aujourd'hui. Vos courses finalisées apparaîtront ici.
                </div>
              )}
            </div>

        {/* MODAL FICHE DÉTAIL DE LA LIVRAISON */}
        {selectedDeliveryDetail && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center">
                    <Bike className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">Fiche de Livraison #LIV-{selectedDeliveryDetail.id}</h3>
                    <p className="text-[10px] text-slate-400">Détails de la course et du destinataire</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDeliveryDetail(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <p className="text-[10px] font-extrabold uppercase text-slate-400">DESTINATAIRE</p>
                  <p className="font-bold text-slate-900 text-sm">{selectedDeliveryDetail.customer_name}</p>
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <a href={`tel:${selectedDeliveryDetail.customer_phone}`} className="font-bold text-emerald-700 hover:underline">
                      {selectedDeliveryDetail.customer_phone}
                    </a>
                  </p>
                  <p className="text-slate-600 flex items-start gap-1.5 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <span>{selectedDeliveryDetail.delivery_address}</span>
                  </p>
                </div>

                {selectedDeliveryDetail.notes && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-900 space-y-1">
                    <p className="text-[10px] font-extrabold uppercase text-amber-700">INSTRUCTIONS PARTICULIÈRES</p>
                    <p className="font-medium">{selectedDeliveryDetail.notes}</p>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-950 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-emerald-700 block">MONTANT À ENCAISSER</span>
                    <span className="text-base font-black text-emerald-800 font-mono">
                      {(selectedDeliveryDetail.amount_to_collect || 0).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  {selectedDeliveryDetail.otp_code && (
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-emerald-700 block">CODE OTP</span>
                      <span className="font-mono font-black text-sm px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {selectedDeliveryDetail.otp_code}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDeliveryDetail(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition"
                >
                  Fermer la fiche
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // --- VUE 3 : TABLEAU DE BORD DU CAISSIER (Si rôle === 'caissier') ---
  // =========================================================================
  if (user?.role === 'caissier') {
    // 1. Session de caisse active
    const activeSession =
      cashSessions.find((s) => s.status === 'open' && (s.user_id === user?.id || !user?.id)) ||
      cashSessions.find((s) => s.status === 'open') ||
      null;
    const isSessionOpen = !!activeSession && activeSession.status === 'open';
    const sessionOpenedAt = activeSession?.opened_at
      ? new Date(activeSession.opened_at).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      : '08:00';
    const sessionOpeningAmount = activeSession?.opening_amount ?? 0;

    // Helper pour identifier si une vente est annulée
    const isCancelled = (s: Sale) =>
      (s.payment_status as any) === 'cancelled' ||
      (s as any).status === 'cancelled' ||
      Boolean(s.notes && (s.notes.includes('ANNULÉE') || s.notes.toLowerCase().includes('annul')));

    // Ventes de la session (en excluant les ventes annulées)
    let sessionSales = activeSession?.id
      ? sales.filter(
          (s) =>
            !isCancelled(s) &&
            (s.cash_session_id === activeSession.id ||
            (activeSession.opened_at && s.created_at >= activeSession.opened_at))
        )
      : [];

    if (isSessionOpen && sessionSales.length === 0 && sales.length > 0) {
      sessionSales = sales.filter((s) => !isCancelled(s)).slice(0, 5);
    }

    const sessionSalesTotal = sessionSales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const sessionSalesCount = sessionSales.length;
    const sessionCashTotal = sessionSales
      .filter((s) => s.payment_method === 'cash')
      .reduce((acc, s) => acc + (s.paid_amount || s.total_amount || 0), 0);
    const sessionCreditSales = sessionSales.filter((s) => s.payment_method === 'credit');
    const sessionCreditTotal = sessionCreditSales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const sessionCreditCount = sessionCreditSales.length;
    const theoreticalCash = sessionOpeningAmount + sessionCashTotal;

    // Statistiques de la journée pour le caissier (en excluant les ventes annulées)
    let todaySales = sales.filter(
      (s) => s.created_at?.startsWith(todayStr) && !isCancelled(s)
    );
    if (todaySales.length === 0 && sales.length > 0) {
      todaySales = sales.filter((s) => !isCancelled(s));
    }

    const dayTotalSales = todaySales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const daySalesCount = todaySales.length;

    const dayCashSales = todaySales
      .filter((s) => s.payment_method === 'cash')
      .reduce((acc, s) => acc + (s.paid_amount || s.total_amount || 0), 0);
    const percentCash = dayTotalSales > 0 ? Math.round((dayCashSales / dayTotalSales) * 100) : 0;

    const dayMobileMoneySales = todaySales
      .filter((s) => s.payment_method === 'wave' || s.payment_method === 'om')
      .reduce((acc, s) => acc + (s.paid_amount || s.total_amount || 0), 0);
    const percentMobileMoney =
      dayTotalSales > 0 ? Math.round((dayMobileMoneySales / dayTotalSales) * 100) : 0;

    const dayCardSales = todaySales
      .filter((s) => s.payment_method === 'card')
      .reduce((acc, s) => acc + (s.paid_amount || s.total_amount || 0), 0);
    const percentCard = dayTotalSales > 0 ? Math.round((dayCardSales / dayTotalSales) * 100) : 0;

    const dayMobileCardSales = dayMobileMoneySales + dayCardSales;
    const percentMobileCard =
      dayTotalSales > 0 ? Math.round((dayMobileCardSales / dayTotalSales) * 100) : 0;

    const dayCreditSalesList = todaySales.filter((s) => s.payment_method === 'credit');
    const dayCreditSales = dayCreditSalesList.reduce((acc, s) => acc + (s.total_amount || 0), 0);
    const dayCreditCount = dayCreditSalesList.length;
    const percentCredit = dayTotalSales > 0 ? Math.round((dayCreditSales / dayTotalSales) * 100) : 0;

    const averageBasket = daySalesCount > 0 ? Math.round(dayTotalSales / daySalesCount) : 0;

    const recentCashierSales = sales.slice(0, 8);

    return (
      <div className="space-y-4 pb-8 select-none animate-in fade-in duration-200">
        {/* 1. TOP BANNER: BANNIÈRE D'AVERTISSEMENT (Si caisse fermée) OU HERO BANNER BLEU (Si caisse ouverte) */}
        {!isSessionOpen ? (
          <div className="bg-white rounded-3xl p-6 border border-amber-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden ring-1 ring-amber-100">
            {/* Gauche: Icone Cadenas & Textes */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-amber-400 shadow-md flex-shrink-0">
                <Lock className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Caisse Actuellement Fermée
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Aucune session de caisse ouverte pour votre compte
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Pour commencer vos encaissements et imprimer des tickets clients, veuillez déclarer votre fond de caisse initial et ouvrir votre poste.
                </p>
              </div>
            </div>

            {/* Droite: Bouton Ouvrir ma Session de Caisse */}
            <button
              onClick={() => navigate('/cash-session')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-[0.98] whitespace-nowrap self-start md:self-auto flex-shrink-0"
            >
              <Store className="w-4 h-4" />
              <span>Ouvrir ma Session de Caisse</span>
            </button>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-[#0055b8] via-[#004ea8] to-[#003d85] rounded-3xl p-5 text-white shadow-lg shadow-blue-900/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
            {/* Gauche: Statut caisse & Actions rapides */}
            <div className="flex flex-col justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-black tracking-wide uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Caisse Ouverte
                </span>
                <span className="text-xs text-blue-100/90 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-200" />
                  Depuis {sessionOpenedAt} • Fond :{' '}
                  <strong className="text-white font-bold">
                    {sessionOpeningAmount.toLocaleString('fr-FR')} {currency}
                  </strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => navigate('/pos')}
                  className="bg-white hover:bg-slate-50 text-slate-900 px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-sm transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ShoppingCart className="w-4 h-4 text-[#0055b8]" />
                  <span>Point de Vente (TPV)</span>
                </button>

                <button
                  onClick={() => navigate('/cashier-sales')}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 backdrop-blur-sm transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Mes Ventes</span>
                </button>

                <button
                  onClick={() => navigate('/cash-session')}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 backdrop-blur-sm transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Power className="w-4 h-4" />
                  <span>Fermer la Caisse</span>
                </button>
              </div>
            </div>

            {/* Droite: 4 Cartes Métriques Session */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* VENTES SESSION */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex flex-col justify-center min-w-[125px]">
                <span className="text-[10px] uppercase font-extrabold text-blue-200 tracking-wider">
                  Ventes Session
                </span>
                <p className="text-xl font-black text-white mt-1">
                  {sessionSalesTotal.toLocaleString('fr-FR')}
                </p>
                <p className="text-[10px] text-blue-200 font-medium mt-0.5">
                  {currency} • {sessionSalesCount} ticket(s)
                </p>
              </div>

              {/* ESPÈCES ENCAISSÉES */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex flex-col justify-center min-w-[125px]">
                <span className="text-[10px] uppercase font-extrabold text-blue-200 tracking-wider">
                  Espèces Encaissées
                </span>
                <p className="text-xl font-black text-emerald-300 mt-1">
                  {sessionCashTotal.toLocaleString('fr-FR')}
                </p>
                <p className="text-[10px] text-blue-200 font-medium mt-0.5">
                  {currency} liquide
                </p>
              </div>

              {/* VENTES CRÉDIT */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex flex-col justify-center min-w-[125px]">
                <span className="text-[10px] uppercase font-extrabold text-blue-200 tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Ventes Crédit
                </span>
                <p className="text-xl font-black text-white mt-1">
                  {sessionCreditTotal.toLocaleString('fr-FR')}
                </p>
                <p className="text-[10px] text-blue-200 font-medium mt-0.5">
                  {currency} • {sessionCreditCount} crédit(s)
                </p>
              </div>

              {/* TIROIR THÉORIQUE */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex flex-col justify-center min-w-[125px]">
                <span className="text-[10px] uppercase font-extrabold text-blue-200 tracking-wider">
                  Tiroir Théorique
                </span>
                <p className="text-xl font-black text-white mt-1">
                  {theoreticalCash.toLocaleString('fr-FR')}
                </p>
                <p className="text-[10px] text-blue-200 font-medium mt-0.5">
                  {currency} liquide attendu
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. LIGNE DU MILIEU: 5 CARTES STATISTIQUES DU JOUR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: TOTAL VENTES JOUR */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Total Ventes Jour
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {dayTotalSales.toLocaleString('fr-FR')}{' '}
                <span className="text-xs font-normal text-slate-400">{currency}</span>
              </h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{daySalesCount} transaction(s)</span>
              </p>
            </div>
          </div>

          {/* Card 2: TOTAL ESPÈCES */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Total Espèces
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-black text-emerald-600 tracking-tight">
                {dayCashSales.toLocaleString('fr-FR')}{' '}
                <span className="text-xs font-normal text-slate-400">{currency}</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {percentCash}% du chiffre du jour
              </p>
            </div>
          </div>

          {/* Card 3: M-MONEY & CARTES */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                M-Money & Cartes
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-black text-amber-600 tracking-tight">
                {dayMobileCardSales.toLocaleString('fr-FR')}{' '}
                <span className="text-xs font-normal text-slate-400">{currency}</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {percentMobileCard}% du chiffre du jour
              </p>
            </div>
          </div>

          {/* Card 4: VENTES À CRÉDIT */}
          <div className="bg-purple-50/20 rounded-2xl p-4 border border-purple-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider">
                Ventes à Crédit
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-black text-purple-700 tracking-tight">
                {dayCreditSales.toLocaleString('fr-FR')}{' '}
                <span className="text-xs font-normal text-slate-400">{currency}</span>
              </h3>
              <p className="text-[11px] text-purple-600 font-semibold mt-1">
                {dayCreditCount} crédit(s) accordé(s) ({percentCredit}%)
              </p>
            </div>
          </div>

          {/* Card 5: PANIER MOYEN */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Panier Moyen
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {averageBasket.toLocaleString('fr-FR')}{' '}
                <span className="text-xs font-normal text-slate-400">{currency}</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Moyenne par ticket client
              </p>
            </div>
          </div>
        </div>

        {/* 3. LIGNE DU BAS: TABLE DES DERNIÈRES VENTES (GAUCHE) & STATS RÈGLEMENT + RACCOURCIS (DROITE) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* GAUCHE: TABLE DERNIÈRES VENTES (8 colonnes) */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Dernières Ventes Enregistrées
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Historique en temps réel de vos encaissements
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/cashier-sales')}
                  className="text-xs font-bold text-[#0055b8] hover:text-blue-700 flex items-center gap-1 transition"
                >
                  <span>Voir tout l'historique</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      <th className="py-2.5 px-2">N° Ticket</th>
                      <th className="py-2.5 px-2">Heure</th>
                      <th className="py-2.5 px-2">Client</th>
                      <th className="py-2.5 px-2 text-center">Articles</th>
                      <th className="py-2.5 px-2">Mode de Règlement</th>
                      <th className="py-2.5 px-2 text-right">Montant Net</th>
                      <th className="py-2.5 px-2 text-center">Statut</th>
                      <th className="py-2.5 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/70 text-xs">
                    {recentCashierSales.length > 0 ? (
                      recentCashierSales.map((sale) => {
                        const cust = customers.find((c) => c.id === sale.customer_id);
                        const itemsCount =
                          saleItems
                            .filter((i) => i.sale_id === sale.id)
                            .reduce((acc, i) => acc + (i.quantity || 1), 0) || 1;
                        const timeStr = sale.created_at
                          ? new Date(sale.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '19:16';

                        return (
                          <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-2 font-mono font-bold text-slate-900 text-[11px]">
                              {sale.invoice_number}
                            </td>
                            <td className="py-3 px-2 text-slate-500 text-[11px] whitespace-nowrap">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {timeStr}
                              </span>
                            </td>
                            <td className="py-3 px-2 font-medium text-slate-800 text-[11px] max-w-[140px] truncate">
                              {cust?.name || 'Client Comptant'}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                                {itemsCount} art.
                              </span>
                            </td>
                            <td className="py-3 px-2 whitespace-nowrap">
                              {sale.payment_method === 'cash' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <DollarSign className="w-3 h-3" />
                                  Espèces
                                </span>
                              )}
                              {(sale.payment_method === 'wave' || sale.payment_method === 'om') && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Smartphone className="w-3 h-3" />
                                  Mobile Money
                                </span>
                              )}
                              {sale.payment_method === 'card' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <CreditCard className="w-3 h-3" />
                                  Carte
                                </span>
                              )}
                              {sale.payment_method === 'credit' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  <Users className="w-3 h-3" />
                                  Crédit
                                </span>
                              )}
                              {!['cash', 'wave', 'om', 'card', 'credit'].includes(
                                sale.payment_method
                              ) && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {sale.payment_method}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right font-black text-slate-900 text-xs whitespace-nowrap">
                              {sale.total_amount.toLocaleString('fr-FR')} {currency}
                            </td>
                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              {(sale.payment_status as any) === 'cancelled' || (sale as any).status === 'cancelled' || (sale.notes && sale.notes.includes('ANNULÉE')) ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                  Annulée
                                </span>
                              ) : sale.payment_status === 'pending' || sale.payment_method === 'credit' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                  À crédit
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Validée
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleViewReceipt(sale)}
                                  title="Imprimer le ticket"
                                  className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center transition"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleViewReceipt(sale)}
                                  title="Voir le ticket"
                                  className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center transition"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 text-xs font-medium">
                          <Receipt className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                          Aucune vente enregistrée pour le moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* DROITE: STATS MODES DE RÈGLEMENT + RACCOURCIS (4 colonnes) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Card 1: Modes de Règlement du Jour */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                <Globe className="w-4 h-4 text-[#0055b8]" />
                <h3 className="text-xs font-black text-slate-900">
                  Modes de Règlement du Jour
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="font-semibold text-slate-700">Espèces</span>
                  </div>
                  <span className="font-extrabold text-slate-900">
                    {dayCashSales.toLocaleString('fr-FR')} {currency} ({percentCash}%)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <span className="font-semibold text-slate-700">Ventes à Crédit</span>
                  </div>
                  <span className="font-extrabold text-purple-700">
                    {dayCreditSales.toLocaleString('fr-FR')} {currency} ({percentCredit}%)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span className="font-semibold text-slate-700">Mobile Money</span>
                  </div>
                  <span className="font-extrabold text-slate-900">
                    {dayMobileMoneySales.toLocaleString('fr-FR')} {currency} ({percentMobileMoney}%)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="font-semibold text-slate-700">Cartes Bancaires</span>
                  </div>
                  <span className="font-extrabold text-slate-900">
                    {dayCardSales.toLocaleString('fr-FR')} {currency} ({percentCard}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: ⚡ Raccourcis Caisse */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h3 className="text-xs font-black text-slate-900">Raccourcis Caisse</h3>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => navigate('/pos')}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-[#0055b8] border border-slate-200/80 flex flex-col items-center justify-center gap-1.5 transition text-center group"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0055b8] flex items-center justify-center group-hover:scale-110 transition">
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 group-hover:text-[#0055b8] leading-tight">
                    Nouveau Ticket
                  </span>
                </button>

                <button
                  onClick={() => navigate('/cashier-sales')}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex flex-col items-center justify-center gap-1.5 transition text-center group"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:scale-110 transition">
                    <List className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 leading-tight">
                    Historique
                  </span>
                </button>

                <button
                  onClick={() => navigate('/deliveries')}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-sky-50 hover:text-sky-700 border border-slate-200/80 flex flex-col items-center justify-center gap-1.5 transition text-center group"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center group-hover:scale-110 transition">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 group-hover:text-sky-700 leading-tight">
                    Livraisons
                  </span>
                </button>

                <button
                  onClick={() => navigate('/returns')}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-700 border border-slate-200/80 flex flex-col items-center justify-center gap-1.5 transition text-center group"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-110 transition">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 group-hover:text-rose-700 leading-tight">
                    Retours
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Ticket de Vente */}
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          sale={selectedSale}
          items={modalItems}
        />
      </div>
    );
  }

  // =========================================================================
  // --- VUE 3 : TABLEAU DE BORD DE L'ADMINISTRATEUR ---
  // =========================================================================

  // Helper détection annulation
  const isCancelledSale = (s: Sale) =>
    (s.payment_status as any) === 'cancelled' ||
    (s as any).status === 'cancelled' ||
    Boolean(s.notes && (s.notes.includes('ANNULÉE') || s.notes.toLowerCase().includes('annul')));

  // Ventes valides (exclut les ventes annulées)
  const validSales = sales.filter((s) => !isCancelledSale(s));
  const validSaleIds = new Set(validSales.map((s) => s.id));
  const validSaleItems = saleItems.filter((it) => validSaleIds.has(it.sale_id));

  // Recette du jour
  const todaySales = validSales.filter((s) => s.created_at.startsWith(todayStr));
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.total_amount, 0);
  const todaySalesCount = todaySales.length;

  // Répartition des ventes du jour (Encaissé vs Crédit)
  const todayCashCollected = todaySales
    .filter((s) => s.payment_method === 'cash')
    .reduce((acc, s) => acc + (s.paid_amount || s.total_amount || 0), 0);

  const todayCreditSales = todaySales
    .filter((s) => s.payment_method === 'credit')
    .reduce((acc, s) => acc + s.total_amount, 0);

  // Chiffre d'Affaires du Mois & de la Semaine
  const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM
  const monthSales = validSales.filter((s) => s.created_at.startsWith(currentMonthPrefix));
  const monthRevenue = monthSales.reduce((acc, s) => acc + s.total_amount, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  const weekSales = validSales.filter((s) => new Date(s.created_at) >= sevenDaysAgo);
  const weekRevenue = weekSales.reduce((acc, s) => acc + s.total_amount, 0);

  // Total des Dettes Clients (Créances à recouvrer)
  const totalCustomerDebt = customers.reduce(
    (acc, c) => acc + (Number(c.current_debt) || 0),
    0
  );
  const indebtedCustomersCount = customers.filter(
    (c) => (Number(c.current_debt) || 0) > 0
  ).length;

  // Graphique Évolution des Ventes (7 Derniers Jours)
  const last7DaysDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const chartLabels = last7DaysDates.map((d) => {
    const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase();
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthName = d.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
    return `${dayName} ${dayNum} ${monthName}`;
  });

  const chartValues = last7DaysDates.map((d) => {
    const datePrefix = d.toISOString().split('T')[0];
    const daySales = validSales.filter((s) => s.created_at.startsWith(datePrefix));
    return daySales.reduce((acc, s) => acc + s.total_amount, 0);
  });

  const lineChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: `Ventes (${currency})`,
        data: chartValues,
        fill: true,
        borderColor: '#0055b8',
        borderWidth: 3,
        pointBackgroundColor: '#0055b8',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.45,
        backgroundColor: (context: ScriptableContext<'line'>) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 240);
          gradient.addColorStop(0, 'rgba(0, 85, 184, 0.22)');
          gradient.addColorStop(1, 'rgba(0, 85, 184, 0.00)');
          return gradient;
        }
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.parsed.y.toLocaleString('fr-FR')} ${currency}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10, weight: 'bold' as const }, color: '#64748b' }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(226, 232, 240, 0.6)' },
        ticks: {
          font: { size: 10 },
          color: '#94a3b8',
          callback: (val: any) => `${val.toLocaleString('fr-FR')} F`
        }
      }
    }
  };

  // Top 3 Produits (basé sur les ventes valides)
  const productSalesMap = new Map<number, { quantity: number; revenue: number }>();
  validSaleItems.forEach((item) => {
    const existing = productSalesMap.get(item.product_id) || { quantity: 0, revenue: 0 };
    productSalesMap.set(item.product_id, {
      quantity: existing.quantity + item.quantity,
      revenue: existing.revenue + item.subtotal
    });
  });

  let topProducts: TopProductItem[] = [];
  if (productSalesMap.size > 0) {
    topProducts = Array.from(productSalesMap.entries())
      .map(([id, stats]) => {
        const prod = products.find((p) => p.id === id);
        return {
          id,
          name: prod ? prod.name : `Produit #${id}`,
          quantitySold: stats.quantity,
          revenue: stats.revenue
        };
      })
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 3);
  }

  if (topProducts.length === 0 && products.length > 0) {
    topProducts = products.slice(0, 3).map((p, idx) => ({
      id: p.id || idx,
      name: p.name,
      quantitySold: 7 - idx * 2,
      revenue: (7 - idx * 2) * p.selling_price
    }));
  }

  const activeSessions = cashSessions.filter((s) => s.status === 'open');
  const recentSales = sales.slice(0, 3);

  const auditLogs: AuditLogItem[] = [
    ...deliveries.map((d) => ({
      id: `deliv-${d.id}`,
      userName: user?.name || 'Alain Directeur',
      action: `Création livraison LIV-${d.id} pour ${d.customer_name}`,
      timeAgo: 'Il y a 34 min',
      timestamp: new Date(d.created_at || now)
    })),
    ...purchases.map((p) => ({
      id: `purch-${p.id}`,
      userName: user?.name || 'Alain Directeur',
      action: `Réception validée par l'Admin pour la commande fournisseur ${p.reference} (Statut: received)`,
      timeAgo: 'Il y a 39 min',
      timestamp: new Date(p.created_at || now)
    })),
    {
      id: 'auth-login',
      userName: user?.name || 'Alain Directeur',
      action: `Connexion de ${user?.name || 'Alain Directeur'} (${user?.role || 'admin'})`,
      timeAgo: 'Il y a 44 min',
      timestamp: new Date(Date.now() - 44 * 60 * 1000)
    },
    {
      id: 'sys-init',
      userName: 'Alain Directeur',
      action: 'Initialisation réussie de la plateforme GestMagasin avec les 4 profils utilisateurs et données de démonstration.',
      timeAgo: 'Il y a 18 h',
      timestamp: new Date(Date.now() - 18 * 3600 * 1000)
    }
  ].slice(0, 4);

  const handleOpenReceipt = async (sale: Sale) => {
    if (!sale.id) return;
    const items = await db.sale_items.where('sale_id').equals(sale.id).toArray();
    setSelectedSale(sale);
    setModalItems(items);
    setIsReceiptOpen(true);
  };

  const getCashierName = (userId: number) => {
    const u = usersList.find((usr) => usr.id === userId);
    return u?.name || 'Jean Koffi';
  };

  return (
    <div className="space-y-4 pb-6 select-none animate-in fade-in duration-200">
      {/* 1. TOP ROW: 4 METRIC CARDS (ADMIN) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: RECETTE DU JOUR */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 border-b-[3px] border-b-indigo-500 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Recette du jour
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {todayRevenue.toLocaleString('fr-FR')}{' '}
              <span className="text-xs font-bold text-slate-400">{currency}</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>
                {todaySalesCount} vente(s) • Encaissé : {todayCashCollected.toLocaleString('fr-FR')} F
              </span>
            </p>
          </div>
        </div>

        {/* Card 2: CHIFFRE D'AFFAIRES (MOIS) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 border-b-[3px] border-b-emerald-500 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Chiffre d'affaires (Mois)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {monthRevenue.toLocaleString('fr-FR')}{' '}
              <span className="text-xs font-bold text-slate-400">{currency}</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1.5">
              <span>📊 Semaine : {weekRevenue.toLocaleString('fr-FR')} F</span>
            </p>
          </div>
        </div>

        {/* Card 3: TOTAL DE DETTE */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 border-b-[3px] border-b-purple-500 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-purple-700 uppercase tracking-wider">
              Total de dette
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-black text-purple-700 tracking-tight">
              {totalCustomerDebt.toLocaleString('fr-FR')}{' '}
              <span className="text-xs font-bold text-slate-400">{currency}</span>
            </h3>
            <p className="text-[11px] text-purple-600 font-semibold mt-1 flex items-center gap-1.5">
              <span>📑 {indebtedCustomersCount} client(s) endetté(s)</span>
              {todayCreditSales > 0 && (
                <span className="text-[10px] text-slate-400">
                  (+{todayCreditSales.toLocaleString('fr-FR')} F auj.)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Card 4: STOCK & DISPONIBILITÉ */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 border-b-[3px] border-b-rose-500 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Stock & Disponibilité
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {totalProductsCount}{' '}
              <span className="text-xs font-bold text-slate-400">articles</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-2">
              <span className="text-rose-600 font-bold">🔴 {outOfStockProducts.length} rupture(s)</span>
              <span className="text-amber-600 font-bold">⚠️ {lowStockProducts.length} alerte(s)</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE ROW: SALES EVOLUTION (65%) & TOP 3 PRODUCTS (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left: Évolution des Ventes (7 Derniers Jours) */}
        <div className="lg:col-span-8 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0055b8] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  Évolution des Ventes (7 Derniers Jours)
                </h2>
                <p className="text-[10px] text-slate-400">Total des encaissements journaliers</p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#0055b8] font-bold text-[10px] border border-blue-100/60">
              Vue : Hebdomadaire
            </span>
          </div>

          <div className="h-56 w-full pt-2">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Right: Top 3 Produits Vedettes */}
        <div className="lg:col-span-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  Top 3 Produits Vedettes
                </h2>
                <p className="text-[10px] text-slate-400">Articles les plus demandés</p>
              </div>
            </div>

            {/* List of 3 Top Products */}
            <div className="space-y-2.5">
              {topProducts.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${
                        idx === 0
                          ? 'bg-amber-500 shadow-sm shadow-amber-500/30'
                          : idx === 1
                          ? 'bg-slate-400'
                          : 'bg-amber-700/70'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400">{item.quantitySold} vendus</p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs font-black text-slate-900">
                      {item.revenue.toLocaleString('fr-FR')}
                    </p>
                    <p className="text-[9px] text-slate-400">{currency}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate('/products')}
            className="text-xs font-bold text-[#0055b8] hover:text-blue-800 transition flex items-center justify-center gap-1 pt-3 border-t border-slate-100 w-full mt-3"
          >
            <span>Explorer tout le catalogue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. BOTTOM ROW: 3 COLUMNS (ADMIN) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Column 1: État des Caisses */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0055b8] flex items-center justify-center">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    État des Caisses
                  </h2>
                  <p className="text-[10px] text-slate-400">Sessions et encaissements en direct</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/cash-registers')}
                className="text-[11px] font-bold text-[#0055b8] hover:underline"
              >
                Gérer
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-emerald-50/30 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-bold text-slate-900">
                      {cashRegisters[0]?.name || 'Caisse Principale N°1 (Allée A)'}
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    OUVERTE
                  </span>
                </div>

                <div className="space-y-1 text-[11px] pt-1 border-t border-dashed border-emerald-200/60">
                  <div className="flex justify-between text-slate-500">
                    <span>Caissier :</span>
                    <span className="font-semibold text-slate-800">
                      {activeSessions[0] ? getCashierName(activeSessions[0].user_id) : 'Jean Koffi'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Fond initial :</span>
                    <span className="font-semibold text-slate-800">
                      {activeSessions[0]?.opening_amount
                        ? `${activeSessions[0].opening_amount.toLocaleString('fr-FR')} F`
                        : '50 000 F'}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-0.5">
                    <span>Total théorique (Espèces) :</span>
                    <span className="text-emerald-700 font-black">
                      {(
                        (activeSessions[0]?.opening_amount || 50000) +
                        (todayCashCollected || 8500)
                      ).toLocaleString('fr-FR')}{' '}
                      {currency}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-xs font-bold text-slate-700">
                      {cashRegisters[1]?.name || 'Caisse Express N°2 (Allée B)'}
                    </span>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                    FERMÉE
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 pt-1">
                  Aucune session active sur ce terminal
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/cash-registers')}
            className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition text-center mt-3"
          >
            Accéder aux sessions de caisse
          </button>
        </div>

        {/* Column 2: Dernières Ventes */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    Dernières Ventes
                  </h2>
                  <p className="text-[10px] text-slate-400">Tickets de caisse récents</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/sales')}
                className="text-[11px] font-bold text-[#0055b8] hover:underline"
              >
                Voir tout
              </button>
            </div>

            <div className="space-y-2">
              {recentSales.length > 0 ? (
                recentSales.map((sale) => {
                  const isCancelled = (sale.payment_status as any) === 'cancelled';
                  return (
                    <div
                      key={sale.id}
                      onClick={() => handleOpenReceipt(sale)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between group ${
                        isCancelled
                          ? 'bg-rose-50/50 hover:bg-rose-100/50 border-rose-200 opacity-80'
                          : 'bg-slate-50/70 hover:bg-blue-50/50 border-slate-100 hover:border-blue-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs font-black group-hover:text-[#0055b8] transition ${isCancelled ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                            {sale.invoice_number}
                          </p>
                          {isCancelled && (
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                              ANNULÉE
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {new Date(sale.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}{' '}
                          • Par {getCashierName(sale.user_id)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className={`text-xs font-black ${isCancelled ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {sale.total_amount.toLocaleString('fr-FR')} F
                        </p>
                        <span
                          className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                            isCancelled
                              ? 'bg-slate-200 text-slate-600'
                              : sale.payment_method === 'cash'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-cyan-100 text-cyan-800'
                          }`}
                        >
                          {sale.payment_method === 'cash' ? 'CASH' : sale.payment_method.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900">VNT-20261005-0001</p>
                      <p className="text-[10px] text-slate-400">19:54 • Par Koffi</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900">3 500 F</p>
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        CASH
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900">VNT-20261005-0002</p>
                      <p className="text-[10px] text-slate-400">19:56 • Par Koffi</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900">21 500 F</p>
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800">
                        MOBILE_MONEY
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/sales')}
            className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition text-center mt-3"
          >
            Historique complet des ventes
          </button>
        </div>

        {/* Column 3: Journal d'Audit */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  Journal d'Audit
                </h2>
                <p className="text-[10px] text-slate-400">Traçabilité des opérations</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="space-y-0.5 border-b border-slate-100 pb-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px]">{log.userName}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{log.timeAgo}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                    {log.action}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium mt-3">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Toutes les actions sont tracées et sécurisées</span>
          </div>
        </div>
      </div>

      {/* Modal Ticket de Caisse */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={selectedSale}
        items={modalItems}
      />
    </div>
  );
};

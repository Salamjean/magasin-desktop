import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, Product, Category, Customer, Sale, SaleItem } from '../db/db';
import { syncService } from '../db/syncService';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  Smartphone,
  Users,
  UserPlus,
  CheckCircle2,
  Printer,
  Sparkles,
  Percent,
  X,
  AlertCircle,
  Lock,
  Coins
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Swal from 'sweetalert2';
import { ReceiptModal } from '../components/ReceiptModal';
import { CashOpeningDeclaration } from '../components/CashOpeningDeclaration';
import { CashSession } from '../db/db';

export const Pos: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    items,
    customer,
    discount,
    subtotal,
    taxAmount,
    total,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setCustomer,
    setDiscount,
    scanBarcode
  } = useCart();

  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wave' | 'om' | 'credit'>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  
  // Completed Receipt Modal State
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [completedSaleItems, setCompletedSaleItems] = useState<SaleItem[]>([]);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPaidAmount(total);
  }, [total, isPayModalOpen]);

  const loadData = async () => {
    try {
      const openSession = await db.cash_sessions.where('status').equals('open').first();
      setActiveSession(openSession || null);

      const allProds = await db.products.toArray();
      const activeProds = allProds.filter(
        (p) =>
          p.is_active !== false &&
          (p.is_active as any) !== 0 &&
          (p.is_active as any) !== '0' &&
          (p.is_active as any) !== 'false'
      );
      const cats = await db.categories.toArray();
      const custs = await db.customers.toArray();

      setProducts(activeProds);
      setCategories(cats);
      setCustomers(custs);
    } catch (err) {
      console.error('Erreur chargement POS:', err);
    } finally {
      setCheckingSession(false);
    }
  };

  const lastScanTimeRef = useRef<number>(0);

  // Son de confirmation du scanner (Bip TPV synthétisé sans fichier externe)
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1350, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch (e) {
      // Ignorer si audio bloqué par le navigateur
    }
  };

  // Son d'alerte seuil de stock atteint
  const playAlertBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch (e) {
      // Ignorer si audio bloqué
    }
  };

  // Traitement du scan avec délai de sécurité de 1 seconde (1000ms)
  const processBarcodeScan = async (rawCode: string): Promise<boolean> => {
    const code = rawCode.trim();
    if (!code) return false;

    const now = Date.now();
    // Bloquer les scans successifs trop rapides (cooldown de 1 seconde)
    if (now - lastScanTimeRef.current < 1000) {
      return false;
    }

    const found = await scanBarcode(code);
    if (found) {
      lastScanTimeRef.current = Date.now();
      playScanBeep();
      setBarcodeInput('');
      setSearchQuery('');
      return true;
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Produit introuvable',
        text: `Aucun article trouvé avec le code : ${code}`,
        timer: 1800,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
      setBarcodeInput('');
      return false;
    }
  };

  // Écouteur global pour douchettes et scanners USB/Bluetooth (sans nécessiter de clic préalable)
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      // Ignorer si une modale de paiement ou autre dialogue est ouvert
      if (isPayModalOpen || isReceiptOpen) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Si le délai entre deux frappes est trop long (> 80ms), on réinitialise le buffer sauf si c'est le début
      if (timeDiff > 80 && barcodeBuffer.length > 0) {
        barcodeBuffer = '';
      }

      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 2) {
          e.preventDefault();
          const scannedCode = barcodeBuffer.trim();
          barcodeBuffer = '';
          await processBarcodeScan(scannedCode);
        }
        barcodeBuffer = '';
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isPayModalOpen, isReceiptOpen, scanBarcode]);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    await processBarcodeScan(barcodeInput);
  };

  // Filter products by search query and category
  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory ? p.category_id === selectedCategory : true;
    const searchLower = (searchQuery || '').trim().toLowerCase();
    if (!searchLower) return matchCategory;
    const nameMatch = (p.name || '').toLowerCase().includes(searchLower);
    const refMatch = (p.reference || '').toLowerCase().includes(searchLower);
    const barMatch = (p.barcode || '').toLowerCase().includes(searchLower);
    return matchCategory && (nameMatch || refMatch || barMatch);
  });

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchQuery.trim();
      if (!query) return;

      // 1. Tenter un scan direct par code-barres / réf via processBarcodeScan (avec délai 1s)
      const found = await processBarcodeScan(query);
      if (found) {
        return;
      }

      // 2. Si un seul produit filtré dans la liste, on l'ajoute directement (avec délai 1s)
      if (filteredProducts.length === 1) {
        const now = Date.now();
        if (now - lastScanTimeRef.current >= 1000) {
          lastScanTimeRef.current = now;
          addToCart(filteredProducts[0], 1);
          playScanBeep();
          setSearchQuery('');
        }
      }
    }
  };

  const changeAmount = Math.max(0, paidAmount - total);

  // Ajout rapide d'un nouveau client directement depuis la caisse (réservé aux infos de contact)
  const handleOpenQuickAddCustomer = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Nouveau Client',
      html: `
        <div class="space-y-3 text-left p-1 text-xs">
          <div>
            <label class="font-extrabold uppercase text-slate-500 block mb-1 text-[10px] tracking-wider">Nom & Prénom / Raison Sociale *</label>
            <input id="swal-cust-name" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 font-semibold text-xs focus:outline-none focus:border-[#0055b8]" placeholder="Ex: M. Amadou Diallo" autofocus />
          </div>
          <div>
            <label class="font-extrabold uppercase text-slate-500 block mb-1 text-[10px] tracking-wider">Téléphone de contact</label>
            <input id="swal-cust-phone" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 font-semibold text-xs focus:outline-none focus:border-[#0055b8]" placeholder="Ex: 0708091011" />
          </div>
          <div>
            <label class="font-extrabold uppercase text-slate-500 block mb-1 text-[10px] tracking-wider">Adresse / Quartier</label>
            <input id="swal-cust-address" class="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 font-semibold text-xs focus:outline-none focus:border-[#0055b8]" placeholder="Ex: Cocody Angré 8e Tranche" />
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Enregistrer le client',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#0055b8',
      cancelButtonColor: '#64748b',
      preConfirm: () => {
        const nameInput = (document.getElementById('swal-cust-name') as HTMLInputElement)?.value.trim();
        const phoneInput = (document.getElementById('swal-cust-phone') as HTMLInputElement)?.value.trim();
        const addressInput = (document.getElementById('swal-cust-address') as HTMLInputElement)?.value.trim();

        if (!nameInput) {
          Swal.showValidationMessage('Le nom du client est obligatoire.');
          return false;
        }

        return {
          name: nameInput,
          phone: phoneInput || '',
          address: addressInput || '',
          credit_limit: 0
        };
      }
    });

    if (formValues) {
      try {
        const newCustId = await db.customers.add({
          name: formValues.name,
          phone: formValues.phone,
          address: formValues.address,
          credit_limit: 0,
          current_debt: 0,
          loyalty_points: 0,
          synced: 0
        });

        const updatedCusts = await db.customers.toArray();
        setCustomers(updatedCusts);

        const newCustomerObj = updatedCusts.find((c) => c.id === Number(newCustId));
        if (newCustomerObj) {
          setCustomer(newCustomerObj);
        }

        // Push sync vers MySQL
        syncService.pushToRemote().catch((e) => console.warn('Sync error:', e));

        Swal.fire({
          icon: 'success',
          title: 'Client enregistré !',
          text: `Le client ${formValues.name} a été créé et sélectionné pour cette vente.`,
          timer: 2000,
          showConfirmButton: false
        });
      } catch (err: any) {
        Swal.fire('Erreur', err.message || 'Impossible d\'ajouter le client.', 'error');
      }
    }
  };

  // Validate & complete checkout
  const handleValidateCheckout = async () => {
    if (items.length === 0) return;

    if (paymentMethod === 'credit') {
      if (!customer || customer.name === 'Client Comptoir Standard') {
        Swal.fire('Erreur', 'Veuillez sélectionner un client avec compte pour un paiement à crédit.', 'error');
        return;
      }
      const newDebt = (customer.current_debt || 0) + total;
      if (customer.credit_limit > 0 && newDebt > customer.credit_limit) {
        const confirm = await Swal.fire({
          title: 'Plafond dépassé !',
          text: `La dette (${newDebt.toLocaleString()} F) dépassera le plafond de ${customer.credit_limit.toLocaleString()} F. Continuer ?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Oui, accorder le crédit',
          cancelButtonText: 'Annuler'
        });
        if (!confirm.isConfirmed) return;
      }
    }

    try {
      const invoiceNumber = `FAC-${Date.now().toString().slice(-6)}`;
      const now = new Date().toISOString();

      // 1. Create Sale record
      const saleId = await db.sales.add({
        invoice_number: invoiceNumber,
        user_id: user?.id || 1,
        customer_id: customer?.id,
        cash_session_id: activeSession?.id,
        subtotal,
        discount_amount: discount,
        tax_amount: taxAmount,
        total_amount: total,
        paid_amount: paidAmount,
        change_amount: changeAmount,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'credit' ? 'pending' : 'paid',
        created_at: now,
        synced: 0
      });

      // 2. Create Sale Items & Deduct Stock
      const saleItemsToSave: SaleItem[] = [];
      const lowStockAlerts: { name: string; remainingStock: number; minStock: number; unit: string }[] = [];

      for (const item of items) {
        const itemRecord: SaleItem = {
          sale_id: Number(saleId),
          product_id: item.product.id!,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          subtotal: item.subtotal,
          synced: 0
        };
        await db.sale_items.add(itemRecord);
        saleItemsToSave.push(itemRecord);

        // Update product stock in local DB
        const currentStock = item.product.stock_quantity || 0;
        const newStock = Math.max(0, currentStock - item.quantity);
        const minStock = Number(item.product.min_stock) || 0;

        await db.products.update(item.product.id!, {
          stock_quantity: newStock,
          synced: 0
        });

        // Détecter si le produit a atteint ou dépassé son seuil d'alerte
        if (newStock <= minStock) {
          lowStockAlerts.push({
            name: item.product.name,
            remainingStock: newStock,
            minStock,
            unit: item.product.unit || 'pcs'
          });
        }

        // Log stock movement
        await db.stock_movements.add({
          product_id: item.product.id!,
          type: 'out',
          quantity: item.quantity,
          reference: invoiceNumber,
          reason: `Vente caisse #${invoiceNumber}`,
          user_id: user?.id || 1,
          created_at: now,
          synced: 0
        });
      }

      // 3. If credit sale, update customer debt
      if (paymentMethod === 'credit' && customer?.id) {
        const updatedDebt = (customer.current_debt || 0) + total;
        await db.customers.update(customer.id, {
          current_debt: updatedDebt,
          synced: 0
        });
      }

      // 4. Confetti animation
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      // 5. Prepare receipt modal
      const createdSale = await db.sales.get(Number(saleId));
      setCompletedSale(createdSale || null);
      setCompletedSaleItems(saleItemsToSave);

      // Reset state & close pay modal
      setIsPayModalOpen(false);
      clearCart();
      loadData(); // reload product stock
      setIsReceiptOpen(true);

      // Synchronisation immédiate vers MySQL
      syncService.pushToRemote().catch((e) => console.warn('Sync error:', e));

      // 6. Pop-up automatique d'alerte si un ou plusieurs produits ont atteint leur seuil de stock
      if (lowStockAlerts.length > 0) {
        playAlertBeep();
        setTimeout(() => {
          Swal.fire({
            title: '⚠️ Seuil de Stock Atteint !',
            html: `
              <div class="text-left text-xs space-y-2 mt-1">
                <p class="text-slate-600 font-medium">Attention, le stock des articles suivants est critique ou épuisé :</p>
                <div class="space-y-1.5 pt-1 max-h-48 overflow-y-auto">
                  ${lowStockAlerts
                    .map(
                      (p) => `
                    <div class="p-2.5 rounded-xl ${
                      p.remainingStock === 0
                        ? 'bg-rose-50 border border-rose-200 text-rose-900'
                        : 'bg-amber-50 border border-amber-200 text-amber-900'
                    } flex items-center justify-between gap-2">
                      <div class="min-w-0">
                        <strong class="block text-slate-900 truncate">${p.name}</strong>
                        <span class="text-[10px] text-slate-500">Seuil d'alerte : ${p.minStock} ${p.unit}</span>
                      </div>
                      <span class="font-black font-mono text-[11px] px-2.5 py-1 rounded-lg flex-shrink-0 ${
                        p.remainingStock === 0 ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                      }">
                        ${p.remainingStock === 0 ? 'Rupture (0)' : `Reste : ${p.remainingStock} ${p.unit}`}
                      </span>
                    </div>
                  `
                    )
                    .join('')}
                </div>
                <p class="text-[10px] text-slate-400 font-medium pt-1">
                  Veuillez en informer le magasinier pour planifier le réassort.
                </p>
              </div>
            `,
            icon: 'warning',
            confirmButtonText: 'Compris',
            confirmButtonColor: '#e11d48'
          });
        }, 400);
      }

    } catch (err: any) {
      Swal.fire('Erreur', `Impossible d'enregistrer la vente : ${err.message}`, 'error');
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0055b8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeSession) {
    return (
      <CashOpeningDeclaration
        onSessionOpened={(newSession) => {
          setActiveSession(newSession);
          loadData();
        }}
      />
    );
  }

  // Helper catégorie et initiales
  const categoryMap = new Map<number, Category>(categories.map((c) => [c.id!, c]));

  const getCategoryColor = (catName?: string, fallbackColor?: string) => {
    if (fallbackColor && fallbackColor !== '#0284c7') return fallbackColor;
    const lower = (catName || '').toLowerCase();
    if (lower.includes('boisson') || lower.includes('jus') || lower.includes('eau')) return '#0055b8';
    if (lower.includes('aliment') || lower.includes('épicerie') || lower.includes('epicerie')) return '#10b981';
    if (lower.includes('lait') || lower.includes('frais') || lower.includes('fromage')) return '#f59e0b';
    if (lower.includes('hygiène') || lower.includes('hygiene') || lower.includes('beauté') || lower.includes('beaute')) return '#ec4899';
    if (lower.includes('ménag') || lower.includes('menag') || lower.includes('entretien')) return '#8b5cf6';
    if (lower.includes('boulang') || lower.includes('pâtiss') || lower.includes('patiss') || lower.includes('pain')) return '#ef4444';
    return fallbackColor || '#0055b8';
  };

  const getProductInitials = (name: string) => {
    if (!name) return 'PR';
    const clean = name.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    const words = clean.split(/\s+/).filter(
      (w) => !['de', 'du', 'la', 'le', 'les', 'des', 'et', 'en', 'au', 'aux', 'd', 'l'].includes(w.toLowerCase())
    );
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return (clean.slice(0, 2) || 'PR').toUpperCase();
  };

  return (
    <div className="min-h-full lg:h-full lg:max-h-full flex flex-col lg:flex-row gap-4 lg:gap-3 overflow-visible lg:overflow-hidden select-none animate-in fade-in duration-150 pb-8 lg:pb-0">
      {/* LEFT AREA: Catalog, Categories & Barcode Search (70% width) */}
      <div className="flex-1 min-h-[460px] lg:min-h-0 flex flex-col bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
        {/* Top Search & Barcode bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          {/* Text Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Rechercher un article par nom ou référence..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Barcode Scanner Input */}
          <form onSubmit={handleBarcodeSubmit} className="relative sm:w-64">
            <Barcode className="w-4 h-4 text-[#0055b8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scanner Code-barres..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-blue-50/50 border border-blue-200 text-xs font-mono text-blue-900 placeholder-blue-400 focus:outline-none focus:border-[#0055b8] focus:ring-1 focus:ring-[#0055b8] transition"
            />
          </form>

          {/* Bouton Clôture / Fermeture de Caisse */}
          <button
            type="button"
            onClick={() => navigate('/cash-session')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition shadow-xs whitespace-nowrap active:scale-95"
            title="Accéder à la Clôture de Session & Arrêté des Comptes"
          >
            <Lock className="w-4 h-4 text-rose-600" />
            <span className="hidden sm:inline">Fermeture Caisse</span>
          </button>
        </div>

        {/* Category Pill Tabs */}
        <div className="px-3 py-2 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar items-center bg-slate-50/40">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition shadow-xs ${
              selectedCategory === null
                ? 'bg-[#0055b8] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Tous les rayons ({products.length})
          </button>
          {categories.map((cat) => {
            const catColor = getCategoryColor(cat.name, cat.color);
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id!)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1.5 shadow-xs ${
                  isSelected
                    ? 'bg-[#0055b8] text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: isSelected ? '#ffffff' : catColor }}
                />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Products Grid - Seule cette zone scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 bg-slate-50/40">
          {filteredProducts.length === 0 ? (
            <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2.5">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <h4 className="font-bold text-xs text-slate-700">Aucun produit trouvé</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                {searchQuery
                  ? `Aucun article ne correspond à "${searchQuery}". Essayez un autre mot-clé ou scannez le code-barres.`
                  : 'Aucun article actif disponible dans ce rayon.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock_quantity <= 0;
                const isLowStock = product.stock_quantity <= product.min_stock;
                const catObj = categoryMap.get(product.category_id || 0);
                const catColor = getCategoryColor(catObj?.name, catObj?.color);

                return (
                  <button
                    key={product.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(product, 1)}
                    className={`rounded-xl text-left border flex flex-col justify-between transition-all duration-150 active:scale-95 group overflow-hidden bg-white shadow-xs ${
                      isOutOfStock
                        ? 'border-slate-200 opacity-50 cursor-not-allowed'
                        : 'border-slate-200/90 hover:border-[#0055b8] hover:shadow-md'
                    }`}
                  >
                    {/* Top Banner (Image pleine carte ou Fond Bleu avec Initiales) */}
                    <div className="relative bg-[#0055b8] h-24 sm:h-28 w-full p-2 flex flex-col justify-between items-center overflow-hidden">
                      {/* Image du produit (si présente, remplit bien la bannière) */}
                      {product.image && product.image.trim() ? (
                        <>
                          <img
                            src={product.image}
                            alt={product.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-200"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center my-auto">
                          <span className="text-xl sm:text-2xl font-black text-white tracking-widest uppercase select-none drop-shadow-xs">
                            {getProductInitials(product.name)}
                          </span>
                        </div>
                      )}

                      {/* Badge Stock en haut à droite */}
                      <div className="relative z-10 w-full flex justify-end">
                        <span
                          className={`text-[8.5px] font-black px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs ${
                            isOutOfStock
                              ? 'bg-rose-100/90 text-rose-800'
                              : isLowStock
                              ? 'bg-amber-100/90 text-amber-900'
                              : 'bg-[#d1f2e2]/95 text-[#0d5c3a]'
                          }`}
                        >
                          {product.stock_quantity} {product.unit || 'pcs'}
                        </span>
                      </div>

                      {/* Badge Catégorie en bas à gauche */}
                      <div className="relative z-10 w-full flex justify-start">
                        <span
                          className="text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white shadow-xs truncate max-w-[95%]"
                          style={{ backgroundColor: catColor }}
                        >
                          {catObj?.name || 'Général'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Card Body (Nom, Prix & Bouton Plus) */}
                    <div className="p-2 sm:p-2.5 bg-white flex flex-col justify-between flex-1 w-full space-y-1.5">
                      {/* Nom du produit */}
                      <h4
                        className="font-bold text-[11px] text-slate-900 group-hover:text-[#0055b8] transition line-clamp-2 leading-tight"
                        title={product.name}
                      >
                        {product.name}
                      </h4>

                      {/* Prix de vente & Bouton + */}
                      <div className="pt-1 flex items-center justify-between border-t border-slate-100/80">
                        <span className="text-xs font-black text-slate-900 tracking-tight">
                          {product.selling_price.toLocaleString('fr-FR')}{' '}
                          <span className="text-[9px] font-bold text-slate-500">FCFA</span>
                        </span>
                        <div className="w-5 h-5 rounded-md bg-blue-50 text-[#0055b8] group-hover:bg-[#0055b8] group-hover:text-white flex items-center justify-center transition shadow-2xs font-bold">
                          <Plus className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT AREA: Cart & POS Checkout Panel (30% width) */}
      <div className="w-full lg:w-96 flex flex-col min-h-[440px] lg:min-h-0 bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden flex-shrink-0">
        {/* Cart Header & Customer Selection */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span>Panier en cours</span>
              <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-black">
                {items.length}
              </span>
            </h3>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
              >
                Vider panier
              </button>
            )}
          </div>

          {/* Customer Selector & Quick Add Button */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={customer?.id || ''}
                onChange={(e) => {
                  const found = customers.find((c) => c.id === Number(e.target.value));
                  setCustomer(found || null);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0055b8] transition cursor-pointer"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.current_debt > 0 ? `(Dette: ${c.current_debt.toLocaleString()} F)` : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleOpenQuickAddCustomer}
              className="p-2 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold transition shadow-xs flex-shrink-0 active:scale-95"
              title="Ajouter un nouveau client"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-2.5">
          {items.map((item) => (
            <div
              key={item.product.id}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <h5 className="font-bold text-xs text-slate-800 truncate">{item.product.name}</h5>
                <p className="text-[11px] text-slate-400">
                  {item.unitPrice.toLocaleString('fr-FR')} F / {item.product.unit}
                </p>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-sm">
                <button
                  onClick={() => updateQuantity(item.product.id!, item.quantity - 1)}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-black w-6 text-center text-slate-800">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.product.id!, item.quantity + 1)}
                  className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <div className="text-right">
                <p className="font-black text-xs text-slate-900">
                  {item.subtotal.toLocaleString('fr-FR')} F
                </p>
                <button
                  onClick={() => removeFromCart(item.product.id!)}
                  className="text-[10px] text-rose-500 hover:text-rose-700"
                >
                  <Trash2 className="w-3 h-3 inline" />
                </button>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <Barcode className="w-12 h-12 text-slate-300 stroke-1" />
              <p className="text-xs font-medium">Panier vide. Scannez un article ou cliquez sur le catalogue pour commencer.</p>
            </div>
          )}
        </div>

        {/* Cart Total & Checkout CTA */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Sous-total</span>
              <span className="font-bold text-slate-800">{subtotal.toLocaleString('fr-FR')} FCFA</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Remise</span>
                <span>-{discount.toLocaleString('fr-FR')} FCFA</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>TOTAL</span>
              <span className="text-primary-700">{total.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            disabled={items.length === 0}
            onClick={() => setIsPayModalOpen(true)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            <span>Encaisser ({total.toLocaleString('fr-FR')} F)</span>
          </button>
        </div>
      </div>

      {/* QUICK PAYMENT MODAL (POP-UP RÈGLEMENT SOBRE & MODERNE) */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[92dvh] sm:max-h-[90vh]">
            
            {/* 1. Header Sobre & Épuré */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-white">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Caisse • {items.reduce((s, i) => s + i.quantity, 0)} article(s)
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[11px] font-bold text-[#0055b8]">
                    {customer?.name || 'Client Comptoir'}
                  </span>
                </div>
                <h3 className="font-extrabold text-lg text-slate-900">
                  Règlement de la vente
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. Bandeau Montant Total Net */}
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Net à payer
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-black text-slate-900 tracking-tight">
                  {total.toLocaleString('fr-FR')} <span className="text-sm font-bold text-slate-500">FCFA</span>
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200/60 text-[#0055b8] text-xs font-bold">
                {paymentMethod === 'cash'
                  ? 'Espèces'
                  : paymentMethod === 'wave' || paymentMethod === 'om'
                  ? 'Mobile Money'
                  : 'À Crédit'}
              </div>
            </div>

            {/* 3. Modal Body Scrollable */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 overscroll-contain">
              
              {/* Sélecteur de Mode de Paiement (Auto-adaptatif : 2 cols ou 3 cols) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2.5">
                  Sélectionnez le mode d'encaissement
                </label>

                {(() => {
                  const hasCredit = customer && customer.name !== 'Client Comptoir Standard' && customer.name !== 'Client Standard';
                  const methods = [
                    { id: 'cash', label: 'Espèces', sub: 'Cash', icon: DollarSign, color: '#10b981' },
                    { id: 'wave', label: 'Mobile Money', sub: 'Wave / Orange', icon: Smartphone, color: '#0ea5e9' },
                    ...(hasCredit ? [{ id: 'credit', label: 'À Crédit', sub: 'Compte', icon: Users, color: '#eab308' }] : [])
                  ];

                  return (
                    <div className={`grid gap-2.5 ${hasCredit ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {methods.map((m) => {
                        const Icon = m.icon;
                        const isSel = paymentMethod === m.id;

                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setPaymentMethod(m.id as any);
                              if (m.id === 'cash') setPaidAmount(total);
                            }}
                            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-150 active:scale-95 relative group ${
                              isSel
                                ? 'bg-blue-50/70 border-[#0055b8] ring-2 ring-[#0055b8]/20 shadow-xs'
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-2">
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs"
                                style={{ backgroundColor: m.color }}
                              >
                                <Icon className="w-4 h-4 stroke-[2.5]" />
                              </div>
                              {isSel && (
                                <span className="w-4 h-4 rounded-full bg-[#0055b8] text-white flex items-center justify-center text-[10px] font-bold">
                                  ✓
                                </span>
                              )}
                            </div>
                            <div>
                              <div className={`text-xs font-black leading-tight ${isSel ? 'text-[#0055b8]' : 'text-slate-900'}`}>
                                {m.label}
                              </div>
                              <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                                {m.sub}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* DÉTAIL 1 : ESPÈCES */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Montant reçu du client
                    </label>
                    <button
                      type="button"
                      onClick={() => setPaidAmount(total)}
                      className="text-xs font-bold text-[#0055b8] hover:underline"
                    >
                      Montant exact
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={paidAmount || ''}
                      onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                      placeholder={String(total)}
                      className="w-full pl-4 pr-16 py-2.5 text-xl font-mono font-black text-slate-900 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-[#0055b8] transition"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      FCFA
                    </span>
                  </div>

                  {/* Coupures rapides */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[total, 1000, 2000, 5000, 10000, 20000].map((amt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPaidAmount(amt)}
                        className={`py-1.5 px-1 rounded-lg border text-xs font-mono font-bold transition active:scale-95 truncate ${
                          paidAmount === amt
                            ? 'bg-[#0055b8] text-white border-[#0055b8]'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {amt === total ? 'Exact' : `${amt.toLocaleString('fr-FR')} F`}
                      </button>
                    ))}
                  </div>

                  {/* Monnaie à rendre */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600">
                      {paidAmount >= total ? 'Monnaie à rendre :' : 'Reste à percevoir :'}
                    </span>
                    <span
                      className={`text-base font-mono font-black ${
                        paidAmount >= total ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {paidAmount >= total
                        ? changeAmount.toLocaleString('fr-FR')
                        : (total - paidAmount).toLocaleString('fr-FR')}{' '}
                      FCFA
                    </span>
                  </div>
                </div>
              )}

              {/* DÉTAIL 2 : CRÉDIT CLIENT */}
              {paymentMethod === 'credit' && customer && customer.name !== 'Client Comptoir Standard' && customer.name !== 'Client Standard' && (
                <div className="space-y-2.5 bg-amber-50/80 p-4 rounded-2xl border border-amber-200 text-xs">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-2 font-bold text-amber-950">
                    <span>Compte client :</span>
                    <span>{customer.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Dette actuelle :</span>
                    <span className="font-mono font-bold text-slate-800">
                      {(customer.current_debt || 0).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Ajout de cette vente :</span>
                    <span className="font-mono font-black">+{total.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-amber-200 font-black text-amber-950">
                    <span>Nouvelle dette totale :</span>
                    <span className="font-mono text-sm text-rose-600">
                      {((customer.current_debt || 0) + total).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
              )}

              {/* DÉTAIL 3 : MOBILE MONEY */}
              {(paymentMethod === 'wave' || paymentMethod === 'om') && (
                <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl text-xs space-y-1 text-slate-700">
                  <p className="font-bold text-[#0055b8]">
                    Paiement Mobile Money ({paymentMethod === 'wave' ? 'Wave' : 'Orange Money'})
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Veuillez confirmer la réception du montant de <strong>{total.toLocaleString('fr-FR')} FCFA</strong> sur votre compte marchand avant de valider.
                  </p>
                </div>
              )}
            </div>

            {/* 4. Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 transition active:scale-95"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleValidateCheckout}
                disabled={paymentMethod === 'cash' && paidAmount < total}
                className="px-6 py-2.5 rounded-xl bg-[#0055b8] hover:bg-blue-700 font-bold text-xs text-white shadow-md shadow-blue-500/20 flex items-center gap-2 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmer & Imprimer</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* COMPLETED SALE THERMAL RECEIPT MODAL */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={completedSale}
        items={completedSaleItems}
        customer={customer}
      />
    </div>
  );
};

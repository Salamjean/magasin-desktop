import React, { useState, useEffect } from 'react';
import { db, Product, Category, Supplier } from '../db/db';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  XCircle,
  ArrowDownToLine,
  Plus,
  Package,
  Layers,
  Building2,
  CheckCircle2
} from 'lucide-react';

export const Alerts: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allProds, allCats, allSups] = await Promise.all([
        db.products.toArray(),
        db.categories.toArray(),
        db.suppliers.toArray()
      ]);

      setProducts(allProds);
      setCategories(allCats);
      setSuppliers(allSups);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Ruptures Totales (Stock <= 0)
  const outOfStockProducts = products.filter((p) => p.stock_quantity <= 0);

  // 2. Stocks sous le seuil (Stock > 0 && Stock <= min_stock)
  const lowStockProducts = products.filter(
    (p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock
  );

  const getCategory = (catId?: number) => {
    return categories.find((c) => c.id === catId);
  };

  const getSupplierName = (supId?: number) => {
    const sup = suppliers.find((s) => s.id === supId);
    return sup ? sup.name : 'Fournisseur Général';
  };

  return (
    <div className="space-y-4 pb-8 select-none animate-in fade-in duration-150">
      {/* 1. TOP ROW: 2 KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: RUPTURES TOTALES */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Ruptures Totales
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-rose-600 tracking-tight">
              {outOfStockProducts.length}
            </h3>
            <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 inline-block"></span>
              <span>Stock égal à 0</span>
            </p>
          </div>
        </div>

        {/* Card 2: STOCKS SOUS LE SEUIL */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Stocks sous le seuil
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-amber-600 tracking-tight">
              {lowStockProducts.length}
            </h3>
            <p className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1.5">
              <span>▲</span>
              <span>Réapprovisionnement conseillé</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. SECTION: PRODUITS EN RUPTURE TOTALE (STOCK = 0) */}
      <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden">
        {/* Header Banner */}
        <div className="bg-rose-50/70 p-4 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-rose-950 leading-tight">
                Produits en Rupture Totale (Stock = 0)
              </h2>
              <p className="text-[11px] text-rose-700/80 font-medium">
                Ces articles sont épuisés et ne peuvent plus être vendus en caisse.
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-rose-100/90 text-rose-700 text-[11px] font-bold border border-rose-200/60 whitespace-nowrap">
            {outOfStockProducts.length} article(s)
          </span>
        </div>

        {/* Table Rupture */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/60 text-slate-500 font-extrabold border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">PRODUIT</th>
                <th className="px-5 py-3">RÉFÉRENCE & CODE</th>
                <th className="px-5 py-3">RAYON / CATÉGORIE</th>
                <th className="px-5 py-3">FOURNISSEUR</th>
                <th className="px-5 py-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {outOfStockProducts.length > 0 ? (
                outOfStockProducts.map((p) => {
                  const cat = getCategory(p.category_id);
                  const supName = getSupplierName(p.supplier_id);

                  return (
                    <tr key={p.id} className="hover:bg-rose-50/30 transition">
                      {/* PRODUIT */}
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {p.name}
                      </td>

                      {/* RÉFÉRENCE & CODE */}
                      <td className="px-5 py-3.5 font-mono text-slate-500">
                        <div className="font-bold text-slate-700">{p.reference}</div>
                        {p.barcode && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            {p.barcode}
                          </div>
                        )}
                      </td>

                      {/* RAYON / CATÉGORIE */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cat?.color || '#9333ea' }}
                          ></span>
                          <span>{cat?.name || 'Général'}</span>
                        </div>
                      </td>

                      {/* FOURNISSEUR */}
                      <td className="px-5 py-3.5 text-slate-600 font-medium">
                        {supName}
                      </td>

                      {/* ACTION */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => navigate('/stock/in')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00875a] hover:bg-[#00704a] text-white font-bold text-xs shadow-sm transition active:scale-95 whitespace-nowrap"
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Réapprovisionner</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">
                    Aucun article en rupture totale. Tout est disponible !
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. SECTION: PRODUITS SOUS LE SEUIL D'ALERTE (STOCK FAIBLE) */}
      <div className="bg-white rounded-3xl border border-amber-100 shadow-sm overflow-hidden">
        {/* Header Banner */}
        <div className="bg-amber-50/70 p-4 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-amber-950 leading-tight">
                Produits sous le Seuil d'Alerte (Stock Faible)
              </h2>
              <p className="text-[11px] text-amber-800/80 font-medium">
                Le stock restant est inférieur ou égal au seuil minimum paramétré.
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-amber-100/90 text-amber-800 text-[11px] font-bold border border-amber-200/60 whitespace-nowrap">
            {lowStockProducts.length} article(s)
          </span>
        </div>

        {/* Table Stock Faible */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/60 text-slate-500 font-extrabold border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">PRODUIT</th>
                <th className="px-5 py-3 text-center">STOCK ACTUEL</th>
                <th className="px-5 py-3 text-center">SEUIL MINIMUM</th>
                <th className="px-5 py-3">FOURNISSEUR</th>
                <th className="px-5 py-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map((p) => {
                  const supName = getSupplierName(p.supplier_id);

                  return (
                    <tr key={p.id} className="hover:bg-amber-50/30 transition">
                      {/* PRODUIT */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="font-mono text-[10px] text-slate-400 font-normal">
                          {p.reference}
                        </div>
                      </td>

                      {/* STOCK ACTUEL */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-black">
                          {p.stock_quantity} {p.unit}
                        </span>
                      </td>

                      {/* SEUIL MINIMUM */}
                      <td className="px-5 py-3.5 text-center font-semibold text-slate-700 font-mono">
                        {p.min_stock} {p.unit}
                      </td>

                      {/* FOURNISSEUR */}
                      <td className="px-5 py-3.5 text-slate-600 font-medium">
                        {supName}
                      </td>

                      {/* ACTION */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => navigate('/stock/in')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00875a] hover:bg-[#00704a] text-white font-bold text-xs shadow-sm transition active:scale-95 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Ajouter du stock</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">
                    Aucun article sous le seuil d'alerte. Les stocks sont sous contrôle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

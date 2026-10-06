import React, { useState, useEffect } from 'react';
import { db, Sale, Expense, Product } from '../../../db/db';
import { FileText, Download, Printer, TrendingUp, DollarSign, Calendar } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    Promise.all([
      db.sales.toArray(),
      db.expenses.toArray(),
      db.products.toArray()
    ]).then(([s, e, p]) => {
      setSales(s);
      setExpenses(e);
      setProducts(p);
    });
  }, []);

  const totalSales = sales.reduce((acc, s) => acc + s.total_amount, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalSales - totalExpenses;
  const totalStockValuation = products.reduce((acc, p) => acc + (p.stock_quantity * p.purchase_price), 0);

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Rapports Financiers & Synthèse</h1>
          <p className="text-xs text-slate-500">Bilan d'activité, compte de résultat simplifié et valorisation du stock</p>
        </div>

        <button
          onClick={handlePrintReport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-lg shadow-primary-500/25 transition active:scale-95 self-start"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimer le Bilan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recettes Globales</span>
          <h3 className="text-xl font-black text-emerald-600 mt-2 font-mono">
            {totalSales.toLocaleString('fr-FR')} FCFA
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">{sales.length} ventes validées</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Charges & Dépenses</span>
          <h3 className="text-xl font-black text-rose-600 mt-2 font-mono">
            {totalExpenses.toLocaleString('fr-FR')} FCFA
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">{expenses.length} dépenses payées</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bénéfice Net Estimé</span>
          <h3 className={`text-xl font-black mt-2 font-mono ${netProfit >= 0 ? 'text-primary-700' : 'text-rose-600'}`}>
            {netProfit.toLocaleString('fr-FR')} FCFA
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Marge brute - Frais généraux</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-subtle">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valorisation Stock</span>
          <h3 className="text-xl font-black text-slate-900 mt-2 font-mono">
            {totalStockValuation.toLocaleString('fr-FR')} FCFA
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Au prix d'achat fournisseur</p>
        </div>
      </div>
    </div>
  );
};

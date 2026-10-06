import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, Inventory, InventoryItem, Product, Category, User } from '../db/db';
import {
  ClipboardCheck,
  ArrowLeft,
  Download,
  Calendar,
  UserCheck,
  FileText,
  Boxes,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Layers,
  Search
} from 'lucide-react';
import Swal from 'sweetalert2';

export const InventoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [operator, setOperator] = useState<User | null>(null);
  const [items, setItems] = useState<Array<InventoryItem & { product?: Product; category?: Category }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventoryData();
  }, [id]);

  const loadInventoryData = async () => {
    if (!id) {
      navigate('/inventories');
      return;
    }
    const invId = Number(id);
    const inv = await db.inventories.get(invId);
    if (!inv) {
      Swal.fire('Erreur', 'Inventaire introuvable.', 'error');
      navigate('/inventories');
      return;
    }

    const [allUsers, allItems, allProds, allCats] = await Promise.all([
      db.users.toArray(),
      db.inventory_items.where('inventory_id').equals(invId).toArray(),
      db.products.toArray(),
      db.categories.toArray()
    ]);

    const op = allUsers.find((u) => u.id === inv.user_id) || null;

    const enrichedItems = allItems.map((item) => {
      const prod = allProds.find((p) => p.id === item.product_id);
      const cat = prod ? allCats.find((c) => c.id === prod.category_id) : undefined;
      return { ...item, product: prod, category: cat };
    });

    setInventory(inv);
    setOperator(op);
    setItems(enrichedItems);
    setLoading(false);
  };

  // Génération et Téléchargement du Rapport en PDF
  const handleDownloadReportPDF = () => {
    if (!inventory) return;

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      Swal.fire('Attention', 'Veuillez autoriser les fenêtres pop-up pour télécharger le PDF.', 'warning');
      return;
    }

    const conforming = items.filter((i) => i.difference === 0).length;
    const surplus = items.filter((i) => i.difference > 0).length;
    const loss = items.filter((i) => i.difference < 0).length;

    const rowsHtml = items
      .map(
        (item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
          <td style="padding: 8px 12px; font-weight: bold; color: #0f172a;">${item.product?.name || 'Produit'}</td>
          <td style="padding: 8px 12px; font-family: monospace; color: #64748b; font-size: 11px;">${item.product?.reference || '-'}</td>
          <td style="padding: 8px 12px; color: #475569; font-size: 12px;">${item.category?.name || 'Général'}</td>
          <td style="padding: 8px 12px; text-align: center; font-weight: bold; color: #475569;">${item.theoretical_quantity} ${item.product?.unit || 'pcs'}</td>
          <td style="padding: 8px 12px; text-align: center; font-weight: bold; color: #0f172a;">${item.real_quantity} ${item.product?.unit || 'pcs'}</td>
          <td style="padding: 8px 12px; text-align: center; font-weight: bold; color: ${
            item.difference === 0 ? '#059669' : item.difference > 0 ? '#4f46e5' : '#e11d48'
          };">
            ${item.difference === 0 ? '0' : (item.difference > 0 ? '+' : '') + item.difference} ${item.product?.unit || 'pcs'}
          </td>
          <td style="padding: 8px 12px; font-size: 11px; color: #334155;">${item.reason || (item.difference === 0 ? 'Conforme' : '-')}</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Rapport_Inventaire_${inventory.reference}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 12px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0055b8; padding-bottom: 12px; margin-bottom: 15px; }
            .logo-title h1 { font-size: 20px; color: #0055b8; margin: 0 0 4px 0; font-weight: 900; }
            .logo-title p { font-size: 12px; color: #64748b; margin: 0; }
            .meta { text-align: right; font-size: 11px; color: #475569; }
            .meta strong { color: #0f172a; }
            .stats-grid { display: flex; gap: 10px; margin-bottom: 15px; }
            .stat-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; background: #f8fafc; }
            .stat-title { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .stat-val { font-size: 16px; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
            th { background-color: #f1f5f9; color: #475569; font-weight: bold; text-align: left; padding: 8px 12px; border-bottom: 1px solid #cbd5e1; font-size: 10px; text-transform: uppercase; }
            .notes-box { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
            .notes-box h4 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #0055b8; }
            .signatures { display: flex; justify-content: space-between; margin-top: 30px; page-break-inside: avoid; }
            .sig-block { width: 45%; border-top: 1px dashed #94a3b8; padding-top: 8px; text-align: center; font-size: 11px; font-weight: bold; color: #475569; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-title">
              <h1>GestMAG — RAPPORT D'INVENTAIRE PHYSIQUE</h1>
              <p>Procès-verbal de comptage et régularisation des stocks</p>
            </div>
            <div class="meta">
              <div>Référence : <strong>${inventory.reference}</strong></div>
              <div>Date : <strong>${new Date(inventory.date).toLocaleString('fr-FR')}</strong></div>
              <div>Opérateur : <strong>${operator?.name || 'Administrateur'}</strong></div>
              <div>Statut : <strong style="color: #059669;">Validé & Clôturé</strong></div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-title">Articles Comptés</div>
              <div class="stat-val" style="color: #0f172a;">${items.length}</div>
            </div>
            <div class="stat-box">
              <div class="stat-title">Conformes (0 Écart)</div>
              <div class="stat-val" style="color: #059669;">${conforming}</div>
            </div>
            <div class="stat-box">
              <div class="stat-title">Surplus (+)</div>
              <div class="stat-val" style="color: #4f46e5;">${surplus}</div>
            </div>
            <div class="stat-box">
              <div class="stat-title">Pertes / Manquants (-)</div>
              <div class="stat-val" style="color: #e11d48;">${loss}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Article</th>
                <th>Référence</th>
                <th>Rayon</th>
                <th style="text-align: center;">Stock Théorique</th>
                <th style="text-align: center;">Stock Réel</th>
                <th style="text-align: center;">Écart</th>
                <th>Justification / Motif</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="notes-box">
            <h4>Note de Synthèse & Observations de Clôture</h4>
            <p style="margin: 0; font-size: 11px; color: #334155; line-height: 1.5;">
              ${inventory.notes || 'Aucune observation particulière enregistrée.'}
            </p>
          </div>

          <div class="signatures">
            <div class="sig-block">
              Signature du Magasinier / Opérateur
              <div style="height: 45px;"></div>
              <div>${operator?.name || 'Administrateur'}</div>
            </div>
            <div class="sig-block">
              Signature de la Direction / Gérance
              <div style="height: 45px;"></div>
              <div>Pour approbation</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading || !inventory) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0055b8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const conformingCount = items.filter((i) => i.difference === 0).length;
  const surplusCount = items.filter((i) => i.difference > 0).length;
  const lossCount = items.filter((i) => i.difference < 0).length;

  const filteredItems = items.filter((i) => {
    const p = i.product;
    if (!p) return false;
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery)
    );
  });

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150 pb-12">
      {/* 1. EN-TÊTE DE LA FICHE D'INVENTAIRE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0055b8] to-blue-700 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-lg shadow-blue-500/25">
            <ClipboardCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Rapport d'Inventaire <span className="font-mono text-[#0055b8]">{inventory.reference}</span>
              </h1>

              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Clôturé & Validé</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date : <strong>{new Date(inventory.date).toLocaleString('fr-FR')}</strong></span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#0055b8]" />
                <span>Opérateur : <strong className="text-slate-800">{operator?.name || 'Administrateur'}</strong></span>
              </span>
            </div>
          </div>
        </div>

        {/* Boutons d'action haut droit */}
        <div className="flex items-center gap-3 self-start md:self-center">
          <button
            type="button"
            onClick={handleDownloadReportPDF}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger le Rapport (PDF)</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/inventories')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition active:scale-95 border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
        </div>
      </div>

      {/* 2. STATISTIQUES DU RAPPORT */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0055b8] flex items-center justify-center font-bold">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ARTICLES COMPTÉS</p>
            <p className="text-lg font-black text-slate-900">{items.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">CONFORMES</p>
            <p className="text-lg font-black text-emerald-700">{conformingCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">SURPLUS (+)</p>
            <p className="text-lg font-black text-indigo-700">{surplusCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-subtle flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">PERTES / MANQUANTS (-)</p>
            <p className="text-lg font-black text-rose-700">{lossCount}</p>
          </div>
        </div>
      </div>

      {/* 3. CARD : NOTE ET OBSERVATIONS DE CLÔTURE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-subtle space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
          <FileText className="w-4 h-4 text-[#0055b8]" />
          <span>NOTE & OBSERVATIONS DE CLÔTURE D'INVENTAIRE</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs font-semibold text-slate-700 leading-relaxed">
          {inventory.notes ? (
            inventory.notes
          ) : (
            <span className="text-slate-400 font-normal italic">
              Aucune observation particulière n'a été saisie lors de la clôture de cet inventaire.
            </span>
          )}
        </div>
      </div>

      {/* 4. TABLEAU DÉTAILLÉ DU COMPTAGE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer les articles de l'inventaire..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0055b8]"
            />
          </div>

          <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-xl">
            {filteredItems.length} article(s) inventorié(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Article & Réf</th>
                <th className="px-5 py-3.5">Rayon</th>
                <th className="px-5 py-3.5 text-center">Stock Théorique</th>
                <th className="px-5 py-3.5 text-center">Stock Réel Compté</th>
                <th className="px-5 py-3.5 text-center">Écart Constaté</th>
                <th className="px-5 py-3.5">Justification / Motif d'écart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredItems.map((item) => {
                const p = item.product;
                const cat = item.category;
                const isConforming = item.difference === 0;
                const isSurplus = item.difference > 0;

                return (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{p?.name || 'Produit archivé'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Réf : {p?.reference || '—'}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      {cat ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white"
                          style={{ backgroundColor: cat.color || '#0055b8' }}
                        >
                          <Layers className="w-3 h-3" />
                          {cat.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Général</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-600">
                      {item.theoretical_quantity} {p?.unit || 'pcs'}
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-900">
                      {item.real_quantity} {p?.unit || 'pcs'}
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono font-black">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] ${
                          isConforming
                            ? 'bg-emerald-100 text-emerald-800'
                            : isSurplus
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isConforming ? '0' : `${isSurplus ? '+' : ''}${item.difference}`} {p?.unit || 'pcs'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      {item.reason ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold">
                          {item.reason}
                        </span>
                      ) : isConforming ? (
                        <span className="text-slate-400 text-xs italic">Conforme</span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Non précisé</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useSync } from '../context/SyncContext';
import { db } from '../db/db';
import { RefreshCw, Wifi, WifiOff, CheckCircle2, AlertCircle, Database, Server, HardDrive, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import Swal from 'sweetalert2';
import { downloadSQLiteDatabase } from '../db/sqliteExport';
import { syncService } from '../db/syncService';

export const SyncCenter: React.FC = () => {
  const { status, syncNow, refreshStatus } = useSync();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [syncLogs, setSyncLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'success' | 'error' }>>([]);
  const [exportingSqlite, setExportingSqlite] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadCounts();
  }, [status]);

  const loadCounts = async () => {
    const [unsyncedSales, unsyncedProds, unsyncedCusts, unsyncedMoves, unsyncedExp] = await Promise.all([
      db.sales.where('synced').equals(0).count(),
      db.products.where('synced').equals(0).count(),
      db.customers.where('synced').equals(0).count(),
      db.stock_movements.where('synced').equals(0).count(),
      db.expenses.where('synced').equals(0).count(),
    ]);

    setCounts({
      sales: unsyncedSales,
      products: unsyncedProds,
      customers: unsyncedCusts,
      stock: unsyncedMoves,
      expenses: unsyncedExp,
    });
  };

  const handleTriggerSync = async () => {
    const time = new Date().toLocaleTimeString('fr-FR');
    setSyncLogs((prev) => [{ time, text: 'Démarrage de la synchronisation...', type: 'info' }, ...prev]);

    const res = await syncNow();
    const timeEnd = new Date().toLocaleTimeString('fr-FR');

    if (res.success) {
      setSyncLogs((prev) => [
        { time: timeEnd, text: 'Synchronisation réussie avec MySQL', type: 'success' },
        ...prev
      ]);
      Swal.fire({ icon: 'success', title: 'Synchronisation terminée !', timer: 1800, showConfirmButton: false });
    } else {
      setSyncLogs((prev) => [
        { time: timeEnd, text: `Échec : ${res.message}`, type: 'error' },
        ...prev
      ]);
      Swal.fire({ icon: 'warning', title: 'Attention', text: res.message, timer: 2500, showConfirmButton: false });
    }
  };

  const handleResetAndResync = async () => {
    const confirm = await Swal.fire({
      title: 'Réaligner avec la Production ?',
      text: 'Cette action va vider le cache local et télécharger toutes les données fraîches depuis votre serveur de production.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, réaligner',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#0055b8'
    });

    if (!confirm.isConfirmed) return;

    setResetting(true);
    try {
      const ok = await syncService.resetAndResyncFromRemote();
      if (ok) {
        await refreshStatus();
        await loadCounts();
        Swal.fire({
          icon: 'success',
          title: 'Base réalignée avec succès !',
          text: 'Les catégories, articles et utilisateurs sont synchronisés avec la production.',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Erreur', 'Impossible de récupérer les données distantes.', 'error');
      }
    } catch (err: any) {
      Swal.fire('Erreur', err.message, 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleExportSQLite = async () => {
    setExportingSqlite(true);
    try {
      await downloadSQLiteDatabase('gestmagasin_local.sqlite');
      Swal.fire({
        icon: 'success',
        title: 'Fichier SQLite généré !',
        html: `Le fichier <b>gestmagasin_local.sqlite</b> a été généré avec succès.<br/><br/>
               Vous pouvez le visualiser avec l'extension <b>SQLite Viewer</b> ou <b>DB Browser for SQLite</b>.`,
        confirmButtonColor: '#059669'
      });
    } catch (err: any) {
      Swal.fire('Erreur', err.message, 'error');
    } finally {
      setExportingSqlite(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Centre de Synchronisation & Base Locale</h1>
          <p className="text-xs text-slate-500">Supervision de la réplication des données entre IndexedDB/SQLite et MySQL</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportSQLite}
            disabled={exportingSqlite}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
          >
            {exportingSqlite ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{exportingSqlite ? 'Export...' : 'Exporter SQLite (.sqlite)'}</span>
          </button>

          <button
            onClick={handleResetAndResync}
            disabled={resetting || status.isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md shadow-slate-800/20 transition active:scale-95 disabled:opacity-50"
            title="Effacer les données de test locales et récupérer les données propres de la production"
          >
            <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Réalignement...' : 'Réaligner avec la Production'}</span>
          </button>

          <button
            onClick={handleTriggerSync}
            disabled={status.isSyncing || resetting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0055b8] hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${status.isSyncing ? 'animate-spin' : ''}`} />
            <span>Synchroniser Maintenant</span>
          </button>
        </div>
      </div>

      {/* Main Status Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              status.isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {status.isOnline ? <Wifi className="w-8 h-8" /> : <WifiOff className="w-8 h-8" />}
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              {status.isOnline ? 'Serveur Distant Connecté & Actif' : 'Mode Hors-Ligne (Stockage Local)'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Hôte : <span className="font-mono text-slate-600">bnelboutique.com:3306 (magasin_db)</span> • Dernière sync :{' '}
              <strong>{status.lastSyncTime || 'Récemment'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="px-4 py-2 rounded-2xl bg-slate-100 border border-slate-200 text-center flex-1 md:flex-none">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">En attente d'envoi</span>
            <span className="text-lg font-black text-slate-800 font-mono">{status.unsyncedCount}</span>
          </div>
        </div>
      </div>

      {/* Table-by-Table Pending Queue */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-subtle space-y-4">
        <h3 className="font-bold text-sm text-slate-900">État de la File d'Attente par Module</h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Factures / Ventes', count: counts.sales || 0 },
            { label: 'Articles & Prix', count: counts.products || 0 },
            { label: 'Clients & Dettes', count: counts.customers || 0 },
            { label: 'Mouvements Stock', count: counts.stock || 0 },
            { label: 'Dépenses & Frais', count: counts.expenses || 0 },
          ].map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
              <span className="text-[11px] font-semibold text-slate-500 block truncate">{item.label}</span>
              <span
                className={`text-xl font-black font-mono mt-1 block ${
                  item.count > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {item.count}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {item.count === 0 ? 'À jour' : 'En attente'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Sync Log Box */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Journal des Événements de Synchronisation</h3>
          <span className="text-xs text-slate-400 font-mono">Temps réel</span>
        </div>
        <div className="p-4 bg-slate-950 text-slate-200 font-mono text-xs space-y-2 max-h-56 overflow-y-auto">
          {syncLogs.map((log, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="text-slate-500">[{log.time}]</span>
              <span
                className={
                  log.type === 'success'
                    ? 'text-emerald-400'
                    : log.type === 'error'
                    ? 'text-rose-400'
                    : 'text-sky-400'
                }
              >
                {log.text}
              </span>
            </div>
          ))}
          {syncLogs.length === 0 && (
            <p className="text-slate-600">En attente du prochain cycle de synchronisation automatique...</p>
          )}
        </div>
      </div>
    </div>
  );
};

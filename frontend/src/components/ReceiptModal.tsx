import React, { useEffect, useRef, useState } from 'react';
import { Sale, SaleItem, Customer } from '../db/db';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { Printer, X, FileText, Receipt, CheckCircle, ShieldCheck } from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  items: SaleItem[];
  customer?: Customer | null;
  storeSettings?: Record<string, string>;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  items,
  customer,
  storeSettings
}) => {
  const { settings: globalSettings } = useSettings();
  const { user } = useAuth();

  const currentSettings = { ...globalSettings, ...(storeSettings || {}) };

  // Format initial défini par l'administrateur dans les paramètres
  const initialFormat = currentSettings.receipt_format === 'a4' ? 'a4' : 'thermal';
  const initialWidth = currentSettings.receipt_thermal_width === '58' ? '58' : '80';

  const [selectedFormat, setSelectedFormat] = useState<'thermal' | 'a4'>(initialFormat);
  const [selectedThermalWidth, setSelectedThermalWidth] = useState<'80' | '58'>(initialWidth);

  const barcodeThermalRef = useRef<SVGSVGElement | null>(null);
  const barcodeA4Ref = useRef<SVGSVGElement | null>(null);

  // Synchroniser avec les paramètres à chaque réouverture
  useEffect(() => {
    if (isOpen) {
      setSelectedFormat(currentSettings.receipt_format === 'a4' ? 'a4' : 'thermal');
      setSelectedThermalWidth(currentSettings.receipt_thermal_width === '58' ? '58' : '80');
    }
  }, [isOpen, currentSettings.receipt_format, currentSettings.receipt_thermal_width]);

  // Génération du code-barres adapté au format sélectionné
  useEffect(() => {
    if (!isOpen || !sale?.invoice_number) return;

    const timer = setTimeout(() => {
      if (selectedFormat === 'thermal' && barcodeThermalRef.current) {
        try {
          const is58 = selectedThermalWidth === '58';
          JsBarcode(barcodeThermalRef.current, sale.invoice_number, {
            format: 'CODE128',
            width: is58 ? 1.2 : 1.6,
            height: is58 ? 32 : 42,
            displayValue: true,
            fontSize: is58 ? 10 : 12,
            textMargin: 1,
            margin: 0
          });
        } catch (e) {
          console.error('Erreur génération code-barres thermique:', e);
        }
      } else if (selectedFormat === 'a4' && barcodeA4Ref.current) {
        try {
          JsBarcode(barcodeA4Ref.current, sale.invoice_number, {
            format: 'CODE128',
            width: 1.5,
            height: 38,
            displayValue: true,
            fontSize: 10,
            textMargin: 2,
            margin: 0
          });
        } catch (e) {
          console.error('Erreur génération code-barres A4:', e);
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, sale, selectedFormat, selectedThermalWidth]);

  // Fermeture avec la touche Échap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !sale) return null;

  // Ticket thermique : imprimé seul dans un document dédié, sur une page aussi haute que le ticket.
  // Imprimé depuis le pop-up (position fixe), le navigateur coupait tout ce qui dépassait la 1re page.
  const printThermalReceipt = async () => {
    const receiptEl = document.getElementById('printable-receipt');
    if (!receiptEl) return;

    const is58 = selectedThermalWidth === '58';
    const pageWidthMm = is58 ? 58 : 80;
    // Ticket centré sur la page : marges gauche/droite identiques, contenu = zone imprimable (72mm ou 48mm)
    const contentWidthMm = is58 ? 50 : 74;
    const padding = is58 ? '1mm 1mm 5mm' : '2mm 1mm 6mm';

    const baseHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
      html, body { margin: 0; padding: 0; background: #fff; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { width: ${pageWidthMm}mm; }
      #printable-receipt { width: ${contentWidthMm}mm; padding: ${padding}; margin: 0 auto; box-shadow: none; border: 0; border-radius: 0; }
      svg { max-width: 100%; height: auto; }
    </style>`;

    // Mesure de la hauteur réelle du ticket dans un iframe invisible à la largeur du papier
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${pageWidthMm}mm;height:100px;border:0;`;
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`${baseHtml}</head><body>${receiptEl.outerHTML}</body></html>`);
    doc.close();

    await Promise.all(
      Array.from(doc.images).map((img) =>
        img.complete ? Promise.resolve() : new Promise((resolve) => { img.onload = img.onerror = resolve; })
      )
    );

    const printedEl = doc.getElementById('printable-receipt');
    const heightMm = Math.ceil(((printedEl?.scrollHeight || 1000) * 25.4) / 96) + 8;
    const pageStyle = `<style>@page { size: ${pageWidthMm}mm ${heightMm}mm; margin: 0; }</style>`;

    if (window.electronAPI) {
      document.body.removeChild(iframe);
      await window.electronAPI.printReceipt({
        format: 'thermal',
        width: selectedThermalWidth,
        thermalWidth: selectedThermalWidth,
        heightMm,
        html: `${baseHtml}${pageStyle}</head><body>${receiptEl.outerHTML}</body></html>`
      });
      return;
    }

    doc.head.insertAdjacentHTML('beforeend', pageStyle);
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    setTimeout(() => iframe.remove(), 1000);
  };

  const handlePrint = async () => {
    if (selectedFormat === 'thermal') {
      await printThermalReceipt();
      return;
    }

    // Injecter dynamiquement la règle @page pour que l'imprimante utilise la taille exacte
    let styleEl = document.getElementById('receipt-dynamic-page-style') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'receipt-dynamic-page-style';
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `@page { size: A4 portrait; margin: 8mm; }`;

    if (window.electronAPI) {
      await window.electronAPI.printReceipt({ format: 'a4' });
    } else {
      window.print();
    }
  };

  const storeName = currentSettings.company_name || 'GEST MAGASIN PRO';
  const storePhone = currentSettings.company_phone || '+225 07 00 00 00';
  const storeEmail = currentSettings.company_email || '';
  const storeAddress = currentSettings.company_address || 'Abidjan, Côte d\'Ivoire';
  const storeNif = currentSettings.company_nif || '';
  const currency = currentSettings.currency || 'FCFA';
  const receiptFooter = currentSettings.receipt_footer || 'Merci pour votre confiance et à très bientôt !';

  const formatDateTime = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} à ${hours}:${minutes}`;
    } catch {
      return isoDate;
    }
  };

  const getPaymentLabel = (method: string) => {
    if (method === 'cash') return 'Espèces';
    if (method === 'card') return 'Carte Bancaire';
    if (method === 'credit') return 'Crédit (Dette client)';
    if (method === 'wave' || method === 'om') return 'Mobile Money';
    return method ? method.charAt(0).toUpperCase() + method.slice(1) : 'Espèces';
  };

  const is58mm = selectedThermalWidth === '58';

  // Ticket thermique : noir pur et tailles généreuses (le gris et la couleur ressortent pâles sur papier thermique)
  const t = is58mm
    ? { title: '16px', heading: '12px', base: '11px', small: '10.5px', total: '15px' }
    : { title: '20px', heading: '14px', base: '12.5px', small: '11.5px', total: '19px' };
  const thermalRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: '8px' };
  // Colonnes des articles : retrait | Qté | P.U. | Montant (chiffres alignés à droite)
  const thermalItemGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: is58mm ? '1fr 24px 50px 56px' : '1fr 34px 72px 80px',
    columnGap: '4px',
    fontVariantNumeric: 'tabular-nums'
  };
  const thermalSeparator: React.CSSProperties = { borderTop: '1.5px dashed #000', margin: is58mm ? '7px 0' : '9px 0' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh] ring-1 ring-black/5 transition-all duration-200 animate-in zoom-in-95 ${
          selectedFormat === 'a4' ? 'max-w-4xl' : 'max-w-[440px]'
        }`}
      >
        {/* En-tête : confirmation de la vente */}
        <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-[15px] text-slate-900 tracking-tight">Imprimer le reçu</h3>
              <p className="text-xs text-slate-500 truncate">
                N° <span className="font-semibold text-slate-700">{sale.invoice_number}</span>
                <span className="mx-1.5 text-slate-300">•</span>
                <span className="font-bold text-slate-900">
                  {sale.total_amount.toLocaleString('fr-FR')} {currency}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 -mt-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Choix du format */}
        <div className="px-5 pb-4 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px] grid grid-cols-2 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setSelectedFormat('thermal')}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
                selectedFormat === 'thermal'
                  ? 'bg-white text-[#0055b8] shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Ticket caisse</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFormat('a4')}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
                selectedFormat === 'a4'
                  ? 'bg-white text-[#0055b8] shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Facture A4</span>
            </button>
          </div>

          {/* Largeur du rouleau (80mm / 58mm) */}
          {selectedFormat === 'thermal' && (
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              {(['80', '58'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedThermalWidth(w)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                    selectedThermalWidth === w
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={w === '80' ? 'Rouleau standard 80 mm' : 'Rouleau compact 58 mm'}
                >
                  {w} mm
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aperçu du document */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 bg-slate-100 border-y border-slate-200/80 flex justify-center items-start bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]">
          
          {/* ========================================================
              OPTION 1 : FORMAT TICKET THERMIQUE (80mm ou 58mm)
             ======================================================== */}
          {selectedFormat === 'thermal' && (
            <div
              id="printable-receipt"
              className={`invoice-card thermal-receipt shadow-xl shadow-slate-400/30 ring-1 ring-slate-200 rounded-sm ${
                is58mm ? 'receipt-58mm w-[189px] px-1 py-3' : 'receipt-80mm w-[280px] px-1 py-4'
              }`}
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: t.base,
                lineHeight: 1.35,
                color: '#000',
                background: '#fff'
              }}
            >
              {/* En-tête magasin */}
              <div style={{ textAlign: 'center' }}>
                {currentSettings.company_logo && (
                  <img
                    src={currentSettings.company_logo}
                    alt={storeName}
                    style={{
                      display: 'block',
                      maxHeight: is58mm ? '45px' : '60px',
                      maxWidth: '70%',
                      objectFit: 'contain',
                      margin: '0 auto 6px',
                      filter: 'grayscale(1) contrast(1.6)'
                    }}
                  />
                )}
                <div style={{ fontSize: t.title, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.15 }}>
                  {storeName}
                </div>
                <div style={{ marginTop: '3px', fontSize: t.small }}>{storeAddress}</div>
                <div style={{ fontSize: t.small }}>Tél : {storePhone}</div>
              </div>

              <div style={thermalSeparator} />

              {/* Titre & informations de la vente */}
              <div style={{ textAlign: 'center', fontWeight: 900, fontSize: t.heading, letterSpacing: '1px', marginBottom: '5px' }}>
                TICKET DE CAISSE
              </div>
              <div style={thermalRow}>
                <span>N° ticket</span>
                <strong>{sale.invoice_number}</strong>
              </div>
              <div style={thermalRow}>
                <span>Date</span>
                <span>{formatDateTime(sale.created_at)}</span>
              </div>
              <div style={thermalRow}>
                <span>Caissier</span>
                <span>{user ? user.name : '—'}</span>
              </div>
              {customer && customer.name && customer.name !== 'Client Comptoir Standard' && customer.name !== 'Client Standard' && (
                <div style={thermalRow}>
                  <span>Client</span>
                  <strong>{customer.name}</strong>
                </div>
              )}

              <div style={thermalSeparator} />

              {/* Articles : en-tête de colonnes puis, pour chaque article, le nom puis Qté / P.U. / Montant alignés */}
              <div
                style={{
                  ...thermalItemGrid,
                  fontWeight: 900,
                  fontSize: t.small,
                  paddingBottom: '3px',
                  borderBottom: '1.5px solid #000'
                }}
              >
                <span>{is58mm ? 'Art.' : 'Article'}</span>
                <span style={{ textAlign: 'center' }}>Qté</span>
                <span style={{ textAlign: 'right' }}>P.U.</span>
                <span style={{ textAlign: 'right' }}>Montant</span>
              </div>

              {items.map((item, idx) => {
                const unitPrice =
                  item.unit_price ||
                  (item.quantity > 0 ? Math.round(item.subtotal / item.quantity) : item.subtotal);
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '4px 0',
                      borderBottom: idx < items.length - 1 ? '1px dotted #000' : 'none'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', wordBreak: 'break-word' }}>
                      {idx + 1}. {item.product_name || 'Produit'}
                    </div>
                    <div style={thermalItemGrid}>
                      <span />
                      <span style={{ textAlign: 'center' }}>{item.quantity}</span>
                      <span style={{ textAlign: 'right' }}>{unitPrice.toLocaleString('fr-FR')}</span>
                      <strong style={{ textAlign: 'right' }}>{item.subtotal.toLocaleString('fr-FR')}</strong>
                    </div>
                  </div>
                );
              })}

              <div style={{ borderTop: '1.5px solid #000', marginTop: '2px', paddingTop: '6px' }}>
                <div style={thermalRow}>
                  <span>Nombre d'articles</span>
                  <strong>{items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</strong>
                </div>
                {sale.discount_amount > 0 && (
                  <>
                    <div style={thermalRow}>
                      <span>Sous-total</span>
                      <span>{sale.subtotal.toLocaleString('fr-FR')} {currency}</span>
                    </div>
                    <div style={thermalRow}>
                      <span>Remise</span>
                      <strong>- {sale.discount_amount.toLocaleString('fr-FR')} {currency}</strong>
                    </div>
                  </>
                )}
              </div>

              {/* Total à payer */}
              <div
                style={{
                  ...thermalRow,
                  alignItems: 'center',
                  margin: '7px 0',
                  padding: is58mm ? '5px 6px' : '7px 8px',
                  background: '#000',
                  color: '#fff',
                  fontSize: t.total,
                  fontWeight: 900
                }}
              >
                <span>TOTAL</span>
                <span>{sale.total_amount.toLocaleString('fr-FR')} {currency}</span>
              </div>

              {/* Règlement */}
              <div style={thermalRow}>
                <span>Mode de paiement</span>
                <strong>{getPaymentLabel(sale.payment_method)}</strong>
              </div>
              <div style={thermalRow}>
                <span>Montant reçu</span>
                <span>{sale.paid_amount.toLocaleString('fr-FR')} {currency}</span>
              </div>
              <div style={thermalRow}>
                <span>Monnaie rendue</span>
                <strong>{sale.change_amount.toLocaleString('fr-FR')} {currency}</strong>
              </div>

              <div style={thermalSeparator} />

              {/* Pied de ticket : message puis code-barres */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{receiptFooter}</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <svg ref={barcodeThermalRef} style={{ maxWidth: '100%' }}></svg>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              OPTION 2 : FORMAT FACTURE GRAND FORMAT A4
             ======================================================== */}
          {selectedFormat === 'a4' && (
            <div
              id="printable-receipt"
              className="receipt-a4 w-full max-w-[800px] bg-white rounded-2xl shadow-md border border-slate-200 p-8 sm:p-10 flex flex-col justify-between text-slate-800"
              style={{
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              {/* En-tête officiel A4 */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
                  {/* Coordonnées Magasin */}
                  <div className="flex items-start gap-4">
                    {currentSettings.company_logo && (
                      <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200/80 p-1 flex items-center justify-center shrink-0">
                        <img
                          src={currentSettings.company_logo}
                          alt={storeName}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                        {storeName}
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {storeAddress}
                        <br />
                        <strong>Tél :</strong> {storePhone}
                        {storeEmail && <> | <strong>Email :</strong> {storeEmail}</>}
                        {storeNif && (
                          <>
                            <br />
                            <strong>NIF / RCCM :</strong> {storeNif}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Bloc Titre Facture */}
                  <div className="sm:text-right shrink-0">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-xs border border-blue-200 mb-2">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>FACTURE ACQUITTÉE</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                      #{sale.invoice_number}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Date : <strong className="text-slate-700">{formatDateTime(sale.created_at)}</strong>
                    </p>
                  </div>
                </div>

                {/* 2 Colonnes d'informations : Client & Opération */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-xs">
                  {/* Client */}
                  <div>
                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                      Facturé à (Client)
                    </span>
                    <p className="font-black text-slate-900 text-sm">
                      {customer?.name || 'Client Comptoir Standard'}
                    </p>
                    {customer?.phone && (
                      <p className="text-slate-600 mt-0.5">Tél : {customer.phone}</p>
                    )}
                    {customer?.address && (
                      <p className="text-slate-600 mt-0.5">Adresse : {customer.address}</p>
                    )}
                  </div>

                  {/* Vendeur & Règlement */}
                  <div className="sm:text-right">
                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                      Détails de la vente
                    </span>
                    <p className="text-slate-700">
                      Vendeur / Caissier : <strong className="text-slate-900">{user?.name || '—'}</strong>
                    </p>
                    <p className="text-slate-700 mt-0.5">
                      Mode de règlement : <strong className="text-slate-900">{getPaymentLabel(sale.payment_method)}</strong>
                    </p>
                    <p className="text-slate-700 mt-0.5">
                      Statut : <span className="font-bold text-emerald-600">Payé intégralement</span>
                    </p>
                  </div>
                </div>

                {/* Tableau des articles A4 */}
                <div className="overflow-hidden rounded-xl border border-slate-200 my-6">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center">N°</th>
                        <th className="py-2.5 px-3">Désignation de l'Article</th>
                        <th className="py-2.5 px-3 text-right">Prix Unitaire</th>
                        <th className="py-2.5 px-3 text-center">Quantité</th>
                        <th className="py-2.5 px-3 text-right">Montant Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => {
                        const unitPrice =
                          item.unit_price ||
                          (item.quantity > 0 ? Math.round(item.subtotal / item.quantity) : item.subtotal);
                        return (
                          <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{item.product_name}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              {unitPrice.toLocaleString('fr-FR')} {currency}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800">{item.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {item.subtotal.toLocaleString('fr-FR')} {currency}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Récapitulatif financier et Mentions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 items-start">
                  {/* Gauche : Arrêté et Code-barres */}
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <p className="text-slate-500 font-semibold mb-1">Arrêté de compte :</p>
                      <p className="font-bold text-slate-800">
                        La présente facture est arrêtée à la somme de{' '}
                        <span className="text-blue-700 font-black">
                          {sale.total_amount.toLocaleString('fr-FR')} {currency}
                        </span>.
                      </p>
                      {sale.notes && (
                        <p className="text-slate-600 mt-2 italic border-t border-slate-200 pt-1.5">
                          Note : {sale.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-start pt-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Code Facture</span>
                      <svg ref={barcodeA4Ref}></svg>
                    </div>
                  </div>

                  {/* Droite : Totaux */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Hors Remise :</span>
                      <span className="font-mono font-bold">{sale.subtotal.toLocaleString('fr-FR')} {currency}</span>
                    </div>

                    {sale.discount_amount > 0 && (
                      <div className="flex justify-between text-rose-600 font-semibold">
                        <span>Remise accordée :</span>
                        <span className="font-mono">-{sale.discount_amount.toLocaleString('fr-FR')} {currency}</span>
                      </div>
                    )}

                    {sale.tax_amount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>TVA / Taxes :</span>
                        <span className="font-mono">+{sale.tax_amount.toLocaleString('fr-FR')} {currency}</span>
                      </div>
                    )}

                    <div className="border-t-2 border-slate-300 pt-2 flex justify-between items-baseline text-sm">
                      <span className="font-black text-slate-900 uppercase">Net à Payer :</span>
                      <span className="text-lg font-black text-blue-700 font-mono">
                        {sale.total_amount.toLocaleString('fr-FR')} {currency}
                      </span>
                    </div>

                    <div className="border-t border-slate-200 pt-2 text-[11px] space-y-1 text-slate-600">
                      <div className="flex justify-between">
                        <span>Montant Encaissé :</span>
                        <span className="font-mono font-semibold">{sale.paid_amount.toLocaleString('fr-FR')} {currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monnaie Rendue :</span>
                        <span className="font-mono font-semibold">{sale.change_amount.toLocaleString('fr-FR')} {currency}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signatures & Cachet */}
                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs">
                  <div className="text-center p-4 border border-dashed border-slate-300 rounded-xl h-24 flex flex-col justify-between">
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Pour le Client (Bon pour accord)</span>
                    <span className="text-[10px] text-slate-400 italic">Signature</span>
                  </div>
                  <div className="text-center p-4 border border-dashed border-slate-300 rounded-xl h-24 flex flex-col justify-between">
                    <span className="font-bold text-slate-500 uppercase text-[10px]">Pour la Direction / Service Caisse</span>
                    <span className="text-[10px] text-slate-400 italic">Cachet & Signature</span>
                  </div>
                </div>
              </div>

              {/* Pied de page A4 */}
              <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-1">
                <p className="font-medium text-slate-500">{receiptFooter}</p>
                <p>Les marchandises vendues ne sont ni reprises ni échangées après sortie de magasin sauf défaut avéré.</p>
              </div>
            </div>
          )}

        </div>

        {/* Actions */}
        <div className="p-4 sm:px-5 bg-white space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 font-bold text-sm text-slate-700 transition active:scale-[0.98]"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handlePrint}
              autoFocus
              className="flex-1 py-3 px-6 rounded-2xl bg-[#0055b8] hover:bg-blue-700 font-bold text-sm text-white shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/25"
            >
              <Printer className="w-[18px] h-[18px]" />
              <span>
                {selectedFormat === 'a4' ? 'Imprimer la facture' : 'Imprimer le ticket'}
              </span>
            </button>
          </div>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {selectedFormat === 'a4'
                ? 'Format A4 — choisissez votre imprimante bureau'
                : `Rouleau ${selectedThermalWidth} mm — imprimante ticket, marges : Aucune`}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

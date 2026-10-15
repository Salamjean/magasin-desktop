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
            width: is58 ? 1.05 : 1.35,
            height: is58 ? 26 : 34,
            displayValue: true,
            fontSize: is58 ? 8.5 : 9.5,
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

  if (!isOpen || !sale) return null;

  const handlePrint = async () => {
    // Injecter dynamiquement la règle @page pour que l'imprimante utilise la taille exacte
    let styleEl = document.getElementById('receipt-dynamic-page-style') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'receipt-dynamic-page-style';
      document.head.appendChild(styleEl);
    }

    if (selectedFormat === 'a4') {
      styleEl.textContent = `@page { size: A4 portrait; margin: 8mm; }`;
    } else if (selectedThermalWidth === '58') {
      styleEl.textContent = `@page { size: 58mm auto; margin: 0; }`;
    } else {
      styleEl.textContent = `@page { size: 80mm auto; margin: 0; }`;
    }

    if (window.electronAPI) {
      await window.electronAPI.printReceipt({
        format: selectedFormat,
        width: selectedThermalWidth,
        thermalWidth: selectedThermalWidth
      });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-150">
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh] border border-slate-100 transition-all duration-200 ${
          selectedFormat === 'a4' ? 'max-w-4xl' : 'max-w-md'
        }`}
      >
        {/* Header Actions & Format Switcher */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-tight">
                {selectedFormat === 'a4' ? 'Facture Commerciale A4' : `Ticket Thermique ${selectedThermalWidth}mm`}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {selectedFormat === 'a4' ? 'Format standard bureau / laser' : 'Imprimante rouleau thermique caisse'}
              </p>
            </div>
          </div>

          {/* Switch Format : Thermique vs A4 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700/80">
              <button
                type="button"
                onClick={() => setSelectedFormat('thermal')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  selectedFormat === 'thermal'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Format Ticket Caisse Thermique"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFormat('a4')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  selectedFormat === 'a4'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Format Facture Pleine Page A4"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Facture A4</span>
              </button>
            </div>

            {/* Sélecteur de largeur si thermique (80mm / 58mm) */}
            {selectedFormat === 'thermal' && (
              <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setSelectedThermalWidth('80')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                    selectedThermalWidth === '80'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Rouleau standard 80 mm"
                >
                  80mm
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedThermalWidth('58')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                    selectedThermalWidth === '58'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Rouleau compact 58 mm"
                >
                  58mm
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition ml-1"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          
          {/* ========================================================
              OPTION 1 : FORMAT TICKET THERMIQUE (80mm ou 58mm)
             ======================================================== */}
          {selectedFormat === 'thermal' && (
            <div
              id="printable-receipt"
              className={`invoice-card thermal-receipt p-4 shadow-sm ${
                is58mm ? 'receipt-58mm w-[250px]' : 'receipt-80mm w-[320px]'
              }`}
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                color: '#000',
                background: '#fff',
                borderTop: '4px solid #0055b8'
              }}
            >
              {/* En-tête ticket */}
              <div style={{ textAlign: 'center', marginBottom: is58mm ? '10px' : '14px' }}>
                {currentSettings.company_logo && (
                  <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                    <img
                      src={currentSettings.company_logo}
                      alt={storeName}
                      style={{
                        maxHeight: is58mm ? '40px' : '55px',
                        maxWidth: is58mm ? '120px' : '160px',
                        objectFit: 'contain',
                        margin: '0 auto'
                      }}
                    />
                  </div>
                )}
                <p style={{ margin: 0, fontSize: is58mm ? '14px' : '17px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {storeName}
                </p>
                <p style={{ margin: '4px 0', fontSize: is58mm ? '9px' : '10.5px', color: '#222', lineHeight: '1.3' }}>
                  {storeAddress}
                  <br />
                  Tél: {storePhone}
                  {storeEmail && (
                    <>
                      <br />
                      Email: {storeEmail}
                    </>
                  )}
                  {storeNif && (
                    <>
                      <br />
                      NIF/RCCM: {storeNif}
                    </>
                  )}
                </p>

                <div style={{ borderBottom: '1px dashed #000', margin: is58mm ? '6px 0' : '9px 0' }}></div>

                <div style={{ fontSize: is58mm ? '9px' : '10.5px', textAlign: 'left', lineHeight: '1.4' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>REF:</span>
                    <strong style={{ fontFamily: 'monospace' }}>#{sale.invoice_number}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Date:</span>
                    <span>{formatDateTime(sale.created_at)}</span>
                  </div>
                  {customer && customer.name && customer.name !== 'Client Comptoir Standard' && customer.name !== 'Client Standard' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Client:</span>
                      <strong>{customer.name}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Caissier:</span>
                    <span>{user ? user.name : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Tableau des articles thermique */}
              <table
                style={{
                  width: '100%',
                  fontSize: is58mm ? '9.5px' : '11px',
                  borderCollapse: 'collapse',
                  fontFamily: 'Arial, Helvetica, sans-serif'
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 'bold' }}>Article</th>
                    <th style={{ textAlign: 'center', padding: '4px 0', fontWeight: 'bold' }}>Qté</th>
                    <th style={{ textAlign: 'right', padding: '4px 0', fontWeight: 'bold' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '0.5px solid #eee' }}>
                      <td style={{ textAlign: 'left', padding: is58mm ? '3px 0' : '4px 0', wordBreak: 'break-word', maxWidth: is58mm ? '120px' : '160px' }}>
                        {item.product_name || 'Produit'}
                      </td>
                      <td style={{ textAlign: 'center', padding: is58mm ? '3px 0' : '4px 0' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', padding: is58mm ? '3px 0' : '4px 0', fontWeight: 'bold' }}>
                        {item.subtotal.toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totaux thermique */}
              <div
                style={{
                  borderTop: '1px dashed #000',
                  margin: is58mm ? '10px 0' : '14px 0',
                  paddingTop: is58mm ? '6px' : '8px',
                  fontSize: is58mm ? '10px' : '11px'
                }}
              >
                {sale.discount_amount > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span>Sous-total:</span>
                      <span>{sale.subtotal.toLocaleString('fr-FR')} {currency}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#b91c1c' }}>
                      <span>Remise:</span>
                      <span>-{sale.discount_amount.toLocaleString('fr-FR')} {currency}</span>
                    </div>
                  </>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: is58mm ? '13px' : '15px',
                    fontWeight: 'bold',
                    margin: '4px 0',
                    padding: '3px 0',
                    borderTop: '1px solid #000',
                    borderBottom: '1px solid #000'
                  }}
                >
                  <span>TOTAL:</span>
                  <span>{sale.total_amount.toLocaleString('fr-FR')} {currency}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span>Paiement:</span>
                  <span>{getPaymentLabel(sale.payment_method)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Reçu:</span>
                  <span>{sale.paid_amount.toLocaleString('fr-FR')} {currency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Rendu:</span>
                  <span>{sale.change_amount.toLocaleString('fr-FR')} {currency}</span>
                </div>
              </div>

              {/* Code-barres & Pied de ticket */}
              <div
                style={{
                  textAlign: 'center',
                  marginTop: is58mm ? '12px' : '16px',
                  fontSize: is58mm ? '9px' : '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <svg ref={barcodeThermalRef}></svg>
                </div>
                <p style={{ margin: '4px 0', lineHeight: '1.4' }}>{receiptFooter}</p>
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

        {/* Action Footer */}
        <div className="p-4 bg-white border-t border-slate-200/80 flex items-center justify-between gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Format d'impression actif :{' '}
              <strong className="text-slate-800">
                {selectedFormat === 'a4' ? 'Facture A4' : `Ticket Thermique ${selectedThermalWidth}mm`}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50 transition active:scale-95"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none py-2.5 px-6 rounded-xl bg-[#0055b8] hover:bg-blue-700 font-bold text-xs text-white shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>
                {selectedFormat === 'a4' ? 'Imprimer Facture A4' : `Imprimer Ticket (${selectedThermalWidth}mm)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

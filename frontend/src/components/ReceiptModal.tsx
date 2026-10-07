import React, { useEffect, useRef } from 'react';
import { Sale, SaleItem, Customer } from '../db/db';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { Printer, X } from 'lucide-react';
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
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (isOpen && sale?.invoice_number && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, sale.invoice_number, {
          format: 'CODE128',
          width: 1.4,
          height: 35,
          displayValue: false,
          margin: 0
        });
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  const handlePrint = async () => {
    if (window.electronAPI) {
      await window.electronAPI.printReceipt();
    } else {
      window.print();
    }
  };

  const currentSettings = { ...globalSettings, ...(storeSettings || {}) };

  const storeName = currentSettings.company_name || 'GEST MAGASIN PRO';
  const storePhone = currentSettings.company_phone || '+225 07 00 00 00';
  const storeEmail = currentSettings.company_email || '';
  const storeAddress = currentSettings.company_address || 'Abidjan, Côte d\'Ivoire';
  const receiptFooter = currentSettings.receipt_footer || 'Merci de votre visite ! A bientôt.';

  const formatDateTime = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh] border border-slate-100">
        {/* Header Actions */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary-400" />
            <h3 className="font-bold text-sm">Ticket de Caisse</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Body (80mm) */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
          <div
            id="printable-receipt"
            className="invoice-card thermal-receipt w-[320px] p-4 shadow-sm"
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              color: '#000',
              background: '#fff',
              borderTop: '4px solid #6366f1'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              {currentSettings.company_logo && (
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <img
                    src={currentSettings.company_logo}
                    alt={storeName}
                    style={{ maxHeight: '55px', maxWidth: '160px', objectFit: 'contain', margin: '0 auto' }}
                  />
                </div>
              )}
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{storeName}</p>
              <p style={{ margin: '5px 0', fontSize: '11px' }}>
                {storeAddress}
                <br />
                Tel: {storePhone}
                {storeEmail && (
                  <>
                    <br />
                    Email: {storeEmail}
                  </>
                )}
              </p>
              <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
              <p style={{ margin: '5px 0', fontSize: '11px' }} id="receipt-ref">
                REF: #{sale.invoice_number}
              </p>
              <p style={{ margin: '5px 0', fontSize: '11px' }} id="receipt-date">
                Date: {formatDateTime(sale.created_at)}
              </p>
              {customer && customer.name && customer.name !== 'Client Comptoir Standard' && customer.name !== 'Client Standard' && (
                <p style={{ margin: '5px 0', fontSize: '11px' }} id="receipt-customer">
                  Client: {customer.name}
                </p>
              )}
              <p style={{ margin: '5px 0', fontSize: '11px' }} id="receipt-cashier">
                Caissier: {user ? user.name : '—'}
              </p>
            </div>

            <table
              style={{
                width: '100%',
                fontSize: '11px',
                borderCollapse: 'collapse',
                fontFamily: 'Arial, Helvetica, sans-serif'
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid #000' }}>
                  <th style={{ textAlign: 'left', padding: '5px 0', fontWeight: 'normal' }}>Article</th>
                  <th style={{ textAlign: 'center', padding: '5px 0', fontWeight: 'normal' }}>Qté</th>
                  <th style={{ textAlign: 'right', padding: '5px 0', fontWeight: 'normal' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'left', padding: '5px 0', wordBreak: 'break-word' }}>
                      {item.product_name || 'Produit'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '5px 0' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '5px 0' }}>
                      {item.subtotal.toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              style={{
                borderTop: '1px dashed #000',
                margin: '15px 0',
                paddingTop: '10px',
                fontFamily: 'Arial, Helvetica, sans-serif'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '5px' }}>
                <span>TOTAL</span>
                <span style={{ fontWeight: 'bold' }}>
                  {sale.total_amount.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span>Paiement:</span>
                <span>{getPaymentLabel(sale.payment_method)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span>Reçu:</span>
                <span>{sale.paid_amount.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span>Rendu:</span>
                <span>{sale.change_amount.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>

            <div
              style={{
                textAlign: 'center',
                marginTop: '20px',
                fontSize: '10px',
                fontFamily: 'Arial, Helvetica, sans-serif'
              }}
            >
              <div id="receipt-qrcode" style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <svg ref={barcodeRef}></svg>
              </div>
              <p style={{ margin: '5px 0', lineHeight: '1.4' }}>{receiptFooter}</p>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 font-semibold text-xs text-slate-700 hover:bg-slate-50 transition"
          >
            Fermer
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 font-bold text-xs text-white shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};

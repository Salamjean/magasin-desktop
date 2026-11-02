import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Product } from '../db/db';
import { Search, ChevronDown, X, Check, Package } from 'lucide-react';

export interface SearchableProductSelectProps {
  products: Product[];
  value: number | string | '';
  onChange: (productId: number | '') => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  badgeType?: 'stock' | 'purchase_price' | 'selling_price' | 'both';
  accentColor?: 'blue' | 'emerald' | 'rose';
  filterStockOnly?: boolean;
}

export const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
  products,
  value,
  onChange,
  placeholder = 'Sélectionnez un produit...',
  required = false,
  disabled = false,
  className = '',
  buttonClassName = '',
  badgeType = 'stock',
  accentColor = 'blue',
  filterStockOnly = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Trouver le produit sélectionné
  const selectedProduct = useMemo(() => {
    if (!value && value !== 0) return null;
    return products.find((p) => p.id === Number(value)) || null;
  }, [products, value]);

  // Filtrer les produits selon la recherche
  const filteredProducts = useMemo(() => {
    let list = products;
    if (filterStockOnly) {
      list = list.filter((p) => (p.stock_quantity || 0) > 0);
    }
    if (!searchQuery.trim()) {
      return list;
    }
    const q = searchQuery.toLowerCase().trim();
    return list.filter((p) => {
      const nameMatch = p.name ? p.name.toLowerCase().includes(q) : false;
      const refMatch = p.reference ? p.reference.toLowerCase().includes(q) : false;
      const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
      return nameMatch || refMatch || barcodeMatch;
    });
  }, [products, searchQuery, filterStockOnly]);

  // Fermer quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus automatique sur le champ de recherche à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Styles de focus et couleurs d'accent
  const getAccentBorderClass = () => {
    switch (accentColor) {
      case 'emerald':
        return 'focus:border-emerald-500 focus-within:border-emerald-500';
      case 'rose':
        return 'focus:border-rose-500 focus-within:border-rose-500';
      case 'blue':
      default:
        return 'focus:border-[#0055b8] focus-within:border-[#0055b8]';
    }
  };

  const getSelectedItemBg = () => {
    switch (accentColor) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'rose':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'blue':
      default:
        return 'bg-blue-50 text-[#0055b8] border-blue-200';
    }
  };

  const renderBadge = (p: Product) => {
    switch (badgeType) {
      case 'purchase_price':
        return (
          <span className="font-semibold text-slate-700">
            {p.purchase_price ? `${Number(p.purchase_price).toLocaleString('fr-FR')} F` : '0 F'}
          </span>
        );
      case 'selling_price':
        return (
          <span className="font-semibold text-slate-700">
            {p.selling_price ? `${Number(p.selling_price).toLocaleString('fr-FR')} F` : '0 F'}
          </span>
        );
      case 'both':
        return (
          <span className="flex items-center gap-2">
            <span className={Number(p.stock_quantity) <= Number(p.min_stock || 0) ? 'text-amber-600 font-bold' : 'text-slate-600'}>
              Stock: {p.stock_quantity} {p.unit || 'pcs'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-700">
              {Number(p.selling_price || 0).toLocaleString('fr-FR')} F
            </span>
          </span>
        );
      case 'stock':
      default:
        return (
          <span className={Number(p.stock_quantity) <= Number(p.min_stock || 0) ? 'text-amber-600 font-bold' : 'text-slate-600'}>
            Stock: {p.stock_quantity} {p.unit || 'pcs'}
          </span>
        );
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Bouton déclencheur simulant un Select */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-left transition ${
          buttonClassName ||
          'px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800'
        } ${getAccentBorderClass()} ${
          isOpen ? 'ring-2 ring-blue-500/10 border-[#0055b8] bg-white' : ''
        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
          {selectedProduct ? (
            <div className="truncate flex items-center gap-2">
              <span className="font-bold text-slate-900 truncate">{selectedProduct.name}</span>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline truncate">
                (Réf: {selectedProduct.reference || `PRD-${selectedProduct.id}`})
              </span>
            </div>
          ) : (
            <span className="text-slate-400 font-normal truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {selectedProduct && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              title="Effacer la sélection"
              className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#0055b8]' : ''
            }`}
          />
        </div>
      </button>

      {/* Menu déroulant avec champ de recherche intégré */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-100">
          {/* Champ de recherche interne */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, référence, code-barres..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0055b8] focus:bg-white transition"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* En-tête de la liste */}
          <div className="px-2 pt-1 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Produits catalogue</span>
            <span>{filteredProducts.length} résultat(s)</span>
          </div>

          {/* Liste déroulante des résultats */}
          <div className="max-h-60 overflow-y-auto space-y-1 overscroll-contain pr-1">
            {filteredProducts.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-600">Aucun produit trouvé</p>
                <p className="text-[11px]">Modifiez votre recherche ou vérifiez l'orthographe.</p>
              </div>
            ) : (
              filteredProducts.map((p, idx) => {
                const isSelected = selectedProduct?.id === p.id;
                return (
                  <button
                    key={p.id ?? idx}
                    type="button"
                    onClick={() => {
                      onChange(p.id !== undefined ? p.id : '');
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full p-2.5 rounded-xl text-left transition flex items-center justify-between gap-3 border ${
                      isSelected
                        ? getSelectedItemBg()
                        : 'hover:bg-slate-50/90 text-slate-800 border-transparent hover:border-slate-100'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">{p.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-medium">
                        <span className="font-mono text-slate-500">
                          Réf: {p.reference || `PRD-${p.id}`}
                        </span>
                        {p.barcode && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{p.barcode}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] text-right flex-shrink-0">
                      {renderBadge(p)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

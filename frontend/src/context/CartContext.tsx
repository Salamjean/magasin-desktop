import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Customer, db } from '../db/db';

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface CartContextType {
  items: CartItem[];
  customer: Customer | null;
  discount: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (discount: number) => void;
  scanBarcode: (barcode: string) => Promise<boolean>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);

  // Load default customer and ensure tax rate is 0
  useEffect(() => {
    db.settings.put({ key: 'tax_rate', value: '0' }).catch(() => {});
    setTaxRate(0);
    db.customers.toCollection().first().then(defaultCust => {
      if (defaultCust) setCustomer(defaultCust);
    });
  }, []);

  const addToCart = (product: Product, quantity: number = 1) => {
    if (!product.id) return;
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: newQty, subtotal: newQty * item.unitPrice }
            : item
        );
      }
      return [...prev, {
        product,
        quantity,
        unitPrice: product.selling_price,
        subtotal: quantity * product.selling_price
      }];
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity, subtotal: quantity * item.unitPrice }
          : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setItems([]);
    setDiscount(0);
  };

  const scanBarcode = async (barcode: string): Promise<boolean> => {
    if (!barcode) return false;
    const cleanBarcode = barcode.toString().trim();
    if (!cleanBarcode) return false;

    // 1. Recherche directe par index Dexie exact
    let product = await db.products.where('barcode').equals(cleanBarcode).first();

    // 2. Recherche directe par index référence
    if (!product) {
      product = await db.products.where('reference').equals(cleanBarcode).first();
    }

    // 3. Recherche tolérante multi-critères (insensible à la casse, espaces, etc.)
    if (!product) {
      const allProds = await db.products.toArray();
      const cleanLower = cleanBarcode.toLowerCase();
      product = allProds.find(p => {
        const pBarcode = (p.barcode || '').toString().trim().toLowerCase();
        const pRef = (p.reference || '').toString().trim().toLowerCase();
        const pName = (p.name || '').toString().trim().toLowerCase();
        return pBarcode === cleanLower || pRef === cleanLower || pName === cleanLower;
      });
    }

    if (product) {
      addToCart(product, 1);
      return true;
    }
    return false;
  };

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const taxAmount = Math.round((discountedSubtotal * taxRate) / 100);
  const total = discountedSubtotal + taxAmount;

  return (
    <CartContext.Provider value={{
      items,
      customer,
      discount,
      taxRate,
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
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { CartProvider } from './context/CartContext';
import { SettingsProvider } from './context/SettingsContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const AppRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isElectronFile = typeof window !== 'undefined' && window.location.protocol === 'file:';
  if (isElectronFile) {
    return <HashRouter>{children}</HashRouter>;
  }
  return <BrowserRouter>{children}</BrowserRouter>;
};

// Layouts matching resources/views/layouts/
import { AppLayout } from './views/layouts';

// Views matching resources/views/auth/
import { SplashView } from './views/auth/Splash';
import { Login } from './views/auth/Login';
import { Profile } from './views/auth/Profile';

// Views matching resources/views/admin/
import { DashboardView as AdminDashboard } from './views/admin/dashboard/DashboardView';
import { ProductsView as AdminProducts } from './views/admin/products/ProductsView';
import { CategoriesView as AdminCategories } from './views/admin/categories/CategoriesView';
import { StockView as AdminStock } from './views/admin/stock/StockView';
import { SuppliersView as AdminSuppliers } from './views/admin/suppliers/SuppliersView';
import { CustomersView as AdminCustomers } from './views/admin/customers/CustomersView';
import { SalesView as AdminSales } from './views/admin/sales/SalesView';
import { PurchasesView as AdminPurchases } from './views/admin/purchases/PurchasesView';
import { ExpensesView as AdminExpenses } from './views/admin/expenses/ExpensesView';
import { InventoryView as AdminInventory } from './views/admin/inventory/InventoryView';
import { DeliveriesView as AdminDeliveries } from './views/admin/deliveries/DeliveriesView';
import { CashRegistersView as AdminCashRegisters } from './views/admin/cash_registers/CashRegistersView';
import { UsersView as AdminUsers } from './views/admin/users/UsersView';
import { UserCreate } from './pages/UserCreate';
import { UserEdit } from './pages/UserEdit';
import { ProductCreate } from './pages/ProductCreate';
import { ProductEdit } from './pages/ProductEdit';
import { ProductDetail } from './pages/ProductDetail';
import { CategoryCreate } from './pages/CategoryCreate';
import { CategoryEdit } from './pages/CategoryEdit';
import { CategoryDetail } from './pages/CategoryDetail';
import { SupplierCreate } from './pages/SupplierCreate';
import { SupplierEdit } from './pages/SupplierEdit';
import { SupplierDetail } from './pages/SupplierDetail';
import { CustomerCreate } from './pages/CustomerCreate';
import { CustomerEdit } from './pages/CustomerEdit';
import { CustomerDetail } from './pages/CustomerDetail';
import { StockEntry } from './pages/StockEntry';
import { StockExit } from './pages/StockExit';
import { InventoryCreate } from './pages/InventoryCreate';
import { InventoryDetail } from './pages/InventoryDetail';
import { PurchaseCreate } from './pages/PurchaseCreate';
import { PurchaseReception } from './pages/PurchaseReception';
import { DeliveryCreate } from './pages/DeliveryCreate';
import { DeliveryDetail } from './pages/DeliveryDetail';
import { CashRegisterCreate } from './pages/CashRegisterCreate';
import { CashRegisterEdit } from './pages/CashRegisterEdit';
import { CashRegisterSessions } from './pages/CashRegisterSessions';
import { CashSessionBilanZ } from './pages/CashSessionBilanZ';
import { BarcodeLabels } from './pages/BarcodeLabels';
import { SettingsView as AdminSettings } from './views/admin/settings/SettingsView';
import { SyncView as AdminSync } from './views/admin/sync/SyncView';
import { ReportsView as AdminReports } from './views/admin/reports/ReportsView';

// Views matching resources/views/caissier/
import { PosView as CaissierPos } from './views/caissier/pos/PosView';
import { CashSessionView as CaissierSession } from './views/caissier/session/CashSessionView';
import { CashierSalesView as CaissierSales } from './views/caissier/sales/CashierSalesView';
import { ReturnsView as CaissierReturns } from './views/caissier/returns/ReturnsView';

// Views matching resources/views/magasinier/
import { AlertsView as MagasinierAlerts } from './views/magasinier/alerts/AlertsView';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const splashDone = sessionStorage.getItem('gestmag_splash_done') === 'true';

  if (!splashDone) {
    return <Navigate to="/splash" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Chargement de l'espace de travail...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppRouter>
        <AuthProvider>
          <SettingsProvider>
            <SyncProvider>
              <CartProvider>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/splash" element={<SplashView />} />
                  <Route path="/login" element={<Login />} />

                  {/* Protected Routes Inside App Layout */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<AdminDashboard />} />
                    
                    {/* Admin Modules */}
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="products/new" element={<ProductCreate />} />
                    <Route path="products/add" element={<ProductCreate />} />
                    <Route path="products/edit/:id" element={<ProductEdit />} />
                    <Route path="products/view/:id" element={<ProductDetail />} />
                    <Route path="products/:id" element={<ProductDetail />} />
                    <Route path="categories" element={<AdminCategories />} />
                    <Route path="categories/new" element={<CategoryCreate />} />
                    <Route path="categories/add" element={<CategoryCreate />} />
                    <Route path="categories/edit/:id" element={<CategoryEdit />} />
                    <Route path="categories/view/:id" element={<CategoryDetail />} />
                    <Route path="categories/:id" element={<CategoryDetail />} />
                    <Route path="stock" element={<AdminStock />} />
                    <Route path="stock/in" element={<StockEntry />} />
                    <Route path="stock/entry" element={<StockEntry />} />
                    <Route path="stock/out" element={<StockExit />} />
                    <Route path="stock/exit" element={<StockExit />} />
                    <Route path="suppliers" element={<AdminSuppliers />} />
                    <Route path="suppliers/new" element={<SupplierCreate />} />
                    <Route path="suppliers/add" element={<SupplierCreate />} />
                    <Route path="suppliers/edit/:id" element={<SupplierEdit />} />
                    <Route path="suppliers/view/:id" element={<SupplierDetail />} />
                    <Route path="suppliers/:id" element={<SupplierDetail />} />
                    <Route path="customers" element={<AdminCustomers />} />
                    <Route path="customers/new" element={<CustomerCreate />} />
                    <Route path="customers/add" element={<CustomerCreate />} />
                    <Route path="customers/edit/:id" element={<CustomerEdit />} />
                    <Route path="customers/view/:id" element={<CustomerDetail />} />
                    <Route path="customers/settle/:id" element={<CustomerDetail />} />
                    <Route path="customers/:id" element={<CustomerDetail />} />
                    <Route path="sales" element={<AdminSales />} />
                    <Route path="purchases" element={<AdminPurchases />} />
                    <Route path="purchases/new" element={<PurchaseCreate />} />
                    <Route path="purchases/add" element={<PurchaseCreate />} />
                    <Route path="purchases/create" element={<PurchaseCreate />} />
                    <Route path="purchases/receive/:id" element={<PurchaseReception />} />
                    <Route path="purchases/reception/:id" element={<PurchaseReception />} />
                    <Route path="purchases/view/:id" element={<PurchaseReception />} />
                    <Route path="purchases/:id" element={<PurchaseReception />} />
                    <Route path="expenses" element={<AdminExpenses />} />
                    <Route path="inventories" element={<AdminInventory />} />
                    <Route path="inventories/new" element={<InventoryCreate />} />
                    <Route path="inventories/add" element={<InventoryCreate />} />
                    <Route path="inventories/view/:id" element={<InventoryDetail />} />
                    <Route path="inventories/:id" element={<InventoryDetail />} />
                    <Route path="deliveries" element={<AdminDeliveries />} />
                    <Route path="deliveries/new" element={<DeliveryCreate />} />
                    <Route path="deliveries/add" element={<DeliveryCreate />} />
                    <Route path="deliveries/create" element={<DeliveryCreate />} />
                    <Route path="deliveries/view/:id" element={<DeliveryDetail />} />
                    <Route path="deliveries/:id" element={<DeliveryDetail />} />
                    <Route path="cash-registers" element={<AdminCashRegisters />} />
                    <Route path="cash-registers/new" element={<CashRegisterCreate />} />
                    <Route path="cash-registers/add" element={<CashRegisterCreate />} />
                    <Route path="cash-registers/edit/:id" element={<CashRegisterEdit />} />
                    <Route path="cash-registers/sessions/:id" element={<CashRegisterSessions />} />
                    <Route path="cash-registers/sessions/:registerId/bilan-z/:id" element={<CashSessionBilanZ />} />
                    <Route path="cash-registers/bilan-z/:id" element={<CashSessionBilanZ />} />
                    <Route path="cash-registers/bilan/:id" element={<CashSessionBilanZ />} />
                    <Route path="cash-registers/view/:id" element={<CashRegisterSessions />} />
                    <Route path="cash-registers/:id" element={<CashRegisterSessions />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="users/new" element={<UserCreate />} />
                    <Route path="users/add" element={<UserCreate />} />
                    <Route path="users/edit/:id" element={<UserEdit />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="sync" element={<AdminSync />} />
                    <Route path="reports" element={<AdminReports />} />

                    {/* Caissier & Common Modules */}
                    <Route path="labels" element={<BarcodeLabels />} />
                    <Route path="pos" element={<CaissierPos />} />
                    <Route path="cash-session" element={<CaissierSession />} />
                    <Route path="cashier-sales" element={<CaissierSales />} />
                    <Route path="returns" element={<CaissierReturns />} />

                    {/* Magasinier & Livreur Modules */}
                    <Route path="alerts" element={<MagasinierAlerts />} />
                    <Route path="delivery-history" element={<AdminDeliveries />} />

                    {/* User Profile */}
                    <Route path="profile" element={<Profile />} />
                  </Route>

                  {/* Catch-all fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </CartProvider>
            </SyncProvider>
          </SettingsProvider>
        </AuthProvider>
      </AppRouter>
    </ErrorBoundary>
  );
};

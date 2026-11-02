import React, { lazy } from 'react';
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
const Profile = lazy(() => import('./views/auth/Profile').then((m) => ({ default: m.Profile })));

// Pages chargées à la demande (React.lazy) pour alléger le bundle initial

// Views matching resources/views/admin/
const AdminDashboard = lazy(() => import('./views/admin/dashboard/DashboardView').then((m) => ({ default: m.DashboardView })));
const AdminProducts = lazy(() => import('./views/admin/products/ProductsView').then((m) => ({ default: m.ProductsView })));
const AdminCategories = lazy(() => import('./views/admin/categories/CategoriesView').then((m) => ({ default: m.CategoriesView })));
const AdminStock = lazy(() => import('./views/admin/stock/StockView').then((m) => ({ default: m.StockView })));
const AdminSuppliers = lazy(() => import('./views/admin/suppliers/SuppliersView').then((m) => ({ default: m.SuppliersView })));
const AdminCustomers = lazy(() => import('./views/admin/customers/CustomersView').then((m) => ({ default: m.CustomersView })));
const AdminSales = lazy(() => import('./views/admin/sales/SalesView').then((m) => ({ default: m.SalesView })));
const AdminPurchases = lazy(() => import('./views/admin/purchases/PurchasesView').then((m) => ({ default: m.PurchasesView })));
const AdminExpenses = lazy(() => import('./views/admin/expenses/ExpensesView').then((m) => ({ default: m.ExpensesView })));
const AdminInventory = lazy(() => import('./views/admin/inventory/InventoryView').then((m) => ({ default: m.InventoryView })));
const AdminDeliveries = lazy(() => import('./views/admin/deliveries/DeliveriesView').then((m) => ({ default: m.DeliveriesView })));
const AdminCashRegisters = lazy(() => import('./views/admin/cash_registers/CashRegistersView').then((m) => ({ default: m.CashRegistersView })));
const AdminUsers = lazy(() => import('./views/admin/users/UsersView').then((m) => ({ default: m.UsersView })));
const UserCreate = lazy(() => import('./pages/UserCreate').then((m) => ({ default: m.UserCreate })));
const UserEdit = lazy(() => import('./pages/UserEdit').then((m) => ({ default: m.UserEdit })));
const ProductCreate = lazy(() => import('./pages/ProductCreate').then((m) => ({ default: m.ProductCreate })));
const ProductEdit = lazy(() => import('./pages/ProductEdit').then((m) => ({ default: m.ProductEdit })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then((m) => ({ default: m.ProductDetail })));
const CategoryCreate = lazy(() => import('./pages/CategoryCreate').then((m) => ({ default: m.CategoryCreate })));
const CategoryEdit = lazy(() => import('./pages/CategoryEdit').then((m) => ({ default: m.CategoryEdit })));
const CategoryDetail = lazy(() => import('./pages/CategoryDetail').then((m) => ({ default: m.CategoryDetail })));
const SupplierCreate = lazy(() => import('./pages/SupplierCreate').then((m) => ({ default: m.SupplierCreate })));
const SupplierEdit = lazy(() => import('./pages/SupplierEdit').then((m) => ({ default: m.SupplierEdit })));
const SupplierDetail = lazy(() => import('./pages/SupplierDetail').then((m) => ({ default: m.SupplierDetail })));
const CustomerCreate = lazy(() => import('./pages/CustomerCreate').then((m) => ({ default: m.CustomerCreate })));
const CustomerEdit = lazy(() => import('./pages/CustomerEdit').then((m) => ({ default: m.CustomerEdit })));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail').then((m) => ({ default: m.CustomerDetail })));
const StockEntry = lazy(() => import('./pages/StockEntry').then((m) => ({ default: m.StockEntry })));
const StockExit = lazy(() => import('./pages/StockExit').then((m) => ({ default: m.StockExit })));
const InventoryCreate = lazy(() => import('./pages/InventoryCreate').then((m) => ({ default: m.InventoryCreate })));
const InventoryDetail = lazy(() => import('./pages/InventoryDetail').then((m) => ({ default: m.InventoryDetail })));
const PurchaseCreate = lazy(() => import('./pages/PurchaseCreate').then((m) => ({ default: m.PurchaseCreate })));
const PurchaseReception = lazy(() => import('./pages/PurchaseReception').then((m) => ({ default: m.PurchaseReception })));
const DeliveryCreate = lazy(() => import('./pages/DeliveryCreate').then((m) => ({ default: m.DeliveryCreate })));
const DeliveryDetail = lazy(() => import('./pages/DeliveryDetail').then((m) => ({ default: m.DeliveryDetail })));
const CashRegisterCreate = lazy(() => import('./pages/CashRegisterCreate').then((m) => ({ default: m.CashRegisterCreate })));
const CashRegisterEdit = lazy(() => import('./pages/CashRegisterEdit').then((m) => ({ default: m.CashRegisterEdit })));
const CashRegisterSessions = lazy(() => import('./pages/CashRegisterSessions').then((m) => ({ default: m.CashRegisterSessions })));
const CashSessionBilanZ = lazy(() => import('./pages/CashSessionBilanZ').then((m) => ({ default: m.CashSessionBilanZ })));
const BarcodeLabels = lazy(() => import('./pages/BarcodeLabels').then((m) => ({ default: m.BarcodeLabels })));
const AdminSettings = lazy(() => import('./views/admin/settings/SettingsView').then((m) => ({ default: m.SettingsView })));
const AdminSync = lazy(() => import('./views/admin/sync/SyncView').then((m) => ({ default: m.SyncView })));
const AdminReports = lazy(() => import('./views/admin/reports/ReportsView').then((m) => ({ default: m.ReportsView })));

// Views matching resources/views/caissier/
const CaissierPos = lazy(() => import('./views/caissier/pos/PosView').then((m) => ({ default: m.PosView })));
const CaissierSession = lazy(() => import('./views/caissier/session/CashSessionView').then((m) => ({ default: m.CashSessionView })));
const CaissierSales = lazy(() => import('./views/caissier/sales/CashierSalesView').then((m) => ({ default: m.CashierSalesView })));
const CaissierReturns = lazy(() => import('./views/caissier/returns/ReturnsView').then((m) => ({ default: m.ReturnsView })));

// Views matching resources/views/magasinier/
const MagasinierAlerts = lazy(() => import('./views/magasinier/alerts/AlertsView').then((m) => ({ default: m.AlertsView })));

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

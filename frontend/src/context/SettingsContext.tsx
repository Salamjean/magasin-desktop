import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../db/db';

export interface StoreSettings {
  company_name: string;
  company_phone: string;
  company_email: string;
  company_address: string;
  company_nif: string;
  company_logo: string;
  currency: string;
  min_stock_alert: string;
  receipt_footer: string;
  [key: string]: string;
}

export const defaultStoreSettings: StoreSettings = {
  company_name: 'BNELBOUTIQUE',
  company_phone: '+225 07 88 99 00 11',
  company_email: 'contact@bnelboutique.com',
  company_address: 'Abidjan Cocody, Rue des Jardins',
  company_nif: 'CI-ABJ-2026-B-12345',
  company_logo: '',
  currency: 'FCFA',
  min_stock_alert: '10',
  receipt_footer: 'Merci pour votre confiance et à très bientôt !'
};

interface SettingsContextType {
  settings: StoreSettings;
  loading: boolean;
  getSetting: (key: string, fallback?: string) => string;
  updateSettings: (newSettings: Partial<StoreSettings> | Record<string, string>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings>(defaultStoreSettings);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSettings = useCallback(async () => {
    try {
      const list = await db.settings.toArray();
      const map: Record<string, string> = {};
      list.forEach((item) => {
        map[item.key] = item.value;
      });

      setSettings((prev) => ({
        ...prev,
        ...map
      }));
    } catch (err) {
      console.error('Erreur lors du chargement des paramètres:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();

    // Écouteur d'événement personnalisé pour synchroniser les onglets / composants
    const handleSettingsUpdated = () => {
      refreshSettings();
    };

    window.addEventListener('gestmag:settings_updated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('gestmag:settings_updated', handleSettingsUpdated);
    };
  }, [refreshSettings]);

  // Synchronisation dynamique du Favicon et du Titre du document selon le logo et nom du magasin
  useEffect(() => {
    const logoUrl = settings.company_logo || (settings as any).logo;
    if (logoUrl && typeof document !== 'undefined') {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = logoUrl;
    }
    if (settings.company_name && typeof document !== 'undefined') {
      document.title = settings.company_name;
    }

    // Synchroniser avec la fenêtre Electron native
    if (typeof window !== 'undefined' && (window as any).electronAPI?.updateAppBranding) {
      (window as any).electronAPI.updateAppBranding({
        name: settings.company_name,
        logo: logoUrl
      }).catch(() => {});
    }
  }, [settings.company_logo, settings.company_name, (settings as any).logo]);

  const updateSettings = async (newSettings: Partial<StoreSettings> | Record<string, string>) => {
    try {
      for (const [key, value] of Object.entries(newSettings)) {
        await db.settings.put({ key, value: value ?? '' });
      }

      setSettings((prev) => ({
        ...prev,
        ...newSettings
      }));

      // Synchroniser avec Electron immédiatement
      const updatedName = newSettings.company_name || settings.company_name;
      const updatedLogo = newSettings.company_logo || (newSettings as any).logo || settings.company_logo;
      if (typeof window !== 'undefined' && (window as any).electronAPI?.updateAppBranding) {
        (window as any).electronAPI.updateAppBranding({
          name: updatedName,
          logo: updatedLogo
        }).catch(() => {});
      }

      // Marquer pour la synchronisation montante vers MySQL
      sessionStorage.setItem('gestmag_settings_dirty', 'true');

      // Déclencher l'événement pour notifier tous les composants
      window.dispatchEvent(new Event('gestmag:settings_updated'));

      // Tenter la synchronisation en arrière-plan vers MySQL si en ligne
      try {
        const { syncService } = await import('../db/syncService');
        syncService.pushToRemote().catch(() => {});
      } catch {}
    } catch (err) {
      console.error('Erreur lors de la mise à jour des paramètres:', err);
      throw err;
    }
  };

  const getSetting = (key: string, fallback: string = ''): string => {
    return settings[key] || fallback;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        getSetting,
        updateSettings,
        refreshSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings doit être utilisé à l\'intérieur d\'un SettingsProvider');
  }
  return context;
};

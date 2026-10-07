import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import bcrypt from 'bcryptjs';
import Swal from 'sweetalert2';
import { User, db } from '../db/db';

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 heure d'inactivité en millisecondes

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchRole: (role: 'admin' | 'caissier' | 'magasinier' | 'livreur') => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const updateLastActivity = useCallback(() => {
    localStorage.setItem('gestmagasin_last_activity', String(Date.now()));
  }, []);

  const logout = useCallback((reason?: string) => {
    setUser(null);
    userRef.current = null;
    localStorage.removeItem('gestmagasin_user_id');
    localStorage.removeItem('gestmagasin_last_activity');

    if (reason) {
      Swal.fire({
        icon: 'warning',
        title: 'Session expirée',
        text: reason,
        confirmButtonColor: '#0055b8'
      });
    }
  }, []);

  // Vérification de la session au démarrage
  useEffect(() => {
    const savedUserId = localStorage.getItem('gestmagasin_user_id');
    const lastActivity = localStorage.getItem('gestmagasin_last_activity');
    const now = Date.now();

    if (savedUserId) {
      // Si la dernière activité remonte à plus d'une heure, déconnecter
      if (lastActivity && now - Number(lastActivity) > INACTIVITY_TIMEOUT_MS) {
        logout("Votre session a expiré suite à 1 heure d'inactivité.");
        setLoading(false);
        return;
      }

      db.users.get(Number(savedUserId)).then(foundUser => {
        if (foundUser && foundUser.active) {
          setUser(foundUser);
          updateLastActivity();
        } else {
          logout();
        }
        setLoading(false);
      }).catch(() => {
        logout();
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [logout, updateLastActivity]);

  // Écoute des événements d'activité de l'utilisateur
  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      updateLastActivity();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));

    // Vérificateur régulier (toutes les 15 secondes)
    const interval = setInterval(async () => {
      const currentUser = userRef.current;
      if (!currentUser) return;

      const lastActivity = localStorage.getItem('gestmagasin_last_activity');
      const now = Date.now();

      // 1. Déconnexion automatique si inactif depuis plus d'1 heure
      if (lastActivity && now - Number(lastActivity) > INACTIVITY_TIMEOUT_MS) {
        logout("Vous avez été déconnecté suite à 1 heure d'inactivité sur l'application.");
        return;
      }

      // 2. Vérification que l'utilisateur existe toujours en base et est actif
      if (currentUser.id) {
        try {
          const freshUser = await db.users.get(currentUser.id);
          if (!freshUser || !freshUser.active) {
            logout("Votre compte utilisateur n'est plus actif ou a été supprimé.");
          }
        } catch {
          // Erreur de lecture locale ignorée
        }
      }
    }, 15000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      clearInterval(interval);
    };
  }, [user, logout, updateLastActivity]);

  const login = async (identifier: string, password?: string) => {
    try {
      const cleanInput = identifier.trim();
      if (!cleanInput) {
        return { success: false, message: 'Veuillez saisir votre identifiant.' };
      }

      let foundUser: User | undefined;

      if (cleanInput.includes('@')) {
        // --- 1. Mode Email (Réservé à l'Admin) ---
        foundUser = await db.users.where('email').equalsIgnoreCase(cleanInput).first();
        if (!foundUser) {
          return { success: false, message: 'Aucun compte trouvé avec cette adresse email.' };
        }
        if (foundUser.role !== 'admin') {
          return {
            success: false,
            message: 'Aucun compte trouvé avec cet identifiant.'
          };
        }
      } else {
        // --- 2. Mode Numéro de Téléphone (Pour Caissier, Magasinier, Livreur) ---
        const normalizedInput = cleanInput.replace(/[^0-9+]/g, '');
        const allUsers = await db.users.toArray();
        foundUser = allUsers.find(u => {
          if (!u.phone) return false;
          const uPhone = u.phone.replace(/[^0-9+]/g, '');
          return uPhone === normalizedInput || uPhone.endsWith(normalizedInput) || normalizedInput.endsWith(uPhone);
        });

        if (!foundUser) {
          return { success: false, message: 'Aucun compte trouvé avec cet identifiant.' };
        }

        if (foundUser.role === 'admin') {
          return {
            success: false,
            message: 'Identifiant incorrect.'
          };
        }
      }

      if (!foundUser.active) {
        return { success: false, message: 'Ce compte utilisateur a été désactivé.' };
      }

      if (password && foundUser.password) {
        let isMatch = false;
        if (foundUser.password.startsWith('$2a$') || foundUser.password.startsWith('$2b$')) {
          try {
            isMatch = bcrypt.compareSync(password, foundUser.password);
          } catch {
            isMatch = false;
          }
        } else {
          isMatch = foundUser.password === password;
        }

        if (!isMatch) {
          return { success: false, message: 'Mot de passe incorrect.' };
        }
      }

      setUser(foundUser);
      if (foundUser.id) {
        localStorage.setItem('gestmagasin_user_id', String(foundUser.id));
        updateLastActivity();
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erreur de connexion' };
    }
  };

  const switchRole = async (role: 'admin' | 'caissier' | 'magasinier' | 'livreur') => {
    const foundUser = await db.users.where('role').equals(role).first();
    if (foundUser && foundUser.id) {
      setUser(foundUser);
      localStorage.setItem('gestmagasin_user_id', String(foundUser.id));
    }
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user || !user.id) return;
    const finalData = { ...data };
    if (finalData.password && !finalData.password.startsWith('$2a$') && !finalData.password.startsWith('$2b$')) {
      finalData.password = bcrypt.hashSync(finalData.password, 10);
    }
    await db.users.update(user.id, { ...finalData, synced: 0 });
    const updated = await db.users.get(user.id);
    if (updated) setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchRole, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

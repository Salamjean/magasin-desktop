import React, { createContext, useContext, useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import { User, db } from '../db/db';

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

  useEffect(() => {
    const savedUserId = localStorage.getItem('gestmagasin_user_id');
    if (savedUserId) {
      db.users.get(Number(savedUserId)).then(foundUser => {
        if (foundUser && foundUser.active) {
          setUser(foundUser);
        } else {
          localStorage.removeItem('gestmagasin_user_id');
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

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
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erreur de connexion' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('gestmagasin_user_id');
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

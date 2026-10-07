import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Logo } from '../components/Logo';
import Swal from 'sweetalert2';

export const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(identifier, password);
    setLoading(false);

    if (result.success) {
      Swal.fire({
        icon: 'success',
        title: 'Connexion réussie !',
        text: 'Bienvenue sur votre espace GestMAG',
        timer: 1500,
        showConfirmButton: false
      });
      navigate('/');
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Échec de connexion',
        text: result.message || 'Identifiant ou mot de passe incorrect.',
        confirmButtonColor: '#003874'
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0055b8] font-sans p-4 select-none">
      {/* Compact Form Card */}
      <div className="w-full max-w-[340px] bg-white rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
        {/* Official GESTiMAG Logo & Titles */}
        <div className="flex flex-col items-center justify-center text-center">
          <Logo size={85} />

          <h1 className="text-base font-black text-[#0c2340] tracking-tight mt-2.5 uppercase leading-tight line-clamp-2">
            {settings.company_name || 'Connexion'}
          </h1>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            Accédez à votre espace selon votre rôle
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3.5" autoComplete="off">
          {/* Identifiant Input (Email pour Admin, Téléphone pour les autres) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Identifiant</label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoComplete="off"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email (Admin) ou N° Téléphone"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#eef4fc] border border-transparent focus:border-[#0055b8] focus:bg-white text-slate-800 text-xs font-medium focus:outline-none transition shadow-sm"
              />
            </div>
          </div>

          {/* Mot de passe Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Mot de passe</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-9 py-2 rounded-xl bg-[#eef4fc] border border-transparent focus:border-[#0055b8] focus:bg-white text-slate-800 text-xs font-medium focus:outline-none transition shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Checkbox Se souvenir de moi */}
          <div className="flex items-center gap-2 pt-0.5">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-[#003874] focus:ring-[#003874] accent-[#003874] cursor-pointer"
            />
            <label htmlFor="rememberMe" className="text-[11px] text-slate-600 font-medium cursor-pointer select-none">
              Se souvenir de moi
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#003874] hover:bg-[#002b59] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50 mt-1"
          >
            <span>{loading ? 'Connexion en cours...' : 'Se connecter'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

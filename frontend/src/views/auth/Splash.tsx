import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Logo } from '../../components/Logo';
import {
  Database,
  Layers,
  Sparkles,
  Cpu,
  ArrowRight
} from 'lucide-react';

interface LoadingStep {
  text: string;
  subtext: string;
  icon: React.ReactNode;
}

export const SplashView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps: LoadingStep[] = [
    {
      text: 'Initialisation de la base locale',
      subtext: 'Chargement Dexie & configuration TPV...',
      icon: <Database className="w-4 h-4 text-[#0055b8] animate-pulse" />
    },
    {
      text: 'Configuration des périphériques',
      subtext: 'Connexion imprimantes & tiroir caisse...',
      icon: <Cpu className="w-4 h-4 text-[#0055b8] animate-pulse" />
    },
    {
      text: 'Synchronisation Cloud & Stocks',
      subtext: 'Vérification du catalogue et des rayons...',
      icon: <Layers className="w-4 h-4 text-[#0055b8] animate-pulse" />
    },
    {
      text: 'Espace de travail prêt !',
      subtext: 'Lancement de votre session commerciale...',
      icon: <Sparkles className="w-4 h-4 text-emerald-600 animate-bounce" />
    }
  ];

  useEffect(() => {
    // Progression fluide de 0% à 100%
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const increment = Math.floor(Math.random() * 8) + 5;
        const nextVal = Math.min(100, prev + increment);

        if (nextVal < 30) {
          setCurrentStepIndex(0);
        } else if (nextVal < 65) {
          setCurrentStepIndex(1);
        } else if (nextVal < 92) {
          setCurrentStepIndex(2);
        } else {
          setCurrentStepIndex(3);
        }

        return nextVal;
      });
    }, 85);

    return () => clearInterval(interval);
  }, []);

  // Redirection automatique dès que 100% est atteint
  useEffect(() => {
    if (progress >= 100) {
      sessionStorage.setItem('gestmag_splash_done', 'true');
      const timer = setTimeout(() => {
        if (user) {
          navigate('/');
        } else {
          navigate('/login');
        }
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [progress, user, navigate]);

  const handleSkip = () => {
    sessionStorage.setItem('gestmag_splash_done', 'true');
    if (user) {
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  const currentStep = steps[currentStepIndex];

  return (
    <div className="h-screen w-screen bg-[#0055b8] flex flex-col items-center justify-center text-slate-900 relative overflow-hidden select-none font-sans p-4">
      
      {/* EFFETS LUMINEUX SUBTILS SUR LE FOND BLEU OFFICIEL #0055b8 */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-black/15 rounded-full blur-3xl pointer-events-none" />

      <div className="z-10 flex flex-col items-center max-w-sm w-full space-y-5 animate-in fade-in zoom-in-95 duration-300">
        
        {/* CARTE CENTRALE BLANCHE (ÉLÉGANTE ET ASSORTIE À LA PAGE DE CONNEXION) */}
        <div className="w-full bg-white rounded-3xl p-7 shadow-2xl space-y-6 border border-white/40">
          
          {/* Logo officiel GestMAG */}
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <Logo size={90} />

            <div className="space-y-0.5 pt-1">
              <h1 className="text-base font-black text-[#0c2340] tracking-tight uppercase leading-tight">
                {settings.company_name || 'GESTiMAG PRO'}
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Gestion Commerciale, Caisse TPV & Stocks
              </p>
            </div>
          </div>

          {/* Étape courante */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                  {currentStep.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-[#0c2340] truncate text-xs">{currentStep.text}</p>
                  <p className="text-[10px] text-slate-500 truncate">{currentStep.subtext}</p>
                </div>
              </div>

              {/* Pourcentage */}
              <div className="font-mono font-black text-sm text-[#0055b8] flex-shrink-0 pl-2">
                {progress}%
              </div>
            </div>

            {/* BARRE DE PROGRESSION AVEC LE BLEU OFFICIEL */}
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-[#0055b8] transition-all duration-150 ease-out shadow-sm"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Pied de carte avec statut */}
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 pt-1">
            <span>Étape {currentStepIndex + 1} / {steps.length}</span>
            <button
              type="button"
              onClick={handleSkip}
              className="font-bold text-[#0055b8] hover:underline flex items-center gap-1 transition"
            >
              <span>Passer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* MENTION BAS DE PAGE SUR FOND BLEU */}
        <div className="text-center space-y-1">
          <p className="text-xs font-bold text-white/90 drop-shadow-xs">
            Version Desktop • Système Connecté
          </p>
          <p className="text-[10px] text-blue-100/70 font-mono">
            © 2026 GestMagasin Pro
          </p>
        </div>

      </div>

    </div>
  );
};

export default SplashView;

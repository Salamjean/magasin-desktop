import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Store } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: number;
  showSlogan?: boolean;
  customSrc?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 100, customSrc }) => {
  const { settings } = useSettings();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [settings.company_logo, customSrc]);

  // Si customSrc fourni
  if (customSrc) {
    if (imgError) {
      return (
        <div
          style={{ width: `${size}px`, height: `${size}px` }}
          className={`flex items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-[#0055b8] ${className}`}
        >
          <Store className="w-1/2 h-1/2" />
        </div>
      );
    }
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <img
          src={customSrc}
          alt={settings.company_name || 'Logo'}
          onError={() => setImgError(true)}
          style={{ width: `${size}px`, maxHeight: `${size * 1.2}px` }}
          className="object-contain drop-shadow-sm select-none"
        />
      </div>
    );
  }

  // Si company_logo présent dans les paramètres
  if (settings.company_logo && !imgError) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <img
          src={settings.company_logo}
          alt={settings.company_name || 'Logo'}
          onError={() => setImgError(true)}
          style={{ width: `${size}px`, maxHeight: `${size * 1.2}px` }}
          className="object-contain drop-shadow-sm select-none"
        />
      </div>
    );
  }

  // Fallback sur logo local ./logo.png ou icône de secours
  if (imgError) {
    return (
      <div
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`flex items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-[#0055b8] shadow-sm ${className}`}
      >
        <Store className="w-1/2 h-1/2" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <img
        src="./logo.png"
        alt={settings.company_name || 'GESTiMAG'}
        onError={() => setImgError(true)}
        style={{ width: `${size}px`, maxHeight: `${size * 1.2}px` }}
        className="object-contain drop-shadow-sm select-none"
      />
    </div>
  );
};



import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

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

  const logoSrc = customSrc || (!imgError && settings.company_logo ? settings.company_logo : '/logo.png');
  const storeName = settings.company_name || 'GESTiMAG';

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <img
        src={logoSrc}
        alt={storeName}
        onError={() => setImgError(true)}
        style={{ width: `${size}px`, maxHeight: `${size * 1.2}px` }}
        className="object-contain drop-shadow-sm select-none transition-all duration-200"
      />
    </div>
  );
};


import React from 'react';

interface OfficialLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  textColor?: string;
}

export function OfficialLogo({
  className = '',
  size = 'md',
  withText = false,
  textColor = 'text-white'
}: OfficialLogoProps) {
  // Traditional dimensions based on size
  const sizes = {
    xs: 'w-8 h-8',
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${currentSize} shrink-0 flex items-center justify-center`}>
        <img
          src="/logo_oficial.png"
          alt="Logo Oficial Kung Fu Garra de Águia Praia Grande"
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>

      {withText && (
        <div className="flex flex-col items-center justify-center text-center mt-3 select-none">
          <span className={`text-sm tracking-widest font-extrabold font-serif uppercase ${textColor}`}>
            Garra de Águia
          </span>
          <span className="text-[10px] uppercase font-bold text-amber-500 tracking-widest leading-none mt-1">
            Praia Grande
          </span>
        </div>
      )}
    </div>
  );
}


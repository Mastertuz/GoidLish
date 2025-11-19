import React from 'react';

interface ToasterProps {}

export const Toaster: React.FC<ToasterProps> = () => {
  return (
    <div id="toaster" className="fixed bottom-0 right-0 z-50 w-full md:max-w-[420px] p-4">
      {/* Simple toaster placeholder - можно заменить на react-hot-toast или подобное */}
    </div>
  );
};
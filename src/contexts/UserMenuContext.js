// src/contexts/UserMenuContext.js
import React, { createContext, useContext, useState } from 'react';

const UserMenuContext = createContext();

export const useUserMenu = () => {
  const context = useContext(UserMenuContext);
  if (!context) {
    throw new Error('useUserMenu deve ser usado dentro de um UserMenuProvider');
  }
  return context;
};

// Só guarda se o menu está aberto ou não — permite abrir a partir do
// cabeçalho (TelaPadrao.js) sem precisar passar navigation por props; quem
// realmente resolve a navegação é o próprio componente UserMenu.
export const UserMenuProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const value = {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };

  return (
    <UserMenuContext.Provider value={value}>
      {children}
    </UserMenuContext.Provider>
  );
};

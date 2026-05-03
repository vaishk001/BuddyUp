// contexts/EnhancedThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const EnhancedThemeContext = createContext();

export const useEnhancedTheme = () => {
  const context = useContext(EnhancedThemeContext);
  if (!context) {
    throw new Error('useEnhancedTheme must be used within EnhancedThemeProvider');
  }
  return context;
};

export const EnhancedThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('chatwave-theme') || 'dark';
  });

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('chatwave-accent') || '#8b5cf6';
  });

  const [chatBackground, setChatBackground] = useState(() => {
    return localStorage.getItem('chatwave-bg') || 'default';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chatwave-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', accentColor);
    localStorage.setItem('chatwave-accent', accentColor);
  }, [accentColor]);

  const value = {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    chatBackground,
    setChatBackground,
  };

  return (
    <EnhancedThemeContext.Provider value={value}>
      {children}
    </EnhancedThemeContext.Provider>
  );
};
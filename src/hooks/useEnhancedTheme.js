import { useState, useEffect } from 'react'

export const useEnhancedTheme = () => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('chatwave-theme') || 'dark'
  })

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('chatwave-accent') || '#8b5cf6'
  })

  const [chatBackground, setChatBackground] = useState(() => {
    return localStorage.getItem('chatwave-bg') || 'default'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('chatwave-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', accentColor)
    localStorage.setItem('chatwave-accent', accentColor)
  }, [accentColor])

  useEffect(() => {
    localStorage.setItem('chatwave-bg', chatBackground)
  }, [chatBackground])

  return {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    chatBackground,
    setChatBackground,
  }
}
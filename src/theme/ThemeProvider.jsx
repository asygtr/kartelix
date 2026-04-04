import React, { createContext, useContext, useEffect, useState } from 'react';
import { defaultPaletteId, palettes } from './palettes';

const ThemeContext = createContext({
  activePalette: defaultPaletteId,
  setActivePalette: () => {},
  appLogo: '/nevres.png',
  setAppLogo: () => {},
  appBackground: '/showroom-bg.png',
  setAppBackground: () => {}
});

export const ThemeProvider = ({ children }) => {
  const [activePalette, setActivePalette] = useState(defaultPaletteId);
  const [appLogo, setAppLogo] = useState('/nevres.png');
  const [appBackground, setAppBackground] = useState('/showroom-bg.png');

  useEffect(() => {
    const applyPalette = (paletteId) => {
      const palette = palettes[paletteId] || palettes[defaultPaletteId];
      Object.entries(palette.colors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
      document.documentElement.dataset.palette = palette.id;
    };

    applyPalette(activePalette);
  }, [activePalette]);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-bg-image', `url("${appBackground}")`);
  }, [appBackground]);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const response = await fetch('/api/theme-settings');
        const result = await response.json();
        if (result.success && result.data) {
          if (result.data.activePalette) {
            setActivePalette(result.data.activePalette);
          }
          if (result.data.appLogo) {
            setAppLogo(result.data.appLogo);
          }
          if (result.data.appBackground) {
            setAppBackground(result.data.appBackground);
          }
        }
      } catch {}
    };

    loadTheme();
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        activePalette,
        setActivePalette,
        appLogo,
        setAppLogo,
        appBackground,
        setAppBackground
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

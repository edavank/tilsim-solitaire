import React, { createContext, useContext, useState, useEffect } from 'react';
import { getT } from '../i18n/translations';
import { loadSettings, saveSettings } from '../utils/storage';

const LanguageContext = createContext({ lang: 'tr', t: getT('tr'), setLang: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('tr');
  const [t, setT] = useState(getT('tr'));

  useEffect(() => {
    loadSettings().then((s) => {
      const l = s.language || 'tr';
      setLangState(l);
      setT(getT(l));
    }).catch(() => {});
  }, []);

  const setLang = async (code) => {
    setLangState(code);
    setT(getT(code));
    const s = await loadSettings();
    await saveSettings({ ...s, language: code, languageSelected: true });
  };

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}

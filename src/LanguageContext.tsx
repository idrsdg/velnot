import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Lang, T } from './i18n';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
}

const LangContext = createContext<LangCtx>({
  lang: 'en',
  setLang: () => {},
  t: translations['en'],
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    window.api.getSetting('ui_language').then(val => {
      if (val && val in translations) setLangState(val as Lang);
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    window.api.setSetting('ui_language', l);
    window.api.setMenuLanguage(l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export const useT = () => useContext(LangContext);

// Maps known main-process error strings → localized messages
export function localizeError(msg: string, t: T): string {
  const m = msg ?? '';
  if (m.includes('OpenAI API key') && m.includes('ayarlanmamış')) return t.errors.noOpenAIKey;
  if (m.includes('AssemblyAI API key') && m.includes('ayarlanmamış')) return t.errors.noAssemblyKey;
  if (m.includes('AssemblyAI upload')) return t.errors.assemblyUpload;
  if (m.includes('AssemblyAI transcript isteği') || m.includes('AssemblyAI transcript request')) return t.errors.assemblyRequest;
  if (m.includes('AssemblyAI hatası') || m.includes('AssemblyAI error')) return t.errors.assemblyFailed;
  if (m.includes('AssemblyAI zaman') || m.includes('AssemblyAI timeout')) return t.errors.assemblyTimeout;
  if (m.includes('GPT boş') || m.includes('GPT empty')) return t.errors.gptEmpty;
  if (m.includes('Kayıt başlatılamadı') || m.includes('Could not start')) return t.errors.recordFailed;
  if (m.includes('Transkripsiyon başarısız') || m.includes('Transcription failed')) return t.errors.transcribeFailed;
  if (m.includes('İşlem başarısız') || m.includes('Processing failed')) return t.errors.processFailed;
  return m; // fallback: show raw message
}

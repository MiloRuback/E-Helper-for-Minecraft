import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ptBR from './pt-br.json'
import enUS from './en-us.json'

/**
 * Configuração do sistema de internacionalização
 * Idiomas suportados: PT-BR (padrão) e EN-US
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      'en-US': { translation: enUS }
    },
    fallbackLng: 'pt-BR',
    interpolation: {
      escapeValue: false // React já faz escape
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  })

export default i18n

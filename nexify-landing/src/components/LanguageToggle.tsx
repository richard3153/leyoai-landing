import { useLang } from '../contexts/LanguageContext';

export function LanguageToggle() {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
      title={lang === 'zh' ? 'Switch to English' : '切换到中文'}
      aria-label={lang === 'zh' ? '切换语言到英文' : 'Switch language to Chinese'}
    >
      <span className="text-lg">{lang === 'zh' ? '🇨🇳' : '🇺🇸'}</span>
      <span>{lang === 'zh' ? '中文' : 'EN'}</span>
    </button>
  );
}

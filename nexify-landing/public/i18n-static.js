/**
 * LeyoAI Static Page i18n
 * 实时响应全局语言切换（与 React LanguageContext 同步）
 * 同步机制：监听 <html lang="..."> 属性变化（React LanguageContext 会更新此属性）
 *
 * localStorage key: leyoai-lang
 *
 * Usage in HTML:
 *   <script src="/i18n-static.js" defer></script>
 *   <span data-zh>中文</span><span data-en>English</span>
 */
(function() {
  var LANG_KEY = 'leyoai-lang';

  function getLang() {
    try { return localStorage.getItem(LANG_KEY) || 'zh'; } catch(e) { return 'zh'; }
  }

  function applyLang(lang) {
    document.querySelectorAll('[data-zh]').forEach(function(el) {
      el.style.display = lang === 'zh' ? '' : 'none';
    });
    document.querySelectorAll('[data-en]').forEach(function(el) {
      el.style.display = lang === 'en' ? '' : 'none';
    });
    // Note: document.documentElement.lang is updated by both React
    // and this script — no need to duplicate here
  }

  // Global toggle — also usable by React app
  window.toggleStaticLang = function() {
    var current = getLang();
    var next = current === 'zh' ? 'en' : 'zh';
    try { localStorage.setItem(LANG_KEY, next); } catch(e) {}
    document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
    applyLang(next);
    updateAllToggleButtons(next);
  };

  function updateAllToggleButtons(currentLang) {
    document.querySelectorAll('.lang-toggle-btn').forEach(function(btn) {
      // Show current language: zh→"🇨🇳 中文" (switch to EN), en→"🇺🇸 EN" (switch to ZH)
      btn.textContent = currentLang === 'zh' ? '🇨🇳 中文' : '🇺🇸 EN';
    });
  }

  function addToggleButton(container, currentLang, light) {
    if (!container || container.querySelector('.lang-toggle-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'lang-toggle-btn';
    if (light) {
      btn.style.cssText = 'padding:4px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-size:13px;cursor:pointer;transition:all 0.2s;';
    } else {
      btn.style.cssText = 'padding:4px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.1);color:#fff;font-size:13px;cursor:pointer;transition:all 0.2s;';
    }
    btn.textContent = currentLang === 'zh' ? '🇨🇳 中文' : '🇺🇸 EN';
    btn.onclick = window.toggleStaticLang;
    container.appendChild(btn);
  }

  function init() {
    var lang = getLang();
    applyLang(lang);
    addToggleButton(document.querySelector('.lang-toggle-container'), lang, false);
    addToggleButton(document.querySelector('.lang-toggle-container-light'), lang, true);

    // ---- REAL-TIME SYNC: watch <html lang="..."> ----
    // React LanguageContext updates document.documentElement.lang on every language change.
    // MutationObserver catches this in real-time across same-tab navigation.
    var lastLang = lang;
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        if (m.type === 'attributes' && m.attributeName === 'lang') {
          var newLang = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
          if (newLang !== lastLang) {
            lastLang = newLang;
            applyLang(newLang);
            updateAllToggleButtons(newLang);
          }
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });

    // Fallback: also listen for custom event (same-tab fast path)
    window.addEventListener('leyoai-lang-change', function(e) {
      if (e.detail && e.detail.lang) {
        applyLang(e.detail.lang);
        updateAllToggleButtons(e.detail.lang);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

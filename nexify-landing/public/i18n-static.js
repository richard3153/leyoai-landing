/**
 * LeyoAI Static Page i18n
 * Reads language preference from localStorage (set by React app's LanguageContext)
 * and toggles visibility of zh/en elements.
 *
 * Usage in HTML:
 *   <script src="/i18n-static.js"></script>
 *   <span data-zh>中文</span><span data-en>English</span>
 *   <div data-zh>中文内容</div><div data-en>English content</div>
 */
(function() {
  function getLang() {
    try { return localStorage.getItem('leyoai-lang') || 'zh'; } catch(e) { return 'zh'; }
  }

  function applyLang(lang) {
    // Hide all zh/en spans, show only current lang
    document.querySelectorAll('[data-zh]').forEach(function(el) {
      el.style.display = lang === 'zh' ? '' : 'none';
    });
    document.querySelectorAll('[data-en]').forEach(function(el) {
      el.style.display = lang === 'en' ? '' : 'none';
    });
    // Update html lang attribute
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }

  // Apply on load
  var lang = getLang();
  applyLang(lang);

  // Expose toggle function
  window.toggleStaticLang = function() {
    var current = getLang();
    var next = current === 'zh' ? 'en' : 'zh';
    localStorage.setItem('leyoai-lang', next);
    applyLang(next);
  };

  // Add lang toggle button to nav
  document.addEventListener('DOMContentLoaded', function() {
    var navs = document.querySelectorAll('.lang-toggle-container');
    navs.forEach(function(container) {
      var btn = document.createElement('button');
      btn.className = 'lang-toggle-btn';
      btn.style.cssText = 'padding:4px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.1);color:#fff;font-size:13px;cursor:pointer;transition:all 0.2s;';
      btn.textContent = lang === 'zh' ? '🇺🇸 EN' : '🇨🇳 中文';
      btn.onclick = function() {
        toggleStaticLang();
        btn.textContent = getLang() === 'zh' ? '🇺🇸 EN' : '🇨🇳 中文';
      };
      container.appendChild(btn);
    });

    // Also for light-theme navs
    var lightNavs = document.querySelectorAll('.lang-toggle-container-light');
    lightNavs.forEach(function(container) {
      var btn = document.createElement('button');
      btn.className = 'lang-toggle-btn';
      btn.style.cssText = 'padding:4px 12px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-size:13px;cursor:pointer;transition:all 0.2s;';
      btn.textContent = lang === 'zh' ? '🇺🇸 EN' : '🇨🇳 中文';
      btn.onclick = function() {
        toggleStaticLang();
        btn.textContent = getLang() === 'zh' ? '🇺🇸 EN' : '🇨🇳 中文';
      };
      container.appendChild(btn);
    });
  });
})();

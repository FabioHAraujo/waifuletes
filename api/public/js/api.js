// js/api.js - Utilitários de API, Tema e Notificações Toast para o Waifuletes

const Api = {
  _loadingCount: 0,
  _lastToastMsg: null,
  _lastToastTime: 0,
  _toastTimer: null,
  _errorCatchingInitialized: false,

  showLoading(title = 'Aguarde... Enviando...', subtext = 'Processando sua solicitação...') {
    let overlay = document.getElementById('retro-loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'retro-loading-overlay';
      overlay.className = 'retro-loading-overlay hidden';
      overlay.innerHTML = `
        <div class="retro-loading-box">
          <div class="retro-spinner"></div>
          <div class="retro-loading-title" id="retro-loading-title">Aguarde... Enviando...</div>
          <div class="retro-loading-subtext" id="retro-loading-subtext">Processando sua solicitação...</div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    const titleEl = document.getElementById('retro-loading-title');
    const subEl = document.getElementById('retro-loading-subtext');
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = subtext;

    overlay.classList.remove('hidden');
    this._loadingCount = (this._loadingCount || 0) + 1;
  },

  hideLoading(force = false) {
    this._loadingCount = Math.max(0, (this._loadingCount || 1) - 1);
    if (force || this._loadingCount === 0) {
      this._loadingCount = 0;
      const overlay = document.getElementById('retro-loading-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
      }
    }
  },

  async request(url, method, data = null, headers = {}, options = {}) {
    const isFormData = data instanceof FormData;
    const isModalOpen = Boolean(document.querySelector('.modal-overlay:not(.hidden):not(#retro-loading-overlay)'));
    const isMutedUrl = typeof url === 'string' && (url.includes('/persist-session') || url.includes('/notifications/read'));
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
    const shouldShowLoading = options.loading === true || (options.loading !== false && isMutation && isModalOpen && !isMutedUrl);

    if (shouldShowLoading) {
      this.showLoading(options.loadingTitle || 'Aguarde... Enviando...', options.loadingSubtext || 'Processando sua solicitação...');
    }

    try {
      const fetchHeaders = isFormData ? { ...headers } : { 'Content-Type': 'application/json', ...headers };
      if (!isFormData && !fetchHeaders['Accept']) {
        fetchHeaders['Accept'] = 'application/json';
      }

      const fetchConfig = {
        method,
        headers: fetchHeaders,
        ...options.fetchOptions
      };

      if (data !== null && data !== undefined) {
        fetchConfig.body = isFormData ? data : JSON.stringify(data);
      }

      const res = await fetch(url, fetchConfig);
      const contentType = res.headers.get('content-type') || '';
      let json;
      if (contentType.includes('application/json')) {
        json = await res.json();
      } else {
        const text = await res.text();
        try {
          json = JSON.parse(text);
        } catch {
          json = { success: res.ok, rawText: text };
        }
      }

      if (!res.ok) {
        if (!json || typeof json !== 'object') json = {};
        const isTooLarge =
          res.status === 413 ||
          json.code === 'FST_ERR_CTP_BODY_TOO_LARGE' ||
          json.error?.code === 'PAYLOAD_TOO_LARGE' ||
          (typeof json.message === 'string' && json.message.toLowerCase().includes('too large')) ||
          (typeof json.error?.message === 'string' && json.error.message.toLowerCase().includes('too large'));

        if (isTooLarge) {
          const customMsg = 'A imagem enviada é muito grande! Compacte ela antes';
          json.success = false;
          json.error = { code: 'PAYLOAD_TOO_LARGE', message: customMsg };
          json.message = customMsg;
        } else if (!json.error && !json.message) {
          json.error = { message: `Erro HTTP ${res.status}: ${res.statusText || 'Falha na resposta do servidor'}` };
        }
      }
      return json;
    } catch (err) {
      const errMsg = err?.message || 'Falha de comunicação com o servidor.';
      this.showToast(errMsg, '❌');
      this.hideLoading(true);
      throw err;
    } finally {
      if (shouldShowLoading) {
        this.hideLoading();
      }
    }
  },

  async get(url, headers = {}, options = {}) {
    const isAuthOrNoCache = Boolean(headers['Authorization'] || headers['authorization'] || headers['Cache-Control']);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...headers
      },
      cache: options.cache || (isAuthOrNoCache ? 'no-store' : 'default'),
      ...options
    });
    return res.json();
  },

  async post(url, data, headers = {}, options = {}) {
    return this.request(url, 'POST', data, headers, options);
  },

  async put(url, data, headers = {}, options = {}) {
    return this.request(url, 'PUT', data, headers, options);
  },

  async patch(url, data, headers = {}, options = {}) {
    return this.request(url, 'PATCH', data, headers, options);
  },

  async delete(url, headers = {}, options = {}) {
    return this.request(url, 'DELETE', null, headers, options);
  },

  showToast(message, icon = '✨') {
    if (!message) return;
    const now = Date.now();
    if (this._lastToastMsg === message && (now - (this._lastToastTime || 0)) < 2500) {
      return;
    }
    this._lastToastMsg = message;
    this._lastToastTime = now;

    let toast = document.getElementById('retro-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'retro-toast';
      toast.className = 'retro-toast hidden';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `<span style="font-size: 18px;">${icon}</span> <span>${message}</span>`;
    toast.classList.remove('hidden');

    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  },

  initGlobalErrorCatching() {
    if (this._errorCatchingInitialized) return;
    this._errorCatchingInitialized = true;

    window.addEventListener('error', (event) => {
      if (!event || !event.message) return;
      const msg = String(event.message || '');
      if (
        msg.includes('ResizeObserver') ||
        msg.includes('Script error.') ||
        event.filename?.includes('extension://') ||
        event.filename?.includes('chrome-extension://')
      ) {
        return;
      }
      this.hideLoading(true);
      this.showToast(`Erro na página: ${msg}`, '⚠️');
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.hideLoading(true);
      const reason = event?.reason;
      let msg = reason?.message || (typeof reason === 'string' ? reason : null);
      if (!msg && reason && typeof reason === 'object') {
        msg = reason.error?.message || reason.statusText || null;
      }
      if (!msg) {
        msg = 'Erro inesperado na operação.';
      }
      const strMsg = String(msg);
      if (strMsg.includes('ResizeObserver') || strMsg.includes('Script error.')) {
        return;
      }
      this.showToast(`Erro na requisição: ${strMsg}`, '⚠️');
    });
  },

  copyToClipboard(text, successMsg = 'Copiado para a área de transferência!') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => {
        this.showToast(successMsg, '📋');
      });
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    this.showToast(successMsg, '📋');
  },

  initTheme() {
    const urlParams = new URLSearchParams(window.location.search);
    const themeParam = urlParams.get('theme') || urlParams.get('dark');
    const isDarkParam = themeParam === 'dark' || themeParam === 'true' || themeParam === '1';
    const savedTheme = localStorage.getItem('waifu_theme');

    if (isDarkParam || savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
    }

    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) {
      this.updateThemeButton(themeBtn);
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }
  },

  updateThemeButton(btn) {
    if (!btn) return;
    const isDark = document.body.classList.contains('dark-mode');
    btn.innerHTML = isDark
      ? '<i class="fas fa-sun"></i> Claro'
      : '<i class="fas fa-moon"></i> Dark';
    btn.title = isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro (roxo)';
  },

  toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('waifu_theme', isDark ? 'dark' : 'light');
    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) {
      this.updateThemeButton(themeBtn);
    }
    this.showToast(isDark ? 'Modo Escuro (Roxo) ativado!' : 'Modo Claro ativado!', isDark ? '🌙' : '☀️');
  },

  getShareUrl(baseUrl) {
    if (!baseUrl) baseUrl = window.location.href;
    const url = new URL(baseUrl, window.location.origin);
    if (document.body.classList.contains('dark-mode')) {
      url.searchParams.set('theme', 'dark');
    } else {
      url.searchParams.delete('theme');
      url.searchParams.delete('dark');
    }
    return url.toString();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Api.initTheme();
  Api.initGlobalErrorCatching();
});

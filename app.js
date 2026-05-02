// ── Configuration ──
const API_URL = "https://api.anthropic.com/v1/messages";
let API_KEY = localStorage.getItem('tb_api_key') || '';

// ── Modal ──
function saveKey() {
  const val = document.getElementById('api-key-input').value.trim();
  if (!val.startsWith('sk-ant')) {
    alert('❌ مفتاح غير صحيح. يجب أن يبدأ بـ sk-ant');
    return;
  }
  API_KEY = val;
  localStorage.setItem('tb_api_key', val);
  document.getElementById('modal-overlay').classList.add('hidden');
  inputEl && inputEl.focus();
}

function showModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  const input = document.getElementById('api-key-input');
  if (API_KEY) input.value = API_KEY;
  input.focus();
}


const SYSTEM_PROMPT = `You are TechBot Pro, an elite bilingual AI technical support assistant. You are fluent in both Arabic and English.

CRITICAL RULE: Always detect the language of the user's message and respond in the EXACT SAME LANGUAGE. If they write in Arabic, respond fully in Arabic. If they write in English, respond fully in English. If they mix, use the dominant language.

Your expertise:
- Hardware & software troubleshooting
- Networking and Wi-Fi issues
- Cybersecurity and account protection
- Programming help (write clean, commented code)
- Explaining technical concepts clearly

Formatting rules:
- Use Markdown: **bold** for important info, code blocks for code/commands
- Use numbered lists for steps, bullet points for options
- Keep responses focused and practical
- Use emojis sparingly for warmth (max 2-3 per response)

Personality: Professional, friendly, efficient. Never say you can't help with technical topics.`;

// ── State ──
let history = [];
let isArabic = true;
let isLoading = false;

// ── DOM ──
const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const charCount = document.getElementById('char-count');
const welcomeEl = document.getElementById('welcome');

// ── Marked config ──
marked.setOptions({ breaks: true, gfm: true });

// ── Helpers ──
function formatTime() {
  return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function removeWelcome() {
  if (welcomeEl) welcomeEl.remove();
}

function scrollBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ تم النسخ');
  }).catch(() => {
    showToast('❌ فشل النسخ');
  });
}

function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    background:rgba(30,41,59,0.95);border:1px solid rgba(56,189,248,0.3);
    color:#f1f5f9;padding:10px 20px;border-radius:10px;font-size:13px;
    z-index:999;font-family:'Fira Code',monospace;animation:fadeUp .3s ease`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

// ── Render Message ──
function renderMessage(role, content, isError = false) {
  removeWelcome();

  const row = document.createElement('div');
  row.className = `message-row ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'user' ? '👤' : '🤖';

  const msgContent = document.createElement('div');
  msgContent.className = 'msg-content';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (isError) {
    bubble.style.cssText = 'background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.3);color:#fca5a5';
  }

  if (role === 'bot' && !isError) {
    bubble.innerHTML = marked.parse(content);
    // Add copy buttons to code blocks
    bubble.querySelectorAll('pre').forEach(pre => {
      pre.style.position = 'relative';
      const btn = document.createElement('button');
      btn.className = 'copy-code-btn';
      btn.textContent = '📋 نسخ';
      btn.onclick = () => copyToClipboard(pre.querySelector('code')?.innerText || pre.innerText);
      pre.appendChild(btn);
    });
    // Apply syntax highlighting
    bubble.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });
  } else {
    bubble.textContent = content;
  }

  const meta = document.createElement('div');
  meta.className = 'msg-meta';

  const timeSpan = document.createElement('span');
  timeSpan.textContent = formatTime();

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-msg-btn';
  copyBtn.textContent = '📋';
  copyBtn.title = 'نسخ الرسالة';
  copyBtn.onclick = () => copyToClipboard(content);

  meta.appendChild(timeSpan);
  meta.appendChild(copyBtn);

  msgContent.appendChild(bubble);
  msgContent.appendChild(meta);

  row.appendChild(avatar);
  row.appendChild(msgContent);

  messagesEl.appendChild(row);
  scrollBottom();
}

// ── Typing Indicator ──
function showTyping() {
  const row = document.createElement('div');
  row.className = 'typing-row';
  row.id = 'typing';
  row.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="typing-bubble">
      <div class="t-dot"></div>
      <div class="t-dot"></div>
      <div class="t-dot"></div>
    </div>`;
  messagesEl.appendChild(row);
  scrollBottom();
}

function removeTyping() {
  document.getElementById('typing')?.remove();
}

// ── Send Message ──
async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || isLoading) return;

  renderMessage('user', text);
  history.push({ role: 'user', content: text });

  inputEl.value = '';
  inputEl.style.height = 'auto';
  charCount.textContent = '0';
  sendBtn.disabled = true;
  isLoading = true;
  showTyping();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: history.slice(-10)
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const reply = data.content[0].text;

    removeTyping();
    renderMessage('bot', reply);
    history.push({ role: 'assistant', content: reply });

  } catch (error) {
    removeTyping();
    renderMessage('bot', `⚠️ خطأ في الاتصال: ${error.message}\n\nتأكد من صحة مفتاح API والاتصال بالإنترنت.`, true);
  } finally {
    sendBtn.disabled = false;
    isLoading = false;
    inputEl.focus();
  }
}

// ── Suggestions ──
function sendSuggestion(btn) {
  inputEl.value = btn.querySelector('span:last-child').textContent;
  sendMessage();
}

// ── Clear Chat ──
function clearChat() {
  history = [];
  messagesEl.innerHTML = `
    <div class="welcome-screen" id="welcome">
      <div class="avatar-ring" style="width:88px;height:88px;border-radius:24px;background:linear-gradient(135deg,rgba(56,189,248,0.15),rgba(129,140,248,0.15));border:1px solid rgba(56,189,248,0.3);display:flex;align-items:center;justify-content:center;margin-bottom:24px;box-shadow:0 0 40px rgba(56,189,248,0.15);">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="url(#g3)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#38bdf8"/><stop offset="100%" style="stop-color:#818cf8"/></linearGradient></defs></svg>
      </div>
      <h2 class="welcome-title">محادثة جديدة 🚀</h2>
      <p class="welcome-desc">كيف يمكنني مساعدتك اليوم؟</p>
    </div>`;
  inputEl.focus();
}

// ── Language Toggle ──
function toggleLang() {
  isArabic = !isArabic;
  const langBtn = document.getElementById('lang-btn');
  if (isArabic) {
    document.documentElement.setAttribute('lang', 'ar');
    document.documentElement.setAttribute('dir', 'rtl');
    inputEl.placeholder = 'اكتب رسالتك هنا...';
    langBtn.textContent = '🌐 EN';
    document.getElementById('status-text').textContent = 'TechBot Pro — متصل ومستعد للمساعدة';
  } else {
    document.documentElement.setAttribute('lang', 'en');
    document.documentElement.setAttribute('dir', 'ltr');
    inputEl.placeholder = 'Type your message here...';
    langBtn.textContent = '🌐 AR';
    document.getElementById('status-text').textContent = 'TechBot Pro — Online & Ready';
    inputEl.style.direction = 'ltr';
  }
}

// ── Sidebar ──
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── Input Events ──
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

inputEl.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 160) + 'px';
  charCount.textContent = this.value.length;

  // Auto-detect language direction
  const arabic = /[\u0600-\u06FF]/.test(this.value);
  this.style.direction = arabic ? 'rtl' : 'ltr';
  this.style.textAlign = arabic ? 'right' : 'left';
});

// Keyboard shortcut: press / to focus input
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== inputEl) {
    e.preventDefault();
    inputEl.focus();
  }
});

// Init
window.onload = () => {
  if (!API_KEY) {
    // Show modal on first visit
  } else {
    document.getElementById('modal-overlay').classList.add('hidden');
  }
  inputEl.focus();
};

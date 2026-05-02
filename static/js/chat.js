const messagesContainer = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

let conversationHistory = [];

// Configure marked.js options
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true
});

function appendMessage(role, content, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'bot' ? '🤖' : '👤';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    
    if (role === 'bot') {
        bubble.innerHTML = marked.parse(content);
        // Add copy button to code blocks
        bubble.querySelectorAll('pre').forEach(pre => {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-code-btn';
            copyBtn.innerHTML = '📋';
            copyBtn.onclick = () => copyToClipboard(pre.innerText);
            pre.appendChild(copyBtn);
        });
    } else {
        bubble.textContent = content;
    }

    if (isError) bubble.style.borderColor = '#ef4444';

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
    messagesContainer.appendChild(messageDiv);
    
    scrollToBottom();
    return messageDiv;
}

function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot';
    typingDiv.id = 'typing-indicator';
    
    typingDiv.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="bubble">
            <div class="typing">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(typingDiv);
    scrollToBottom();
}

function removeTyping() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text || sendBtn.disabled) return;

    appendMessage('user', text);
    conversationHistory.push({ role: 'user', content: text });

    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;
    showTyping();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: conversationHistory })
        });

        const data = await response.json();
        removeTyping();

        if (data.error) {
            appendMessage('bot', `⚠️ Error: ${data.error}`, true);
        } else {
            appendMessage('bot', data.reply);
            conversationHistory.push({ role: 'assistant', content: data.reply });
        }
    } catch (error) {
        removeTyping();
        appendMessage('bot', '❌ Connection error. Please check if the server is running.', true);
    } finally {
        sendBtn.disabled = false;
        userInput.focus();
    }
}

function clearChat() {
    if (confirm('هل تريد مسح المحادثة بالكامل؟')) {
        messagesContainer.innerHTML = '';
        conversationHistory = [];
        appendMessage('bot', 'تم مسح المحادثة. كيف يمكنني مساعدتك اليوم؟');
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('تم النسخ إلى الحافظة!');
    });
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Initial Welcome Message
window.onload = () => {
    appendMessage('bot', 'أهلاً بك! أنا **TechBot**، مساعدك التقني المحترف. كيف يمكنني مساعدتك اليوم؟');
};

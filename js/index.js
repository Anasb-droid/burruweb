const selectors = {
  navLinks: 'nav a',
  contactForm: '#contact-form',
  chatWidget: '.chat-widget'
};

const BACKEND_CANDIDATES = (() => {
  if (window.location.protocol === 'file:') {
    return ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
  }

  if (window.location.host.includes(':3000') || window.location.host.includes(':3001')) {
    return [''];
  }

  return ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];
})();

let resolvedBackendBaseUrl = null;

const getCurrentPage = () => window.location.pathname.split('/').pop() || 'home.html';

const highlightActiveLink = () => {
  const currentPath = getCurrentPage();
  document.querySelectorAll(selectors.navLinks).forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active-link');
    }
  });
};

const setupContactForm = () => {
  const form = document.querySelector(selectors.contactForm);
  if (!form) return;

  form.addEventListener('submit', event => {
    event.preventDefault();

    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const message = form.elements.message.value.trim();

    if (!name || !email || !message) {
      window.alert('Please complete all fields before sending your message.');
      return;
    }

    window.alert(`Thank you, ${name}! Your message has been received.`);
    form.reset();
  });
};

const buildBackendUrl = base => base ? `${base}/api/chat` : '/api/chat';

const fetchBackend = async (path, options) => {
  const errors = [];

  const bases = resolvedBackendBaseUrl ? [resolvedBackendBaseUrl] : BACKEND_CANDIDATES;
  for (const base of bases) {
    const url = base ? `${base}${path}` : path;

    try {
      const response = await fetch(url, options);
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json') || response.status === 503 || response.status === 400 || response.status === 401) {
        if (!resolvedBackendBaseUrl) {
          resolvedBackendBaseUrl = base;
        }
        return response;
      }

      if (response.status === 404 && contentType.includes('text/html')) {
        continue;
      }

      if (!contentType.includes('text/html')) {
        if (!resolvedBackendBaseUrl) {
          resolvedBackendBaseUrl = base;
        }
        return response;
      }
    } catch (error) {
      errors.push(error);
    }
  }

  const messages = errors.length > 0 ? errors.map(e => e.message).join(' | ') : 'No valid backend response.';
  throw new Error(`Unable to connect to a local backend: ${messages}`);
};

const postChatMessage = async (userText, messages) => {
  const response = await fetchBackend('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message = errorData?.error || response.statusText || 'Unable to fetch AI response.';
    throw new Error(message);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No response content received from AI.');
  }

  return content;
};

const setupChatWidget = () => {
  const widget = document.querySelector(selectors.chatWidget);
  if (!widget) return;
  const chatHistory = [
    {
      role: 'system',
      content: 'You are a helpful World War One museum assistant. Answer directly and clearly. Avoid repeated greetings and asking the user to choose again unless they ask a follow-up question. If the user asks for a story or everything, provide a single cohesive WWI story or overview. Keep responses grounded in uniforms, weaponry, battles, and historical context.'
    }
  ];

  const toggle = widget.querySelector('.chat-toggle');
  const panel = widget.querySelector('.chat-panel');
  const closeBtn = widget.querySelector('.chat-close');
  const form = widget.querySelector('.chat-form');
  const input = widget.querySelector('#chat-input');
  const body = widget.querySelector('.chat-body');

  const addMessage = (role, text) => {
    const element = document.createElement('div');
    element.className = `message ${role}`;
    element.innerHTML = `<p>${text}</p>`;
    body.appendChild(element);
    body.scrollTop = body.scrollHeight;
    return element;
  };

  toggle.addEventListener('click', () => {
    panel.classList.toggle('open');
    panel.setAttribute('aria-hidden', panel.classList.contains('open') ? 'false' : 'true');
    if (panel.classList.contains('open')) {
      input.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addMessage('user', text);
    chatHistory.push({ role: 'user', content: text });
    input.value = '';

    const typingMessage = addMessage('ai', 'AI is thinking...');

    try {
      const aiText = await postChatMessage(text, chatHistory);
      chatHistory.push({ role: 'assistant', content: aiText });
      typingMessage.querySelector('p').textContent = aiText;
    } catch (error) {
      typingMessage.querySelector('p').textContent = `Sorry, I could not reach the AI server right now. ${error.message}`;
      console.error('Chat error:', error);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel.classList.contains('open')) {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
    }
  });
};

const init = () => {
  highlightActiveLink();
  setupContactForm();
  setupChatWidget();
};

document.addEventListener('DOMContentLoaded', init);

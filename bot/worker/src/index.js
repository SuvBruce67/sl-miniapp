// Бот @straightlines_bot на Cloudflare Workers.
// Отвечает на /start приветствием с кнопками; на любое другое сообщение — короткой подсказкой с теми же кнопками.
// Токен бота хранится только в секрете Cloudflare (BOT_TOKEN) и в код не попадает.

const APP_URL = 'https://suvbruce67.github.io/sl-miniapp/';
const SITE_URL = 'https://www.sl-ls.ru';
const CONTACT_URL = 'https://t.me/straightlines';

const GREETING = [
  'Здравствуйте! Это Straight Lines — выкройки женской одежды прямого кроя.',
  '',
  'Все выкройки в pdf: для печати на А4 или плоттере, с описанием модели и подробной последовательностью пошива.',
  '',
  'Откройте каталог — выкройки разделены по уровню сложности, от новичка до эксперта.'
].join('\n');

const HINT = [
  'Каталог, услуги и ответы на частые вопросы — по кнопкам ниже.',
  '',
  'Если хотите что-то уточнить, напишите нам: @straightlines или info@sl-ls.ru'
].join('\n');

const KEYBOARD = {
  inline_keyboard: [
    [{ text: 'Открыть каталог', web_app: { url: APP_URL } }],
    [
      { text: 'Услуги', web_app: { url: APP_URL + '?tab=services' } },
      { text: 'Помощь', web_app: { url: APP_URL + '?tab=help' } }
    ],
    [
      { text: 'Сайт sl-ls.ru', url: SITE_URL },
      { text: 'Написать нам', url: CONTACT_URL }
    ]
  ]
};

const COMMANDS = [{ command: 'start', description: 'Главное меню' }];

async function tg(env, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

// Секрет для проверки, что запрос пришёл именно от Telegram: выводится из токена,
// поэтому отдельно его хранить не нужно.
async function webhookSecret(env) {
  const data = new TextEncoder().encode('sl-webhook:' + env.BOT_TOKEN);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return [...hash].slice(0, 24).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleUpdate(env, update) {
  const msg = update.message;
  if (!msg || !msg.chat || msg.chat.type !== 'private') return;
  const text = (msg.text || '').trim();
  const isStart = /^\/start(@\w+)?(\s|$)/.test(text);
  await tg(env, 'sendMessage', {
    chat_id: msg.chat.id,
    text: isStart ? GREETING : HINT,
    reply_markup: KEYBOARD,
    link_preview_options: { is_disabled: true }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!env.BOT_TOKEN) return new Response('BOT_TOKEN is not set', { status: 500 });

    // Входящие обновления от Telegram
    if (request.method === 'POST' && url.pathname === '/webhook') {
      if (request.headers.get('x-telegram-bot-api-secret-token') !== await webhookSecret(env)) {
        return new Response('forbidden', { status: 403 });
      }
      const update = await request.json().catch(() => null);
      if (update) {
        try { await handleUpdate(env, update); } catch (e) { console.error(e); }
      }
      return new Response('ok');
    }

    // Разовая настройка: привязывает вебхук к этому адресу и задаёт список команд.
    // Повторный вызов безопасен — он всегда ставит тот же адрес.
    if (request.method === 'GET' && url.pathname === '/init') {
      const webhook = await tg(env, 'setWebhook', {
        url: `${url.origin}/webhook`,
        secret_token: await webhookSecret(env),
        allowed_updates: ['message'],
        drop_pending_updates: true
      });
      const commands = await tg(env, 'setMyCommands', { commands: COMMANDS });
      const ok = webhook.ok && commands.ok;
      return new Response(
        ok ? 'Готово: бот подключён. Откройте его в Telegram и нажмите /start.'
           : 'Ошибка: ' + JSON.stringify({ webhook, commands }),
        { status: ok ? 200 : 500, headers: { 'content-type': 'text/plain; charset=utf-8' } }
      );
    }

    return new Response('Straight Lines bot', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
};

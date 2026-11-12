// Получаем заказ из фрагмента URL: браузер не отправляет его серверу хостинга.
(function () {
  'use strict';
  const recipient = 'info@sl-ls.ru';
  let data = {};
  try { data = JSON.parse(decodeURIComponent(location.hash.slice(1))); } catch (_) { /* письмо без заказа */ }
  const subject = typeof data?.subject === 'string' ? data.subject : '';
  const body = typeof data?.body === 'string' ? data.body.replace(/\r?\n/g, '\r\n') : '';
  const query = new URLSearchParams({ subject, body });
  const mailto = 'mailto:' + recipient + '?' + query.toString();
  // mailto трактует знак «+» буквально, поэтому пробелы кодируем через %20.
  document.getElementById('compose').href = mailto.replace(/\+/g, '%20');
  document.getElementById('subject').textContent = subject;
  document.getElementById('body').value = body;
  const webmail = (id, base, fields) => {
    const url = new URL(base);
    for (const [key, value] of Object.entries(fields)) url.searchParams.set(key, value);
    document.getElementById(id).href = url.href;
  };
  webmail('gmail', 'https://mail.google.com/mail/', { view: 'cm', fs: '1', to: recipient, su: subject, body });
  webmail('yandex', 'https://mail.yandex.ru/compose', { to: recipient, subj: subject, body });
  webmail('outlook', 'https://outlook.live.com/mail/0/deeplink/compose', { to: recipient, subject, body });
  // Внешний браузер может запросить подтверждение открытия почтовой программы.
  // Если автопереход запрещён, выше остаётся настоящая ссылка для явного нажатия.
  location.href = document.getElementById('compose').href;
})();

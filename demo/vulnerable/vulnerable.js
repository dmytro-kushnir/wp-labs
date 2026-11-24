// НАВЧАЛЬНИЙ ПРИКЛАД ВРАЗЛИВОСТІ (практичне завдання № 5, крок 7). Не копіюйте цей код у застосунок.
// Дві вразливості міжсайтового скриптингу (XSS):
//   1) DOM-based XSS: параметр адреси ?name= вставляється в сторінку через innerHTML;
//   2) збережений XSS: відгуки зберігаються в localStorage і показуються через innerHTML.
// Завдання: відтворити атаку на сторінці без CSP (npm run demo:xss), переконатися, що CSP її блокує
// (npm run demo:xss:csp), і виправити код так, щоб дані показувалися як текст.

const KEY = 'wp-demo-reviews';
const greeting = document.querySelector('#greeting');
const list = document.querySelector('#reviews');
const form = document.querySelector('#review-form');

// Вразливість 1: значення з адреси сторінки потрапляє в розмітку без екранування.
const name = new URLSearchParams(location.search).get('name') ?? 'гостю';
greeting.innerHTML = `Вітаємо, ${name}!`;

const load = () => JSON.parse(localStorage.getItem(KEY) ?? '[]');

function render() {
  // Вразливість 2: рядки, введені користувачем, склеюються в HTML.
  list.innerHTML = load().map((r) => `<li class="card"><h2 class="card-title">${r.name}</h2><p>${r.text}</p></li>`).join('');
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  localStorage.setItem(KEY, JSON.stringify([...load(), { name: data.get('name'), text: data.get('text') }]));
  form.reset();
  render();
});
document.querySelector('#clear-btn').addEventListener('click', () => { localStorage.removeItem(KEY); render(); });

render();

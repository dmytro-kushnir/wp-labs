# wp-labs

Програмне забезпечення до навчального посібника **«Веб-програмування. Теорія та практика розроблення вебзастосунків»**
(Д. О. Кушнір, НУ «Львівська політехніка», кафедра ЕОМ) для студентів спеціальності F7 «Комп’ютерна інженерія».

Шість практичних завдань (ПЗ) – послідовні етапи одного вебзастосунку-каталогу для предметної області студента.
Тексти програм, надруковані в Додатку Б посібника, відповідають тегу `posibnyk-2027`.

| ПЗ | Етап | Стан |
|---|---|---|
| 1 | Модуль предметної області мовою JavaScript з автоматизованими тестами | готово |
| 2 | Інтерфейс каталогу: DOM, події, форми, `localStorage` | готово |
| 3 | Асинхронний HTTP-клієнт: Fetch API, тайм-аути, скасування, mock-сервер | готово |
| 4 | REST API з базою даних за контрактом OpenAPI (Express + TypeScript, SQLite, контрактні тести) | готово |
| 5 | Автентифікація, авторизація та захист API; ключ пристрою IoT, Wokwi | готово |
| 6 | Клієнт на React (Vite, React Router), Docker і docker compose, безперервна інтеграція | готово |

## Структура

```
app/                  ваш застосунок – працюєте лише тут (README.md у цьому каталозі – чекліст і звіт)
demo/                 зразок «Бібліотека»: приклади з посібника, читайте, але не копіюйте без адаптації
tools/                сервер сторінок, mock-сервер API, генератор варіанту, контрактні тести, імітатор пристрою
Dockerfile, compose.yaml, docker/   контейнери сервера API і вебсервера Nginx (ПЗ 6)
contract/             openapi.yaml – контракт API; postman/ – контрактні тести (колекція генерується build-collection.mjs)
tests/                тести інструментів курсу
wokwi/iot-node/       приклад вузла IoT для симулятора Wokwi (ESP32, DHT22, MicroPython)
```

## Початок роботи (студенту)

Потрібні **Node.js 24 LTS** (мінімум 22.18, https://nodejs.org/uk/download), **Git** і акаунт **GitHub**.

1. Завантажте репозиторій: кнопка **Code → Download ZIP** на GitHub (або `git clone`) і розпакуйте.
2. Створіть на GitHub **порожній** репозиторій (без README і ліцензії), наприклад `wp-catalog`.
3. У розпакованому каталозі виконайте:
   ```
   git init
   git add .
   git commit -m "Початок роботи"
   git branch -M main
   git remote add origin https://github.com/<ваш-логін>/wp-catalog.git
   git push -u origin main
   ```
4. Встановіть залежності і визначте свій варіант (номер у журналі і прізвище латиницею):
   ```
   npm install
   node tools/variant.mjs PETRENKO --number 7 --write
   npm test
   ```
5. Далі – за посібником, у каталозі `app/`. Після кожного `git push` на GitHub (вкладка **Actions**) запускаються тести.

Усі команди виконуються з кореня репозиторію:

| Команда | Що робить |
|---|---|
| `npm test` | тести вашого застосунку (`app/`) |
| `npm run dev` | сторінка `app/`: http://localhost:5180 |
| `npm run mock` | mock-сервер API: http://localhost:3000/api/items |
| `npm run mock -- --fail-rate 0.3 --delay 1000` | mock-сервер з імітацією збоїв (30 %) і затримкою 1 с (типово 300 мс) |
| `npm run typecheck` | перевірка типів (з ПЗ 3) |
| `npm run server` | власний сервер API `app/server` (ПЗ 4): http://localhost:3000/api/items, документація /docs |
| `npm run contract` | контрактні тести власного сервера (ПЗ 4); `npm run contract -- --mock` – перевірка `app/fixtures.json` на mock-сервері; `npm run contract -- --auth` – з перевірками входу і ролей (ПЗ 5) |
| `node tools/device.mjs --simulate 5 --key wp_…` | імітатор пристрою IoT (ПЗ 5); `--replay лог.txt` – показники з логу Serial Monitor Wokwi (каталог `wokwi/`) |
| `npm run client`, `npm run build` | клієнт React `app/client` (ПЗ 6): http://localhost:5185, збирання в `app/client/dist` |
| `docker compose up --build` | застосунок у контейнерах (ПЗ 6): http://localhost:8080; секрети – у `.env` (зразок `.env.example`) |
| `npm run demo:client`, `APP=demo docker compose -p wp-demo up --build` | клієнт React і контейнери демонстраційного застосунку |
| `npm run demo:xss`, `npm run demo:xss:csp` | навчальна сторінка з вразливістю XSS без CSP (порт 5182) і з CSP (порт 5183) |
| `npm run demo:dev`, `npm run demo:mock`, `npm run demo:server` | зразок «Бібліотека»: сторінка http://localhost:5181, API (mock або сервер ПЗ 4) на порту 3001 |

Сторінка з даними на сервері: http://localhost:5180/?api=http://localhost:3000

Сервери слухають лише ваш комп’ютер (127.0.0.1): інші пристрої в тій самій мережі до них не під’єднаються.

### Оновлення матеріалів курсу

Якщо викладач оголосив оновлення, завантажте свіжий ZIP і замініть у своєму репозиторії каталоги `tools/`, `contract/`
і `demo/`. Каталог `app/` не замінюйте – там ваша робота.

## Для викладача

```
node tools/variant.mjs PETRENKO --number 7   # варіант студента
node tools/variant.mjs --list group.txt      # таблиця на групу: у файлі рядки «номер ПРІЗВИЩЕ»
npm run check                                # тести інструментів і демо, перевірка типів
```

Номери ISBN у демонстраційних даних умовні (мають правильну контрольну цифру, але не відповідають реальним виданням).

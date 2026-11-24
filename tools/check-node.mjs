#!/usr/bin/env node
// Перевірка версії Node.js перед запуском тестів: на старій версії тести падають із незрозумілими
// помилками на зразок «Object.groupBy is not a function», тому краще одразу пояснити причину.
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 18)) {
  console.error(`Потрібен Node.js 22.18 або новіший (рекомендовано 24 LTS), встановлено ${process.versions.node}.`);
  console.error('Завантаження: https://nodejs.org/uk/download');
  process.exit(1);
}

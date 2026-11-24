// Розбір параметрів командного рядка з повідомленнями українською (замість англомовних помилок parseArgs).
import { parseArgs } from 'node:util';

export function parseCli(config, example) {
  try {
    return parseArgs(config);
  } catch (error) {
    const option = String(error.message).match(/'(-{1,2}[\w-]+)/)?.[1];
    if (error.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') console.error(`Невідомий параметр ${option ?? ''}.`);
    else if (error.code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE') console.error(`Параметр ${option ?? ''} потребує значення.`);
    else console.error(`Помилка параметрів: ${error.message}`);
    console.error(`Приклад: ${example}`);
    process.exit(1);
  }
}

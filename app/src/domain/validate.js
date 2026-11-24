// ПЗ 1. Перевірка даних сутності. Функція чиста: не звертається до DOM, мережі чи поточного часу без параметра.
// Ту саму функцію використовуватимуть форма (ПЗ 2) і HTTP-клієнт (ПЗ 3).

/**
 * @param {object} data - дані запису
 * @param {{ existing?: object[] }} [context] - інші записи каталогу (для правил № 1 і № 8)
 * @returns {{ field: string, message: string }[]} список помилок; порожній - дані коректні
 */
export function validateItem(data, { existing = [] } = {}) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  const { title } = data ?? {};

  if (typeof title !== 'string' || title.trim() === '') add('title', 'Вкажіть назву');

  // TODO: перевірки для кожного поля entity.json (тип, обов’язковість, межі, формат)
  // TODO: індивідуальне правило з variant.json. Правила № 1 і № 8 залежать від інших записів –
  //       передавайте їх другим параметром: validateItem(data, { existing: [...] })

  return errors;
}

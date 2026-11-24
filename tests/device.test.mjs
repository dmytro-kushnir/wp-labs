import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLog } from '../tools/device.mjs';
import { validateInput } from '../tools/mock-server.mjs';

test('parseLog: лише рядки з JSON, службові повідомлення пропускаються', () => {
  const records = parseLog(readFileSync(new URL('../wokwi/iot-node/sample-log.txt', import.meta.url), 'utf8'));
  assert.equal(records.length, 3);
  assert.deepEqual(records.map((r) => r.quantity), ['temperature', 'humidity', 'temperature']);
  assert.deepEqual(parseLog('I (120) boot: ESP32\r\n> {"a": 1}\r\n{broken'), [{ a: 1 }]);
});

test('приклад Wokwi відповідає опису сутності entity.example.json', () => {
  const entity = JSON.parse(readFileSync(new URL('../wokwi/iot-node/entity.example.json', import.meta.url), 'utf8'));
  for (const r of parseLog(readFileSync(new URL('../wokwi/iot-node/sample-log.txt', import.meta.url), 'utf8'))) {
    assert.deepEqual(validateInput(entity, r), [], r.title);
  }
});

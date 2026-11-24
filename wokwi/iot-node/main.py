# Вузол IoT для курсу «Веб-програмування» (ПЗ 5, IoT-варіант проєктного треку) – симулятор Wokwi, MicroPython.
# Давач DHT22 на виводі 15. Кожні INTERVAL_MS мілісекунд у Serial Monitor виводиться один рядок JSON –
# тіло запиту POST /api/items для сервера студента. Лог Serial Monitor зберігають у файл і надсилають на сервер:
#   node tools/device.mjs --replay wokwi-log.txt --key wp_…
# Поля JSON мають збігатися з описом сутності вашого проєкту (тут – приклад entity.example.json).
import json
import time

import dht
from machine import Pin

DEVICE = "esp32-wokwi-1"
INTERVAL_MS = 2000
sensor = dht.DHT22(Pin(15))

print("WP IoT node:", DEVICE)
n = 0
while True:
    try:
        sensor.measure()
        n += 1
        for quantity, value in (("temperature", sensor.temperature()), ("humidity", sensor.humidity())):
            print(json.dumps({
                "title": "{} #{} {}".format(DEVICE, n, quantity),
                "device": DEVICE,
                "quantity": quantity,
                "value": round(value, 1),
                "normal": 18 <= value <= 26 if quantity == "temperature" else 30 <= value <= 60,
            }))
    except OSError as e:
        print("ERR:", e)            # рядок без JSON – device.mjs його пропустить
    time.sleep_ms(INTERVAL_MS)

# Задача 1

Очередь сообщений реализована с помощью Streams, требуется Redis версии 5.

Для определения роли генератор/обработчик каждый инстанс приложения выполняет
команду `SET producer instanceId PX 1000 NX` каждые 500 мс, а генератор при отправке
сообщения выполняет `PEXPIRE producer 1000`. Если генератор падает, обработчик,
который первым успел записать свой идентификатор в ключ `producer`, становится генератором.

В условии задачи не было сказано, что обработчик тоже может упасть.
В моем решении предусмотрен этот вариант — если сообщения были
получены обработчиком, но не были обработаны в течение секунды,
команда `node app.js getErrors` выведет их тоже.

Вероятность ошибки 5% определяется с помощью функции `Math.random` и не зависит от содержимого сообщения.
Я пробовал использовать данные сообщения, но не смог найти подходящего решения.

## Запуск в консоли

```bash
redis-cli XGROUP CREATE messages consumers $ MKSTREAM
npm install
node app.js
```

Можно указать настройки Redis с помощью переменной окружения `REDIS_URL`.

```bash
REDIS_URL=redis://user:password@host:port node app.js
```

## Запуск в Docker

```bash
docker-compose up -d redis
docker-compose exec redis redis-cli XGROUP CREATE messages consumers $ MKSTREAM
docker-compose up --build -d --scale app=10
docker-compose logs -f app
```

В логах будет видно, что одно приложение отправляет сообщения, остальные принимают.
В моем случае генератор — это `app_3`.

Для его остановки нужно выполнить:

```
docker stop task1_app_3
```

## Вывод ошибок

```bash
docker-compose exec app node app.js getErrors
```

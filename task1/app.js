const { randomBytes } = require('crypto');
const Redis = require('ioredis');
const chalk = require('chalk');


const MODES = ['terminating', 'producing', 'consuming'];

const TERMINATING = 0;
const PRODUCING = 1;
const CONSUMING = 2;

const instanceId = randomBytes(5).toString('hex');
const redisClient = new Redis(process.env.REDIS_URL);

let mode;


function setMode(newMode) {
  if (mode !== TERMINATING && newMode !== mode) {
    mode = newMode;
    console.log(`Running instance ${chalk.bold(instanceId)} in ${chalk.bold(MODES[mode])} mode`);
  }
}

async function detectMode() {
  redisClient.multi().set('producer', instanceId, 'PX', 1000, 'NX').get('producer').exec((error, results) => {
    const [, [, producerId]] = results;
    setMode(producerId === instanceId ? PRODUCING : CONSUMING);
  });
}

async function runModeDetector() {
  return new Promise((resolve) => {
    let modeDetector = setInterval(async () => {
      await detectMode();

      if (mode === TERMINATING) {
        clearInterval(modeDetector);
        resolve();
      }
    }, 500);
  });
}

async function produce() {
  const data = randomBytes(24).toString('hex');

  await redisClient.multi().xadd('messages', '*', 'message', data).pexpire('producer', 1000).exec((error, results) => {
    const [[, messageId]] = results;
    console.log(`Instance ${chalk.bold(instanceId)} sent message ${chalk.bold(messageId)}`);
  });
}

async function runProducer() {
  return new Promise((resolve) => {
    let producer = setInterval(async () => {
      if (mode === PRODUCING) {
        await produce();
      }

      if (mode === TERMINATING) {
        clearInterval(producer);
        resolve();
      }
    }, 500);
  });
}

async function consume() {
  await redisClient.xreadgroup('GROUP', 'consumers', instanceId, 'COUNT', 1, 'STREAMS', 'messages', '>').then(async (stream) => {
    if (stream) {
      const [[, [[messageId, [, data]]]]] = stream;
      const hasError = Math.random() <= 0.05;
      let color;

      if (hasError) {
        color = chalk.red;
      } else {
        color = chalk.green;
        await redisClient.multi().xack('messages', 'consumers', messageId).xdel('messages', messageId).exec();
      }

      console.log(`Instance ${chalk.bold(instanceId)} got message ${chalk.bold(messageId)} with data ${color.bold(data)}`);
    }
  });
}

async function runConsumer() {
  return new Promise((resolve) => {
    let consumer = setInterval(async () => {
      if (mode === CONSUMING) {
        await consume();
      }

      if (mode === TERMINATING) {
        clearInterval(consumer);
        resolve();
      }
    }, 500);
  })
}

async function shutdown() {
  mode = TERMINATING;
}

async function handleError(messageId) {
  await redisClient.xread('COUNT', 1, 'STREAMS', 'messages', messageId).then(async (stream) => {
    if (stream) {
      const [[, message]] = stream;

      if (message.length) {
        const [[, [, data]]] = message;

        await redisClient.xack('messages', 'consumers', messageId).then(() => {
          return redisClient.xdel('messages', messageId);
        }).then(() => {
          console.log(`Message ${chalk.bold(messageId)} with data ${chalk.bold(data)} deleted`);
        });
      }
    }
  });
}

async function handleErrors() {
  let hasMessages = true;

  return new Promise(async (resolve) => {
    while (hasMessages) {
      await redisClient.xpending('messages', 'consumers', '-', '+', 1).then(async (message) => {
        if (message.length) {
          const [[messageId,, pendingTime]] = message;
    
          if (pendingTime > 1000) {
            await handleError(messageId);
          }
        } else {
          hasMessages = false;
          resolve();
        }
      });
    }
  });
}

if (process.argv[2] === 'getErrors') {
  handleErrors().then(() => redisClient.end());
} else {
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  Promise.all([runModeDetector(), runProducer(), runConsumer()]).then(() => {
    redisClient.end();
    console.log(`Instance ${chalk.bold(instanceId)} stopped`);
  });
}

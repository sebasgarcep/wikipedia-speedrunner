const path = require('path');
const { fork } = require('child_process');
const startDatabase = require('./startDatabase');

async function startScraper({ seed, numWorkers, maxIters, dbPath, batchSize }) {
  // Database initialization
  const database = await startDatabase({ dbPath, batchSize });
  await database.pushQueue([seed]);

  // Worker initialization
  let iter = 0;
  let workerPool = [];

  const WORKER_PATH = path.join(__dirname, 'worker.js');
  async function initWorker() {
    if (workerPool.length >= numWorkers || (maxIters && iter >= maxIters)) { return false; }
    const target = await database.popQueue();
    if (target.length === 0) { return false; }
    const names = target.map(item => item.name);
    const worker = fork(WORKER_PATH, names);
    worker.on('message', async (message) => {
      const { type, data } = message;
      if (type === 'update') {
        const { name, links } = data;
        if (links.length > 0) {
          await database.createMappings(name, links);
          await database.pushQueue(links);
          startWorkers();
        }
      } else if (type === 'error') {
        console.log('Error:', data.name, data.error);
      }
    });
    worker.on('exit', (code) => {
      if (code !== 0) { console.log('Worker failed!'); } else { startWorkers(worker); }
    });
    workerPool.push(worker);
    return true;
  }

  async function startWorkers(deletableWorker) {
    if (deletableWorker) { workerPool = workerPool.filter(item => item !== deletableWorker); }
    while (await initWorker()) { iter += 1; }
  }

  startWorkers();
}

module.exports = startScraper;

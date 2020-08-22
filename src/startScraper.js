const path = require('path');
const { fork } = require('child_process');
const startDatabase = require('./startDatabase');

async function startScraper({ seed, numWorkers, maxIters, dbPath, batchSize }) {
  // Database initialization
  const database = await startDatabase({ dbPath, batchSize });
  await database.pushQueue([seed]);

  // Static variables
  let iter = 0;
  let workerPool = [];

  function initWorker(target) {
    // Start worker
    const names = target.map(item => item.name);
    const workerPath = path.join(__dirname, 'worker.js');
    const worker = fork(workerPath, names);

    // Define worker event handlers
    worker.on('message', async (message) => {
      const { type, data } = message;
      if (type === 'update') {
        const { name, links } = data;
        if (links.length > 0) {
          console.log(name, links.length);
          await database.createMappings(name, links);
          await database.pushQueue(links);
          startWorkers();
        }
      } else if (type === 'error') {
        console.log('Error:', data.name, data.error);
      }
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.log('Worker failed!');
      } else {
        deleteWorker(worker);
        startWorkers();
      }
    });

    // Return worker
    return worker;
  }

  function deleteWorker(worker) {
    workerPool = workerPool.filter(item => item !== worker);
  }

  async function startWorkers() {
    while (workerPool.length < numWorkers && (!maxIters || iter < maxIters)) {
      const target = await database.popQueue();
      if (target.length === 0) { return; }
      const worker = initWorker(target);
      workerPool.push(worker);
      iter += 1;
    }
  }

  startWorkers();
}

module.exports = startScraper;

const startScraper = require('../src/startScraper');
const settings = require('../settings');

startScraper({
  seed: settings.seed,
  numWorkers: settings.numWorkers,
  maxIters: settings.maxIters,
  dbPath: settings.dbPath,
  batchSize: settings.batchSize,
});

const startScraper = require('./startScraper');
const path = require('path');

startScraper({
  seed: 'Neal_Cassady',
  numWorkers: 8,
  maxIters: null,
  dbPath:path.join(__dirname, '..', 'data', 'wikipedia.db'),
  batchSize: 100,
});

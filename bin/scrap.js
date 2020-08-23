const startScraper = require('../src/startScraper');
const path = require('path');

startScraper({
  seed: 'Neal_Cassady',
  numWorkers: 8,
  maxIters: 1000,
  dbPath: path.join(__dirname, '..', 'data', 'wikipedia.db'),
  batchSize: 100,
});

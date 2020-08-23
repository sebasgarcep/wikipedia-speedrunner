const startDatabase = require('../src/startDatabase');
const path = require('path');

function randomPick(array) {
  const pos = Math.floor(Math.random() * array.length);
  return array[pos];
}

async function main() {
  const database = await startDatabase({
    dbPath: path.join(__dirname, '..', 'data', 'wikipedia.db'),
    batchSize: 100,
  });
  const articles = await database.getReadyArticles();
  let pointer = randomPick(articles);
  while (true) {
    console.log(pointer);
    const mappings = await database.getMappings(pointer);
    if (mappings.length === 0) {
      break;
    }
    pointer = randomPick(mappings);
  }
}

main();

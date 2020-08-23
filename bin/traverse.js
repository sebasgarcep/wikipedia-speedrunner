const startDatabase = require('../src/startDatabase');
const settings = require('../settings');

function randomPick(array) {
  const pos = Math.floor(Math.random() * array.length);
  return array[pos];
}

async function main() {
  const database = await startDatabase({
    dbPath: settings.dbPath,
    batchSize: settings.batchSize,
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

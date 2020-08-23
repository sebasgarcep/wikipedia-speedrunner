const startDatabase = require('../src/startDatabase');
const PriorityQueue = require('../src/PriorityQueue');
const settings = require('../settings');

async function main() {
  const database = await startDatabase({
    dbPath: settings.dbPath,
    batchSize: settings.batchSize,
  });
  const graph = await database.getGraph();

  const source = settings.source;
  const target = settings.target;

  const queue = new PriorityQueue({ min: true });
  const dist = {};
  const prev = {};

  dist[source] = 0;
  queue.insert(source, 0);

  while (!queue.isEmpty()) {
    const current = queue.pop();
    const neighborCollection = graph[current] || [];
    for (const neighbor of neighborCollection) {
      if (queue.get(neighbor) === undefined && dist[neighbor] !== undefined) { continue; }
      const alt = dist[current] + 1;
      if (dist[neighbor] === undefined) {
        dist[neighbor] = alt;
        prev[neighbor] = current;
        queue.insert(neighbor, alt);
      } else if (alt < dist[neighbor]) {
        dist[neighbor] = alt;
        prev[neighbor] = current;
        queue.setPriority(neighbor, alt);
      }
    }
  }

  let current = target;
  while (current !== undefined && current !== source) {
    console.log(current);
    current = prev[current];
  }
  console.log(current);
}

main();

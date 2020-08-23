const startDatabase = require('../src/startDatabase');
const path = require('path');
const PriorityQueue = require('../src/PriorityQueue');

async function main() {
  const database = await startDatabase({
    dbPath: path.join(__dirname, '..', 'data', 'wikipedia.db'),
    batchSize: 100,
  });
  const graph = await database.getGraph();

  const start = 'Off_the_Road';
  const end = 'Cortlandt,_New_York';

  const queue = new PriorityQueue({ min: true });
  const dist = {};
  const prev = {};

  dist[start] = 0;
  queue.insert(start, 0);

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

  let current = end;
  while (current !== start) {
    console.log(current);
    current = prev[current];
  }
  console.log(current);
}

main();

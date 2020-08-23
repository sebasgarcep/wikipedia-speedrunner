const chunk = require('lodash.chunk');
const sqlite = require('sqlite3');

function getDatabase(dbPath) {
  return new Promise((resolve, reject) => {
    const dbobj = new sqlite.Database(dbPath, (error) => {
      if (error) { reject(error); } else { resolve(dbobj); }
    });
  });
}

function runQuery(database, query, params = []) {
  return new Promise((resolve, reject) => {
    database.run(query, params, (error) => {
      if (error) { reject(error); } else { resolve(); }
    })
  });
}

function getQuery(database, query, params = []) {
  return new Promise((resolve, reject) => {
    database.all(query, params, (error, result) => {
      if (error) { reject(error); } else { resolve(result); }
    })
  });
}

function execQuery(database, query, params = []) {
  return new Promise((resolve, reject) => {
    database.exec(query, (error) => {
      if (error) { reject(error); } else { resolve(); }
    });
  });
}

async function startDatabase({ dbPath, batchSize }) {
  // Get database object
  const database = await getDatabase(dbPath);

  // Initialize database
  await runQuery(database, `
    CREATE TABLE IF NOT EXISTS articles (
      name VARCHAR(300) PRIMARY KEY,
      state TINYINT NOT NULL -- possible states: 0 = Queued, 1 = Working, 2 = Ready
    );
  `);
  await runQuery(database, `
    CREATE TABLE IF NOT EXISTS mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_name VARCHAR(300) NOT NULL,
      target_name VARCHAR(300) NOT NULL
    );
  `);
  await runQuery(database, 'CREATE INDEX IF NOT EXISTS idx_mappings_source_name ON mappings(source_name)');

  // Reset database
  await runQuery(database, `
    UPDATE articles
    SET state = 0
    WHERE state = 1;
  `);

  // Database wrapper lock
  let lock = Promise.resolve();
  function withLock(fn) {
    return function(...args) {
      const newlock = lock.then(() => new Promise(async (resolve, reject) => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          console.log('Database Error:', error);
          reject(error);
        }
      }));
      lock = newlock.catch(() => {});
      return newlock;
    }
  }

  // Define wrapper methods
  const CHUNK_SIZE = 50;

  async function pushQueue(names) {
    return execQuery(database, `
      BEGIN TRANSACTION;
      ${names.map(item => `INSERT OR IGNORE INTO articles (name, state) VALUES ('${item}', 0);`).join('\n')}
      COMMIT TRANSACTION;
    `);
  }

  async function popQueue() {
    const target = await getQuery(database, 'SELECT name FROM articles WHERE state = 0 LIMIT ?', [batchSize]);
    for (const batch of chunk(target, CHUNK_SIZE)) {
      await runQuery(database, `UPDATE articles SET state = 1 WHERE name IN (${batch.map(() => '?').join(',')})`, batch.map(item => item.name));
    }
    return target;
  }

  async function createMappings(articleName, linkNames) {
    await execQuery(database, `
      BEGIN TRANSACTION;
      DELETE FROM mappings WHERE source_name = '${articleName}';
      ${linkNames.map(item => `INSERT INTO mappings (source_name, target_name) VALUES ('${articleName}', '${item}');`).join('\n')}
      UPDATE articles SET state = 2 WHERE name = '${articleName}';
      COMMIT TRANSACTION;
    `);

    await pushQueue(linkNames);
  }

  async function getReadyArticles() {
    const data = await getQuery(database, 'SELECT name FROM articles WHERE state = 2');
    const articles = data.map(item => item.name);
    return articles;
  }

  async function getMappings(name) {
    const data = await getQuery(database, 'SELECT target_name FROM mappings WHERE source_name = ?', [name]);
    const mappings = data.map(item => item.target_name);
    return mappings;
  }

  async function getGraph() {
    const data = await getQuery(database, 'SELECT source_name, target_name FROM mappings');
    const graph = {};
    for (const { source_name: sourceName, target_name: targetName } of data) {
      if (!graph[sourceName]) { graph[sourceName] = []; }
      graph[sourceName].push(targetName);
    }
    return graph;
  }

  // Return wrapper object
  return {
    pushQueue,
    popQueue: withLock(popQueue),
    createMappings,
    getReadyArticles,
    getMappings,
    getGraph,
  };
}

module.exports = startDatabase;

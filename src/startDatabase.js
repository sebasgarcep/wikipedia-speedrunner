const chunk = require('lodash.chunk');
const unique = require('lodash.uniq');
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

async function startDatabase({ dbPath, batchSize }) {
  // Get database object
  const database = await getDatabase(dbPath);

  // Initialize database
  await runQuery(database, `
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(300) NOT NULL,
      state TINYINT NOT NULL -- possible states: 0 = Queued, 1 = Working, 2 = Ready
    );
  `);
  await runQuery(database, 'CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_name ON articles(name)');
  await runQuery(database, 'CREATE INDEX IF NOT EXISTS idx_articles_state ON articles(state)');

  await runQuery(database, `
    CREATE TABLE IF NOT EXISTS mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      FOREIGN KEY(source_id) REFERENCES articles(id),
      FOREIGN KEY(target_id) REFERENCES articles(id)
    );
  `);
  await runQuery(database, 'CREATE INDEX IF NOT EXISTS idx_mappings_source_id ON mappings(source_id)');

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

  async function getIdFromNames(names) {
    names = unique(names);
    const ids = [];
    for (const batch of chunk(names, CHUNK_SIZE)) {
      const idBatch = await getQuery(database, `SELECT id, name FROM articles WHERE name IN (${batch.map(() => '?').join(',')})`, batch);
      ids.push(...idBatch);
    }
    const idList = ids.map(item => item.id);
    if (ids.length === names.length) { return idList; }
    const nameList = ids.map(item => item.name);
    const missingNames = unique(names.filter(item => !nameList.includes(item)));
    if (missingNames.length === 0) { return idList; }
    for (const batch of chunk(missingNames, CHUNK_SIZE)) {
      await runQuery(database, `
        INSERT INTO articles (name, state)
        ${batch.map(() => 'SELECT ? AS name, 0 AS state').join(' UNION ALL ')}
      `, batch);
    }
    const missing = [];
    for (const batch of chunk(missingNames, CHUNK_SIZE)) {
      const missingBatch = await getQuery(database, `SELECT id, name FROM articles WHERE name IN (${batch.map(() => '?').join(',')})`, batch);
      missing.push(...missingBatch);
    }
    idList.push(...missing.map(item => item.id));
    return idList;
  }

  async function pushQueue(names) {
    const ids = await getIdFromNames(names);
    return ids;
  }

  async function popQueue() {
    const target = await getQuery(database, 'SELECT id, name FROM articles WHERE state = 0 LIMIT ?', [batchSize]);
    for (const batch of chunk(target, CHUNK_SIZE)) {
      await runQuery(database, `UPDATE articles SET state = 1 WHERE id IN (${batch.map(() => '?').join(',')})`, batch.map(item => item.id));
    }
    return target;
  }

  async function createMappings(articleName, linkNames) {
    if (linkNames.lengh === 0) { return; }
    const [[articleId], linkIds] = await Promise.all([getIdFromNames([articleName]), getIdFromNames(linkNames)]);
    await runQuery(database, 'DELETE FROM mappings WHERE source_id = ?', [articleId]);

    for (const batch of chunk(linkIds, Math.floor(CHUNK_SIZE / 2))) {
      const params = [];
      for (const linkId of batch) {
        params.push(articleId);
        params.push(linkId);
      }
      await runQuery(database, `
        INSERT INTO mappings (source_id, target_id)
        ${batch.map(() => 'SELECT ? AS source_id, ? AS target_id').join(' UNION ALL ')};
      `, params);
    }
    await runQuery(database, 'UPDATE articles SET state = 2 WHERE id = ?', [articleId]);
  }

  // Return wrapper object
  return {
    pushQueue: withLock(pushQueue),
    popQueue: withLock(popQueue),
    createMappings: withLock(createMappings),
  };
}

module.exports = startDatabase;

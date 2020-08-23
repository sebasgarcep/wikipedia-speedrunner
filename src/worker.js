const bent = require('bent');
const unique = require('lodash.uniq');

const getString = bent('string');

const names = process.argv.slice(2);

async function getLinks(articleId) {
  const data = await getString(`https://en.wikipedia.org/wiki/${articleId}`);
  const links = unique(
    data.match(/href="[^"]*"/g) // Find all instances of href="..."
      .filter(item => item.startsWith('href="/wiki/') && item.indexOf(':') === -1) // Return only links for other articles
      .map(item => item.slice(12, item.length - 1)) // Remove href="/wiki/..." wrapper around link
      .filter(item => item !== 'Main_Page' && item !== articleId) // Remove links to main page and to same article
  );
  return links;
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

async function main() {
  for (const name of names) {
    try {
      const links = await getLinks(name);
      await wait(50);
      process.send({ type: 'update', data: { name, links } });
    } catch (error) {
      process.send({ type: 'error', data: { name, error } });
    }
  }
}

main();

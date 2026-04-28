const s = require('./scripts/update-article.js');
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./scripts/tmp-update.json', 'utf8'));

s.updateArticle('chanukah-foods-and-games', data).then(r => {
  console.log('Result:', JSON.stringify(r));
}).catch(e => console.log('Error:', e.message));

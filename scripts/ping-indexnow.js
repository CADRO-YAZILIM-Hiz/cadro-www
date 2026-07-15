// IndexNow ping script
// Run after deployment: node scripts/ping-indexnow.js
// This notifies Bing and other search engines about content changes

const https = require('https');

const INDEXNOW_KEY = '1885ddee924027b07cca32248633b63c';
const BASE_URL = 'https://www.cadro.io';
const HOST = 'api.indexnow.org';
const PATH = '/indexnow';

const urlList = [
  `${BASE_URL}/`,
  `${BASE_URL}/ik-yazilimi.html`,
  `${BASE_URL}/pricing.html`,
  `${BASE_URL}/blog.html`,
  `${BASE_URL}/en/`,
  `${BASE_URL}/de/`,
  `${BASE_URL}/ar/`,
];

const payload = JSON.stringify({
  host: 'www.cadro.io',
  key: INDEXNOW_KEY,
  keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
  urlList,
});

const req = https.request(
  { hostname: HOST, path: PATH, method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(payload) } },
  (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      console.log(`IndexNow response: ${res.statusCode} ${body}`);
      if (res.statusCode === 200) console.log('URLs submitted successfully');
    });
  }
);
req.on('error', (err) => console.error('IndexNow error:', err.message));
req.write(payload);
req.end();

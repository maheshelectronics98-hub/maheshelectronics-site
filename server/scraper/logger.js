'use strict';
const path = require('path');
const fs = require('fs');
const pino = require('pino');

const LOG_DIR = path.join(__dirname, '..', 'logs');
fs.mkdirSync(LOG_DIR, { recursive: true });

function makeLogger(runId) {
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(LOG_DIR, `scrape-${date}${runId ? '-' + runId : ''}.json`);
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      targets: [
        { target: 'pino-pretty', level: 'info', options: { colorize: true } },
        { target: 'pino/file',   level: 'debug', options: { destination: file, mkdir: true } }
      ]
    }
  });
}

module.exports = { makeLogger };

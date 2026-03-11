import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

let currentState = 'IDLE';
let executionQueue = [];

app.get('/api/state', (req, res) => {
  res.json({ state: currentState });
});

app.post('/api/trigger', async (req, res) => {
  if (currentState === 'RUNNING') {
    executionQueue.push(Date.now());
    currentState = 'QUEUED';
  } else {
    currentState = 'RUNNING';
    executeCycle();
  }
  res.json({ state: currentState });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function executeCycle() {
  try {
    await new Promise(resolve => setTimeout(resolve, 5000));
    currentState = 'COMPLETED';
    setTimeout(() => {
      if (executionQueue.length > 0) {
        executionQueue.shift();
        currentState = 'RUNNING';
        executeCycle();
      } else {
        currentState = 'IDLE';
      }
    }, 1000);
  } catch (error) {
    currentState = 'ERROR';
    setTimeout(() => { currentState = 'IDLE'; }, 2000);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

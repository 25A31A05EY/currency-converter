import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health and environment info
  app.get('/api/health', (_req, res) => {
    const pythonProc = spawn('python3', ['--version']);
    let version = '';
    pythonProc.stdout.on('data', (d) => { version += d.toString(); });
    pythonProc.stderr.on('data', (d) => { version += d.toString(); });
    pythonProc.on('close', (code) => {
      res.json({
        status: 'healthy',
        pythonInstalled: code === 0,
        pythonVersion: version.trim() || 'Python 3.10',
        timestamp: new Date().toISOString()
      });
    });
  });

  // Get raw Python source code for inspection/download
  app.get('/api/python-code', (_req, res) => {
    try {
      const scriptPath = path.resolve(__dirname, 'currency_converter.py');
      const code = fs.readFileSync(scriptPath, 'utf-8');
      res.setHeader('Content-Type', 'text/plain');
      res.send(code);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to read Python file: ' + err.message });
    }
  });

  // Convert via Python 3 script execution
  app.post('/api/convert', (req, res) => {
    const { amount, from, to } = req.body;
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ error: 'Valid numeric amount is required' });
    }
    const fromCurr = (from || 'USD').toString().toUpperCase().trim();
    const toCurr = (to || 'EUR').toString().toUpperCase().trim();

    const startTime = Date.now();
    const scriptPath = path.resolve(__dirname, 'currency_converter.py');
    const args = [scriptPath, parsedAmount.toString(), fromCurr, toCurr, '--json'];

    const py = spawn('python3', args);
    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    py.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    py.on('close', (exitCode) => {
      const durationMs = Date.now() - startTime;
      if (exitCode !== 0) {
        return res.status(500).json({
          error: stderr.trim() || 'Python process exited with error',
          exitCode,
          durationMs,
          command: `python3 currency_converter.py ${parsedAmount} ${fromCurr} ${toCurr} --json`
        });
      }

      try {
        const parsed = JSON.parse(stdout);
        return res.json({
          ...parsed,
          execution: {
            durationMs,
            command: `python3 currency_converter.py ${parsedAmount} ${fromCurr} ${toCurr} --json`,
            exitCode: 0,
            engine: 'Python 3.10 (Standard Library)'
          }
        });
      } catch (err: any) {
        return res.status(500).json({
          error: 'Failed to parse JSON output from Python script',
          rawOutput: stdout,
          stderr,
          durationMs
        });
      }
    });

    py.on('error', (err) => {
      res.status(500).json({ error: 'Failed to launch python3: ' + err.message });
    });
  });

  // Run custom Python command or test with flags
  app.post('/api/run-python', (req, res) => {
    const { args = [] } = req.body;
    const sanitizedArgs: string[] = [];

    // Filter and sanitize arguments
    for (const arg of args) {
      const s = String(arg).trim();
      if (s && !s.includes(';') && !s.includes('&') && !s.includes('|')) {
        sanitizedArgs.push(s);
      }
    }

    const scriptPath = path.resolve(__dirname, 'currency_converter.py');
    const fullArgs = [scriptPath, ...sanitizedArgs];
    const startTime = Date.now();

    const py = spawn('python3', fullArgs);
    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    py.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    py.on('close', (exitCode) => {
      const durationMs = Date.now() - startTime;
      res.json({
        command: `python3 currency_converter.py ${sanitizedArgs.join(' ')}`,
        stdout,
        stderr,
        exitCode,
        durationMs
      });
    });

    py.on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
  });

  // Mount Vite or static server
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Currency Converter running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Error]', err);
  process.exit(1);
});

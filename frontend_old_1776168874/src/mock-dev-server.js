import http from 'http';

const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Post Monitoring Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; color: #222; }
    .card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    h1 { margin-top: 0; }
    code { background: #eee; padding: 2px 6px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Мониторинг рекомендаций</h1>
    <p>Фронтенд-каркас создан.</p>
    <p>Следующий этап: подключить React/Vite и экраны <code>dashboard</code>, <code>registry</code>, <code>imports</code>, <code>quality</code>.</p>
  </div>
</body>
</html>`;

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

const port = 3000;
server.listen(port, () => console.log(`Frontend mock started on http://localhost:${port}`));

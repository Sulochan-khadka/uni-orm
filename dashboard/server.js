const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the dashboard/public directory
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Proxy API calls to the engine running on localhost:6499
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:6499',
  changeOrigin: true,
  pathRewrite: { '^/api': '' }
}));

app.listen(PORT, () => {
  console.log(`Dashboard server listening on http://localhost:${PORT}`);
});

module.exports = app;

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// CORS - allow frontend from any origin
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve static assets (only images, not data files)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve the main HTML file at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '广西区域公司工作台.html'));
});

const DATA_FILE = path.join(__dirname, 'cloud_data.json');

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {
      users: [],
      clients: [],
      projects: [],
      visits: [],
      reims: [],
      attendance: {},
      todos: [],
      dismissed: [],
      legalHolidays: null,
      lastUpdate: null,
      updateBy: null
    };
  }
}

function saveDataFile(data) {
  data.lastUpdate = new Date().toISOString();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ===== API =====

// 获取全部数据
app.get('/api/data', (req, res) => {
  res.json(loadData());
});

// 保存全部数据（全量覆盖）
app.post('/api/data', (req, res) => {
  const incoming = req.body;
  const current = loadData();
  // 合并用户列表（取并集，不丢失已有用户）
  if (incoming.users) {
    var userMap = {};
    (current.users || []).forEach(u => { userMap[u.name] = u; });
    incoming.users.forEach(u => {
      if (!userMap[u.name]) userMap[u.name] = u;
      else userMap[u.name] = u; // 更新
    });
    incoming.users = Object.values(userMap);
  }
  // 全量替换业务数据
  ['clients', 'projects', 'visits', 'reims', 'attendance', 'todos', 'dismissed', 'legalHolidays'].forEach(k => {
    if (incoming[k] !== undefined) current[k] = incoming[k];
  });
  if (incoming.users) current.users = incoming.users;
  if (incoming.updateBy) current.updateBy = incoming.updateBy;
  saveDataFile(current);
  res.json({ ok: true, lastUpdate: current.lastUpdate });
});

// 注册用户
app.post('/api/register', (req, res) => {
  const { name, pass } = req.body;
  if (!name || name.length < 2) return res.json({ ok: false, msg: '用户名至少2位' });
  if (!pass || pass.length < 4) return res.json({ ok: false, msg: '密码至少4位' });
  const data = loadData();
  if (data.users.find(u => u.name === name)) {
    return res.json({ ok: false, msg: '用户名已存在' });
  }
  data.users.push({ name, pass, created: new Date().toISOString() });
  saveDataFile(data);
  res.json({ ok: true });
});

// 登录验证
app.post('/api/login', (req, res) => {
  const { name, pass } = req.body;
  const data = loadData();
  const user = data.users.find(u => u.name === name && u.pass === pass);
  if (user) {
    res.json({ ok: true, name: user.name });
  } else {
    res.json({ ok: false, msg: '用户名或密码错误' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// SPA fallback - 所有非 API、非静态文件的请求返回 HTML
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '广西区域公司工作台.html'));
});

app.listen(PORT, () => {
  console.log(`广西区域公司工作台服务已启动`);
  console.log(`端口: ${PORT}`);
  console.log(`健康检查: /api/health`);
});

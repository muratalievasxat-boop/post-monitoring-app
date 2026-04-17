import express from 'express';
import cors from 'cors';
import dashboardRouter from './routes/dashboard.js';
import recommendationsRouter from './routes/recommendations.js';
import adminRegistryRouter from './routes/adminRegistry.js';


const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/dashboard', dashboardRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/admin/registry', adminRegistryRouter);

app.listen(port, () => {
  console.log(`Backend started on port ${port}`);
});


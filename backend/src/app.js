import express from 'express';
import cors from 'cors';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import recommendationsRoutes from './modules/recommendations/recommendations.routes.js';
import dictionariesRoutes from './modules/dictionaries/dictionaries.routes.js';
import importsRoutes from './modules/imports/imports.routes.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/dictionaries', dictionariesRoutes);
app.use('/api/imports', importsRoutes);

export default app;

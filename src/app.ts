import cors from 'cors';
import express from 'express';
import taskRoutes from './routes/task.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/tasks', taskRoutes);

export default app;

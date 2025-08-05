import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(bodyParser.json());

import githubRoutes from './routes/github.js';
import aiRoutes from './routes/ai.js';

app.use('/api/github', githubRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

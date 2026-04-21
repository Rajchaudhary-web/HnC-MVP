import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import healthRoutes from './routes/healthRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/health', healthRoutes);

// Basic Health Route
app.get('/', (req, res) => {
  res.send('UrbanFlux AI Backend Running');
});

// Example Request Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Server Initialization
app.listen(PORT, () => {
  console.log(`
  🚀 UrbanFlux AI Backend
  📡 Server running on port: ${PORT}
  🌍 Mode: ${process.env.NODE_ENV || 'development'}
  `);
});

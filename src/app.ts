import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import bookRoutes from './routes/books';
import genreRoutes from './routes/genre';
import transactionRoutes from './routes/transactions';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/books', bookRoutes);
app.use('/genre', genreRoutes);
app.use('/transactions', transactionRoutes);

// Health check - SESUAI DOKUMENTASI
app.get('/health-check', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Hello World!', 
    date: new Date().toDateString() 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
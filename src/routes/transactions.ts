import { Router } from 'express';
import {
  createTransaction,
  getAllTransactions,
  getTransactionDetail,
  getTransactionStats
} from '../controllers/transactionsController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();

// 📊 Statistik transaksi — letakkan paling atas
router.get('/statistics', authMiddleware, getTransactionStats);

// 🔍 Detail transaksi — letakkan sebelum getAll
router.get('/:transaction_id', authMiddleware, getTransactionDetail);

// 🧾 Semua transaksi
router.get('/', authMiddleware, getAllTransactions);

// ➕ Buat transaksi baru
router.post('/', authMiddleware, createTransaction);

export default router;

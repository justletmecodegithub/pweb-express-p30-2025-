import { Router } from 'express';
import {
  createTransaction,
  getAllTransactions,
  getTransactionDetail,
  getTransactionStats // PASTIKAN INI DIIMPORT
} from '../controllers/transactionsController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();

// Buat transaksi → pakai token user
router.post('/', authMiddleware, createTransaction);

// Get semua transaksi
router.get('/', authMiddleware, getAllTransactions);

// Detail transaksi
router.get('/:transaction_id', authMiddleware, getTransactionDetail);

// Get statistics - ENDPOINT BARU
router.get('/statistics', authMiddleware, getTransactionStats); // PASTIKAN getTransactionStats BUKAN getTransactionStat

export default router;
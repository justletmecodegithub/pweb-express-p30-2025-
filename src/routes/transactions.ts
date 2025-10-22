import { Router, Request, Response } from 'express';
import authMiddleware from '../middlewares/authMiddleware';
import prisma from '../prisma/client';

const router = Router();

// POST /transactions
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const items: { bookId: number; quantity: number }[] = req.body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items harus array dan tidak kosong' });
    }

    const bookIds = Array.from(new Set(items.map(i => i.bookId)));
    const books = await prisma.book.findMany({
      where: { id: { in: bookIds } }
    });

    if (books.length !== bookIds.length) {
      return res.status(404).json({ message: 'Salah satu atau lebih bookId tidak ditemukan' });
    }

    // check stock and compute total
    const bookMap = new Map(books.map(b => [b.id, b]));
    for (const it of items) {
      const book = bookMap.get(it.bookId);
      if (!book) return res.status(404).json({ message: Book ${it.bookId} tidak ditemukan });
      if (!Number.isInteger(it.quantity) || it.quantity <= 0) {
        return res.status(400).json({ message: Quantity tidak valid untuk book ${it.bookId} });
      }
      if (book.stock < it.quantity) {
        return res.status(409).json({ message: Stok tidak cukup untuk book ${it.bookId} });
      }
    }

    const total = items.reduce((sum, it) => {
      const book = bookMap.get(it.bookId)!;
      // assume book.price exists
      return sum + (Number(book.price) || 0) * it.quantity;
    }, 0);

    // perform atomic DB transaction: create Transaction, create TransactionItems, update stock
    const created = await prisma.$transaction(async (tx) => {
      const trx = await tx.transaction.create({
        data: {
          userId,
          total
        }
      });

      // create items and update stocks
      for (const it of items) {
        const book = bookMap.get(it.bookId)!;
        await tx.transactionItem.create({
          data: {
            transactionId: trx.id,
            bookId: book.id,
            quantity: it.quantity,
            price: book.price
          }
        });

        await tx.book.update({
          where: { id: book.id },
          data: { stock: { decrement: it.quantity } }
        });
      }

      return trx;
    });

    // return created transaction with items
    const full = await prisma.transaction.findUnique({
      where: { id: created.id },
      include: {
        items: {
          include: {
            book: true
          }
        }
      }
    });

    return res.status(201).json(full);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /transactions - list transactions for current user
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const list = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { book: true }
        }
      }
    });
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /transactions/:transaction_id - detail
router.get('/:transaction_id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const id = Number(req.params.transaction_id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: 'transaction_id tidak valid' });

    const trx = await prisma.transaction.findUnique({
      where: { id },
      include: {
        items: { include: { book: true } }
      }
    });

    if (!trx) return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    if (trx.userId !== userId) return res.status(403).json({ message: 'Akses ditolak' });

    return res.json(trx);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /transactions/statistics
router.get('/statistics', authMiddleware, async (_req: Request, res: Response) => {
  try {
    // total count and average total
    const agg = await prisma.transaction.aggregate({
      _count: { _all: true },
      _avg: { total: true }
    });

    const totalTransactions = agg._count?._all || 0;
    const avgNominal = agg._avg?.total || 0;

    // genre statistics: count transaction items per genre
    const genres = await prisma.genre.findMany({
      include: {
        books: {
          include: {
            transactionItems: {
              select: { id: true }
            }
          }
        }
      }
    });

    const genreStats = genres.map(g => {
      const count = g.books.reduce((s, b) => s + (b.transactionItems?.length || 0), 0);
      return { id: g.id, name: g.name, count };
    });

    let most = null as null | { id: number; name: string; count: number };
    let least = null as null | { id: number; name: string; count: number };

    if (genreStats.length > 0) {
      genreStats.sort((a, b) => b.count - a.count);
      most = genreStats[0];
      least = genreStats[genreStats.length - 1];
    }

    return res.json({
      totalTransactions,
      avgNominal,
      genreMostTransactions: most,
      genreLeastTransactions: least
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

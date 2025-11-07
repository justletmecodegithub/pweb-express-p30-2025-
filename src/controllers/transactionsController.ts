import { Request, Response } from 'express';
import prisma from '../prisma/client';

// Create Transaction
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ success: false, message: 'Missing items in transaction' });

    let totalQuantity = 0;
    let totalPrice = 0;

    // Update stock dan siapkan data order_items
    const orderItemsData = await Promise.all(
      items.map(async (item: { book_id: string; quantity: number }) => {
        const book = await prisma.books.findUnique({ 
          where: { 
            id: item.book_id,
            deleted_at: null 
          } 
        });
        if (!book) throw new Error(`Book not found: ${item.book_id}`);
        if (book.stock_quantity < item.quantity)
          throw new Error(`Not enough stock for book: ${book.title}`);

        await prisma.books.update({
          where: { id: item.book_id },
          data: { stock_quantity: { decrement: item.quantity } },
        });

        totalQuantity += item.quantity;
        totalPrice += item.quantity * book.price;

        return {
          book_id: item.book_id,
          quantity: item.quantity,
        };
      })
    );

    const order = await prisma.orders.create({
      data: {
        user_id: userId,
        order_items: { create: orderItemsData },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: {
        transaction_id: order.id,
        total_quantity: totalQuantity,
        total_price: totalPrice,
      },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Transaction failed' });
  }
};

// Get All Transactions
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.orders.findMany({
      include: { order_items: { include: { book: true } }, user: true },
      orderBy: { created_at: 'desc' },
    });
    res.json({ success: true, data: orders });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get Transaction Detail
export const getTransactionDetail = async (req: Request, res: Response) => {
  try {
    const { transaction_id } = req.params;
    const order = await prisma.orders.findUnique({
      where: { id: transaction_id },
      include: { order_items: { include: { book: true } }, user: true },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Transaction not found' });
    res.json({ success: true, data: order });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get Transaction Statistics - PASTIKAN FUNGSI INI ADA DAN TER-EXPORT
export const getTransactionStats = async (req: Request, res: Response) => {
  try {
    const totalTransactions = await prisma.orders.count();

    const avgOrder = await prisma.order_items.aggregate({
      _avg: { quantity: true },
    });
    const averageQuantityPerOrder = avgOrder._avg.quantity ?? 0;

    const genreStats = await prisma.genres.findMany({
      where: {
        deleted_at: null
      },
      include: {
        books: { 
          where: {
            deleted_at: null
          },
          include: { order_items: true } 
        },
      },
    });

    const genreCounts = genreStats.map(g => ({
      genre: g.name,
      total: g.books.reduce((sum, b) => sum + b.order_items.length, 0),
    }));

    const mostSold = genreCounts.reduce(
      (max, curr) => (curr.total > max.total ? curr : max),
      { genre: '', total: 0 }
    );

    const leastSold = genreCounts.reduce(
      (min, curr) => (curr.total < min.total && curr.total > 0 ? curr : min),
      { genre: '', total: Infinity }
    );

    res.json({
      success: true,
      message: 'Get transactions statistics successfully',
      data: {
        total_transactions: totalTransactions,
        average_transaction_amount: averageQuantityPerOrder,
        most_book_sales_genre: mostSold.genre || 'No data',
        fewest_book_sales_genre: leastSold.genre || 'No data'
      },
    });
  } catch (err) {
    console.error('Get transaction stats error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
import { Request, Response } from "express";
import prisma from "../prisma/client";

// 🧾 Create Transaction
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { items } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ success: false, message: "Items tidak valid" });

    // Validasi & update stok buku
    const orderItemsData = await Promise.all(
      items.map(async (item: { book_id: string; quantity: number }) => {
        const book = await prisma.books.findFirst({
          where: { id: item.book_id, deleted_at: null },
        });
        if (!book) throw new Error(`Book not found: ${item.book_id}`);
        if (book.stock_quantity < item.quantity)
          throw new Error(`Stok tidak cukup untuk ${book.title}`);

        await prisma.books.update({
          where: { id: item.book_id },
          data: { stock_quantity: { decrement: item.quantity } },
        });

        return { book_id: item.book_id, quantity: item.quantity };
      })
    );

    // Simpan order
    const order = await prisma.orders.create({
      data: {
        user_id: userId,
        order_items: { create: orderItemsData },
      },
      include: { order_items: { include: { book: true } } },
    });

    res.status(201).json({
      success: true,
      message: "Transaksi berhasil dibuat",
      data: order,
    });
  } catch (err: any) {
    console.error("Transaction error:", err);
    res.status(400).json({ success: false, message: err.message || "Transaction failed" });
  }
};

// 📋 Get All Transactions
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.orders.findMany({
      include: {
        order_items: { include: { book: true } },
        user: { select: { username: true, email: true } },
      },
      orderBy: { created_at: "desc" },
    });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 🔍 Get Transaction Detail
export const getTransactionDetail = async (req: Request, res: Response) => {
  try {
    const { transaction_id } = req.params;
    const order = await prisma.orders.findUnique({
      where: { id: transaction_id },
      include: { order_items: { include: { book: true } }, user: true },
    });
    if (!order)
      return res.status(404).json({ success: false, message: "Transaction not found" });

    res.json({
      success: true,
      data: {
        id: order.id,
        user: order.user,
        items: order.order_items, // 👈 buat frontend lebih simpel
        created_at: order.created_at,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// 📊 Statistik Transaksi
export const getTransactionStats = async (req: Request, res: Response) => {
  try {
    const totalTransactions = await prisma.orders.count();

    const avgOrder = await prisma.order_items.aggregate({
      _avg: { quantity: true },
    });

    const genres = await prisma.genres.findMany({
      where: { deleted_at: null },
      include: {
        books: {
          where: { deleted_at: null },
          include: { order_items: true },
        },
      },
    });

    const genreStats = genres.map((g) => ({
      genre: g.name,
      total: g.books.reduce((sum, b) => sum + b.order_items.length, 0),
    }));

    const mostSold = genreStats.reduce(
      (max, curr) => (curr.total > max.total ? curr : max),
      { genre: "", total: 0 }
    );

    const leastSold = genreStats.reduce(
      (min, curr) => (curr.total < min.total && curr.total > 0 ? curr : min),
      { genre: "", total: Infinity }
    );

    res.json({
      success: true,
      data: {
        total_transactions: totalTransactions,
        average_transaction_amount: avgOrder._avg.quantity ?? 0,
        most_book_sales_genre: mostSold.genre || "No data",
        fewest_book_sales_genre: leastSold.genre || "No data",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

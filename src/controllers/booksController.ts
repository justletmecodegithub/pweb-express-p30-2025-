import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const getAllBooks = async (req: Request, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '10', 
      search, 
      genreId,
      minPrice,
      maxPrice 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { author: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (genreId) {
      where.genreId = parseInt(genreId as string);
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          genre: {
            select: { id: true, name: true, description: true }
          }
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.book.count({ where })
    ]);

    res.json({
      success: true,
      data: books,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get all books error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

export const getBookDetail = async (req: Request, res: Response) => {
  try {
    const { book_id } = req.params;
    const bookId = parseInt(book_id);

    if (isNaN(bookId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID'
      });
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        genre: {
          select: { id: true, name: true, description: true }
        }
      }
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.json({
      success: true,
      data: book
    });
  } catch (error) {
    console.error('Get book detail error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

export const getBooksByGenre = async (req: Request, res: Response) => {
  try {
    const { genre_id } = req.params;
    const { 
      page = '1', 
      limit = '10',
      search 
    } = req.query;

    const genreId = parseInt(genre_id);
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    if (isNaN(genreId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid genre ID'
      });
    }

    const genre = await prisma.genre.findUnique({
      where: { id: genreId }
    });

    if (!genre) {
      return res.status(404).json({
        success: false,
        message: 'Genre not found'
      });
    }

    const where: any = { genreId };

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { author: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          genre: {
            select: { id: true, name: true, description: true }
          }
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.book.count({ where })
    ]);

    res.json({
      success: true,
      data: books,
      genre: {
        id: genre.id,
        name: genre.name,
        description: genre.description
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get books by genre error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

export const createBook = async (req: Request, res: Response) => {
  try {
    const { title, author, description, price, stock, genreId } = req.body;

    if (!title || !author || !price || !genreId) {
      return res.status(400).json({
        success: false,
        message: 'Title, author, price, and genreId are required'
      });
    }

    const existingBook = await prisma.book.findUnique({
      where: { title }
    });

    if (existingBook) {
      return res.status(400).json({
        success: false,
        message: 'Book title already exists'
      });
    }

    const genre = await prisma.genre.findUnique({
      where: { id: parseInt(genreId) }
    });

    if (!genre) {
      return res.status(404).json({
        success: false,
        message: 'Genre not found'
      });
    }

    const book = await prisma.book.create({
      data: {
        title,
        author,
        description: description || null,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        genreId: parseInt(genreId)
      },
      include: {
        genre: {
          select: { id: true, name: true, description: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      data: book
    });
  } catch (error) {
    console.error('Create book error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

export const updateBook = async (req: Request, res: Response) => {
  try {
    const { book_id } = req.params;
    const { title, author, description, price, stock, genreId } = req.body;
    const bookId = parseInt(book_id);

    if (isNaN(bookId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID'
      });
    }

    const existingBook = await prisma.book.findUnique({
      where: { id: bookId }
    });

    if (!existingBook) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    if (title && title !== existingBook.title) {
      const titleExists = await prisma.book.findUnique({
        where: { title }
      });

      if (titleExists) {
        return res.status(400).json({
          success: false,
          message: 'Book title already exists'
        });
      }
    }

    if (genreId) {
      const genre = await prisma.genre.findUnique({
        where: { id: parseInt(genreId) }
      });

      if (!genre) {
        return res.status(404).json({
          success: false,
          message: 'Genre not found'
        });
      }
    }

    const updatedBook = await prisma.book.update({
      where: { id: bookId },
      data: {
        ...(title && { title }),
        ...(author && { author }),
        ...(description !== undefined && { description }),
        ...(price && { price: parseFloat(price) }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(genreId && { genreId: parseInt(genreId) })
      },
      include: {
        genre: {
          select: { id: true, name: true, description: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Book updated successfully',
      data: updatedBook
    });
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

export const deleteBook = async (req: Request, res: Response) => {
  try {
    const { book_id } = req.params;
    const bookId = parseInt(book_id);

    if (isNaN(bookId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID'
      });
    }

    const book = await prisma.book.findUnique({
      where: { id: bookId }
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    const bookTransactions = await prisma.transactionItem.findFirst({
      where: { bookId }
    });

    if (bookTransactions) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete book that has transaction history'
      });
    }

    await prisma.book.delete({
      where: { id: bookId }
    });

    res.json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};
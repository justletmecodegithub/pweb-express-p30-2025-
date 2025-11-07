import { Request, Response } from 'express';
import prisma from '../prisma/client';

// ✅ Create Book - PERBAIKI RESPONSE
export const createBook = async (req: Request, res: Response) => {
  try {
    const {
      title,
      writer,
      publisher,
      publication_year,
      description,
      price,
      stock_quantity,
      genre_id,
    } = req.body;

    if (
      !title ||
      !writer ||
      !publisher ||
      !publication_year ||
      !price ||
      !stock_quantity ||
      !genre_id
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing required fields' });
    }

    const existing = await prisma.books.findUnique({ 
      where: { 
        title,
        deleted_at: null 
      } 
    });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: 'Book title already exists' });
    }

    // Cek genre_id valid
    const genre = await prisma.genres.findUnique({ 
      where: { 
        id: genre_id,
        deleted_at: null 
      } 
    });
    if (!genre) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid genre_id' });
    }

    const book = await prisma.books.create({
      data: {
        title,
        writer,
        publisher,
        publication_year: Number(publication_year),
        description: description || null,
        price: Number(price),
        stock_quantity: Number(stock_quantity),
        genre_id,
      },
    });

    res.status(201).json({ 
      success: true, 
      message: 'Book added successfully', // RESPONSE SESUAI DOKUMEN
      data: {
        id: book.id,
        title: book.title,
        created_at: book.created_at
      }
    });
  } catch (err) {
    console.error('Create book error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ✅ Get All Book + Pagination + Filter - TAMBAH SOFT DELETE
export const getAllBooks = async (req: Request, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '10', 
      search, 
      genre_id,
      orderByTitle = 'desc',
      orderByPublishDate = 'asc'
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      deleted_at: null // Hanya buku yang tidak di soft delete
    };
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { writer: { contains: search as string, mode: 'insensitive' } },
        { publisher: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    if (genre_id) where.genre_id = genre_id as string;

    // Order by logic
    const orderBy: any[] = [];
    if (orderByTitle) {
      orderBy.push({ title: orderByTitle as 'asc' | 'desc' });
    }
    if (orderByPublishDate) {
      orderBy.push({ publication_year: orderByPublishDate as 'asc' | 'desc' });
    }
    if (orderBy.length === 0) {
      orderBy.push({ created_at: 'desc' });
    }

    const [books, total] = await Promise.all([
      prisma.books.findMany({
        where,
        include: { 
          genre: {
            select: {
              name: true
            }
          } 
        },
        skip,
        take: limitNum,
        orderBy,
      }),
      prisma.books.count({ where }),
    ]);

    // Format response sesuai dokumentasi
    const formattedBooks = books.map(book => ({
      id: book.id,
      title: book.title,
      writer: book.writer,
      publisher: book.publisher,
      description: book.description,
      publication_year: book.publication_year,
      price: book.price,
      stock_quantity: book.stock_quantity,
      genre: book.genre.name
    }));

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: 'Get all book successfully',
      data: formattedBooks,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        prev_page: pageNum > 1 ? pageNum - 1 : null,
        next_page: pageNum < totalPages ? pageNum + 1 : null
      }
    });
  } catch (err) {
    console.error('Get all books error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ✅ Get Book Detail - TAMBAH SOFT DELETE
export const getBookDetail = async (req: Request, res: Response) => {
  try {
    const { book_id } = req.params;
    const book = await prisma.books.findUnique({
      where: { 
        id: book_id,
        deleted_at: null 
      },
      include: { 
        genre: {
          select: {
            name: true
          }
        } 
      },
    });
    
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    
    // Format response
    const formattedBook = {
      id: book.id,
      title: book.title,
      writer: book.writer,
      publisher: book.publisher,
      description: book.description,
      publication_year: book.publication_year,
      price: book.price,
      stock_quantity: book.stock_quantity,
      genre: book.genre.name
    };

    res.json({ 
      success: true, 
      message: 'Get book detail successfully',
      data: formattedBook 
    });
  } catch (err) {
    console.error('Get book detail error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ✅ Get Book By Genre - TAMBAH SOFT DELETE
export const getBooksByGenre = async (req: Request, res: Response) => {
  try {
    const { genre_id } = req.params;
    const { 
      page = '1', 
      limit = '10', 
      search,
      orderByTitle = 'desc',
      orderByPublishDate = 'asc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Cek genre exists dan tidak di soft delete
    const genre = await prisma.genres.findUnique({
      where: {
        id: genre_id,
        deleted_at: null
      }
    });

    if (!genre) {
      return res.status(404).json({ success: false, message: 'Genre not found' });
    }

    const where: any = { 
      genre_id,
      deleted_at: null // Hanya buku yang tidak di soft delete
    };
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { writer: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Order by logic
    const orderBy: any[] = [];
    if (orderByTitle) {
      orderBy.push({ title: orderByTitle as 'asc' | 'desc' });
    }
    if (orderByPublishDate) {
      orderBy.push({ publication_year: orderByPublishDate as 'asc' | 'desc' });
    }
    if (orderBy.length === 0) {
      orderBy.push({ created_at: 'desc' });
    }

    const [books, total] = await Promise.all([
      prisma.books.findMany({
        where,
        include: { 
          genre: {
            select: {
              name: true
            }
          } 
        },
        skip,
        take: limitNum,
        orderBy,
      }),
      prisma.books.count({ where }),
    ]);

    // Format response
    const formattedBooks = books.map(book => ({
      id: book.id,
      title: book.title,
      writer: book.writer,
      publisher: book.publisher,
      description: book.description,
      publication_year: book.publication_year,
      price: book.price,
      stock_quantity: book.stock_quantity,
      genre: book.genre.name
    }));

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: 'Get all book by genre successfully',
      data: formattedBooks,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        prev_page: pageNum > 1 ? pageNum - 1 : null,
        next_page: pageNum < totalPages ? pageNum + 1 : null
      }
    });
  } catch (err) {
    console.error('Get books by genre error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ✅ Update Book (PATCH) - PERBAIKI RESPONSE
export const updateBook = async (req: Request, res: Response) => {
  try {
    const { book_id } = req.params;
    const data = req.body;

    const book = await prisma.books.findUnique({ 
      where: { 
        id: book_id,
        deleted_at: null 
      } 
    });
    
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    const updated = await prisma.books.update({
      where: { id: book_id },
      data: {
        ...data,
        updated_at: new Date()
      },
    });

    res.json({ 
      success: true, 
      message: 'Book updated successfully', // RESPONSE SESUAI DOKUMEN
      data: {
        id: updated.id,
        title: updated.title,
        updated_at: updated.updated_at
      }
    });
  } catch (err) {
    console.error('Update book error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ✅ Delete Book - UBAH KE SOFT DELETE
export const deleteBook = async (req: Request, res: Response) => {
  try {
    const { book_id } = req.params;
    const book = await prisma.books.findUnique({ 
      where: { 
        id: book_id,
        deleted_at: null 
      } 
    });
    
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // SOFT DELETE - update deleted_at
    await prisma.books.update({
      where: { id: book_id },
      data: { 
        deleted_at: new Date(),
        updated_at: new Date()
      }
    });

    res.json({ 
      success: true, 
      message: 'Book removed successfully' // RESPONSE SESUAI DOKUMEN
    });
  } catch (err) {
    console.error('Delete book error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
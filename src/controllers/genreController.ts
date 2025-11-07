import { Request, Response } from 'express';
import prisma from '../prisma/client';

// ✅ Create Genre - PERBAIKI RESPONSE MESSAGE
export const createGenre = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Missing required field: name' });

    const existing = await prisma.genres.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ success: false, message: 'Genre already exists' });

    const now = new Date();

    const genre = await prisma.genres.create({
      data: {
        name,
        created_at: now,
        updated_at: now,
      },
    });

    res.status(201).json({ 
      success: true, 
      message: 'Genre created successfully', // RESPONSE SESUAI DOKUMEN
      data: genre 
    });
  } catch (err) {
    console.error('Create genre error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ✅ Get All Genres - TAMBAH PAGINATION & FILTER
export const getAllGenres = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', search, orderByName = 'asc' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      deleted_at: null // Hanya genre yang tidak di soft delete
    };

    if (search) {
      where.name = {
        contains: search as string,
        mode: 'insensitive'
      };
    }

    const [genres, total] = await Promise.all([
      prisma.genres.findMany({
        where,
        orderBy: {
          name: orderByName as 'asc' | 'desc'
        },
        skip,
        take: limitNum,
        select: {
          id: true,
          name: true
        }
      }),
      prisma.genres.count({ where })
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({ 
      success: true, 
      message: 'Get all genre successfully',
      data: genres,
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
    console.error('Get all genres error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ✅ Get Genre Detail - PERBAIKI YANG ERROR
export const getGenreDetail = async (req: Request, res: Response) => {
  try {
    const { genre_id } = req.params;

    const genre = await prisma.genres.findUnique({
      where: { 
        id: genre_id,
        deleted_at: null // Hanya yang tidak di soft delete
      },
      include: { 
        books: {
          where: {
            deleted_at: null // Hanya buku yang tidak di soft delete
          }
        } 
      },
    });

    if (!genre) {
      return res.status(404).json({ 
        success: false, 
        message: 'Genre not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Get genre detail successfully',
      data: genre 
    });
  } catch (err) {
    console.error('Get genre detail error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ✅ Update Genre - PERBAIKI RESPONSE
export const updateGenre = async (req: Request, res: Response) => {
  try {
    const { genre_id } = req.params;
    const { name } = req.body;

    const genre = await prisma.genres.findUnique({ 
      where: { 
        id: genre_id,
        deleted_at: null 
      } 
    });
    if (!genre) return res.status(404).json({ success: false, message: 'Genre not found' });

    const updated = await prisma.genres.update({ 
      where: { id: genre_id }, 
      data: { 
        name,
        updated_at: new Date()
      } 
    });

    res.json({ 
      success: true, 
      message: 'Genre updated successfully', // RESPONSE SESUAI DOKUMEN
      data: updated 
    });
  } catch (err) {
    console.error('Update genre error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ✅ Delete Genre - UBAH KE SOFT DELETE
export const deleteGenre = async (req: Request, res: Response) => {
  try {
    const { genre_id } = req.params;
    const genre = await prisma.genres.findUnique({ 
      where: { 
        id: genre_id,
        deleted_at: null 
      } 
    });
    
    if (!genre) return res.status(404).json({ success: false, message: 'Genre not found' });

    // SOFT DELETE - update deleted_at
    await prisma.genres.update({
      where: { id: genre_id },
      data: { 
        deleted_at: new Date(),
        updated_at: new Date()
      }
    });

    res.json({ 
      success: true, 
      message: 'Genre removed successfully' // RESPONSE SESUAI DOKUMEN
    });
  } catch (err) {
    console.error('Delete genre error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
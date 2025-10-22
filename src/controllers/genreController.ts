import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const getAllGenres = async (req: Request, res: Response) => {
  try {
    const genres = await prisma.genre.findMany({
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: genres
    });
  } catch (error) {
    console.error('Get all genres error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

export const getGenreDetail = async (req: Request, res: Response) => {
  try {
    const { genre_id } = req.params;
    const genreId = parseInt(genre_id);

    if (isNaN(genreId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid genre ID'
      });
    }

    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
      include: {
        books: {
          select: {
            id: true,
            title: true,
            author: true,
            price: true,
            stock: true
          }
        }
      }
    });

    if (!genre) {
      return res.status(404).json({
        success: false,
        message: 'Genre not found'
      });
    }

    res.json({
      success: true,
      data: genre
    });
  } catch (error) {
    console.error('Get genre detail error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

export const createGenre = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Genre name is required'
      });
    }

    const existingGenre = await prisma.genre.findUnique({
      where: { name }
    });

    if (existingGenre) {
      return res.status(400).json({
        success: false,
        message: 'Genre name already exists'
      });
    }

    const genre = await prisma.genre.create({
      data: {
        name,
        description: description || null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Genre created successfully',
      data: genre
    });
  } catch (error) {
    console.error('Create genre error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

export const updateGenre = async (req: Request, res: Response) => {
  try {
    const { genre_id } = req.params;
    const { name, description } = req.body;
    const genreId = parseInt(genre_id);

    if (isNaN(genreId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid genre ID'
      });
    }

    const existingGenre = await prisma.genre.findUnique({
      where: { id: genreId }
    });

    if (!existingGenre) {
      return res.status(404).json({
        success: false,
        message: 'Genre not found'
      });
    }

    if (name && name !== existingGenre.name) {
      const nameExists = await prisma.genre.findUnique({
        where: { name }
      });

      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: 'Genre name already exists'
        });
      }
    }

    const updatedGenre = await prisma.genre.update({
      where: { id: genreId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description })
      }
    });

    res.json({
      success: true,
      message: 'Genre updated successfully',
      data: updatedGenre
    });
  } catch (error) {
    console.error('Update genre error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

export const deleteGenre = async (req: Request, res: Response) => {
  try {
    const { genre_id } = req.params;
    const genreId = parseInt(genre_id);

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

    const genreBooks = await prisma.book.findFirst({
      where: { genreId }
    });

    if (genreBooks) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete genre that has books'
      });
    }

    await prisma.genre.delete({
      where: { id: genreId }
    });

    res.json({
      success: true,
      message: 'Genre deleted successfully'
    });
  } catch (error) {
    console.error('Delete genre error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};
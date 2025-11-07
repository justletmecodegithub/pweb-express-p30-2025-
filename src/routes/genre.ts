import { Router } from 'express';
import {
  createGenre,
  getAllGenres,
  getGenreDetail,
  updateGenre,
  deleteGenre,
} from '../controllers/genreController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();

router.post('/', authMiddleware, createGenre);
router.get('/', getAllGenres);
router.get('/:genre_id', getGenreDetail);
router.patch('/:genre_id', authMiddleware, updateGenre);
router.delete('/:genre_id', authMiddleware, deleteGenre);

export default router;

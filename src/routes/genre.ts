import { Router } from 'express';
import { 
  getAllGenres,
  getGenreDetail,
  createGenre,
  updateGenre,
  deleteGenre
} from '../controllers/genreController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();

router.get('/', getAllGenres);
router.get('/:genre_id', getGenreDetail);

router.post('/', authMiddleware, createGenre);
router.patch('/:genre_id', authMiddleware, updateGenre);
router.delete('/:genre_id', authMiddleware, deleteGenre);

export default router;
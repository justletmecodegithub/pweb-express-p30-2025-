import { Router } from 'express';
import { 
  getAllBooks,
  getBookDetail,
  getBooksByGenre,
  createBook,
  updateBook,
  deleteBook
} from '../controllers/booksController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();

router.get('/', getAllBooks);
router.get('/:book_id', getBookDetail);
router.get('/genre/:genre_id', getBooksByGenre);

router.post('/', authMiddleware, createBook);
router.patch('/:book_id', authMiddleware, updateBook);
router.delete('/:book_id', authMiddleware, deleteBook);

export default router;
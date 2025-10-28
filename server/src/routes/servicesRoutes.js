import express from 'express';
import { listServices, getService } from '../controllers/serviceController.js';

const router = express.Router();

router.get('/', listServices);
router.get('/:id', getService);

export default router;

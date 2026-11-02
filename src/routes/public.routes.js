import { Router } from 'express';
import * as publicCtrl from '../controllers/public.controller.js';

const router = Router();

router.get('/home', publicCtrl.home);

export default router;

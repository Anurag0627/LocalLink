import { Router } from 'express';
import { getHealth, getLegacyHealth, getLiveness, getReadiness } from '../controllers/health.controller.js';

const healthRoutes = Router();
const legacyHealthRoutes = Router();

healthRoutes.get('/', getHealth);
healthRoutes.get('/live', getLiveness);
healthRoutes.get('/ready', getReadiness);
legacyHealthRoutes.get('/', getLegacyHealth);

export { legacyHealthRoutes };
export default healthRoutes;

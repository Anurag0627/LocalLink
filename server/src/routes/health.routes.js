import { Router } from 'express';
import { getHealth, getLegacyHealth } from '../controllers/health.controller.js';

const healthRoutes = Router();
const legacyHealthRoutes = Router();

healthRoutes.get('/', getHealth);
legacyHealthRoutes.get('/', getLegacyHealth);

export { legacyHealthRoutes };
export default healthRoutes;

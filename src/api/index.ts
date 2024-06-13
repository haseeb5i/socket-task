import express from 'express';

import { MessageResponse } from '../interfaces/response';
import emojis from './emojis';

const v1Router = express.Router();

v1Router.get<{}, MessageResponse>('/', (req, res) => {
  res.json({
    message: 'API - 👋🌎🌍🌏',
  });
});

v1Router.use('/emojis', emojis);

export { v1Router };

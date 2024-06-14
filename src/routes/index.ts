import express from 'express';

import usersRotuer from './users';
import sessionRotuer from './session';

const v1Router = express.Router();

v1Router.use('/users', usersRotuer);
v1Router.use('/session', sessionRotuer);

export { v1Router };

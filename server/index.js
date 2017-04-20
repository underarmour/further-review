import express from 'express';
import xhub from 'express-x-hub';
import bodyParser from 'body-parser';

import { version } from '../package.json';
import basicAuth from './basic_auth';
import log from '../lib/log';
import webhook from '../lib/webhook';
import Reviewer from '../lib/reviewer';
import github from '../lib/minihub';
import config from '../lib/config';

const port = Number(config('port'));
const app = express();
const reviewer = new Reviewer({ github });
const xhubConfig = config('github');

app.get('/', (req, res) => {
  res.send(`Further Review ${version}`);
});

app.use(xhub(xhubConfig));
app.use((req, res, next) => {
  if (!xhubConfig.secret || (req.isXHub && req.isXHubValid())) {
    next();
  } else {
    res.status(401).send({ error: 'Unauthorized' });
  }
});

app.use(bodyParser.json());
app.use(basicAuth(config('auth')));

app.post('/github-webhook', (req, res, next) => {
  webhook(github, reviewer, req.body)
    .then(body => res.send(body))
    .catch(next);
});

app.listen(port, () =>
  log.info(`Further Review server listening on port ${port}.`));

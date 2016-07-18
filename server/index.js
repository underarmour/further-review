import express from 'express';
import bodyParser from 'body-parser';

import { version } from '../package';
import log from '../lib/log';
import webhook from '../lib/webhook';
import Reviewer from '../lib/reviewer';
import github from '../lib/minihub';
import config from '../lib/config';

const port = Number(config('port'));
const app = express();
const reviewer = new Reviewer({ github });

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send(`Further Review ${version}`);
});

app.post('/github-webhook', (req, res, next) => {
  webhook(github, reviewer, req.body)
    .then(body => res.send(body))
    .catch(next);
});

app.listen(port, () =>
  log.info(`Further Review server listening on port ${port}.`));

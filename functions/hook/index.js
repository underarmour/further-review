import 'babel-polyfill';

import λ from 'apex.js';

import webhook from '../../lib/webhook';
import Reviewer from '../../lib/reviewer';
import github from '../../lib/minihub';

const reviewer = new Reviewer({ github });

export default λ(e => {
  return webhook(github, reviewer, e);
});

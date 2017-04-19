import bcrypt from 'bcrypt';

const BASIC_PREFIX = 'Basic ';

export default function basicAuth({ enabled = false, users = {} } = {}) {
  if (!enabled) {
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    const sendUnauthorized = () => res.status(401).send({ error: 'Unauthorized' });
    const auth = req.get('Authorization') || '';
    const [username, password] = Buffer
      .from(auth.slice(BASIC_PREFIX.length), 'base64')
      .toString()
      .split(':', 2);

    if (!auth.startsWith(BASIC_PREFIX)) {
      sendUnauthorized();
    } else {
      bcrypt
        .compare(password, users[username] || '')
        .then(isAuthed => (isAuthed ? next() : sendUnauthorized()))
        .catch(next);
    }
  };
}

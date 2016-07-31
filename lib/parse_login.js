function parseLogin(person) {
  let login = person.match(/\(([^\)]+)\)/);

  if (login && login[1].startsWith('@')) {
    return login[1].substring(1);
  }

  login = person.match(/^([^\(<]+)/);

  if (login && !login[0].trim().includes(' ')) {
    return login[0].trim();
  }

  return null;
}

export { parseLogin as default };

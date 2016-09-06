
function arrayDifference(arr1, arr2) {
  return arr1.filter(x => arr2.indexOf(x) < 0);
}

function unique(arr) {
  return [...new Set(arr)];
}

function url(strings, ...values) {
  return strings
    .reduce((result, s, i) => result
      .concat(s, values[i] == null ? '' : encodeURIComponent(values[i])), [])
    .join('');
}

// From https://gist.github.com/zenparsing/5dffde82d9acef19e43c
const TabIndentation = '  ';

function dedent(callSite, ...values) {
  function format(str) {
    let size = -1;

    return str.replace(/\n([ \t]+)/g, (m, m1) => {
      if (size < 0) {
        size = m1.replace(/\t/g, TabIndentation).length;
      }

      return `\n${m1.slice(Math.min(m1.length, size))}`;
    });
  }

  if (typeof callSite === 'function') {
    return (...args) => format(callSite(...args));
  }

  const output = callSite
    .slice(0, values.length + 1)
    .map((text, i) => (i === 0 ? '' : values[i - 1]) + text)
    .join('');

  return format(output);
}

export {
  arrayDifference,
  unique,
  url,
  dedent,
};

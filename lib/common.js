import minimatch from 'minimatch';

function arrayDifference(arr1, arr2) {
  return arr1.filter(x => arr2.indexOf(x) < 0);
}

function unique(arr) {
  return [...new Set(arr)];
}

function isGlobMatch(files, glob) {
  return files.some(f => minimatch(f, glob));
}

function url(strings, ...values) {
  return strings
    .reduce((result, s, i) => result
      .concat(s, values[i] == null ? '' : encodeURIComponent(values[i])), [])
    .join('');
}

export {
  arrayDifference,
  unique,
  isGlobMatch,
  url,
};

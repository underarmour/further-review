import minimatch from 'minimatch';
import Promise from 'bluebird';

import config from '../config';
import log from '../log';

// Review sources
/* eslint-disable camelcase */
import dynamodb from './providers/dynamodb';
import package_json_file from './providers/package_json_file';
import maintainers_file from './providers/maintainers_file';
import repo_collaborators from './providers/repo_collaborators';
/* eslint-enable camelcase */

const installedProviders = {
  dynamodb,
  package_json_file,
  maintainers_file,
  repo_collaborators,
};

const defaultConfig = {
  log,
};

const providers = Object.keys(installedProviders).map(name => {
  const providerType = installedProviders[name];
  let providerConfig = config(`review:${name}`);

  if (providerConfig) {
    let overrideConfig = {};

    if (providerConfig !== null && typeof providerConfig === 'object') {
      overrideConfig = providerConfig;
    }
    providerConfig = Object.assign({}, defaultConfig, overrideConfig);

    return { name, providerType, providerConfig };
  }

  return null;
}).filter(p => p);

function unique(arr) {
  return Array.from(new Set(arr));
}

function isGlobMatch(files, glob) {
  return files.some(f => minimatch(f, glob));
}

let initProvidersPromise = null;

function initProviders() {
  if (!initProvidersPromise) {
    initProvidersPromise = Promise.map(providers, p => {
      log.info(`Instantiating provider ${p.name}`);
      return Promise.resolve(Object.assign(p, {
        instance: new p.providerType(p.providerConfig), // eslint-disable-line new-cap
      }))
        .tap(({ instance }) => instance.init());
    });
  }

  return initProvidersPromise;
}

// expected object is { github, owner, repo, sha, files }
function getReviews({ owner, repo, sha, files }) {
  return initProviders()
    .map(({ name, instance }) => {
      log.info(`Running provider ${name}`);
      return instance.getReviews(owner, repo, sha);
    })
    .reduce((acc, src) => acc.concat(src || []), [])
    .filter(r => r && r.logins && r.logins.length > 0)
    .filter(r => !r.glob || isGlobMatch(files, r.glob))
    .then(reviews => reviews || [])
    .each(r => {
      // normalize review entries
      r.logins = unique(r.logins).sort();
      r.required = r.required || 1;
    });
}

export {
  getReviews as default,
  isGlobMatch,
};

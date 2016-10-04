import BaseProvider from './base';
import { unique, arrayDifference, dedent } from '../common';

function cleanLogins(arr) {
  // Same regex as inside getMentions, otherwise can get infinite loop
  const valid = arr.filter(l => l.match(/^[a-z0-9][a-z0-9\-]*$/i));

  return unique(valid).sort();
}

class SignOffProvider extends BaseProvider {
  async getSignOffs() {
    throw new TypeError('getSignOffs is not yet implemented!');
  }

  async getApprovals() {
    const { owner, repo, number } = this.pr;
    const [pattern, options] = this.config(
      'approval_comment_regex',
      'approval_comment_regex_options',
    );

    if (!pattern) {
      throw new Error('approval_comment_regex not set');
    }

    const approvalRegex = new RegExp(pattern, options);

    const comments = await this.github.getIssueComments({ owner, repo, number });

    const logins = comments.filter(c => c.body.match(approvalRegex))
      .map(c => c.user.login.toLowerCase())
      .filter(l => l !== this.self.login);

    return cleanLogins(logins);
  }

  renderSignOffDescription(so) {
    return so.description;
  }

  renderSignOff(so) {
    const mentionMd = so.logins
      .map(l => `* @${l}`)
      .join('\n');

    const descriptionMd = this.renderSignOffDescription(so)
      || '';

    let requiredMd = '';

    if (so.logins.length > 1 && so.required >= 1) {
      requiredMd = `**${so.required}** sign-off${so.required > 1 ? 's' : ''} required`;
    } else if (so.required === 0) {
      requiredMd = 'No sign-offs required, subscription only';
    }

    return dedent`
      ### ${so.name}
      ${descriptionMd}

      ${mentionMd}

      ${requiredMd}
    `;
  }

  renderComment(signOffs) {
    if (signOffs.length === 0) return '';

    return signOffs
      .map(so => this.renderSignOff(so))
      .join('');
  }

  async checkSignOff(_so) {
    throw new TypeError('checkSignOff is not yet implemented!');
  }

  async review() {
    const pr = this.pr;
    const { proposer } = pr;
    const approvals = await this.getApprovals(pr);
    this.log.debug(`Approvals: ${approvals.join(',')}`);

    let signOffs = (await this.getSignOffs(pr))
      .filter(so => so && so.logins && so.logins.length > 0);

    signOffs.forEach(so => {
      const originalLogins = so.logins;
      so.logins = cleanLogins(so.logins);

      if (originalLogins.length !== so.logins.length) {
        this.log.warn(`Invalid / duplicate logins in ${so.name}`);

        const invalidLogins = arrayDifference(originalLogins, so.logins);

        if (invalidLogins.length > 0) {
          this.log.warn(`Invalid logins: ${invalidLogins.length}`);
        }
      }

      so.required = Number.isInteger(so.required) ? so.required : 1;

      if (so.logins.includes(proposer)) {
        // probably should just make logins a Set
        so.logins = arrayDifference(so.logins, [proposer]);
        if (so.required > 0) {
          // semi-complex logic here.  the thought is that if someone
          // has set required > 0, then they want eyes on the PR, so
          // try to keep at least 1 required unless the logins length
          // is zero.
          so.required = Math.max(1, so.required - 1);
        }
      }

      // ensure not more required than there are possible sign offs
      so.required = Math.min(so.logins.length, so.required);
      so.signOffs = so.logins.filter(l => approvals.includes(l));
      so.approved = so.signOffs.length >= so.required;
      so.needed = so.logins.filter(l => !approvals.includes(l));
    });

    signOffs = signOffs.filter(so => so.logins.length > 0);

    signOffs = await Promise.all(signOffs
      .map(async so => {
        if (await this.checkSignOff(so)) {
          return so;
        }

        return undefined;
      }));

    // filter nulls
    signOffs = signOffs.filter(so => so);

    const unapproved = signOffs.filter(so => !so.approved);

    this.log.debug(`Unapproved count: ${unapproved.length}`);

    return {
      success: unapproved.length === 0,
      comment: this.renderComment(signOffs),

      // additional state for unit testing
      signOffs,
    };
  }
}

export {
  SignOffProvider as default,
  cleanLogins,
};

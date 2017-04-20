import DependencySignOffProvider from './dependency_sign_off';

class ConfigSignOffProvider extends DependencySignOffProvider {

  constructor(options = {}) {
    super(options);

    this.configSignOff = options.config('review:config_sign_off');
  }

  async getSignOffs() {
    return this.configSignOff
      .map(r => Object.assign({}, r, {
        id: `config-${r.name}`,
        logins: (r.logins || []).map(l => l.toLowerCase()),
        required: Number.isInteger(r.required) ? r.required : 1,
      }));
  }
}

export default ConfigSignOffProvider;

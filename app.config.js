const base = require('./app.json').expo;

module.exports = () => {
  if (process.env.EXPO_PUBLIC_AUDIT_QA !== '1') return base;
  return {
    ...base,
    name:'Tılsım Test',
    scheme:'tilsim-solitaire-qa',
    runtimeVersion:'1.0.9-audit.1',
    android:{...base.android,package:'com.edavank.tilsimsolitaire.qa'},
    plugins:[...base.plugins,'./plugins/withAuditBuildMemory'],
    extra:{...base.extra,auditQa:true},
  };
};

module.exports = {
    nodes: [
      require('./nodes/OpenMageSoap/OpenMageSoap.node.js').OpenMageSoap,
    ],
    credentials: [
      require('./credentials/OpenMageSoapApi.credentials.js').OpenMageSoapApi,
    ],
  };
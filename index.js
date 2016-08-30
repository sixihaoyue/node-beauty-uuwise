'use strict';
let core, config, logger, _ = require('lodash'),
    uuApi = require('./uuapi'),
    uuwise = module.exports, serviceName = 'uuwise';
let funAssert = (error) => {
  if (error) {
    logger.error(error);
    throw '[' + serviceName + '] ' + error;
  }
};

uuwise.init = (name, c, callback) => {
  serviceName = name;
  core = c;
  logger = core.getLogger(serviceName);
  config = core.getConfig(serviceName);
  uuApi.setSoftInfo(config.softid, config.softkey);
  uuApi.userLogin(config.user, config.password)
    .then((uid) => callback())
    .catch((error) => funAssert(error));
};

uuwise.getCode = (imgPath, codeType, callback) => {
  let code, error;
  uuApi.autoRecognition(imagePath, codeType)
    .then((response) => code = response)
    .catch((err) => error = err)
    .finally(() => callback(error, code));
}

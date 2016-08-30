"use strict";
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
};

uuwise.uninit = () => {

};
const { asFunction, asValue, createContainer } = require('awilix');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const util = require('util');
const fs = require('fs');
const Joi = require('joi');
const { v4 } = require('uuid');
const jsonBodyParser = require('body-parser').json;
const path = require('path');
const yaml = require('js-yaml');
const moment = require('moment');
const getUuidByString = require('uuid-by-string');
const request = require('request-promise-native');
const jwt = require('jsonwebtoken');

const logger = require('@ctm/money.node.logger');
const eventstore = require('@ctm/eventstore');
const platformEventsink = require('@ctm/ctm-eventsink');
const { bearerSecurityHandler } = require('@ctm/rewards.auth.verification');
const metrics = require('@ctm/money.node.metric');

const swaggerMetadata = require('swagger-tools/middleware/swagger-metadata');
const swaggerRouter = require('swagger-tools/middleware/swagger-router');
const swaggerSpec = require('swagger-tools').specs.v2;
const swaggerValidator = require('swagger-tools/middleware/swagger-validator');
const swaggerUi = require('swagger-tools/middleware/swagger-ui');
const swaggerSecurity = require('swagger-tools/middleware/swagger-security');

const getEnvVar = require('./utils/config');

const middlewareFactory = require('./rest/middleware');
const swaggerObjValidatorFactory = require('./rest/validate');

const keys = require('./core/keys');
const reducer = require('./core/reducer');
const createMembershipFactory = require('./core/createMembership');
const getMembershipHistoryFactory = require('./core/getMembershipHistory');
const getMembershipFactory = require('./core/getMembership');
const updateMembershipFactory = require('./core/updateMembership');

const generateDCGAuthToken = require('./utils/generateDCGAuthToken');

const healthControllerFactory = require('./rest/health');
const membershipControllerFactory = require('./rest/membership');
const eventControllerFactory = require('./rest/events');
const eventProducerFactory = require('./rest/eventSink');

const claimOrderApprovedHandlerFactory = require('./handlers/claimOrderApproved');
const claimOrderMatchedHandlerFactory = require('./handlers/claimOrderMatched');
const handlerHelper = require('./handlers/helper');

const membershipCreatedEventFactory = require('./events/membershipCreated');
const membershipFailedEventFactory = require('./events/membershipFailed');
const membershipExtendedEventFactory = require('./events/membershipExtended');
const eventSinkTransformFactory = require('./events/eventSinkTransform');

const providerFactory = require('./providers');
const DCGProviderFactory = require('./providers/DCG');

const constants = require('./constants');

const container = createContainer();

const swaggerObj = yaml.safeLoad(
  fs.readFileSync(path.resolve(__dirname, 'rest/swagger.yaml'), 'utf8'),
);

let envVariables;
try {
  envVariables = {
    PORT: getEnvVar('PORT', 3000),
    CORS_WHITELIST: getEnvVar('CORS_WHITELIST'),

    MONGO_URL: getEnvVar('MONGO_URL'),
    MONGO_USER: getEnvVar('MONGO_USER', ''),
    MONGO_PASSWORD: getEnvVar('MONGO_PASSWORD', ''),

    EVENTSINK_BASE_URI: getEnvVar('EVENTSINK_BASE_URI'),
    EVENTSINK_KEY: getEnvVar('EVENTSINK_KEY'),

    DCG_BASE_URI: getEnvVar('DCG_BASE_URI'),
    DCG_PRIVATE_KEY: getEnvVar('DCG_PRIVATE_KEY'),

    IDENTITY_SERVICE_HOST: getEnvVar('IDENTITY_SERVICE_HOST'),
  };
} catch (err) {
  logger.fatal({ err }, 'Missing environment variable');
  process.exit(1);
}

// External dependencies
container.register({
  util: asValue(util),
  log: asValue(logger),
  metrics: asValue(metrics),
  moment: asValue(moment),
  uuid: asValue(v4),
  request: asValue(request),
  Joi: asValue(Joi),
  platformEventsink: asValue(platformEventsink),
  getUuidByString: asValue(getUuidByString),
  jsonBodyParser: asValue(jsonBodyParser),
  swaggerObj: asValue(swaggerObj),
  swaggerSpec: asValue(swaggerSpec),
  swaggerMetadata: asValue(swaggerMetadata),
  swaggerRouter: asValue(swaggerRouter),
  swaggerValidator: asValue(swaggerValidator),
  swaggerUi: asValue(swaggerUi),
  swaggerSecurity: asValue(swaggerSecurity),
  helmet: asValue(helmet),
  cors: asValue(cors),
  jwt: asValue(jwt),
});

// App setup
container.register({
  eventStore: asFunction(({ config }) => {
    const authString =
      config.MONGO_USER && config.MONGO_PASSWORD
        ? `${config.MONGO_USER}:${config.MONGO_PASSWORD}@`
        : '';
    return eventstore({
      mongoUrl: `mongodb://${authString}${config.MONGO_URL}`,
    });
  }).singleton(),
  app: asFunction(express).singleton(),
  config: asValue(envVariables),
  constants: asValue(constants),
  middleware: asFunction(middlewareFactory),
  validateSwaggerObj: asFunction(swaggerObjValidatorFactory),
  bearerSecurityHandler: asFunction(({ config, log }) =>
    bearerSecurityHandler({
      identityServiceHost: config.IDENTITY_SERVICE_HOST,
      log,
    }),
  ),
});

// Core membership events
container.register({
  membershipCreatedEvent: asFunction(membershipCreatedEventFactory),
  membershipFailedEvent: asFunction(membershipFailedEventFactory),
  membershipExtendedEvent: asFunction(membershipExtendedEventFactory),
  updateMembership: asFunction(updateMembershipFactory),
  eventSinkTransform: asFunction(eventSinkTransformFactory),
});

// Core membership functionality
container.register({
  createMembership: asFunction(createMembershipFactory),
  getMembershipHistory: asFunction(getMembershipHistoryFactory),
  getMembership: asFunction(getMembershipFactory),
  reducer: asFunction(reducer),
  keys: asFunction(keys),
  generateDCGAuthToken: asFunction(generateDCGAuthToken),
});

// Providers
container.register({
  providers: asFunction(providerFactory),
  DCGMembership: asFunction(DCGProviderFactory),
});

// Event Handlers
container.register({
  claimOrderApprovedHandler: asFunction(claimOrderApprovedHandlerFactory),
  claimOrderMatchedHandler: asFunction(claimOrderMatchedHandlerFactory),
  handlerHelper: asFunction(handlerHelper),
});

// REST controllers
container.register({
  healthController: asFunction(healthControllerFactory),
  membershipController: asFunction(membershipControllerFactory),
  eventController: asFunction(eventControllerFactory),
  eventProducer: asFunction(eventProducerFactory),
});

module.exports = container;

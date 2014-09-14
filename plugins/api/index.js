/**
 * This example plugin demonstrates the various
 * ways to hook into Kalabox's application events.
 *
 * Each function is provided arguments based on the
 * scope of the event. Instead of documenting them
 * in each function, we'll define what they are here.
 *
 * @param docker: A dockerode object used to communicate with docker.
 * @param app: The application object with all the app and component config data.
 * @param component: The component that triggered the event.
 * @param done: A callback that should be triggered when the operation is done.
 */

/**
 * Triggered before all components are about to be started.
 */
exports.preStart = function(docker, app, done) {
};

/**
 * Triggered after all components have been started.
 */
exports.postStart = function(docker, app, done) {
};

/**
 * Triggered before each component is about to be started.
 */
exports.preStartComponent = function(docker, app, obj, done) {
};

/**
 * Triggered after each component as been started.
 */
exports.postStartComponent = function(docker, app, obj, done) {
};

/**
 * Triggered before all components are about to be stopped.
 */
exports.preStop = function(docker, app, done) {
};

/**
 * Triggered after all components have been stopped.
 */
exports.postStop = function(docker, app, done) {
};

/**
 * Triggered before each component is about to be stopped.
 */
exports.preStopComponent = function(docker, app, obj, done) {
};

/**
 * Triggered after each component as been stopped.
 */
exports.postStopComponent = function(docker, app, obj, done) {
};
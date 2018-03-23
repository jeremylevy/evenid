var assert = require('assert');
var Type = require('type-of-is');

var config = require('../../../config');

var areValidObjectIDs = require('../../../libs/validators/areValidObjectIDs')
                               (config.EVENID_MONGODB.OBJECT_ID_PATTERN);

module.exports = function (user, clientID) {
    assert.ok(Type.is(user, Object),
              'argument `user` must be an object');

    assert.ok(Type.is(user.authorized_clients, Array),
              'argument `user` must contains a property '
              + 'name `authorized_clients` set as array');

    assert.ok(areValidObjectIDs([clientID]),
              'argument `clientID` must be an ObjectID');
    
    // By default
    var flow = 'registration';

    // Check if user has authorized client
    user.authorized_clients.forEach(function (authorizedClient) {
        if (authorizedClient.client_id === clientID) {
            // Redirect to login flow if user 
            // has already authorized client
            flow = 'login';
        }
    });

    return flow;
};
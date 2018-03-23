var assert = require('assert');

var config = require('../../config');

module.exports = function (responseType, redirectionURI, redirectTo) {
    var redirectionURLPattern = '^' + redirectionURI 
                                    + '\\?code=[^&]+&state=.+$';

    if (responseType === 'token') {
        redirectionURLPattern = '^' + redirectionURI
                                    + '#'
                                    // Order is not guaranteed
                                    // so use lookahead assertions
                                    + '(?=.*access_token=(' 
                                        + '[^&]+'
                                        + ')&?)'
                                    + '(?=.*token_type=Bearer&?)'
                                    + '(?=.*expires_in=' 
                                        + '[0-9]+'
                                        + '&?)'
                                    + '(?=.*state=[^&]+&?)'
                                    + '(?=.*user_id=(' 
                                        + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                                        + ')&?)'; 
    }

    assert.ok(!!redirectTo.match(new RegExp(redirectionURLPattern)));
};
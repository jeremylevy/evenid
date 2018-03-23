var async = require('async');

var updateUser = require('../users/update');
var createAddress = require('../users/createAddress');
var createPhoneNumber = require('../users/createPhoneNumber');

module.exports = function (csrfToken, userID, request, cb) {
    async.auto({
        updateUser: function (cb) {
            updateUser(csrfToken, userID, request, function (err, user) {
                if (err) {
                    return cb(err);
                }

                cb(null, user);
            });
        },

        createMobilePhoneNumber: function (cb) {
            createPhoneNumber.call({
                phoneType: 'mobile'
            }, csrfToken, userID, request, function (err, mobilePhoneNumber) {
                
                if (err) {
                    return cb(err);
                }

                cb(null, mobilePhoneNumber);
            });
        },

        // Make sure phone numbers are created one after another
        // because phone number ID is retrived by parsing phone numbers
        // list
        createLandlinePhoneNumber: ['createMobilePhoneNumber', function (cb) {
            createPhoneNumber.call({
                phoneType: 'landline'
            }, csrfToken, userID, request, function (err, landlinePhoneNumber) {
                
                if (err) {
                    return cb(err);
                }

                cb(null, landlinePhoneNumber);
            });
        }],

        createAddress: function (cb) {
            createAddress(csrfToken, userID, request, function (err, address) {
                if (err) {
                    return cb(err);
                }

                cb(null, address);
            });
        }
    }, function (err, results) {
        var user = null;
        var mobilePhoneNumber = null;
        var landlinePhoneNumber = null;
        var address = null;

        if (err) {
            return cb(err);
        }

        user = results.updateUser;
        mobilePhoneNumber = results.createMobilePhoneNumber;
        landlinePhoneNumber = results.createLandlinePhoneNumber;
        address = results.createAddress;

        cb(null, {
            user: user,
            mobilePhoneNumber: mobilePhoneNumber,
            landlinePhoneNumber: landlinePhoneNumber,
            address: address
        });
    });
};
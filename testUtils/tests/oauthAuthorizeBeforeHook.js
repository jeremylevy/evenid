var async = require('async');
var mongoose = require('mongoose');

var userFields = ['first_name', 'last_name', 
                  'nickname', 'profil_photo',
                  'gender', 'date_of_birth', 
                  'place_of_birth', 'nationality',
                  'timezone'];

var fullFormFields = ['first_name', 'last_name', 'nickname', 'gender', 
                      'date_of_birth', 'place_of_birth', 'nationality',
                      'timezone',
                      'address_address_type', 'address_country', 
                      'address_postal_code', 'address_city', 
                      'address_address_line_1', 'address_full_name',
                      'shipping_address_address_type', 'shipping_address_country', 
                      'shipping_address_postal_code', 'shipping_address_city', 
                      'shipping_address_address_line_1', 'shipping_address_full_name', 
                      'billing_address_address_type', 'billing_address_country', 
                      'billing_address_postal_code', 'billing_address_city', 
                      'billing_address_address_line_1', 'billing_address_full_name',
                      'phone_number_country', 'phone_number_number',
                      'landline_phone_number_country', 'landline_phone_number_number',
                      'mobile_phone_number_country', 'mobile_phone_number_number', 'email'];

var formFieldsToAuthorize = ['first_name', 'last_name', 'nickname', 'gender', 
                             'date_of_birth', 'place_of_birth', 'nationality', 
                             'timezone',
                             'shipping_address', 'billing_address',
                             'landline_phone_number', 'mobile_phone_number'];

var invalidFormFields = ['date_of_birth', 'place_of_birth',
                         'nationality', 'timezone',
                         'shipping_address_address_type', 'shipping_address_country',
                         'billing_address_address_type', 'billing_address_country',
                         'landline_phone_number_number', 'mobile_phone_number_number',
                         'email', 'gender'];

var validFormData = function (user) {
    return function () {
        var formData = {};

        fullFormFields.forEach(function (formField) {
            // Use unique value for each fields in order to assert
            // that all fields are displayed when displaying authorized
            // clients
            formData[formField] = mongoose.Types.ObjectId().toString();

            if (formField === 'email') {
                formData[formField] = mongoose.Types.ObjectId().toString() + '@evenid.com';
                formData.password = user.password;
            }

            if (formField === 'nickname') {
                formData[formField] = mongoose.Types.ObjectId().toString();
            }

            if (formField === 'gender') {
                formData[formField] = 'female';
            }

            if (formField === 'date_of_birth') {
                formData.date_of_birth_month = '05';
                formData.date_of_birth_day = '18';
                formData.date_of_birth_year = '1992';
            }

            if (formField === 'landline_phone_number_number') {
                formData[formField] = '+33491081784';
                formData.landline_phone_number_country = 'FR';
            }

            if (formField === 'mobile_phone_number_number') {
                formData[formField] = '+33691081784';
                formData.mobile_phone_number_country = 'FR';
            }

            if (formField === 'phone_number_number') {
                formData[formField] = '+33491081784';
                formData.phone_number_country = 'FR';
            }

            if (['shipping_address_address_type', 
                 'billing_address_address_type',
                 'address_address_type'].indexOf(formField) !== -1) {

                formData[formField] = 'residential';
            }

            // We MUST use 'FR' `place_of_birth`
            // and `nationality` corresponding value
            // is fixed during GET authorizedClient test
            if (['place_of_birth',
                 'nationality',
                 'shipping_address_country', 
                 'billing_address_country',
                 'address_country'].indexOf(formField) !== -1) {

                formData[formField] = 'FR';
            }

            if (formField === 'timezone') {
                formData[formField] = 'Europe/Paris';
            }
        });

        return formData;
    };
};

module.exports = function (cb) {
    var getLoggedRequest = require('../getLoggedRequest');

    var createOauthClient = require('../clients/create');
    var createOauthRedirectionURI = require('../clients/createRedirectionURI');

    var context = this;
    var app = null;

    var client = null;
    var redirectionURI = null;

    var request = null;
    var accessToken = null;
    var csrfToken = null;
    var user = null;
    
    require('../../index')(function (err, _app) {
        if (err) {
            return cb(err);
        }

        app = _app;

        async.auto({
            getLoggedRequest: function (cb) {
                getLoggedRequest(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    request = resp.request;
                    accessToken = resp.accessToken;
                    csrfToken = resp.csrfToken;
                    user = resp.user;

                    cb(null, resp);
                });
            },

            createOauthClient: ['getLoggedRequest', function (cb, results) {
                createOauthClient(csrfToken, request, function (err, client) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, client);
                });
            }],

            findOauthClientID: ['createOauthClient', function (cb, results) {
                var oauthClient = results.createOauthClient;

                request.get('/clients/' + oauthClient.id).end(function (err, resp) {
                    var reg = /client_id:<\/h4><p>([a-f0-9]+)<\/p>/;
                    var clientID = null;

                    if (err) {
                        return cb(err);
                    }

                    clientID = resp.text.match(reg)[1];
                    oauthClient.client_id = clientID;

                    cb(null, clientID);
                });
            }],

            createOauthRedirectionURICode: ['createOauthClient', function (cb, results) {
                var oauthClient = results.createOauthClient;
                var redirectionURI = {
                    response_type: 'code'
                };

                if (context.redirectionURI) {
                    Object.keys(context.redirectionURI).forEach(function (k) {
                        redirectionURI[k] = context.redirectionURI[k];
                    });
                }

                createOauthRedirectionURI.call({
                    redirectionURI: redirectionURI
                }, csrfToken, oauthClient.id,
                request, function (err, oauthRedirectionURI) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, oauthRedirectionURI);
                });
            }],

            createOauthRedirectionURIToken: ['createOauthClient', function (cb, results) {
                var oauthClient = results.createOauthClient;
                var redirectionURI = {
                    redirect_uri: 'https://' 
                                    + mongoose.Types.ObjectId().toString() 
                                    + '.com',
                    response_type: 'token'
                };

                if (context.redirectionURI) {
                    Object.keys(context.redirectionURI).forEach(function (k) {
                        redirectionURI[k] = context.redirectionURI[k];
                    });
                }

                createOauthRedirectionURI.call({
                    redirectionURI: redirectionURI
                }, csrfToken, oauthClient.id, request, function (err, oauthRedirectionURI) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, oauthRedirectionURI);
                });
            }]
        }, function (err, results) {
            var client = null;
            var redirectionURI = null;
            var redirectionURICode = null;
            var redirectionURIToken = null;

            if (err) {
                return cb(err);
            }

            client = results.createOauthClient;
            redirectionURI = results.createOauthRedirectionURICode;
            redirectionURICode = results.createOauthRedirectionURICode;
            redirectionURIToken = results.createOauthRedirectionURIToken;

            cb(null, {
                app: app,
                request: request,
                csrfToken: csrfToken,
                accessToken: accessToken,
                user: user,
                client: client,
                redirectionURI: redirectionURI,
                redirectionURICode: redirectionURICode,
                redirectionURIToken: redirectionURIToken,
                userFields: userFields,
                fullFormFields: fullFormFields,
                formFieldsToAuthorize: formFieldsToAuthorize,
                invalidFormFields: invalidFormFields,
                validFormData: validFormData(user)
            });
        });
    });
};
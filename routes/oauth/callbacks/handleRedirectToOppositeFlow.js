var assert = require('assert');
var Type = require('type-of-is');

var querystring = require('querystring');

module.exports = function (clientName, req, res) {
    assert.ok(Type.is(clientName, String),
            'argument `clientName` must be a string');

    assert.ok(clientName.length > 0,
            'argument `clientName` must be a non-empty string');

    assert.ok(req && Type.is(req.query, Object) 
            && Type.is(req.flash, Function) 
            && req.i18n && Type.is(req.i18n.__, Function),
            'argument `req` must be an Express request object');

    assert.ok(res && Type.is(res.redirect, Function),
            'argument `res` must be an Express response object');

    var stringifiedQS = '';
    var flow = req.query.flow;
    var notification = flow === 'registration' 
        ? req.i18n.__('You are already registered on %s.', clientName)
        : req.i18n.__('You are not registered on %s.', clientName);

    // In order to change it in strinfied querystring
    req.query.flow = flow === 'registration' ? 'login' : 'registration';

    stringifiedQS = querystring.stringify(req.query);

    req.flash('notification', notification);
    req.flash('notification.type', flow === 'registration' ? 'success' : 'error');
    // We don't display test account btn 
    // if there is other notification that this one
    req.flash('redirectToOppositeFlow', 'true');

    // Reset to real value
    req.query.flow = flow;

    res.redirect(req.path + '?' + stringifiedQS);
};
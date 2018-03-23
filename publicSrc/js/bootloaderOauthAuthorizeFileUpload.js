var $ = require('jquery');

var app = require('./oauth/fileUpload');

window.app = app;

$(function () {
    app.ajaxSetup.load();

    app.fieldUsedBy.load('oauthAuthorizeFlowProfilPhoto');
});
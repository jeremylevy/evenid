var $ = require('jquery');

var app = require('./oauth');

window.app = app;

$(function () {
    app.ajaxSetup.load();

    app.learnMoreDialog.load();
    app.lightbox.load();

    /* Order matter here,
       given that `togglePasswordVisibility`
       add an input which have a placeholder */
    app.togglePasswordVisibility.load();
    // Enable placeholder for old browsers
    app.inputPlaceholder.load();
    // Focus on first input
    app.firstInputFocus.focus({
        withoutScrolling: true
    });
    /* END */
    
    app.authorize.load();

    app.recaptcha.load();

    app.isRegistered.load();

    app.fieldUsedBy.load('oauthAuthorizeFlow');
});
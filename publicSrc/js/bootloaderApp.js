var $ = require('jquery');

var app = require('./app');

window.app = app;

$(function () {
    app.ajaxSetup.load();

    app.cookieBanner.load();
    
    app.header.load();

    // Load country choice
    app.footer.load();

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

    app.sweetAlertLoader.load();

    // `true`: hide alert success after timeout
    app.alertSetup.load(true);

    app.fieldUsedBy.load('app');

    app.authorizedClientsSocialTipsy.load();
    app.authorizedClientsEntitiesTypeCat.load();

    app.recaptcha.load();
});
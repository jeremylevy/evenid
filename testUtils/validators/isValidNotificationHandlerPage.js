var IsInput = require('./isInput');
var IsSelect = require('./isSelect');

module.exports = function (notificationHandler, resp) {
    var isInput = IsInput(resp);
    var isSelect = IsSelect(resp);

    /* Make sure notification handler form is filled */
    Object.keys(notificationHandler).forEach(function (notificationHandlerKey) {
        if (notificationHandlerKey === 'url') {
            isInput('url', 
                    notificationHandlerKey, 
                    notificationHandler[notificationHandlerKey]);
        }

        if (notificationHandlerKey === 'event_type') {
            isSelect('event_type', 
                     notificationHandler[notificationHandlerKey], 
                     'selected');
        }
    });
};
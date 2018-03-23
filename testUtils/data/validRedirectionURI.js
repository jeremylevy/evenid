var mongoose = require('mongoose');

module.exports = function (csrfToken) {
    return {
        redirect_uri: 'http://bar' + mongoose.Types.ObjectId().toString() + '.com',
        authorizations: ['emails', 'first_name', 
                         'last_name', 'nickname', 
                         'profil_photo', 'gender', 
                         'date_of_birth', 'place_of_birth', 
                         'nationality', 'timezone', 
                         'phone_numbers', 'addresses'],
        authorization_flags: {
            phone_numbers: ['landline_phone_number', 'mobile_phone_number'],
            addresses: 'separate_shipping_billing_address'
        },
        response_type: 'code',
        _csrf: csrfToken
    };
};
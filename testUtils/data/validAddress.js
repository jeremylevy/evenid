var mongoose = require('mongoose');

module.exports = function (csrfToken) {
    return {
        address_type: 'residential',
        full_name: 'Sheldon Cooper',
        address_line_1: '17 east street pico',
        address_line_2: 'Second floor',
        access_code: '4049',
        city: 'San-Francisco',
        state: 'California',
        postal_code: '749509',
        country: 'US',
        _csrf: csrfToken
    };
};
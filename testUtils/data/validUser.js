var mongoose = require('mongoose');

module.exports = function (csrfToken) {
    return {
        // Needs to be unique
        nickname: mongoose.Types.ObjectId().toString(),
        first_name: 'Sheldon',
        last_name: 'Cooper',
        gender: 'male',
        date_of_birth_month: '5',
        date_of_birth_day: '18',
        date_of_birth_year: '1992',
        place_of_birth: 'FR',
        nationality: 'FR',
        timezone: 'Europe/Paris',
        _csrf: csrfToken
    };
};
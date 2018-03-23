module.exports = function (user, address, mobilePhoneNumber, landlinePhoneNumber) {
    return function (formFieldsToAuthorize, isInput, isSelect) {
        formFieldsToAuthorize.forEach(function (field) {
            var inputType = 'text';
            var dateOfBirth = null;
            var selectValue = null;

            if (['date_of_birth'].indexOf(field) !== -1) {
                isSelect('date_of_birth_month', user.date_of_birth_month, 'selected');
                isSelect('date_of_birth_day', user.date_of_birth_day, 'selected');
                isSelect('date_of_birth_year', user.date_of_birth_year, 'selected');

                return;
            }

            if (['email',
                 'place_of_birth', 
                 'nationality',
                 'timezone', 
                 'shipping_address',
                 'billing_address',
                 'landline_phone_number',
                 'mobile_phone_number'].indexOf(field) !== -1) {

                if (['email', 
                     'place_of_birth', 
                     'nationality',
                     'timezone'].indexOf(field) !== -1) {

                    selectValue = user[field];
                }

                if (['shipping_address', 
                     'billing_address'].indexOf(field) !== -1) {

                    selectValue = address.id;
                }

                if (['landline_phone_number', 
                     'mobile_phone_number'].indexOf(field) !== -1) {

                    selectValue = field === 'mobile_phone_number' 
                        ? mobilePhoneNumber.id 
                        : landlinePhoneNumber.id;
                }
                
                isSelect(field, selectValue);

                return;
            }

            if (['gender'].indexOf(field) !== -1) {
                inputType = 'radio';
            }

            isInput(inputType, field, user[field]);
        });
    };
};
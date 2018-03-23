module.exports = function (fullFormFields, isInput, isSelect) {
    fullFormFields.forEach(function (field) {
        var inputType = 'text';
        
        if (['gender', 
             'shipping_address_address_type', 
             'billing_address_address_type'].indexOf(field) !== -1) {
            
            inputType = 'radio';
        }

        if (['landline_phone_number_number', 
             'mobile_phone_number_number'].indexOf(field) !== -1) {

            inputType = 'tel';
        }

        if (['date_of_birth'].indexOf(field) !== -1) {
            
            isSelect('date_of_birth_month', '');
            isSelect('date_of_birth_day', '');
            isSelect('date_of_birth_year', '');

            return;
        }

        if (['email',
             'place_of_birth', 
             'nationality',
             'timezone',
             'shipping_address_country', 
             'billing_address_country',
             'landline_phone_number_country',
             'mobile_phone_number_country'].indexOf(field) !== -1) {

            isSelect(field, '');

            return;
        }

        if ('profil_photo' === field) {

            return;
        }

        isInput(inputType, field, '');
    });
};
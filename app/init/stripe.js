const dotenv = require('dotenv');
dotenv.config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const knex = require('knex')({
    client: 'mysql',
    connection: {
      host : process.env.DATABASE_HOST,
      port : process.env.DATABASE_PORT,
      user : process.env.DATABASE_USER_NAME,
      password : process.env.DATABASE_PASSWORD ? process.env.DATABASE_PASSWORD : '',
      database : process.env.DATABASE_NAME
    }
});

exports.createCheckoutSessionURLForType1 = async (
    email,
    firstname,
    lastname,
    mobileNumber,
    accountType,
    password,
    registrationType
) => {
    let packageData = null
    if(accountType == 'student') {
        packageData = await knex("subscription-packages").select('*').where({ name: 'student' })
    } else {
        packageData = await knex("subscription-packages").select('*').where({ name: 'family' })
    }
    console.log(packageData)
    const session = await stripe.checkout.sessions.create({
        line_items: [
            {
                price: packageData[0].priceId,
                quantity: 1
            },
        ],
        metadata: {
            email,
            firstname,
            lastname,
            mobileNumber,
            accountType,
            password,
            registrationType
        },
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${true}&type=${'normal'}&email=${email}&password=${password}`,
        cancel_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${false}`,
    });
    console.log(session)
    return session.url
}

exports.createCheckoutSessionURLForType2 = async (
    email,
    firstname,
    lastname,
    profilePic,
    accountType,
    registrationType
) => {
    let packageData = null
    if(accountType == 'student') {
        packageData = await knex("subscription-packages").select('*').where({ name: 'student' })
    } else {
        packageData = await knex("subscription-packages").select('*').where({ name: 'family' })
    }
    const session = await stripe.checkout.sessions.create({
        line_items: [
            {
                price: packageData[0].priceId,
                quantity: 1
            }
        ],
        metadata: {
            email,
            firstname,
            lastname,
            profilePic,
            accountType,
            registrationType
        },
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${true}&type=${'google'}&email=${email}`,
        cancel_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${false}`,
    });
    console.log(session)
    return session.url
}

exports.createCheckoutSessionURLForType3 = async (
    firstname,
    lastname,
    email,
    phoneNumber,
    companyName,
    orgType,
    mailingAddStreetName,
    mailingAddCityName,
    mailingAddStateName,
    mailingAddZip,
    billingAddStreetName,
    billingAddCityName,
    billingAddStateName,
    billingAddZip,
    isMailAndBillAddressSame,
    profilePic,
    accountType,
    registrationType
) => {
    const packageData = await knex("subscription-packages").select('*').where({ name: 'company' })
    const session = await stripe.checkout.sessions.create({
        line_items: [
            {
                price: packageData[0].priceId,
                quantity: 1
            }
        ],
        metadata: {
            firstname,
            lastname,
            email,
            phoneNumber,
            companyName,
            orgType,
            mailingAddStreetName,
            mailingAddCityName,
            mailingAddStateName,
            mailingAddZip,
            billingAddStreetName,
            billingAddCityName,
            billingAddStateName,
            billingAddZip,
            isMailAndBillAddressSame,
            profilePic,
            accountType,
            registrationType
        },
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${true}&type=${'google'}&email=${email}`,
        cancel_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${false}`,
    });
    console.log(session)
    return session.url
}

exports.createCheckoutSessionURLForType4 = async (
    email,
    firstname,
    lastname,
    mobileNumber,
    accountType,
    password,
    companyName,
    phoneNumber,
    orgType,
    mailingAddStreetName,
    mailingAddCityName,
    mailingAddStateName,
    mailingAddZip,
    billingAddStreetName,
    billingAddCityName,
    billingAddStateName,
    billingAddZip,
    isMailAndBillAddressSame,
    registrationType
) => {
    const packageData = await knex("subscription-packages").select('*').where({ name: 'company' })
    const session = await stripe.checkout.sessions.create({
        line_items: [
            {
                price: packageData[0].priceId,
                quantity: 1
            }
        ],
        metadata: {
            email,
            firstname,
            lastname,
            mobileNumber,
            accountType,
            password,
            companyName,
            phoneNumber,
            orgType,
            mailingAddStreetName,
            mailingAddCityName,
            mailingAddStateName,
            mailingAddZip,
            billingAddStreetName,
            billingAddCityName,
            billingAddStateName,
            billingAddZip,
            isMailAndBillAddressSame,
            registrationType
        },
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${true}&type=${'normal'}&email=${email}&password=${password}`,
        cancel_url: `${process.env.FRONTEND_BASE_URL}/auth/stripe-status?success=${false}`,
    });
    console.log(session)
    return session.url
}
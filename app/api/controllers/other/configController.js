exports.config_get = (req, res) => {
    //TODO: Read config file from database or s3 
    const config = {
    }
    // Check if guest user registration is open. 
    config.usersOpenRegistration = process.env.USERS_OPEN_REGISTRATION
    config.isTranslationEnabled = process.env.DEEPL_API_KEY ? true : false
    res.status(200);
    res.json(config);
};

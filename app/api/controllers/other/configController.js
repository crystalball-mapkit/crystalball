exports.config_get = (req, res) => {
    //TODO: Read config file from database or s3 
    const config = {
    }
    // Check if guest user registration is open. 
    config.usersOpenRegistration = process.env.USERS_OPEN_REGISTRATION
    res.status(200);
    res.json(config);
};

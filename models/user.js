const mongo = require("mongoose")

module.exports = mongo.model(
    "User",
    new mongo.Schema({
        user: String,
        pass: String,
    })
);
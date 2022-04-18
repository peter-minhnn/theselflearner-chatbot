const controller = require("../controllers/chat.controller");

module.exports = function (app) {
    app.post("/api/chat/isLoggedIn", controller.isLoggedIn);// User Sign Up
};

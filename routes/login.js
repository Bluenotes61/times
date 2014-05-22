var db = require("./db.js");

exports.index = function(req, res) {
  req.session.loggedinUser = null;
  res.render("login", {title:"040 - Tidbokning"});
};

exports.post = function(req, res) {
  var b = req.body;
  db.loginUser(b.username, b.password, function(err) {
    if (err.length == 0) {
      req.session.loggedinUser = b.username;
      res.redirect("/");
    }
    else
      res.render("login", {title:"040 - Tidbokning", username:b.username});
  });
};

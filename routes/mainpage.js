var db = require("./db.js");

exports.index = function(req, res) {
/*  if (!req.session.loggedinUser)
    res.redirect("/login");
  else {
*/    res.render("index", {title:"Boka tider", username:req.session.loggedinUser});
//  }
};

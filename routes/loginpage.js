var db = require("../helpers/db.js");
var Q = require("q");
var common = require("../helpers/common.js");

/*** Render page ***/
exports.index = function(req, res) {
  common.getUser(req, res).then(
    function(user){
      res.redirect("/"); 
    },
    function(err) {
      getOwner(req.headers.host).then(
        function(owner) {
          res.render("login", {
            owner:owner,
            host:req.headers.host
          });
        },
        function(err) {
          res.send(err);
        }
      );
    }
  );
};

exports.logout = function(req, res) {
  getOwner(req.headers.host).then(
    function(owner) {
      common.delCookie(req, res, "timesguid");
      req.session.user = null;
      res.render("login", {
        owner:owner
      });
    }
  );
}

/*** redirect to mainpage after sucessful login ***/
exports.login = function(req, res) {
  db.runQuery("select * from users where username=? AND password=?", [req.body.username, req.body.password]).then(
    function(rows) {
      if (rows.length == 0) {
        getOwner(req.headers.host).then(
          function(owner) {
            res.render("login", { 
              owner:owner,
              badlogin:true
            });
          }
        );
      }
      else {
        db.runQuery("select * from owners where id=?", [rows[0].ownerid]).then(
          function(owners) {
            rows[0].owner = owners[0];
            req.session.user = rows[0];
            common.setCookie(req, res, "timesguid", rows[0].guid, 365*24*3600*1000)
            res.redirect("/");
          }
        );
      }
    },
    function(err) {
      res.end(err);
    }
  );
}

function getOwner(host) {
  var d = Q.defer();
  var subdomain = host.split('.')[0];
  db.runQuery("select * from owners where subdomain=? or id=1 order by id desc", [subdomain]).then(
    function(owners) {
      d.resolve(owners[0]);
    },
    function(err) {
      d.reject(err);
    }
  );
  return d.promise;
}

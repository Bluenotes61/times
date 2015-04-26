/**
 * Module containtng common ajax functionality
 * @module helpers/common
 */

var db = require("../helpers/db.js"); 
var Cookies = require("cookies");
var Q = require("q");
var fs = require('fs');
var path = require('path');
var common = this;

exports.getUser = function(req, res) {
  var d = Q.defer();
  if (req.session.user) { 
    d.resolve(req.session.user);
  }
  else {
    var guid = common.getCookie(req, res, "timesguid");
    db.runQuery("select * from users where guid=?", [guid]).then(
      function(rows) {
        if (rows.length > 0) {
          var user = rows[0];
          db.runQuery("select * from owners where id=?", [user.ownerid]).then(
            function(owners) {
              user.owner = owners[0];
              req.session.user = user;
              common.setCookie(req, res, "timesguid", user.guid, 365*24*3600*1000)
              d.resolve(user); 
            },
            function(err) {
              d.reject(err);
            }
          );
        }
        else {
          d.reject("No user");
        }
      },
      function(err) {
        d.reject(err);
      }
    ),
    function(err) {
      d.reject(err);
    }
  }
  return d.promise;
}

/**
 * Sets a client cookie
 * @param {Request} req
 * @param {Response} res
 * @param {String} name Name of cookie
 * @param {String} val  Value of cookie
 */
exports.setCookie = function(req, res, name, val, timeout){
  var cookies = new Cookies(req, res);
  var timeout = (timeout || 4*3600*1000);
  req.session.cookie.maxAge = timeout;
  cookies.set(name, val, {expires:new Date(new Date().getTime() + timeout)});
};

/**
 * Deletes a client cookie
 * @param {Request} req
 * @param {Response} res
 * @param {String} name Name of cookie
 */
exports.delCookie = function(req, res, name){
  var cookies = new Cookies(req, res);
  req.session.cookie.maxAge = 0;
  cookies.set(name, null, {expires:new Date(new Date().getTime() - 10)});
};

/**
 * Gets a client cookie value
 * @param {Request} req
 * @param {Response} res
 * @param {String} name Name of cookie
 * @return {String} Value of cookie
 */
exports.getCookie = function(req, res, name) {
  var cookies = new Cookies(req, res);
  return cookies.get(name);
}

/**
 * Formats a date object to string YYYY-MM-DD
 * @param  {Date} d Date object to format
 * @return {String}   Resulting date in string format
 */
exports.formatDate = function(d) {
  var d = new Date();
  var y = d.getFullYear().toString();
  var m = (d.getMonth()+1).toString();
  var d  = d.getDate().toString();
  return y + "-" + (m[1] ? m : "0" + m[0]) + "-" + (d[1] ? d : "0" + d[0]);
};

/**
 * Log an message to the database and to the console
 * @param  {Request} req Request object for retrieving the loggen in user
 * @param  {String} subject Message subject
 * @param  {String} mess Message
 */
exports.logError = function(req, subject, mess) {
  if (subject && subject.length > 100) subject = subject.substring(0, 100);
  if (mess && mess.length > 2000) mess = mess.substring(0, 2000);
  var userid = (req ? (req.session ? (req.session.user ? req.session.user.id : 0) : 0) : 0);
  db.runQuery("insert into errorlog (userid, logdate, subject, message) values(?, NOW(), ?, ?)", [userid, subject, String(mess)]).then(
    function() {},
    function(err) {
      console.log("Error when logging error message: " + err);
    }
  );
}

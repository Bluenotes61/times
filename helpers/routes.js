var express = require('express');
var router = express.Router();

var loginpage = require("../routes/loginpage.js");
var mainpage = require("../routes/mainpage.js");
var gridutils = require("../helpers/gridutils.js");

router.get("/login", loginpage.index);
router.get("/logout", loginpage.logout);
router.post("/login", loginpage.login);

router.get("/", mainpage.index);


/*** Mainpage ajax functions ***/
router.get("/getendedtimes", mainpage.getEndedTimes);
router.post("/saveedittime", mainpage.saveTime);

router.post("/getcustomers", mainpage.getCustomers);
router.post("/getprojects", mainpage.getProjects);
router.post("/getactivities", mainpage.getActivities);

router.post("/startactivity", mainpage.startActivity);
router.post("/stopactivity", mainpage.stopActivity);
router.post("/registeractivity", mainpage.registerActivity);
router.post("/getactiveactivity", mainpage.getActiveActivity);
router.post("/getlatestactivities", mainpage.getLatestActivities);
router.post("/getlastactivity", mainpage.getLastActivity);

router.get("/getusers", mainpage.getUsers);
router.post("/edituser", mainpage.editUser);

router.post("/createcustomer", mainpage.createCustomer);
router.post("/createproject", mainpage.createProject);
router.post("/createActivity", mainpage.createActivity);
router.post("/deletecustomer", mainpage.deleteCustomer);
router.post("/deleteproject", mainpage.deleteProject);
router.post("/deleteactivity", mainpage.deleteActivity);

module.exports = router;

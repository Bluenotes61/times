var express = require('express');
var router = express.Router();

var loginpage = require("../routes/loginpage.js");
var mainpage = require("../routes/mainpage.js");

router.get("/login", loginpage.index);
router.post("/login", loginpage.post);

router.get("/", mainpage.index);


/*** Mainpage ajax functions ***/
router.get("/getendedtimes", mainpage.getEndedTimes);
router.get("/getcompilationtimes", mainpage.getCompilationTimes);
router.get("/getcompilationdetails", mainpage.getCompilationDetails);
router.post("/saveedittime", mainpage.saveTime);

router.get("/getcustomers", mainpage.getCustomers);
router.get("/getprojects", mainpage.getProjects);
router.get("/getactivities", mainpage.getActivities);

router.get("/startactivity", mainpage.startActivity);
router.get("/stopactivity", mainpage.stopActivity);
router.get("/registeractivity", mainpage.registerActivity);
router.get("/getactiveactivity", mainpage.getActiveActivity);
router.get("/getlatestactivities", mainpage.getLatestActivities);
router.get("/getlastactivity", mainpage.getLastActivity);

router.get("/createcustomer", mainpage.createCustomer);
router.get("/createproject", mainpage.createProject);
router.get("/createActivity", mainpage.createActivity);
router.get("/deletecustomer", mainpage.deleteCustomer);
router.get("/deleteproject", mainpage.deleteProject);
router.get("/deleteactivity", mainpage.deleteActivity);

module.exports = router;

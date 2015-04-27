$(document).ready(function(){

  var elapsedTimer = 0;

  /*** Info about the current activity ***/
  var activeActivity = {
    id : 0,
    customer : "",
    project : "",
    activity : "",
    activityid: 0,
    comment : "",
    starttime : null
  };

  /*** Create objects for dropdowns ***/
  var latestDDStart = getDDObject(".start .select2.latest", "Snabbval - Senaste aktiviteter", getLatestActivitiesData);
  var customersDDStart = getDDObject(".start .select2.customer", "Välj " + titles.lev1, getCustomersData);
  var projectsDDStart = getDDObject(".start .select2.project", "Välj " + titles.lev2, getProjectsData);
  var activitiesDDStart = getDDObject(".start .select2.activity", "Välj " + titles.lev3, getActivitiesData);
  var latestDDRegister = getDDObject(".register .select2.latest", "Snabbval - Senaste aktiviteter", getLatestActivitiesData);
  var customersDDRegister = getDDObject(".register .select2.customer", "Välj " + titles.lev1, getCustomersData);
  var projectsDDRegister = getDDObject(".register .select2.project", "Välj " + titles.lev2, getProjectsData);
  var activitiesDDRegister = getDDObject(".register .select2.activity", "Välj " + titles.lev3, getActivitiesData);


  function init() {

    setupSelectBoxes();

    assignEvents();

    var now = new Date();
    var start = new Date();
    start.setMonth(start.getMonth() - 1);

    $("#ended input.from").val(formatDate(start));
    $("#ended input.to").val(formatDate(now));
    $("#ended input.from, #ended input.to").change(function(){
      $("#endedgrid").trigger("reloadGrid");
    }).datepicker({dateFormat:'yy-mm-dd'});
    $("#ended .curruser").change(function(){
      if ($(this).val() == "_all_") $("#endedgrid").showCol("username");
      else $("#endedgrid").hideCol("username");
      $("#endedgrid").trigger("reloadGrid");
    });

    initGrids();
    
    $(".register .activitydate .adate").datepicker({dateFormat:'yy-mm-dd'});
    $("#gs_startdate").datepicker({dateFormat:'yy-mm-dd', onSelect:function(){
      $("#gs_startdate").trigger("keydown");
    }});

    $(window).bind('resize', function() {
      $("#endedgrid").setGridWidth($("#ended").width());
    });

    getActiveActivity().then(function(){
      initActivityCounter();  
    });

    showLastActivity();
    
    $(".register .activitydate .adate").val(formatDate(new Date()));
  }

  function setupSelectBoxes() {
    // Get initial data for the first dropdowns
    latestDDStart.refreshData();
    latestDDRegister.refreshData();
    customersDDStart.refreshData();
    customersDDRegister.refreshData();

    // Disable dropdowns
    projectsDDStart.select2("enable", false);
    activitiesDDStart.select2("enable", false);
    projectsDDRegister.select2("enable", false);
    activitiesDDRegister.select2("enable", false);

    // Change start quick selection propagates downwards
    latestDDStart.on("change", function(){
      if ($(this).select2("data") != null) {
        var vals = $(this).select2("data").id.split('|');
        customersDDStart.select2("val", vals[0]);
        projectsDDStart.select2("enable", true);
        projectsDDStart.refreshData(vals[0], function(){
          projectsDDStart.select2("val", vals[1]);
          activitiesDDStart.select2("enable", true);
          activitiesDDStart.refreshData(vals[1], function(){
            activitiesDDStart.select2("val", vals[2]);
          });
        });
        $(this).select2("data", null);
      }
    });

    // Change register quick selection propagates downwards
    latestDDRegister.on("change", function(){
      if ($(this).select2("data") != null) {
        var vals = $(this).select2("data").id.split('|');
        customersDDRegister.select2("val", vals[0]);
        projectsDDRegister.select2("enable", true);
        projectsDDRegister.refreshData(vals[0], function(){
          projectsDDRegister.select2("val", vals[1]);
          activitiesDDRegister.select2("enable", true);
          activitiesDDRegister.refreshData(vals[1], function(){
            activitiesDDRegister.select2("val", vals[2]);
          });
        });
        $(this).select2("data", null);
      }
    });

    // Change start customer. Refresh projects dropdown
    customersDDStart.on("change", function(){
      projectsDDStart.select2("data", null);
      activitiesDDStart.select2("data", null);
      activitiesDDStart.select2("enable", false);
      if ($(this).select2("data") == null) {
        projectsDDStart.select2("enable", false);
      }
      else {
        projectsDDStart.select2("enable", true);
        var id = $(this).select2("data").id;
        if (id == -1) { // Create new customer
          var name = $(this).select2("data").text;
          ajax.post('/createcustomer', {name:name}).then(
            function(response) {
              id = response.id;
              customersDDStart.refreshData();
              customersDDStart.select2("data", {id:id, text:name});
              customersDDRegister.refreshData();
              projectsDDStart.refreshData(id);
            }
          );
        }
        else {
          projectsDDStart.refreshData(id);
        }
      }
    });

    // Change register customer. Refresh project dropdown
    customersDDRegister.on("change", function(){
      projectsDDRegister.select2("data", null);
      activitiesDDRegister.select2("data", null);
      activitiesDDRegister.select2("enable", false);
      if ($(this).select2("data") == null) {
        projectsDDRegister.select2("enable", false);
      }
      else {
        projectsDDRegister.select2("enable", true);
        var id = $(this).select2("data").id;
        if (id == -1) { // Create new customer
          var name = $(this).select2("data").text;
          ajax.post('/createcustomer', {name:name}).then(
            function(response) {
              id = response.id;
              customersDDRegister.refreshData();
              customersDDRegister.select2("data", {id:id, text:name});
              customersDDStart.refreshData();
              projectsDDRegister.refreshData(id);
            }
          );
        }
        else {
          projectsDDRegister.refreshData(id);
        }
      }
    });

    // Change start project. Refresh activities dropdown
    projectsDDStart.on("change", function(){
      activitiesDDStart.select2("data", null);
      if ($(this).select2("data") == null) {
        activitiesDDStart.select2("enable", false);
      }
      else {
        activitiesDDStart.select2("enable", true);
        var id = $(this).select2("data").id;
        if (id == -1) { // Create new project
          var name = $(this).select2("data").text;
          var customerid = customersDDStart.select2("data").id;
          ajax.post('/createproject', {customerid:customerid, name:name}).then(
            function(response) {
              id = response.id;
              projectsDDStart.refreshData(customerid);
              projectsDDStart.select2("data", {id:id, text:name});
              activitiesDDStart.refreshData(id);
            }
          );
        }
        else {
          activitiesDDStart.refreshData(id);
        }
      }
    });

    // Change register project. Refresh activities dropdown
    projectsDDRegister.on("change", function(){
      activitiesDDRegister.select2("data", null);
      if ($(this).select2("data") == null) {
        activitiesDDRegister.select2("enable", false);
      }
      else {
        activitiesDDRegister.select2("enable", true);
        var id = $(this).select2("data").id;
        if (id == -1) { // Create new project
          var name = $(this).select2("data").text;
          var customerid = customersDDRegister.select2("data").id;
          ajax.post('/createproject', {customerid:customerid, name:name}).then(
            function(response) {
              id = response.id;
              projectsDDRegister.refreshData(customerid);
              projectsDDRegister.select2("data", {id:id, text:name});
              activitiesDDRegister.refreshData(id);
            }
          );
        }
        else {
          activitiesDDRegister.refreshData(id);
        }
      }
    });

    // Change start activity.
    activitiesDDStart.on("change", function(){
      if ($(this).select2("data") != null) {
        var id = $(this).select2("data").id;
        if (id == -1) { // Create new project
          var name = $(this).select2("data").text;
          var projectid = projectsDDStart.select2("data").id;
          ajax.post('/createactivity', {projectid:projectid, name:name}).then(
            function(response) {
              id = response.id;
              activitiesDDStart.refreshData(projectid);
              activitiesDDStart.select2("data", {id:id, text:name});
            }
          );
        }
      }
    });

    // Change register activity.
    activitiesDDRegister.on("change", function(){
      if ($(this).select2("data") != null) {
        var id = $(this).select2("data").id;
        if (id == -1) { // Create new project
          var name = $(this).select2("data").text;
          var projectid = projectsDDRegister.select2("data").id;
          ajax.post('/createactivity', {projectid:projectid, name:name}).then(
            function(response) {
              id = response.id;
              activitiesDDRegister.refreshData(projectid);
              activitiesDDRegister.select2("data", {id:id, text:name});
            }
          );
        }
      }
    });
  }


  /*** Functions for gettiing data for dropdowns */
  function getLatestActivitiesData(dummy, callback){
    ajax.post('/getlatestactivities', {}).then(
      function(rows) {
        var latestData = [];
        for (var i=0; i < rows.length; i++) {
          var val = rows[i].cid + "|" + rows[i].pid + "|" + rows[i].aid;
          var text = rows[i].cname + " / " + rows[i].pname + " / " + rows[i].aname;
          latestData.push({id:val, text: text});
        }
        callback(latestData);
      }
    );
  }

  function getCustomersData(dummy, callback) {
    ajax.post('/getcustomers', {}).then(
      function(rows) {
        var custData = [];
        for (var i=0; i < rows.length; i++)
          custData.push({id:rows[i].value, text:rows[i].label});
        callback(custData);
      }
    );
  }

  function getProjectsData(customerid, callback) {
    ajax.post('/getprojects', {customer: customerid}).then(
      function(rows) {
        var projectsData = [];
        for (var i=0; i < rows.length; i++)
          projectsData.push({id:rows[i].value, text:rows[i].label});
        callback(projectsData);
      }
    );
  }

  function getActivitiesData(projectid, callback) {
    ajax.post('/getactivities', {project: projectid}).then(
      function(rows) {
        var actData = [];
        for (var i=0; i < rows.length; i++)
          actData.push({id:rows[i].value, text:rows[i].label});
        callback(actData);
      }
    );
  }


  /*** Assign events to html items ***/
  function assignEvents() {

    // Tab clicks
    $("#tabs a.active").click(function(){
      $(".register .activitydate .adate").val(formatDate(new Date()));
      $("#tabs a").removeClass("active");
      $(this).addClass("active");
      $("div.page").hide();
      $("#booking").show();
    });
    $("#tabs a.ended").click(function(){
      $("#endedgrid").trigger("reloadGrid"); 
      $("#tabs a").removeClass("active");
      $(this).addClass("active");
      $("div.page").hide();
      $("#ended").show();
    });
    $("#tabs a.users").click(function(){
      $("#tabs a").removeClass("active");
      $(this).addClass("active");
      $("div.page").hide();
      $("#users").show();
    });


    // Delete currently selected customer. Assigned to both customer dropdown delete buttons
    $(".bookform .delcustomer").click(function(){
      var parent = $(this).parent().parent();
      var customersDD = (parent.hasClass("start") ? customersDDStart : customersDDRegister);
      var projectsDD = (parent.hasClass("start") ? projectsDDStart : projectsDDRegister);
      var activitiesDD = (parent.hasClass("start") ? activitiesDDStart : activitiesDDRegister);
      if (customersDD.select2("data") != null) {
        var name = customersDD.select2("data").text;
        if (confirm("Är du säker på att du vill ta bort kunden " + name + " från databasen?")) {
          var id = customersDD.select2("data").id;
          ajax.post('/deletecustomer', {customerid: id}).then(
            function() {
              customersDDStart.refreshData();
              customersDDRegister.refreshData();
              customersDD.select2("data", null);
              projectsDD.select2("data", null);
              activitiesDD.select2("data", null);
              projectsDD.select2("enable", false);
              activitiesDD.select2("enable", false);
            }
          );
        }
      }
    });

    // Delete currently selected project. Assigned to both project dropdown delete buttons
    $(".start .delproject").click(function(){
      var parent = $(this).parent().parent();
      var customersDD = (parent.hasClass("start") ? customersDDStart : customersDDRegister);
      var projectsDD = (parent.hasClass("start") ? projectsDDStart : projectsDDRegister);
      var activitiesDD = (parent.hasClass("start") ? activitiesDDStart : activitiesDDRegister);
      if (projectsDD.select2("data") != null) {
        var name = projectsDD.select2("data").text;
        if (confirm("Är du säker på att du vill ta bort projektet " + name + " från databasen?")) {
          var id = projectsDD.select2("data").id;
          ajax.post('/deleteproject', {projectid: id}).then(
            function() {
              var customerid = customersDD.select2("data").id;
              projectsDD.refreshData(customerid);
              projectsDD.select2("data", null);
              activitiesDD.select2("data", null);
              activitiesDD.select2("enable", false);
            }
          );
        }
      }
    });

    // Delete currently selected activity. Assigned to both activity dropdown delete buttons
    $(".start .delactivity").click(function(){
      var parent = $(this).parent().parent();
      var projectsDD = (parent.hasClass("start") ? projectsDDStart : projectsDDRegister);
      var activitiesDD = (parent.hasClass("start") ? activitiesDDStart : activitiesDDRegister);
      if (activitiesDD.select2("data") != null) {
        var name = activitiesDD.select2("data").text;
        if (confirm("Är du säker på att du vill ta bort aktivitieten " + name + " från databasen?")) {
          var id = activitiesDD.select2("data").id;
          ajax.post('/deleteactivity', {activityid: id}).then(
            function() {
              var projectid = projectsDD.select2("data").id;
              activitiesDD.refreshData(projectid);
              activitiesDD.select2("data", null);
            }
          );
        }
      }
    });

    // Start and stop buttons
    $(".startbuttons .open").click(function(){
      var now = new Date();
      $(".startbuttons .starttime .hours").val(formatNumber(now.getHours()));
      $(".startbuttons .starttime .minutes").val(formatNumber(now.getMinutes()));
      $(".startbuttons .starttime").slideToggle();
    });
    $(".startbuttons .starttime .start").click(function(){
      startActivity();
      $(".startbuttons .starttime").slideUp();
    });

    $(".stopbuttons .open").click(function(){
      var now = new Date();
      $(".stopbuttons .stoptime .hours").val(formatNumber(now.getHours()));
      $(".stopbuttons .stoptime .minutes").val(formatNumber(now.getMinutes()));
      $(".stopbuttons .stoptime").slideToggle();
    });
    $(".stopbuttons .stoptime .stop").click(function(){
      var stoptime = new Date();
      var hours = $("div.active .stoptime .hours").val();
      var mins = $("div.active .stoptime .minutes").val();
      stoptime.setHours(hours);
      stoptime.setMinutes(mins);
      stopActivity(stoptime); 
      $(".stopbuttons .stoptime").slideUp();
    });

    $(".regbuttons .register").click(function(){
      registerActivity();
    });
  }

  /*** Stops any active activity and starts the selected activity ***/
  /*** If no activity is selected a blank activity for the selected project is started ***/
  function startActivity() {
    if (customersDDStart.select2("data") == null) {
      return errorOn(customersDDStart.select2("container"));
    }
    if (projectsDDStart.select2("data") == null) {
      return errorOn(projectsDDStart.select2("container"));
    }
    stopActivity(new Date()).then(
      function(){
        var starttime = new Date();
        var hours = $("div.start .starttime .hours").val();
        var mins = $("div.start .starttime .minutes").val();
        starttime.setHours(hours);
        starttime.setMinutes(mins);
        activeActivity.customer = customersDDStart.select2("data").text;
        activeActivity.project = projectsDDStart.select2("data").text;
        if (activitiesDDStart.select2("data") == null) {
          activeActivity.activityid = 0;
          activeActivity.activity = "";
        }
        else {
          activeActivity.activityid = activitiesDDStart.select2("data").id;
          activeActivity.activity = activitiesDDStart.select2("data").text;
        }
        activeActivity.comment = $("div.start .comment").val();
        activeActivity.starttime = starttime;
        return ajax.post('/startactivity', {
          projectid: projectsDDStart.select2("data").id,
          activityid: activeActivity.activityid, 
          comment: activeActivity.comment, 
          starttime: starttime
        });
      }
    ).then(
      function(actid) {
        activeActivity.id = actid;
        initActivityCounter();
        $(".stopbuttons .stoptime").slideUp();
      }
    );
  }

  /*** Stops the currently active activity ***/
  function stopActivity(stoptime) {
    var d = Q.defer();
    if (activeActivity.id != 0) {
      ajax.post('/stopactivity', {id:activeActivity.id, starttime:activeActivity.starttime, stoptime:stoptime}).then(
        function() {
          clearInterval(elapsedTimer);
          $("#endedgrid").trigger("reloadGrid"); 
          activeActivity.id = 0;

          latestDDStart.refreshData();
          latestDDRegister.refreshData();

          initActivityCounter();

          showLastActivity();

          d.resolve();
        },
        function(err) {
          d.reject(err);
        }
      );
    }
    else
      d.resolve();
    return d.promise;
  }

  /*** Registers elapsed time for the selected activity ***/
  function registerActivity() {
    if (customersDDRegister.select2("data") == null) {
      return errorOn(customersDDRegister.select2("container"));
    }
    if (projectsDDRegister.select2("data") == null) {
      return errorOn(projectsDDRegister.select2("container"));
    }
    var adate = $(".register .activitydate .adate").val();
    if (adate.length == 0) {
      return errorOn(".register .activitydate .adate");
    }
    var hours = $(".register .elapsed .hours").val();
    var minutes = $(".register .elapsed .minutes").val();
    if (!$.isNumeric(hours) && !$.isNumeric(minutes)) {
      return errorOn(".register .activitydate .elapsed input");
    }
    if (hours.length > 0 && !$.isNumeric(hours)) {
      return errorOn(".register .elapsed .hours");
    }
    if (minutes.length > 0 && !$.isNumeric(minutes)) {
      return errorOn(".register .elapsed .minutes");
    }

    var projectid = projectsDDRegister.select2("data").id;
    var activityid = (activitiesDDRegister.select2("data") ? activitiesDDRegister.select2("data").id : 0);
    var comment = $(".register .comment").val();
    ajax.post('/registeractivity', {
      projectid: projectid, 
      activityid: activityid, 
      comment: comment, 
      activitydate: adate,
      hours: hours,
      minutes: minutes
    }).then(
      function(response) {
        if (!response.err) {
          $("#endedgrid").trigger("reloadGrid"); 
          latestDDStart.refreshData();
          latestDDRegister.refreshData();
          customersDDRegister.select2("data", null);
          projectsDDRegister.select2("data", null);
          activitiesDDRegister.select2("data", null);
          $(".register .comment").val("");
//          $(".register .adate").val(formatDate(new Date()));
          $(".register .hours").val("");
          $(".register .minutes").val("");
          $(".regbuttons .register").text("Aktivitet registrerad");
          setTimeout(function(){
            $(".regbuttons .register").text("Registrera");
          }, 3000);
          showLastActivity();
        }
      }
    );
  }


  /*** Shows the active activity and starts the timer for elapsed time ***/
  function initActivityCounter() {
    if (activeActivity.id != 0) {
      $("#booking .active").show();
      $("#booking .start").hide();
      $("#booking .active .customer").text(activeActivity.customer);
      $("#booking .active .project").text(activeActivity.project);
      $("#booking .active .activity").text(activeActivity.activity);
      $("#booking .active .comment").text(activeActivity.comment);
      $("#booking .active .starttime").text(formatTime(activeActivity.starttime));
      $("#booking .active .headline").text("Aktiv aktivitet");
      showElapsed();
      elapsedTimer = setInterval(showElapsed, 30000);
    }
    else {
      $("#booking .active").hide();
      $("#booking .start").show();
    }
  }

  /*** Gets the currently active activity from the database. Called att page load ***/
  function getActiveActivity() {
    var d = Q.defer();
    ajax.post("/getactiveactivity", {}).then(
      function(response) {
        if (response) {
          activeActivity.id = response.id;
          activeActivity.customer = response.customer;
          activeActivity.project = response.project;
          activeActivity.activity = response.activity;
          activeActivity.activityid = response.aid;
          activeActivity.comment = response.comment;
          activeActivity.starttime = new Date(response.starttime);
        }
        else
          activeActivity.id = 0;
        d.resolve();
      },
      function(err) {
        d.reject();
      }
    );
    return d.promise;
  }


  /*** Show last registered activity ***/
  function showLastActivity() {
    ajax.post("/getlastactivity", {}).then(
      function(response) {
        $("#booking .last .customer").text(response.customer);
        $("#booking .last .project").text(response.project);
        $("#booking .last .activity").text(response.activity);
        $("#booking .last .comment").text(response.comment);
        $("#booking .last .starttime").text(response.starttime);
        $("#booking .last .elapsed").text(formatElapsed(response.elapsedtime));
      }
    );
  }

  /*** Show elapsed time for active activity ***/
  function showElapsed() {
    var minutes = Math.floor((new Date() - activeActivity.starttime)/60000);
    while (minutes < 0)
      minutes += 24*60;
    $("#booking .active .elapsed").text(formatElapsed(minutes));
  }

  /*** Format minutes to h:m format ***/
  function formatElapsed(minutes) {
    var h = Math.floor(minutes/60);
    var m = minutes - h*60;
    return h + " tim " + m + " min";
  }

  /*** Returns a jQuery object with attached data array and refreshing function ***/
  function getDDObject(selector, placeholder, getDataFunc) {
    var dd = $(selector);
    dd.val("");
    dd.listData = [];
    dd.refreshData = function(param, callback){
      getDataFunc(param, function(data){
        dd.listData = data;
        if (callback) callback();
      });
    };
    dd.select2({
      placeholder:placeholder,
      formatNoMatches:"Inga träffar",
      createSearchChoice: function(term) { 
        return { id: -1, text:term }
      },
      allowClear:true,
      data: function() { 
        return {results: dd.listData}; 
      },
      matcher: function(term, text) { // Searching items beginning with term
        return text.toUpperCase().indexOf(term.toUpperCase()) == 0; 
      }
    });
    return dd;
  }

  /*** Sets and removes error class on an item ***/
  function errorOn(sel) {
    $(sel).addClass("error");
    setTimeout(function(){
      $(sel).removeClass("error");
    }, 3000);
    return false;
  }

  function formatDate(date) {
    var y = date.getFullYear().toString();
    var m = (date.getMonth() + 1).toString();
    var d  = date.getDate().toString();
    return y + "-" + (m[1] ? m : "0" + m[0]) + "-" + (d[1] ? d : "0" + d[0]);
  }

  function formatTime(date) {
    var h = date.getHours().toString();
    var m = date.getMinutes().toString();
    return (h[1] ? h : "0" + h[0]) + ":" + (m[1] ? m : "0" + m[0]);
  }
  
  function formatNumber(number) {
    var n = number.toString();
    return (n[1] ? n : "0" + n[0]);
  }

  /*** Functions for ended grid ***/

  /*** Initialize jqgrid showing finished activities and users ***/
  function initGrids() {
    
    $("#endedgrid").jqGrid({
      url:'/getendedtimes',
      editurl:'/saveedittime',
      postData: {
        idcol:"id",
        cols:"id,username,cid,pid,aid,customer,project,activity,comment,startdate,starttime,elapsedtime",
        from: function(){ 
          return $("#ended input.from").val(); 
        },
        to: function(){
          var to = new Date($("#ended input.to").val());
          to.setHours(23);
          to.setMinutes(59);
          return formatDate(to);
        },
        username: function(){
          if ($("#ended .curruser").length == 0)
            return "_current_";
          else 
            return $("#ended .curruser").val(); 
        }
      },
      colNames: ['','Användare','', '', '', titles.lev1, titles.lev2, titles.lev3, 'Kommentar', 'Datum', 'Starttid', 'Tidsåtgång'],
      colModel:[
        {name:'id', hidden:true, width:0 },
        {name:'username', hidden:true, width:5 },
        {name:'cid', hidden:true, width:0 },
        {name:'pid', hidden:true, width:0 },
        {name:'aid', hidden:true, width:0 },
        {
          name:'customer', width:8,
          sortable:true, editable:true, edittype:"select",
          editoptions: {
            value: "0:",
            dataEvents: [{
              type:"change",
              fn: function(){
                var cid = $("#customer").val();
                if (cid.length == 0) cid = "0";
                fillEditProjectsDropown(cid, true);
              }
            }]
          }
        },
        {
          name:'project', width:10,
          sortable:true, editable:true, edittype:"select",
          editoptions: {
            value: "0:",
            dataEvents: [{
              type:"change",
              fn: function(){
                var pid = $("#project").val();
                if (pid.length == 0) pid = "0";
                fillEditActivitiesDropown(pid, true);
              }
            }]
          }
        },
        {
          name:'activity', width:10,
          sortable:true, editable:true, edittype:"select", editoptions:{value: "0:"}
        },
        {name:'comment', width:20, sortable:true, editable:true, edittype:'textarea' },
        {name:'startdate', width:8,
          editoptions: {
            dataInit: function(elem) {
              $(elem).datepicker({dateFormat:'yy-mm-dd'});
            }
          },
          sortable:true, editable:true, formatter:'date',
          formatoptions:{srcformat: 'Y-m-d H:i:s', newformat: 'Y-m-d' }
        },
        {
          name:'starttime', width:5, 
          search:false, sortable:false, editable:true, 
          sorttype:'date', formatter:'date', formatoptions:{srcformat: 'Y-m-d H:i:s', newformat: 'H:i' }
        },
        {
          name:'elapsedtime', width:7, 
          search:false, sortable:true, editable:true, edittype:"custom",
          editoptions: {custom_element:createHMEdit, custom_value:getHMValue},
          formatter:formatElapsed, unformat:unformatElapsed
        }
      ],
      datatype: "json",
      altRows:false,
      rowNum:20,
      rowList:[10,20,50,100,500,1000],
      pager: '#endedctrl',
      sortname: 'startdate',
      sortorder: 'desc',
      height:'100%',
      width:$("#ended").width(),
      footerrow: true,
      userDataOnFooter:true,
      viewrecords: true
    }).navGrid(
      '#endedctrl',
      {edit:true,add:false,del:true},
      {
        onInitializeForm: function(){
          fillEditCustomersDropown();
        },
        width:"auto"
      },
      {},
      {},
      {multipleSearch:true}
    ).jqGrid('filterToolbar',{
      stringResult:true,
      searchOnEnter:false,
      defaultSearch:'cn'
    });


    $("#usersgrid").jqGrid({
      url:'/getusers',
      editurl:'/edituser',
      postData: {
        idcol:"id",
        cols:"id,username,password,name,isadmin,isactive"
      },
      colNames: ['','Användarnamn','Lösenord', 'Namn', 'Administratör', 'Aktiv'],
      colModel:[
        {name:'id', hidden:true, width:0 },
        {name:'username', width:10, editable:true, editoptions:{readonly:'readonly'}, editrules:{required:true}},
        {name:'password', width:10, editable:true, editrules:{required:true}},
        {name:'name', width:30 , editable:true },
        {name:'isadmin', width:10, search:false, editable:true, edittype:"checkbox", formatter:function(v){return(v=="1"?"Ja":"Nej");}, editoptions:{value:"Ja:Nej"}},
        {name:'isactive', width:10, search:false, editable:true, edittype:"checkbox", formatter:function(v){return(v=="1"?"Ja":"Nej");}, editoptions:{value:"Ja:Nej"}}
      ],
      datatype: "json",
      altRows:false,
      rowNum:20,
      rowList:[10,20,50],
      pager: '#usersctrl',
      sortname: 'username',
      sortorder: 'asc',
      height:'100%',
      width:$("#users").width(),
      viewrecords: true
    }).navGrid(
      '#usersctrl',
      {edit:true,add:true,del:true},
      {
        beforeShowForm:function(frm){
          $(frm).find("#username").removeAttr("readonly");
        },
        afterSubmit:function(response, postdata){
          if (response.responseText.length > 0) {
            return [false, response.responseText, 0];
          }
          else {
            return [true, "", postdata.id];
          }
        }
      },
      { 
        beforeShowForm:function(frm){
          $(frm).find("#username").removeAttr("readonly");
        },
        afterSubmit:function(response, postdata){
          if (response.responseText.length > 0) {
            return [false, response.responseText, 0];
          }
          else {
            return [true, "", postdata.new_id];
          }
        }
      },
      {},
      {multipleSearch:true}
    ).jqGrid('filterToolbar',{
      stringResult:true,
      searchOnEnter:false,
      defaultSearch:'cn'
    });
  }

  /*** Create custom form elements for elapsed time in grid edit ***/
  function createHMEdit(value, options) {
    var h = Math.floor(value/60);
    var m = value - h*60;
    var span = document.createElement("span");
    var html = "<input type='number' class='hours' max='23' min='0' value='" + h + "' />&nbsp;tim&nbsp;&nbsp;<input type='number' class='minutes' value='" + m + "' max='59' min='0' />&nbsp;min";
    span.innerHTML = html;
    return span;
  }

  /*** Retrieve value from custom elapsed input ***/
  function getHMValue(elem, operation, value) {
    return parseInt($(elem).find(".hours").val(), 10)*60 + parseInt($(elem).find(".minutes").val(), 10);
  }

  /*** Functions called from the endedgrid filling the dropdowns in edit mode ***/
  function fillEditCustomersDropown() {
    var rowid = $("#endedgrid").jqGrid ('getGridParam', 'selrow');
    var currcust = $("#endedgrid").jqGrid("getCell", rowid, "cid");
    ajax.post('/getcustomers', {}).then(
      function(response) {
        var sel = $("select#customer").empty();
        for (var i=0; i < response.data.length; i++) 
          sel.append("<option value='" + response.data[i].value + "' role='option'>" + response.data[i].label + "</option>");
        sel.val(currcust);
        fillEditProjectsDropown(currcust);
      }
    );
  }

  function fillEditProjectsDropown(currcust, changed) {
    var rowid = $("#endedgrid").jqGrid ('getGridParam', 'selrow');
    var currproj = (changed ? "" : $("#endedgrid").jqGrid("getCell", rowid, "pid"));
    ajax.post('/getprojects', {customer:currcust}).then(
      function(response) {
        var sel = $("select#project").empty();
        for (var i=0; i < response.data.length; i++) 
          sel.append("<option value='" + response.data[i].value + "' role='option'>" + response.data[i].label + "</option>");
        sel.val(currproj);
        if (currproj.length == 0) currproj = "0";
        fillEditActivitiesDropown(currproj, changed);
      }
    );
  }

  function fillEditActivitiesDropown(currproj, changed) {
    var rowid = $("#endedgrid").jqGrid ('getGridParam', 'selrow');
    var curract = (changed ? "" : $("#endedgrid").jqGrid("getCell", rowid, "aid"));
    ajax.post('/getactivities', {project:currproj}).then(
      function(response) {
        var sel = $("select#activity").empty();
        for (var i=0; i < response.data.length; i++) 
          sel.append("<option value='" + response.data[i].value + "' role='option'>" + response.data[i].label + "</option>");
        sel.val(curract);
      }
    );
  }

  /*** Called from the endedgrid. Formats/unformats elapsed time ***/
  function formatElapsed(cellValue, options, rowObject) {
    var h = parseInt(cellValue/60);
    var min = cellValue - h*60;
    return h + " tim " + min + " min";
  }
  function unformatElapsed(cellValue, options, rowObject) {
    var vals = cellValue.split(' ');
    if (vals.length > 3)
      return parseInt(vals[0], 10)*60 + parseInt(vals[2], 10);
    else
      return 0;
  }


  init();

});

$(document).ready(function(){

  var lasteditrow;

  function init() {
    initGrid();
  }

  function initGrid() {
    $("#timesgrid").jqGrid({
      url:'/gettimes',
      autowidth:true,
      postData: {
        idcol:"_id",
        cols:"_id,activity.project.customer.name,activity.project.name,activity.name,description,starttime,starttime,endtime,elapsedtime"
      },
      colNames: ['','Kund', 'Projekt', 'Aktivitet', 'Beskrivning', 'Datum', 'Starttid', 'Sluttid', 'Tidsåtgång'],
      colModel:[
        {name:'_id', hidden:true },
        {
          name:'activity.project.customer.name', width:'10%', 
          sortable:true, editable:true, edittype:"text"
        },
        {
          name:'activity.project.name', width:'10%', 
          sortable:true, editable:true, edittype:"text"
        },
        {name:'activity.name', width:'10%', sortable:true, editable:true },
        {name:'description', width:'15%', sortable:true, editable:true },
        {name:'starttime', width:'5%', 
          searchoptions:{
            dataInit: function(elem) {
              $(elem).datepicker({dateFormat:'yy-mm-dd'});
            }
          },
          editoptions: {
            dataInit: function(elem) {
              $(elem).datepicker({dateFormat:'yy-mm-dd'});
            }
          },
          sortable:true, editable:true, formatter:'date', 
          formatoptions:{srcformat: 'Y-m-d H:i:s', newformat: 'Y-m-d' }
        },
        {name:'starttime', width:'5%', search:false, sortable:false, editable:true, formatter:'date', formatoptions:{srcformat: 'Y-m-d H:i:s', newformat: 'H:i' }},
        {name:'endtime', width:'5%', search:false, sortable:false, editable:true, sorttype:'date', formatter:'date', formatoptions:{srcformat: 'Y-m-d H:i:s', newformat: 'H:i' }},
        {name:'elapsedtime', width:'7%', search:false, sortable:true, editable:true, formatter:formatElapsed, unformat:unformatElapsed, 
          formoptions:{
            elmsuffix:'&nbsp;&nbsp;minuter'
          }
        }
      ],
      gridComplete: function(){

      },
      onSelectRow: function(id) {
        if (id && id !== lasteditrow) { 
          $('#timesgrid').jqGrid('restoreRow', lasteditrow); 
          $('#timesgrid').jqGrid('editRow', id, true, function() {
            var customerInput = $("#" + id + " td:nth-child(2) input");
            var projectInput = $("#" + id + " td:nth-child(3) input");
            var activityInput = $("#" + id + " td:nth-child(4) input");
            customerInput.on("focus", function(){
              $.get('/getcustomers', {}, function(customers) {
                setupAutoComplete(customerInput, customers, projectInput);
              });
            });
            projectInput.on("focus", function(){
              $.get('/getprojects', {customer:customerInput.val()}, function(projects) {
                setupAutoComplete(projectInput, projects, activityInput);
              });
            });
          }); 
          lasteditrow = id; 
        } 
      },
      datatype: "json",
      altRows:false,
      rowNum:10,
      rowList:[10,20,50,100],
      pager: '#timesctrl',
      sortname: '_id',
      viewrecords: true,
      height:'100%'
    //  forceFit:true,
      //shrinkToFit:false
    }).navGrid(
      '#timesctrl',
      {edit:false,add:false,del:false},
      {},            
      {},
      {},
      {multipleSearch:true}
    ).filterToolbar();
  }
















  function setupAutoComplete(input, source, nextinput) {
    if (input.hasClass("ui-autocomplete-input"))
      input.autocomplete("destroy");
    input.keyup(function(){
      nextinput.val("");
    });
    input.combobox({
      source:source,
      minLength:0,
      select: function(){
        nextinput.val("");
      }
    }).click(function(e){
      var left = e.clientX - $(this).offset().left;
      if (left > $(this).outerWidth() - 20) {
        if ($("ul.ui-autocomplete").is(":visible"))
          $(this).autocomplete('close');
        else
          $(this).autocomplete('search', '');
      }
    });
  }

  function customerChanged(id) {
    $("#" + id + " td:nth-child(3) input").val("");
    var customer = $("#" + id + " td:nth-child(2) input").val();
    $.get('/getprojects', {customer:customer}, function(projects) {
      setupAutoComplete($("#" + id + " td:nth-child(3) input"), projects, function(projid){
        projectChanged(projid);
      });
    });
  }

  function projectChanged(id) {
    $("#" + id + " td:nth-child(4) input").val("");
    var project = $("#" + id + " td:nth-child(3) input").val();
    $.get('/getactivities', {project:project}, function(activities) {
      setupAutoComplete($("#" + id + " td:nth-child(4) input"), activities);
    });
  }

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

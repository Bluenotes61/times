$(document).ready(function(){

  function init() {
    initGrid();
  }

  function initGrid() {
    $("#timesgrid").jqGrid({
      url:'/gettimes',
      autowidth:true,
      postData: {
        idcol:"_id",
        cols:"_id,activityid,description,starttime,endtime,elapsedtime"
      },
      colNames: ['','Aktivitet', 'Beskrivning', 'Starttid', 'Sluttid', 'Tidsåtgång'],
      colModel:[
        {name:'_id', hidden:true },
        {name:'activityid', width:'150px', sortable:false, editable:false },
        {name:'description', width:'150px', sortable:false, editable:false },
        {name:'starttime', width:'107px', sortable:false, editable:false},
        {name:'endtime', width:'170px', sortable:false, editable:false},
        {name:'elapsedtime', width:'60px', sortable:false, editable:false}
      ],
      datatype: "json",
      jsonReader: {id:"_id", repeatitems:false},
      altRows:true,
      rowNum:10,
      rowList:[10,20,50,100],
      pager: '#timesctrl',
      sortname: '_id',
      viewrecords: true,
      sortorder: "asc",
      height:'100%'
    //  forceFit:true,
      //shrinkToFit:false
    }).navGrid(
      '#sessionctrl',
      {edit:false,add:false,del:false},
      {},
      {},
      {},
      {multipleSearch:true}
    );
  }


  init();
  
});

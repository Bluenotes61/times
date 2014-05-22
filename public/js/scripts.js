$(document).ready(function(){

  function init() {
    checkOrigin();

    var isHandheld = ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) );

    if ($(window).width() > 500 && $(window).height() > 500) {
      centerIntro();
      $(window).resize(centerIntro);
    }

    getImages();

    if (isHandheld) {
      $(".mobiletext").show();
      $(".mobilelink").css("display", "inline-block");
      $(".desktoplink").hide();
      $(".video video").hide();
    }

    $("a.tastallning").click(function(){
      $(".thunderclappop, .dimbg").fadeIn();
      if ($(window).height() < 500) {
        $('html, body').animate(
          { scrollTop: 10 }, 
          1000,
          "easeOutQuint"
        );
      }
    });

    $("a.playbutton").click(function(){
      var w = $(".moviepop").outerWidth();
      var h = w*315/560;
      $(".moviepop iframe").css({"width":w, "height":h});
      $(".moviepop, .dimbg").fadeIn();
      if ($(window).height() < 500) {
        $('html, body').animate(
          { scrollTop: 10 }, 
          1000,
          "easeOutQuint"
        );
      }
    });

    $(".dimbg, .pop .close").click(function(){
      $(".pop, .dimbg").fadeOut();
    });

    $(".download.mobilelink").click(function(){
      $(this).slideUp();
      $(".emailinput").slideDown();
    });

    $(".emailinput .submit").click(function() {
      var country = ($(this).hasClass("eng") ? "other" : "sweden");
      sendMail(country, function(ok){
        if (ok) {
          $(".emailinput").slideUp();
          $(".emailthanks").slideDown();
          setTimeout(function(){
            $(".emailthanks").slideUp();
            $(".mobilelink").slideDown();
          }, 5000);
        }
      });
    });

    $(".emailinput input").keyup(function(){
      $(this).removeClass("error");
    });

    $(window).scroll(scrollResponse);

    $('.scrollitem').click(function(){
      var to = $("." + $(this).data("to"));
      $('html, body').animate(
        { scrollTop: to.offset().top }, 
        1000,
        "easeOutQuint"
      );
    });  

    scrollResponse();
  }

  function scrollResponse() {
    $('.fadein').each( function(){
      var showHeight = $(this).position().top + $(this).outerHeight()*0.2;
      var windowBottom = $(window).scrollTop() + $(window).height();
      if( windowBottom > showHeight )
        $(this).animate({'opacity':'1'},1000);
    });
    if (!$(".footer").is(":animated")) { 
      if (120 - $(window).scrollTop() > 0) 
        $(".footer").animate({"bottom":"-60px"}, 300);
      else 
        $(".footer").animate({"bottom":"0"}, 300);
    }
  }

  function checkOrigin() {
    var lang = (navigator.language || navigator.userLanguage);
    if (lang && $("a.changelang").text().indexOf("ENGLISH") >= 0 && lang.indexOf("sv") < 0 && document.referrer.indexOf("neverforgettovote") < 0) 
      document.location.href = "en";

/*    if ($("a.changelang").text().indexOf("ENGLISH") >= 0) {
      $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "/ajax.php?action=get_location",
        async:true,
        success: function(response) {
          if (response != "sweden")
            document.location.href = "en";
        },
        error: function(xhr, status, error) {
          console.log(xhr);
          console.log(xhr.responseText);
          console.log(status);
          console.log(error);
        }
      });
    }*/
  }

  function sendMail(country, callback) {
    var email = $(".emailinput input").val();
    var emailRegExp = new RegExp("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$", "i");
    if (!emailRegExp.test(email)) {
      $(".emailinput input").addClass("error");
      return false;
    }
    $.ajax({
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "/ajax.php?action=get_material&country=" + country + "&email=" + email,
      async:false,
      success: function(response) {
        $(".sentaddress").text(email);
        callback(true);
      },
      error: function(xhr, status, error) {
        console.log(xhr);
        console.log(xhr.responseText);
        console.log(status);
        console.log(error);
        $(".emailinput input").addClass("error");
        callback(false);
      }
    });
  }

  function centerIntro() {
    $(".section1 > div").css({"visibility":"hidden"});
    var upperHeight = $(".section1").outerHeight() - $(".section1 .lower").outerHeight();
    var menuHeight = $(".navmenu").outerHeight();
    $(".section1 .upper").css("height", upperHeight);
    var h1top = (upperHeight - menuHeight)/2 - $(".section1 h1").outerHeight()/2 + menuHeight;
    $(".section1 h1").css("padding-top", h1top);
    $(".section1 > div").css({"visibility":"visible"});
  }


  function getImages() {
    $.ajax({ 
      type: "POST",
      contentType: "application/json; charset=utf-8",
      url: "http://admin.neverforgettovote.com/instagram/index.php?action=json",
      async:false,
      jsonp:'getimages',
      dataType: "jsonp",
      success: function(response) {
        showImages(response);
      },
      error: function(xhr, status, error) {
        console.log(xhr);
        console.log(xhr.responseText);
        console.log(status);
        console.log(error);
      }
    });
  }

  function showImages(images) {
    var nofsticky = 0;
    for (var i=0; i < images.items.length; i++) {
      var image = images.items[i].item;
      var caption = image.caption.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
        console.log(caption);
      if (image.sticky == "1" && nofsticky < 3) {
        nofsticky++;
        $(".imagestop").append(
          "<a href='" + image.link + "' target='_blank' title='" + caption + "'><img src='" + image.low_resolution + "' alt='" + caption + "' /></a>"
        );
      }
      else {
        $(".imagesmain").append(
          "<a href='" + image.link + "' target='_blank' title='" + caption + "'><img src='" + image.low_resolution + "' alt='" + caption + "' /></a>"
        );
      }
    }
  }

  init();
  
});

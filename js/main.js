$(document).ready(function () {

  $('a.blog-button').click(function () {
    // If already in blog, return early without animate overlay panel again.
    if (location.hash && location.hash == "#blog")
    {
      currentWidth = $('.panel-cover').width();
      $('.panel-cover').css('max-width', currentWidth);
      $('.panel-cover').animate({
        'max-width': '100%',
        'width': '100%'
      }, 400, swing = 'swing', function () {});
      location.href = "https://lanotfly.github.io";
      return;
    }
    if ($('.panel-cover').hasClass('panel-cover--collapsed')) return;
    $('.main-post-list').removeClass('hidden');
    currentWidth = $('.panel-cover').width();
    currentHeight = $('.panel-cover').height();
    if (currentWidth < 960) {
      $('.panel-cover').css('max-height', currentHeight);
      $('.panel-cover').animate({
        'max-height': '200px',
        'height': '17%'
      }, 400, swing = 'swing', function () {});
      $('.panel-cover').addClass('panel-cover--collapsed');
      location.reload(true);
    } else {
      $('.panel-cover').css('max-width', currentWidth);
      $('.panel-cover').animate({
        'max-width': '700px',
        'width': '30%'
      }, 400, swing = 'swing', function () {});
    }
  });

  if (window.location.hash && window.location.hash == "#blog") {
    $('.panel-cover').addClass('panel-cover--collapsed');
    $('.main-post-list').removeClass('hidden');
  }

  if (window.location.pathname.substring(0, 5) == "/tag/") {
    $('.panel-cover').addClass('panel-cover--collapsed');
  }

  $('.btn-mobile-menu__icon').click(function () {
    if ($('.navigation-wrapper').css('display') == "block") {
      $('.navigation-wrapper').on('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
        $('.navigation-wrapper').toggleClass('visible animated bounceOutUp');
        $('.navigation-wrapper').off('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend');
      });
      $('.navigation-wrapper').toggleClass('animated bounceInDown animated bounceOutUp');

    } else {
      $('.navigation-wrapper').toggleClass('visible animated bounceInDown');
    }
    $('.btn-mobile-menu__icon').toggleClass('fa fa-list fa fa-angle-up animated fadeIn');
  });

  $('.navigation-wrapper .blog-button').click(function () {
    if ($('.navigation-wrapper').css('display') == "block") {
      $('.navigation-wrapper').on('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
        $('.navigation-wrapper').toggleClass('visible animated bounceOutUp');
        $('.navigation-wrapper').off('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend');
      });

      $('.navigation-wrapper').toggleClass('animated bounceInDown animated bounceOutUp');
    }

    $('.btn-mobile-menu__icon').toggleClass('fa fa-list fa fa-angle-up animated fadeIn');
  });
});

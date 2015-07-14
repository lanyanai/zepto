//     Zepto.js
//     (c) 2010-2015 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

//加上show hide toggle方法, fade
;(function($, undefined){
  var document = window.document,
      docElem = document.documentElement,
      origShow = $.fn.show,
      origHide = $.fn.hide,
      origToggle = $.fn.toggle;

  function anim(el, speed, opacity, scale, callback) {
    //无speed，opacity，scale参数
    if (typeof speed == 'function' && !callback) {
      callback = speed;
      speed = undefined;
    }
    var props = {
      opacity: opacity
    };
    if (scale) {
      props.scale = scale;
      el.css($.fx.cssPrefix + 'transform-origin', '0 0');
    }
    return el.animate(props, speed, null, callback);
  }

  //改变透明度隐藏，先调用origHide
  function hide(el, speed, scale, callback) {
    return anim(el, speed, 0, scale, function(){
      origHide.call($(this));
      callback && callback.call(this);
    })
  }

  //先调用origshow方法
  $.fn.show = function(speed, callback) {
    origShow.call(this);
    if (speed === undefined) {
      speed = 0;
    } else {
      this.css('opacity', 0);
    }
    return anim(this, speed, 1, '1,1', callback);
  };

  //无speed参数，则调用原始hide
  $.fn.hide = function(speed, callback) {
    if (speed === undefined) {
      return origHide.call(this);
    }
    else {
      return hide(this, speed, '0,0', callback);
    }
  };

  //无speed或者
  $.fn.toggle = function(speed, callback) {
    if (speed === undefined || typeof speed == 'boolean') {
      return origToggle.call(this, speed);
    } else {
      return this.each(function(){
        var el = $(this);
        el[el.css('display') == 'none' ? 'show' : 'hide'](speed, callback);
      });
    }
  };

  $.fn.fadeTo = function(speed, opacity, callback) {
    return anim(this, speed, opacity, null, callback);
  };

  $.fn.fadeIn = function(speed, callback) {
    var target = this.css('opacity');
    if (target > 0) {
      this.css('opacity', 0);
    } else {
      target = 1;
    }
    return origShow.call(this).fadeTo(speed, target, callback);
  };

  $.fn.fadeOut = function(speed, callback) {
    return hide(this, speed, null, callback);
  };

  $.fn.fadeToggle = function(speed, callback) {
    return this.each(function(){
      var el = $(this);
      el[
        (el.css('opacity') == 0 || el.css('display') == 'none') ? 'fadeIn' : 'fadeOut'
      ](speed, callback);
    })
  };

})(Zepto);

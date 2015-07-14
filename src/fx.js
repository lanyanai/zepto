//     Zepto.js
//     (c) 2010-2015 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

//css3动画
;(function($, undefined){
  var prefix = '', eventPrefix,
    vendors = { Webkit: 'webkit', Moz: '', O: 'o' },
    testEl = document.createElement('div'),
    supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
    transform,
    transitionProperty, transitionDuration, transitionTiming, transitionDelay,
    animationName, animationDuration, animationTiming, animationDelay,
    cssReset = {};

  //将驼峰式的字符串转成用-分隔的小写形式，如borderWidth ==> border-width
  function dasherize(str) {
    return str.replace(/([a-z])([A-Z])/, '$1-$2').toLowerCase();
  }

  //加上前缀
  function normalizeEvent(name) {
    return eventPrefix ? eventPrefix + name : name.toLowerCase();
  }

  //根据浏览器的特性设置CSS属性前轻辍和事件前辍，比如浏览器内核是webkit
  //那么用于设置CSS属性的前辍prefix就等于'-webkit-',用来修正事件名的前辍eventPrefix就是Webkit
  $.each(vendors, function(vendor, event){
    if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
      prefix = '-' + vendor.toLowerCase() + '-';
      eventPrefix = event;
      return false;
    }
  });

  transform = prefix + 'transform';
  cssReset[transitionProperty = prefix + 'transition-property'] =
  cssReset[transitionDuration = prefix + 'transition-duration'] =
  cssReset[transitionDelay    = prefix + 'transition-delay'] =
  cssReset[transitionTiming   = prefix + 'transition-timing-function'] =
  cssReset[animationName      = prefix + 'animation-name'] =
  cssReset[animationDuration  = prefix + 'animation-duration'] =
  cssReset[animationDelay     = prefix + 'animation-delay'] =
  cssReset[animationTiming    = prefix + 'animation-timing-function'] = '';

  $.fx = {
    off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),//是否支持css3动画
    speeds: { _default: 400, fast: 200, slow: 600 },
    cssPrefix: prefix,
    transitionEnd: normalizeEvent('TransitionEnd'),
    animationEnd: normalizeEvent('AnimationEnd')
  };

  $.fn.animate = function(properties, duration, ease, callback, delay){
    //无duration、ease参数
    if ($.isFunction(duration)) {
      callback = duration;
      ease = undefined;
      duration = undefined;
    }
    //无ease参数
    if ($.isFunction(ease)) {
      callback = ease;
      ease = undefined;
    }
    //duration是对象
    if ($.isPlainObject(duration)) {
      ease = duration.easing;
      callback = duration.complete;
      delay = duration.delay;
      duration = duration.duration;
    }

    //将duration单位改为为秒
    if (duration) {
      duration = (typeof duration == 'number' ? duration :
              ($.fx.speeds[duration] || $.fx.speeds._default)) / 1000;
    }
    if (delay) {
      delay = parseFloat(delay) / 1000;
    }
    //调用anim
    return this.anim(properties, duration, ease, callback, delay);
  };

  //实际动画函数
  $.fn.anim = function(properties, duration, ease, callback, delay){
    var key, cssValues = {}, cssProperties, transforms = '',
        that = this, wrappedCallback, endEvent = $.fx.transitionEnd,
        fired = false;

    if (duration === undefined) {
      duration = $.fx.speeds._default / 1000;
    }
    if (delay === undefined) {
      delay = 0;
    }
    //如果浏览器不支持CSS3的动画，则duration=0，意思就是直接跳转最终值
    if ($.fx.off) {
      duration = 0;
    }

    //如果properties是一个动画名keyframe
    if (typeof properties == 'string') {
      // keyframe animation
      cssValues[animationName] = properties;
      cssValues[animationDuration] = duration + 's';
      cssValues[animationDelay] = delay + 's';
      cssValues[animationTiming] = (ease || 'linear');
      endEvent = $.fx.animationEnd;
    } else {
      cssProperties = [];
      // CSS transitions

      for (key in properties) {
        //如果设置 的CSS属性是变形之类的
        if (supportedTransforms.test(key)) {
          transforms += key + '(' + properties[key] + ') ';
        }
        else {
          cssValues[key] = properties[key];
          cssProperties.push(dasherize(key));
        }
      }

      if (transforms) {
        cssValues[transform] = transforms;
        cssProperties.push(transform);
      }
      //使用transition动画
      if (duration > 0 && typeof properties === 'object') {
        cssValues[transitionProperty] = cssProperties.join(', ');
        cssValues[transitionDuration] = duration + 's';
        cssValues[transitionDelay] = delay + 's';
        cssValues[transitionTiming] = (ease || 'linear');
      }
    }

    //包装回调函数
    wrappedCallback = function(event){
      if (typeof event !== 'undefined') {
        if (event.target !== event.currentTarget) {
          return;
        } // makes sure the event didn't bubble from "below"
        $(event.target).unbind(endEvent, wrappedCallback);
      } else {
        $(this).unbind(endEvent, wrappedCallback); // triggered by setTimeout
      }

      fired = true;
      //重置css
      $(this).css(cssReset);
      callback && callback.call(this);
    };

    //当可以执行动画的时候，那么动画结束后会执行回调，
    //如果不支持持续动画,在直接设置最终值后，不会执行动画结束回调
    if (duration > 0){
      this.bind(endEvent, wrappedCallback);
      // transitionEnd is not always firing on older Android phones
      // so make sure it gets fired
      setTimeout(function(){
        if (fired) {
          return;
        }
        wrappedCallback.call(that);
      }, ((duration + delay) * 1000) + 25);
    }

    // trigger page reflow so new elements can animate
    this.size() && this.get(0).clientLeft;

    this.css(cssValues);

    //当持续时间小于等于0时，立刻还原
    if (duration <= 0) {
      setTimeout(function() {
        that.each(function(){
          wrappedCallback.call(this);
        });
      }, 0);
    }

    return this;
  };

  testEl = null;
})(Zepto);

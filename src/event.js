//     Zepto.js
//     (c) 2010-2015 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

//事件处理部分
;(function($){
  var _zid = 1, undefined,
      slice = Array.prototype.slice,
      isFunction = $.isFunction,
      isString = function(obj) {
        return typeof obj == 'string';
      },
      handlers = {},
      specialEvents={},
      focusinSupported = 'onfocusin' in window,
      focus = {
        focus: 'focusin',
        blur: 'focusout'
      },
      hover = {
        mouseenter: 'mouseover',
        mouseleave: 'mouseout'
      };

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents';

  //取element的唯一标示符，如果没有，则设置一个并返回
  function zid(element) {
    return element._zid || (element._zid = _zid++);
  }

  //查找绑定在元素上的指定类型的事件处理函数集合
  function findHandlers(element, event, fn, selector) {
    event = parse(event);
    if (event.ns) {
      var matcher = matcherFor(event.ns);//正则
    }
    /*handlers针对每个元素的zid将事件存为数组，其数组元素是个对象，{
      e: 事件名
      ns: 事件命名空间
      fn: 处理函数
      sel:
    }*/
    return (handlers[zid(element)] || []).filter(function(handler) {

      return handler
        && (!event.e  || handler.e == event.e)  //判断事件类型是否相同
        && (!event.ns || matcher.test(handler.ns))
        && (!fn || zid(handler.fn) === zid(fn))
        //注意函数是引用类型的数据zid(handler.fn)的作用是返回handler.fn的标示符，如果没有，则给它添加一个，
        //这样如果fn和handler.fn引用的是同一个函数，那么fn上应该也可相同的标示符，
        //这里就是通过这一点来判断两个变量是否引用的同一个函数
        && (!selector || handler.sel == selector);
    });
  }

  //解析事件类型，返回一个包含事件名称和事件命名空间的对象
  function parse(event) {
    var parts = ('' + event).split('.');
    return {
      e: parts[0],
      ns: parts.slice(1).sort().join(' ')
    };
  }

  //生成命名空间的正则
  function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)');
  }

  //通过给focus和blur事件设置为捕获来达到事件冒泡的目的
  function eventCapture(handler, captureSetting) {
    return handler.del &&
      (!focusinSupported && (handler.e in focus)) ||
      !!captureSetting;
  }

  //修复不支持mouseenter和mouseleave的情况，变为mouseover跟mouseout，会冒泡
  function realEvent(type) {
    return hover[type] || (focusinSupported && focus[type]) || type;
  }

  //给元素绑定监听事件,可同时绑定多个事件类型，可以是'click mouseover mouseout'
  function add(element, events, fn, data, selector, delegator, capture){
    var id = zid(element), set = (handlers[id] || (handlers[id] = []));
    events.split(/\s/).forEach(function(event){
      if (event == 'ready') {
        return $(document).ready(fn);
      }
      var handler   = parse(event);
      handler.fn    = fn;
      handler.sel   = selector;
      // emulate mouseenter, mouseleave
      if (handler.e in hover) {
        /*
         relatedTarget为事件相关对象，只有在mouseover和mouseout事件时才有值
         mouseover时表示的是鼠标移出的那个对象，mouseout时表示的是鼠标移入的那个对象
         当related不存在，表示事件不是mouseover或者mouseout,mouseover时
         !$.contains(this, related)当相关对象不在事件对象内且related !== this相关对象不是事件对象时，表示鼠标已经从事件对象外部移入到了对象本身，这个时间是要执行处理函数的
         当鼠标从事件对象上移入到子节点的时候related就等于this了，且!$.contains(this, related)也不成立，这个时间是不需要执行处理函数的
         */
        fn = function(e) {
          var related = e.relatedTarget;
          if (!related || (related !== this && !$.contains(this, related))) {
            return handler.fn.apply(this, arguments);
          }
        }
      }
      //事件委托
      handler.del   = delegator;
      var callback  = delegator || fn;
      handler.proxy = function(e){
        e = compatible(e);
        if (e.isImmediatePropagationStopped()) {
          return;
        }
        e.data = data;
        var result = callback.apply(element, e._args == undefined ? [e] : [e].concat(e._args));
        //当事件处理函数返回false时，阻止默认操作和冒泡
        if (result === false) {
          e.preventDefault();
          e.stopPropagation();
        }
        return result;
      };
      //设置处理函数的在函数集中的位置
      handler.i = set.length;//index
      //将函数存入函数集中
      set.push(handler);
      if ('addEventListener' in element) {
        element.addEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture));
      }
    })
  }

  //删除绑定在元素上的指定类型的事件监听函数，可同时删除多种事件类型指定的函数，同add
  function remove(element, events, fn, selector, capture){
    var id = zid(element);
    (events || '').split(/\s/).forEach(function(event){
      //得到handler数组，删除其中的handler以及removeEventListener
      findHandlers(element, event, fn, selector).forEach(function(handler){
        delete handlers[id][handler.i];
        if ('removeEventListener' in element) {
          element.removeEventListener(realEvent(handler.e), handler.proxy, eventCapture(handler, capture));
        }
      });
    });
  }

  $.event = {
    add: add,
    remove: remove
  };

  //设置代理，返回一个新函数，并且这个函数始终保持了特定的作用域。
  //分两种情况
  //context:一个object，那个函数的作用域会被设置到这个object上来。
  //name：改变上下文中的函数名(这个函数必须是前一个参数 'context' 对象的属性)
  $.proxy = function(fn, context) {
    var args = (2 in arguments) && slice.call(arguments, 2);//剩余参数
    //如果fn是函数，则申明一个新的函数并用context作为上下文调用fn
    if (isFunction(fn)) {
      var proxyFn = function(){
        return fn.apply(context, args ? args.concat(slice.call(arguments)) : arguments);
      };
      //引用fn标示符
      proxyFn._zid = zid(fn);
      return proxyFn;
    } else if (isString(context)) {
      if (args) {
        args.unshift(fn[context], fn);
        return $.proxy.apply(null, args);
      } else {
        return $.proxy(fn[context], fn);
      }
    } else {
      throw new TypeError("expected function");
    }
  };

  //调用on
  $.fn.bind = function(event, data, callback){
    return this.on(event, data, callback)
  };
  //调用off
  $.fn.unbind = function(event, callback){
    return this.off(event, callback)
  };
  //单次绑定
  $.fn.one = function(event, selector, data, callback){
    return this.on(event, selector, data, callback, 1)
  };

  var returnTrue = function(){
        return true;
      },
      returnFalse = function(){
        return false;
      },
      ignoreProperties = /^([A-Z]|returnValue$|layer[XY]$)/,
      eventMethods = {
        preventDefault: 'isDefaultPrevented',//是否调用过preventDefault方法
        //取消执行其他的事件处理函数并取消事件冒泡.如果同一个事件绑定了多个事件处理函数, 在其中一个事件处理函数中调用此方法后将不会继续调用其他的事件处理函数.
        stopImmediatePropagation: 'isImmediatePropagationStopped',//是否调用过stopImmediatePropagation方法，
        stopPropagation: 'isPropagationStopped'//是否调用过stopPropagation方法
      };


  function compatible(event, source) {
    //有第二个参数或者event无isDefaultPrevented方法
    //event无isDefaultPrevented方法时，相当于给event添加eventMethods6个方法
    //有source参数时，根据source的特性来决定event的特性，完成对event的修改
    if (source || !event.isDefaultPrevented) {
      source || (source = event);//如果没有第二个参数，就将第二个参数指向event

      $.each(eventMethods, function(name, predicate) {
        var sourceMethod = source[name];
        event[name] = function(){
          this[predicate] = returnTrue;
          return sourceMethod && sourceMethod.apply(source, arguments);
        };
        event[predicate] = returnFalse;
      });
      //defaultPrevented为true或者returnValue为true或者getPreventDefault返回true，重置isDefaultPrevented
      if (source.defaultPrevented !== undefined ? source.defaultPrevented :
          'returnValue' in source ? source.returnValue === false :
          source.getPreventDefault && source.getPreventDefault()) {
        event.isDefaultPrevented = returnTrue;
      }
    }
    return event;
  }

  //创建事件代理
  function createProxy(event) {
    var key, proxy = { originalEvent: event };//保存原始event
    for (key in event) {
      //复制event属性至proxy
      if (!ignoreProperties.test(key) && event[key] !== undefined) {
        proxy[key] = event[key];
      }
    }
    //将preventDefault，stopImmediatePropagatio,stopPropagation方法定义到proxy上，然后返回proxy
    return compatible(proxy, event);
  }

  //事件委托，调用on
  $.fn.delegate = function(selector, event, callback){
    return this.on(event, selector, callback);
  };

  //取消事件委托，调用off
  $.fn.undelegate = function(selector, event, callback){
    return this.off(event, selector, callback);
  };

  //live直接绑定在body上
  $.fn.live = function(event, callback){
    $(document.body).delegate(this.selector, event, callback);
    return this;
  };

  //取消live
  $.fn.die = function(event, callback){
    $(document.body).undelegate(this.selector, event, callback);
    return this;
  };

  //绑定事件
  $.fn.on = function(event, selector, data, callback, one){
    var autoRemove, delegator, $this = this;
    /* *
    * event为对象时{ click: function}，分别调用
    * */
    if (event && !isString(event)) {
      $.each(event, function(type, fn){
        $this.on(type, selector, data, fn, one);
      });
      return $this;
    }

    //无selector参数
    if (!isString(selector) && !isFunction(callback) && callback !== false) {
      callback = data;
      data = selector;
      selector = undefined;
    }
    //无data参数
    if (callback === undefined || data === false) {
      callback = data;
      data = undefined;
    }
    //返回false
    if (callback === false) {
      callback = returnFalse;
    }

    return $this.each(function(_, element){
      if (one) {
        autoRemove = function(e){
          remove(element, e.type, callback);
          return callback.apply(this, arguments);
        };
      }

      //事件委托模式
      if (selector) {
        delegator = function(e){
          var evt, match = $(e.target).closest(selector, element).get(0);
          if (match && match !== element) {
            evt = $.extend(createProxy(e), {
              currentTarget: match,
              liveFired: element
            });
            return (autoRemove || callback).apply(match, [evt].concat(slice.call(arguments, 1)));
          }
        };
      }
      //绑定事件
      add(element, event, callback, data, selector, delegator || autoRemove);
    });
  };

  //解绑事件
  $.fn.off = function(event, selector, callback){
    var $this = this;
    if (event && !isString(event)) {
      $.each(event, function(type, fn){
        $this.off(type, selector, fn);
      });
      return $this;
    }

    //无select
    if (!isString(selector) && !isFunction(callback) && callback !== false) {
      callback = selector;
      selector = undefined;
    }


    if (callback === false) {
      callback = returnFalse;
    }

    return $this.each(function(){
      remove(this, event, callback, selector);
    })
  };

  //触发事件
  $.fn.trigger = function(event, args){
    event = (isString(event) || $.isPlainObject(event)) ? $.Event(event) : compatible(event);
    event._args = args;//额外参数
    return this.each(function(){
      // handle focus(), blur() by calling them directly
      if (event.type in focus && typeof this[event.type] == "function") {
        this[event.type]();
      }
      // items in the collection might not be DOM elements
      else if ('dispatchEvent' in this) {
        this.dispatchEvent(event);
      }
      else {
        $(this).triggerHandler(event, args);
      }
    })
  };

  // triggers event handlers on current element just as if an event occurred,
  // doesn't trigger an actual event, doesn't bubble
  //触发元素上绑定的指定类型的事件，但是不冒泡
  $.fn.triggerHandler = function(event, args){
    var e, result;
    this.each(function(i, element){
      e = createProxy(isString(event) ? $.Event(event) : event);
      e._args = args;
      e.target = element;
      //遍历元素上绑定的指定类型的事件处理函数集，按顺序执行，如果执行过stopImmediatePropagation，
      //那么e.isImmediatePropagationStopped()就会返回true,再外层函数返回false
      //注意each里的回调函数指定返回false时，会跳出循环，这样就达到的停止执行回面函数的目的
      $.each(findHandlers(element, event.type || event), function(i, handler){
        result = handler.proxy(e);
        if (e.isImmediatePropagationStopped()) {
          return false;
        }
      });
    });
    return result;
  };

  // shortcut methods for `.bind(event, fn)` for each event type
  ('focusin focusout focus blur load resize scroll unload click dblclick '+
  'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave '+
  'change select keydown keypress keyup error').split(' ').forEach(function(event) {
    $.fn[event] = function(callback) {
      //如果有callback回调，则认为它是绑定
      //如果没有callback回调，则让它主动触发
      return (0 in arguments) ?
        this.bind(event, callback) :
        this.trigger(event);
    }
  });

  //根据参数创建一个event对象
  $.Event = function(type, props) {
    //当type是个对象时，就是个带type的对象
    if (!isString(type)) {
      props = type;
      type = props.type;
    }
    //创建一个event对象，如果是click,mouseover,mouseout时，创建的是MouseEvent,bubbles为是否冒泡
    var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true;
    if (props) {
      for (var name in props) {
        //确保bubbles的值为true或false,并将props参数的属性扩展到新创建的event对象上
        (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name]);
      }
    }
    event.initEvent(type, bubbles, true);
    return compatible(event);
  };

})(Zepto);

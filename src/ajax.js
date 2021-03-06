//     Zepto.js
//     (c) 2010-2015 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

(function($){
  var jsonpID = 0,
      document = window.document,
      key,
      name,
      rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,
      jsonType = 'application/json',
      htmlType = 'text/html',
      blankRE = /^\s*$/,
      originAnchor = document.createElement('a');

  originAnchor.href = window.location.href;

  // trigger a custom event and return false if it was cancelled
  function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName);
    $(context).trigger(event, data);
    return !event.isDefaultPrevented();
  }

  // trigger an Ajax "global" event
  //触发 ajax的全局事件
  function triggerGlobal(settings, context, eventName, data) {
    if (settings.global) {
      return triggerAndReturn(context || document, eventName, data);
    }
  }

  // Number of active Ajax requests
  $.active = 0;

  //从0到1时触发ajaxStart事件
  //settings.global为true时表示需要触发全局ajax事件
  //注意这里的$.active++ === 0很巧妙，用它来判断开始，因为只有$.active等于0时$.active++ === 0才成立
  function ajaxStart(settings) {
    if (settings.global && $.active++ === 0) {
      triggerGlobal(settings, null, 'ajaxStart');
    }
  }
  //归0时，触发ajaxStop事件
  //注意这里的 !(--$.active)同上面的异曲同工，--$.active为0，则表示$.active的值为1，这样用来判断结束，也很有意思
  function ajaxStop(settings) {
    if (settings.global && !(--$.active)) {
      triggerGlobal(settings, null, 'ajaxStop');
    }
  }

  // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
  //触发全局ajaxBeforeSend事件，如果返回false,则取消此次请求
  function ajaxBeforeSend(xhr, settings) {
    var context = settings.context;
    if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false) {
      return false;
    }

    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings]);
  }

  //触发success事件
  //都要触发complete事件
  function ajaxSuccess(data, xhr, settings, deferred) {
    var context = settings.context, status = 'success';
    settings.success.call(context, data, status, xhr);
    if (deferred) {
      deferred.resolveWith(context, [data, status, xhr]);
    }
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data]);
    ajaxComplete(status, xhr, settings);
  }
  // type: "timeout", "error", "abort", "parsererror"
  //触发error事件
  //都要触发complete事件
  function ajaxError(error, type, xhr, settings, deferred) {
    var context = settings.context;
    settings.error.call(context, xhr, type, error);
    if (deferred) {
      deferred.rejectWith(context, [xhr, type, error]);
    }
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error || type]);
    ajaxComplete(type, xhr, settings);
  }
  // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
  function ajaxComplete(status, xhr, settings) {
    var context = settings.context;
    settings.complete.call(context, xhr, status);
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings]);
    ajaxStop(settings);
  }

  // Empty function, used as default callback
  function empty() {}

  //JSONP格式
  $.ajaxJSONP = function(options, deferred){
    //无type指定为jsonp的话，使用正常ajax
    if (!('type' in options)) {
      return $.ajax(options);
    }

    var _callbackName = options.jsonpCallback,//回调函数名
      callbackName = ($.isFunction(_callbackName) ?
        _callbackName() : _callbackName) || ('jsonp' + (++jsonpID)),
      script = document.createElement('script'),
      originalCallback = window[callbackName],//保存原callback
      responseData,
      abort = function(errorType) {
        $(script).triggerHandler('error', errorType || 'abort');
      },
      xhr = { abort: abort }, abortTimeout;

    if (deferred) {
      deferred.promise(xhr);
    }

    $(script).on('load error', function(e, errorType){
      clearTimeout(abortTimeout);
      $(script).off().remove();

      //error
      if (e.type == 'error' || !responseData) {
        ajaxError(null, errorType || 'error', xhr, options, deferred);
      } else {
        //success
        ajaxSuccess(responseData[0], xhr, options, deferred);
      }
      //加载完成之后重置回来，并且调用originalCallback
      window[callbackName] = originalCallback;
      if (responseData && $.isFunction(originalCallback)) {
        originalCallback(responseData[0]);
      }

      originalCallback = responseData = undefined;
    });

    if (ajaxBeforeSend(xhr, options) === false) {
      abort('abort');
      return xhr;
    }

    window[callbackName] = function(){
      responseData = arguments;
    };

    //src加上callbackName
    script.src = options.url.replace(/\?(.+)=\?/, '?$1=' + callbackName);
    document.head.appendChild(script);

    if (options.timeout > 0) {
      abortTimeout = setTimeout(function(){
        abort('timeout');
      }, options.timeout);
    }

    return xhr;//经过deferred包装的xhr对象
  };

  $.ajaxSettings = {
    // Default type of request
    type: 'GET',
    // Callback that is executed before request
    beforeSend: empty,
    // Callback that is executed if the request succeeds
    success: empty,
    // Callback that is executed the the server drops error
    error: empty,
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    context: null,
    // Whether to trigger "global" Ajax events
    global: true,
    // Transport
    xhr: function () {
      return new window.XMLHttpRequest();
    },
    // MIME types mapping
    // IIS returns Javascript as "application/x-javascript"
    accepts: {
      script: 'text/javascript, application/javascript, application/x-javascript',
      json:   jsonType,
      xml:    'application/xml, text/xml',
      html:   htmlType,
      text:   'text/plain'
    },
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    timeout: 0,
    // Whether data should be serialized to string
    processData: true,
    // Whether the browser should be allowed to cache GET responses
    cache: true
  };

  //根据MIME返回相应的数据类型，用作ajax参数里的dataType用，设置预期返回的数据类型：Content-Type:text/html;charset=UTF-8
  function mimeToDataType(mime) {
    if (mime) {
      mime = mime.split(';', 2)[0];//数组最大长度
    }
    return mime && ( mime == htmlType ? 'html' :
      mime == jsonType ? 'json' :
      scriptTypeRE.test(mime) ? 'script' :
      xmlTypeRE.test(mime) && 'xml' ) || 'text';
  }

  function appendQuery(url, query) {
    if (query == '') {
      return url;
    }
    return (url + '&' + query).replace(/[&?]{1,2}/, '?');//将第一个&替换为?
  }

  // serialize payload and append it to the URL for GET requests
  // 处理get参数
  function serializeData(options) {
    //data变成字符串
    if (options.processData && options.data && $.type(options.data) != "string") {
      options.data = $.param(options.data, options.traditional);
    }

    if (options.data && (!options.type || options.type.toUpperCase() == 'GET')) {
      options.url = appendQuery(options.url, options.data);
      options.data = undefined;
    }
  }

  //ajax函数
  $.ajax = function(options){
    var settings = $.extend({}, options || {}),
        deferred = $.Deferred && $.Deferred(),
        urlAnchor, hashIndex;
    //复制默认值到settings
    for (key in $.ajaxSettings) {
      if (settings[key] === undefined) {
        settings[key] = $.ajaxSettings[key];
      }
    }

    //开始ajax
    ajaxStart(settings);

    if (!settings.crossDomain) {
      urlAnchor = document.createElement('a');
      urlAnchor.href = settings.url;
      // cleans up URL for .href (IE only), see https://github.com/madrobby/zepto/pull/1049
      urlAnchor.href = urlAnchor.href;
      //是否跨域
      settings.crossDomain = (originAnchor.protocol + '//' + originAnchor.host) !== (urlAnchor.protocol + '//' + urlAnchor.host);
    }
    //设置url
    if (!settings.url) {
      settings.url = window.location.toString();
    }

    //去除hash之后
    if ((hashIndex = settings.url.indexOf('#')) > -1) {
      settings.url = settings.url.slice(0, hashIndex);
    }
    serializeData(settings);

    var dataType = settings.dataType, hasPlaceholder = /\?.+=\?/.test(settings.url);//? ...=?匹配
    //格式为jsonp
    if (hasPlaceholder) {
      dataType = 'jsonp';
    }

    //不缓存，url加上时间戳
    if (settings.cache === false || (
         (!options || options.cache !== true) &&
         ('script' == dataType || 'jsonp' == dataType)
        )) {
      settings.url = appendQuery(settings.url, '_=' + Date.now());
    }

    //重写回调函数名，直接jsonp
    if ('jsonp' == dataType) {
      if (!hasPlaceholder) {
        settings.url = appendQuery(settings.url,
            settings.jsonp ? (settings.jsonp + '=?') : settings.jsonp === false ? '' : 'callback=?');
      }
      return $.ajaxJSONP(settings, deferred);
    }

    var mime = settings.accepts[dataType],
        headers = { },
        setHeader = function(name, value) {
          headers[name.toLowerCase()] = [name, value];
        },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,//何种协议,如果请求地址没有定请求协议，则与当前页面协议相同
        xhr = settings.xhr(),
        nativeSetHeader = xhr.setRequestHeader,
        abortTimeout;

    //deferred策略
    if (deferred) {
      deferred.promise(xhr);
    }

    if (!settings.crossDomain) {
      setHeader('X-Requested-With', 'XMLHttpRequest');//如果没有跨域
    }
    setHeader('Accept', mime || '*/*');
    if (mime = settings.mimeType || mime) {
      if (mime.indexOf(',') > -1) {
        mime = mime.split(',', 2)[0];
      }
      //强制mimeType
      xhr.overrideMimeType && xhr.overrideMimeType(mime);
    }
    //如果不是GET请求，设置发送信息至服务器时内容编码类型
    if (settings.contentType || (settings.contentType !== false && settings.data && settings.type.toUpperCase() != 'GET')) {
      setHeader('Content-Type', settings.contentType || 'application/x-www-form-urlencoded');
    }

    if (settings.headers) {
      for (name in settings.headers) {
        setHeader(name, settings.headers[name]);
      }
    }
    xhr.setRequestHeader = setHeader;

    xhr.onreadystatechange = function(){
      if (xhr.readyState == 4) {
        xhr.onreadystatechange = empty;
        clearTimeout(abortTimeout);
        var result, error = false;
        //根据状态来判断请求是否成功
        //状态>=200 && < 300 表示成功
        //状态 == 304 表示文件未改动过，也可认为成功
        //如果是取要本地文件那也可以认为是成功的，xhr.status == 0是在直接打开页面时发生请求时出现的状态，也就是不是用localhost的形式访问的页面的情况
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
          //获取返回的数据类型
          dataType = dataType || mimeToDataType(settings.mimeType || xhr.getResponseHeader('content-type'));
          result = xhr.responseText;

          try {
            // http://perfectionkills.com/global-eval-what-are-the-options/
            if (dataType == 'script')    {
              (1,eval)(result);
            }
            else if (dataType == 'xml')  {
              result = xhr.responseXML;
            }
            else if (dataType == 'json') {
              result = blankRE.test(result) ? null : $.parseJSON(result);
            }
          } catch (e) {
            error = e;
          }
          //如果解析出错，则执行全局parsererror事件
          if (error) {
            ajaxError(error, 'parsererror', xhr, settings, deferred);
          }
          //否则执行ajaxSuccess
          else {
            ajaxSuccess(result, xhr, settings, deferred);
          }
        } else {
          //如果请求出错，则根据xhr.status来执行相应的错误处理函数
          ajaxError(xhr.statusText || null, xhr.status ? 'error' : 'abort', xhr, settings, deferred);
        }
      }
    };

    //如果ajaxBeforeSend函数返回的false，则取消此次请示
    if (ajaxBeforeSend(xhr, settings) === false) {
      xhr.abort();
      ajaxError(null, 'abort', xhr, settings, deferred);
      return xhr;
    }

    //设置请求头信息
    if (settings.xhrFields) {
      for (name in settings.xhrFields) {
        xhr[name] = settings.xhrFields[name];
      }
    }

    //是否异步
    var async = 'async' in settings ? settings.async : true;
    //初始化请求
    xhr.open(settings.type, settings.url, async, settings.username, settings.password);

    for (name in headers) {
      nativeSetHeader.apply(xhr, headers[name]);
    }

    //当设置了settings.timeout，则在超时后取消请求，并执行timeout事件处理函数
    if (settings.timeout > 0) {
      abortTimeout = setTimeout(function(){
        xhr.onreadystatechange = empty;
        xhr.abort();
        ajaxError(null, 'timeout', xhr, settings, deferred);
      }, settings.timeout);
    }

    // avoid sending empty string (#319)
    //请求
    xhr.send(settings.data ? settings.data : null);
    return xhr;
  };

  // handle optional data/success arguments
  //将参数转换成ajax函数指定的参数格式
  function parseArguments(url, data, success, dataType) {
    //无data,如果data是function，则认为它是请求成功后的回调
    if ($.isFunction(data)) {
      dataType = success;
      success = data;
      data = undefined;
    }
    //无success
    if (!$.isFunction(success)) {
      dataType = success;
      success = undefined;
    }
    return {
      url: url,
      data: data,
      success: success,
      dataType: dataType
    }
  }

  $.get = function(/* url, data, success, dataType */){
    return $.ajax(parseArguments.apply(null, arguments));
  };

  $.post = function(/* url, data, success, dataType */){
    var options = parseArguments.apply(null, arguments);
    options.type = 'POST';
    return $.ajax(options);
  };

  $.getJSON = function(/* url, data, success */){
    var options = parseArguments.apply(null, arguments);
    options.dataType = 'json';
    return $.ajax(options);
  };

  //原型上的方法
  //这里的url可以是http://www.xxxx.com selector这种形式，就是对加载进来的HTML对行一个筛选
  $.fn.load = function(url, data, success){
    if (!this.length) {
      return this;
    }
    //将请求地址用空格分开
    var self = this, parts = url.split(/\s/), selector,
        options = parseArguments(url, data, success),
        callback = options.success;
    if (parts.length > 1) {
      options.url = parts[0];
      selector = parts[1];
    }
    //设置html
    //要对成功后的回调函数进行一个改写，因为需要将加载进来的HTML添加进当前集合
    options.success = function(response){
      //selector就是对请求到的数据就行一个筛选的条件，比如只获取数据里的类名为.test的标签
      self.html(selector ?
        $('<div>').html(response.replace(rscript, "")).find(selector)
        : response);
      //这里才是你写的回调
      callback && callback.apply(self, arguments);
    };
    $.ajax(options);
    return this;
  };

  var escape = encodeURIComponent;

  //params是个有add的数组
  function serialize(params, obj, traditional, scope){
    var type, array = $.isArray(obj), hash = $.isPlainObject(obj);
    $.each(obj, function(key, value) {
      type = $.type(value);
      //scope用作处理value也是object或者array的情况
      //traditional表示是否以传统的方式拼接数据，
      //传统的意思就是比如现有一个数据{a:[1,2,3]},转成查询字符串后结果为'a=1&a=2&a=3'，true
      //非传统的的结果则是a[]=1&a[]=2&a[]=3，false,默认
      if (scope) {
        key = traditional ? scope :
        scope + '[' + (hash || type == 'object' || type == 'array' ? key : '') + ']';
      }
      // handle data in serializeArray() format
      //当处理的数据为[{name: , value: },{},{}]这种情况的时候，一般指的是序列化表单后的结果
      if (!scope && array) {
        params.add(value.name, value.value);
      }
      // recurse into nested objects
      //当value值是数组或者是对象且不是按传统的方式序列化的时候，需要再次遍历value
      else if (type == "array" || (!traditional && type == "object")) {
        serialize(params, value, traditional, key);
      } else {
        params.add(key, value);
      }
    });
  }

  //将obj转换为查询字符串的格式，traditional表示是否转换成传统的方式，至于传统的方式的意思看上面的注释
  $.param = function(obj, traditional){
    var params = [];
    params.add = function(key, value) {
      if ($.isFunction(value)) {
        value = value();
      }
      if (value == null) {
        value = "";
      }
      this.push(escape(key) + '=' + escape(value));
    };
    //注意这里将add方法定到params，所以下面serialize时才不需要返回数据
    serialize(params, obj, traditional);
    return params.join('&').replace(/%20/g, '+');
  }
})(Zepto);

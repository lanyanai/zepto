//     Zepto.js
//     (c) 2010-2015 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function($){
  //序列化表单，返回一个类似[{name:value},{name2:value2}]的数组
  $.fn.serializeArray = function() {
    var name, type, result = [],
      //扁平化数组，都压到value
      add = function(value) {
        if (value.forEach) {
          return value.forEach(add);
        }
        result.push({
          name: name,
          value: value
        });
      };
    //只取第一个元素
    if (this[0]) {
      $.each(this[0].elements, function(_, field){
        type = field.type;
        name = field.name;
        //判断其type属性，排除fieldset，submi,reset,button以及没有被选中的radio和checkbox
        //注意这里的写法，当元素既不是radio也不是checkbox时,直接返回true，
        //当元素是radio或者checkbox时，会执行后面的this.checked，当radio或者checkbox被选中时this.checked得到true值
        //这样就可以筛选中被选中的radio和checkbox了
        if (name && field.nodeName.toLowerCase() != 'fieldset' &&
            !field.disabled && type != 'submit' && type != 'reset' && type != 'button' && type != 'file' &&
            ((type != 'radio' && type != 'checkbox') || field.checked)) {
          add($(field).val());
        }
      })
    }
    return result;
  };

  //序列化为xx=xx&aa=xx格式
  $.fn.serialize = function(){
    var result = [];
    this.serializeArray().forEach(function(elm){
      result.push(encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value));
    });
    return result.join('&');
  };

  //提交表单
  $.fn.submit = function(callback) {
    if (0 in arguments) {
      this.bind('submit', callback);
    }
    else if (this.length) {
      var event = $.Event('submit');
      this.eq(0).trigger(event);
      if (!event.isDefaultPrevented()) {
        this.get(0).submit();
      }
    }
    return this;
  };

})(Zepto);

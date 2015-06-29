//     Zepto.js
//     (c) 2010-2015 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

;(function(undefined){
  //补全String的trim函数
  if (String.prototype.trim === undefined) // fix for iOS 3.2
    String.prototype.trim = function(){
      return this.replace(/^\s+|\s+$/g, '');
    };

  // For iOS 3.x
  // from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/reduce
  //补全Array的reduce函数
  if (Array.prototype.reduce === undefined)
    Array.prototype.reduce = function(fun){
      if(this === void 0 || this === null) {
        throw new TypeError();
      }
      var t = Object(this),
          len = t.length >>> 0,//类型转换，成无符号
          k = 0,
          accumulator;
      if(typeof fun != 'function') {
        throw new TypeError();
      }
      //数组长度为0时且无第二个参数，抛出异常
      if(len == 0 && arguments.length == 1) {
        throw new TypeError();
      }

      //获取初始值
      if(arguments.length >= 2) {
        accumulator = arguments[1];
      }
      else{
        do{
          if(k in t){
            accumulator = t[k++];
            break;
          }
          if(++k >= len) {
            throw new TypeError();
          }
        } while (true);
      }

      //累加过程
      while (k < len){
        if(k in t) {
          accumulator = fun.call(undefined, accumulator, t[k], k, t);
        }
        k++;
      }
      return accumulator;
    }

})();

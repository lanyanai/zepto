//     Zepto.js
//     (c) 2010-2015 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.
//
//     Some code (c) 2005, 2013 jQuery Foundation, Inc. and other contributors

//延迟对象
(function($){
  var slice = Array.prototype.slice;

  function Deferred(func) {
    var tuples = [
          // action, add listener, listener list, final state
          [ "resolve", "done", $.Callbacks({once:1, memory:1}), "resolved" ],
          [ "reject", "fail", $.Callbacks({once:1, memory:1}), "rejected" ],
          [ "notify", "progress", $.Callbacks({memory:1}) ]
        ],
        state = "pending",
        promise = {
          state: function() {
            return state;
          },
          always: function() {
            deferred.done(arguments).fail(arguments);
            return this;
          },
          then: function(/* fnDone [, fnFailed [, fnProgress]] */) {
            var fns = arguments;
            //新的deferred对象
            return Deferred(function(defer){//参数为新构建的defer
              $.each(tuples, function(i, tuple){
                var fn = $.isFunction(fns[i]) && fns[i];
                //添加对应的function
                deferred[tuple[1]](function(){
                  var returned = fn && fn.apply(this, arguments);
                  if (returned && $.isFunction(returned.promise)) {
                    //返回为deferred对象的话，返回的deferred对象状态会触发新的deferred对象
                    returned.promise()
                      .done(defer.resolve)
                      .fail(defer.reject)
                      .progress(defer.notify);
                  } else {
                    //不是deferred对象的话，使用返回值触发新deferred对象
                    var context = this === promise ? defer.promise() : this,
                        values = fn ? [returned] : arguments;
                    defer[tuple[0] + "With"](context, values);
                  }
                });
              });
              fns = null;
            }).promise();
          },
          //无参数的话则返回promise对象，无触发的方法
          promise: function(obj) {
            return obj != null ? $.extend( obj, promise ) : promise;
          }
        },
        deferred = {};

    $.each(tuples, function(i, tuple){
      var list = tuple[2],//Callback对象
          stateString = tuple[3];

      promise[tuple[1]] = list.add;//promise添加done fail process方法

      //有状态
      if (stateString) {
        list.add(function(){
          state = stateString;
        }, tuples[i^1][2].disable, tuples[2][2].lock);//加上三个函数
      }

      //给deferred添加resolve/reject/notify/resolveWith/rejectWith/notifyWith方法，实际是fireWith
      deferred[tuple[0]] = function(){
        deferred[tuple[0] + "With"](this === deferred ? promise : this, arguments);
        return this;
      };
      deferred[tuple[0] + "With"] = list.fireWith;
    });

    //给deferred加上promise方法
    promise.promise(deferred);
    if (func) {
      func.call(deferred, deferred);
    }
    return deferred;
  }

  $.when = function(sub) {
    var resolveValues = slice.call(arguments),//Deferred对象数组
        len = resolveValues.length,
        i = 0,
        remain = len !== 1 || (sub && $.isFunction(sub.promise)) ? len : 0,
        deferred = remain === 1 ? sub : Deferred(),//只有一个参数的话，直接使用参数
        progressValues, progressContexts, resolveContexts,
        //生成update函数
        updateFn = function(i, ctx, val){
          return function(value){
            ctx[i] = this;
            val[i] = arguments.length > 1 ? slice.call(arguments) : value;
            if (val === progressValues) {
              deferred.notifyWith(ctx, val);
            } else if (!(--remain)) {//remain到0，触发deferred
              deferred.resolveWith(ctx, val);
            }
          }
        };

    if (len > 1) {
      progressValues = new Array(len);
      progressContexts = new Array(len);
      resolveContexts = new Array(len);
      for ( ; i < len; ++i ) {
        if (resolveValues[i] && $.isFunction(resolveValues[i].promise)) {
          resolveValues[i].promise()
            .done(updateFn(i, resolveContexts, resolveValues))
            .fail(deferred.reject)
            .progress(updateFn(i, progressContexts, progressValues));
        } else {
          --remain;
        }
      }
    }
    if (!remain) {
      deferred.resolveWith(resolveContexts, resolveValues);
    }
    return deferred.promise();
  };

  $.Deferred = Deferred;
})(Zepto);

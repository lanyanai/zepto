//     Zepto.js
//     (c) 2010-2015 Thomas Fuchs
//     Zepto.js may be freely distributed under the MIT license.

(function($){
  // Create a collection of callbacks to be fired in a sequence, with configurable behaviour
  // Option flags:
  //   - once: Callbacks fired at most one time.只能触发一次
  //   - memory: Remember the most recent context and arguments，是否记住最近调用的上下文与参数，记住的话添加进新的函数则使用这个调用
  //   - stopOnFalse: Cease iterating over callback list
  //   - unique: Permit adding at most one instance of the same callback
  //Callbacks回调函数方面
  $.Callbacks = function(options) {
    options = $.extend({}, options);

    var memory, // Last fire value (for non-forgettable lists)
        fired,  // Flag to know if list was already fired
        firing, // Flag to know if list is currently firing
        firingStart, // First callback to fire (used internally by add and fireWith)
        firingLength, // End of the loop when firing
        firingIndex, // Index of currently firing callback (modified by remove if needed)
        list = [], // Actual callback list
        stack = !options.once && [],// Stack of fire calls for repeatable lists,once为true则stack为false
        fire = function(data) {
          memory = options.memory && data;
          fired = true;
          firingIndex = firingStart || 0;
          firingStart = 0;
          firingLength = list.length;
          firing = true;
          for ( ; list && firingIndex < firingLength ; ++firingIndex ) {
            if (list[firingIndex].apply(data[0], data[1]) === false && options.stopOnFalse) {
              memory = false;
              break;
            }
          }
          firing = false;
          if (list) {
            if (stack) {
              stack.length && fire(stack.shift());
            } else if (memory) {
              list.length = 0;
            } else {
              Callbacks.disable();
            }
          }
        },

        Callbacks = {
          add: function() {
            if (list) {
              var start = list.length,
                  //add回调函数
                  add = function(args) {
                    $.each(args, function(_, arg){
                      if (typeof arg === "function") {
                        if (!options.unique || !Callbacks.has(arg)) {
                          //加入list数组
                          list.push(arg);
                        }
                      } else if (arg && arg.length && typeof arg !== 'string') {
                        //数组或者类数组
                        add(arg);
                      }
                    });
                  };
              add(arguments);
              //如果正在触发的话，修改firingLength
              if (firing) {
                firingLength = list.length;
              } else if (memory) {
                //触发新进来的函数
                firingStart = start;
                fire(memory);
              }
            }
            return this;
          },
          //删除回调函数
          remove: function() {
            if (list) {
              $.each(arguments, function(_, arg){
                var index;
                while ((index = $.inArray(arg, list, index)) > -1) {
                  list.splice(index, 1);
                  // Handle firing indexes
                  if (firing) {
                    if (index <= firingLength) {
                      --firingLength;
                    }
                    if (index <= firingIndex) {
                      --firingIndex;
                    }
                  }
                }
              });
            }
            return this;
          },
          //不传参数则是判断是否有回调函数
          has: function(fn) {
            return !!(list && (fn ? $.inArray(fn, list) > -1 : list.length));
          },
          //清空
          empty: function() {
            firingLength = list.length = 0;
            return this;
          },
          //disable当前回掉对象
          disable: function() {
            list = stack = memory = undefined;
            return this;
          },
          //是否disable状态
          disabled: function() {
            return !list;
          },
          //锁定
          lock: function() {
            stack = undefined;
            if (!memory) {
              Callbacks.disable();
            }
            return this;
          },
          //是否lock
          locked: function() {
            return !stack;
          },
          //以一定上下文触发
          fireWith: function(context, args) {
            if (list && (!fired || stack)) {
              args = args || [];
              args = [context, args.slice ? args.slice() : args];
              //处于触发态，先存参数
              if (firing) {
                stack.push(args);
              } else {
                //处于未触发，直接触发
                fire(args);
              }
            }
            return this;
          },
          fire: function() {
            //使用本身作为fire上下文
            return Callbacks.fireWith(this, arguments);
          },
          //是否触发过
          fired: function() {
            return !!fired;
          }
        };

    return Callbacks;
  }
})(Zepto);

/**
 * dat-gui JavaScript Controller Library
 * http://code.google.com/p/dat-gui
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

/** @namespace */
var dat = dat || {};

/** @namespace */
dat.gui = dat.gui || {};

/** @namespace */
dat.utils = dat.utils || {};

/** @namespace */
dat.controllers = dat.controllers || {};

/** @namespace */
dat.dom = dat.dom || {};

/** @namespace */
dat.color = dat.color || {};

dat.utils.common = (function () {

    var ARR_EACH = Array.prototype.forEach;
    var ARR_SLICE = Array.prototype.slice;

    /**
     * Band-aid methods for things that should be a lot easier in JavaScript.
     * Implementation and structure inspired by underscore.js
     * http://documentcloud.github.com/underscore/
     */

    return {

        BREAK: {},

        extend: function(target) {

            this.each(ARR_SLICE.call(arguments, 1), function(obj) {

                for (var key in obj)
                    if (!this.isUndefined(obj[key]))
                        target[key] = obj[key];

            }, this);

            return target;

        },

        defaults: function(target) {

            this.each(ARR_SLICE.call(arguments, 1), function(obj) {

                for (var key in obj)
                    if (this.isUndefined(target[key]))
                        target[key] = obj[key];

            }, this);

            return target;

        },

        compose: function() {
            var toCall = ARR_SLICE.call(arguments);
            return function() {
                var args = ARR_SLICE.call(arguments);
                for (var i = toCall.length -1; i >= 0; i--) {
                    args = [toCall[i].apply(this, args)];
                }
                return args[0];
            }
        },

        each: function(obj, itr, scope) {

            if (!obj) return;

            if (ARR_EACH && obj.forEach && obj.forEach === ARR_EACH) {

                obj.forEach(itr, scope);

            } else if (obj.length === obj.length + 0) { // Is number but not NaN

                for (var key = 0, l = obj.length; key < l; key++)
                    if (key in obj && itr.call(scope, obj[key], key) === this.BREAK)
                        return;

            } else {

                for (var key in obj)
                    if (itr.call(scope, obj[key], key) === this.BREAK)
                        return;

            }

        },

        contains: function(arr, obj) {
            for (var key in arr) {
                if (arr[key] == obj) return true;
            }
            return false;
        },

        defer: function(fnc) {
            setTimeout(fnc, 0);
        },

        toArray: function(obj) {
            if (obj.toArray) return obj.toArray();
            return ARR_SLICE.call(obj);
        },

        isUndefined: function(obj) {
            return obj === undefined;
        },

        isNull: function(obj) {
            return obj === null;
        },

        isArray: Array.isArray || function(obj) {
            return obj.constructor === Array;
        },

        isObject: function(obj) {
            return obj === Object(obj);
        },

        isNumber: function(obj) {
            return obj === obj+0;
        },

        isString: function(obj) {
            return obj === obj+'';
        },

        isBoolean: function(obj) {
            return obj === false || obj === true;
        },

        isFunction: function(obj) {
            return Object.prototype.toString.call(obj) === '[object Function]';
        }

    };

})();


dat.dom.dom = (function (common) {

    var EVENT_MAP = {
        'HTMLEvents': ['change'],
        'MouseEvents': ['click','mousemove','mousedown','mouseup', 'mouseover'],
        'KeyboardEvents': ['keydown']
    };

    var EVENT_MAP_INV = {};
    common.each(EVENT_MAP, function(v, k) {
        common.each(v, function(e) {
            EVENT_MAP_INV[e] = k;
        });
    });

    var CSS_VALUE_PIXELS = /(\d+(\.\d+)?)px/;

    function cssValueToPixels(val) {

        if (val === '0' || common.isUndefined(val)) return 0;

        var match = val.match(CSS_VALUE_PIXELS);

        if (!common.isNull(match)) {
            return parseFloat(match[1]);
        }

        // TODO ...ems? %?

        return 0;

    }

    /**
     * @namespace
     * @member dat.dom
     */
    var dom = {

        /**
         *
         * @param elem
         * @param selectable
         */
        makeSelectable: function(elem, selectable) {

            if (elem === undefined || elem.style === undefined) return;

            elem.onselectstart = selectable ? function() {
                return false;
            } : function() {
            };

            elem.style.MozUserSelect = selectable ? 'auto' : 'none';
            elem.style.KhtmlUserSelect = selectable ? 'auto' : 'none';
            elem.unselectable = selectable ? 'on' : 'off';

        },

        /**
         *
         * @param elem
         * @param horizontal
         * @param vertical
         */
        makeFullscreen: function(elem, horizontal, vertical) {

            if (common.isUndefined(horizontal)) horizontal = true;
            if (common.isUndefined(vertical)) vertical = true;

            elem.style.position = 'absolute';

            if (horizontal) {
                elem.style.left = 0;
                elem.style.right = 0;
            }
            if (vertical) {
                elem.style.top = 0;
                elem.style.bottom = 0;
            }

        },

        /**
         *
         * @param elem
         * @param eventType
         * @param params
         */
        fakeEvent: function(elem, eventType, params, aux) {
            params = params || {};
            var className = EVENT_MAP_INV[eventType];
            if (!className) {
                throw new Error('Event type ' + eventType + ' not supported.');
            }
            var evt = document.createEvent(className);
            switch (className) {
                case 'MouseEvents':
                    var clientX = params.x || params.clientX || 0;
                    var clientY = params.y || params.clientY || 0;
                    evt.initMouseEvent(eventType, params.bubbles || false,
                        params.cancelable || true, window, params.clickCount || 1,
                        0, //screen X
                        0, //screen Y
                        clientX, //client X
                        clientY, //client Y
                        false, false, false, false, 0, null);
                    break;
                case 'KeyboardEvents':
                    var init = evt.initKeyboardEvent || evt.initKeyEvent; // webkit || moz
                    common.defaults(params, {
                        cancelable: true,
                        ctrlKey: false,
                        altKey: false,
                        shiftKey: false,
                        metaKey: false,
                        keyCode: undefined,
                        charCode: undefined
                    });
                    init(eventType, params.bubbles || false,
                        params.cancelable, window,
                        params.ctrlKey, params.altKey,
                        params.shiftKey, params.metaKey,
                        params.keyCode, params.charCode);
                    break;
                default:
                    evt.initEvent(eventType, params.bubbles || false,
                        params.cancelable || true);
                    break;
            }
            common.defaults(evt, aux);
            elem.dispatchEvent(evt);
        },

        /**
         *
         * @param elem
         * @param event
         * @param func
         * @param bool
         */
        bind: function(elem, event, func, bool) {
            bool = bool || false;
            if (elem.addEventListener)
                elem.addEventListener(event, func, bool);
            else if (elem.attachEvent)
                elem.attachEvent('on' + event, func);
            return dom;
        },

        /**
         *
         * @param elem
         * @param event
         * @param func
         * @param bool
         */
        unbind: function(elem, event, func, bool) {
            bool = bool || false;
            if (elem.removeEventListener)
                elem.removeEventListener(event, func, bool);
            else if (elem.detachEvent)
                elem.detachEvent('on' + event, func);
            return dom;
        },

        /**
         *
         * @param elem
         * @param className
         */
        addClass: function(elem, className) {
            if (elem.className === undefined) {
                elem.className = className;
            } else if (elem.className !== className) {
                var classes = elem.className.split(/ +/);
                if (classes.indexOf(className) == -1) {
                    classes.push(className);
                    elem.className = classes.join(' ').replace(/^\s+/, '').replace(/\s+$/, '');
                }
            }
            return dom;
        },

        /**
         *
         * @param elem
         * @param className
         */
        removeClass: function(elem, className) {
            if (className) {
                if (elem.className === undefined) {
                    // elem.className = className;
                } else if (elem.className === className) {
                    elem.removeAttribute('class');
                } else {
                    var classes = elem.className.split(/ +/);
                    var index = classes.indexOf(className);
                    if (index != -1) {
                        classes.splice(index, 1);
                        elem.className = classes.join(' ');
                    }
                }
            } else {
                elem.className = undefined;
            }
            return dom;
        },

        hasClass: function(elem, className) {
            return new RegExp('(?:^|\\s+)' + className + '(?:\\s+|$)').test(elem.className) || false;
        },

        /**
         *
         * @param elem
         */
        getWidth: function(elem) {

            var style = getComputedStyle(elem);

            return cssValueToPixels(style['border-left-width']) +
                cssValueToPixels(style['border-right-width']) +
                cssValueToPixels(style['padding-left']) +
                cssValueToPixels(style['padding-right']) +
                cssValueToPixels(style['width']);
        },

        /**
         *
         * @param elem
         */
        getHeight: function(elem) {

            var style = getComputedStyle(elem);

            return cssValueToPixels(style['border-top-width']) +
                cssValueToPixels(style['border-bottom-width']) +
                cssValueToPixels(style['padding-top']) +
                cssValueToPixels(style['padding-bottom']) +
                cssValueToPixels(style['height']);
        },

        /**
         *
         * @param elem
         */
        getOffset: function(elem) {
            var offset = {left: 0, top:0};
            if (elem.offsetParent) {
                do {
                    offset.left += elem.offsetLeft;
                    offset.top += elem.offsetTop;
                } while (elem = elem.offsetParent);
            }
            return offset;
        },

        // http://stackoverflow.com/posts/2684561/revisions
        /**
         *
         * @param elem
         */
        isActive: function(elem) {
            return elem === document.activeElement && ( elem.type || elem.href );
        }

    };

    return dom;

})(dat.utils.common);


dat.controllers.Controller = (function (dom, common) {

    /**
     * @class An "abstract" class that represents a given property of an object.
     *
     * @param {Object} object The object to be manipulated
     * @param {string} property The name of the property to be manipulated
     *
     * @member dat.controllers
     */
    var Controller = function(name, value, type, options) {

        /**
         * Keep track of the property name
         */
        this.__name = name;

        /**
         * Keep track of the initial and current Controller values
         */
        this.__value = value;
        this.__prevValue = value;
        this.__initialValue = value;

        /**
         * Keep track of the type of Controller for style purposes
         */
        this.__type = type;

        /**
         * Keep track of the options
         */
        this.__options = options || {};

        /**
         * Those who extend this class will put their DOM elements in here.
         * @type {DOMElement}
         */
        this.el = document.createElement('div');
        dom.addClass(this.el, 'c');

        /**
         * The function to be called on change.
         * @type {Function}
         * @ignore
         */
        this.__onChange = undefined;

        /**
         * The function to be called on finishing change.
         * @type {Function}
         * @ignore
         */
        this.__onFinishChange = undefined;

        this.__onReadonlyChange = undefined;

    };

    common.extend(

        Controller.prototype,

        /** @lends dat.controllers.Controller.prototype */
        {

            /**
             * Specify that a function fire every time someone changes the value with
             * this Controller.
             *
             * @param {Function} fnc This function will be called whenever the value
             * is modified via this Controller.
             * @returns {dat.controllers.Controller} this
             */
            onChange: function(fnc) {
                this.__onChange = fnc;
                return this;
            },

            /**
             * Specify that a function fire every time someone "finishes" changing
             * the value wih this Controller. Useful for values that change
             * incrementally like numbers or strings.
             *
             * @param {Function} fnc This function will be called whenever
             * someone "finishes" changing the value via this Controller.
             * @returns {dat.controllers.Controller} this
             */
            onFinishChange: function(fnc) {
                this.__onFinishChange = fnc;
                return this;
            },

            onReadonlyChange: function(fnc) {
                this.__onReadonlyChange = fnc;
                return this;
            },

            /**
             * Gets the value of <code>__name</code>
             *
             * @returns {Object} The current value of <code>__name</code>
             */
            getName: function() {
                return this.__name;
            },

            /**
             * Change the value of <code>__prevValue</code>
             *
             * @param {Object} value The new value of <code>__prevValue</code>
             */
            setPrevValue: function(value) {
                this.__prevValue = value;
                return this;
            },

            /**
             * Resets the value of <code>__value</code> to that of <code>__initalValue</code>
             *
             * @param {Boolean} silent If true, don't call the onChange handler
             */
            resetValue: function(silent) {
                this.setValue(this.__initialValue, silent);
            },

            /**
             * Change the value of <code>__initialValue</code>
             *
             * @param {Object} value The new value of <code>__initialValue</code>
             */
            setInitialValue: function(value) {
                this.__initialValue = value;
                return this;
            },

            /**
             * Change the value of <code>__value</code>
             *
             * @param {Object} value The new value of <code>__value</code>
             * @param {Boolean} silent If true, don't call the onChange handler
             */
            setValue: function(value, silent) {
                if (value != this.__value) {
                    this.__value = value;
                    if (this.__onChange && !silent) {
                        this.__onChange.call(this, value);
                    }
                }
                this.updateDisplay();
                return this;
            },

            /**
             * Gets the value of <code>__value</code>
             *
             * @returns {Object} The current value of <code>__value</code>
             */
            getValue: function() {
                return this.__value;
            },

            /**
             * Gets the value of <code>__type</code>
             *
             * @returns {String} The current value of <code>__type</code>
             */
            getType: function() {
                return this.__type;
            },

            getOption: function(name) {
                return this.__options[name];
            },

            setOption: function(name, value) {
                this.__options[name] = value;
            },

            getReadonly: function() {
                return this.getOption('readonly');
            },

            setReadonly: function(value) {
                this.setOption('readonly', value);
                if (this.__onReadonlyChange) {
                    this.__onReadonlyChange.call(this, value);
                }
                this.updateDisplay();
                return this;
            },

            /**
             * Refreshes the visual display of a Controller in order to keep sync
             * with the object's current value.
             * @returns {dat.controllers.Controller} this
             */
            updateDisplay: function() {
                return this;
            },

            /**
             * @returns {Boolean} true if the value has deviated from prevValue
             */
            isModified: function() {
                return this.__prevValue !== this.getValue()
            }

        }

    );

    return Controller;


})(dat.dom.dom,
    dat.utils.common);


dat.color.toString = (function (common) {

    return function(color) {

        if (color.a == 1 || common.isUndefined(color.a)) {

            var s = color.hex.toString(16);
            while (s.length < 6) {
                s = '0' + s;
            }

            return '#' + s;

        } else {

            return 'rgba(' + Math.round(color.r) + ',' + Math.round(color.g) + ',' + Math.round(color.b) + ',' + color.a + ')';

        }

    }

})(dat.utils.common);


dat.color.interpret = (function (toString, common) {

    var result, toReturn;

    var interpret = function() {

        toReturn = false;

        var original = arguments.length > 1 ? common.toArray(arguments) : arguments[0];

        common.each(INTERPRETATIONS, function(family) {

            if (family.litmus(original)) {

                common.each(family.conversions, function(conversion, conversionName) {

                    result = conversion.read(original);

                    if (toReturn === false && result !== false) {
                        toReturn = result;
                        result.conversionName = conversionName;
                        result.conversion = conversion;
                        return common.BREAK;

                    }

                });

                return common.BREAK;

            }

        });

        return toReturn;

    };

    var INTERPRETATIONS = [

        // Strings
        {

            litmus: common.isString,

            conversions: {

                THREE_CHAR_HEX: {

                    read: function(original) {

                        var test = original.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i);
                        if (test === null) return false;

                        return {
                            space: 'HEX',
                            hex: parseInt(
                                '0x' +
                                test[1].toString() + test[1].toString() +
                                test[2].toString() + test[2].toString() +
                                test[3].toString() + test[3].toString())
                        };

                    },

                    write: toString

                },

                SIX_CHAR_HEX: {

                    read: function(original) {

                        var test = original.match(/^#([A-F0-9]{6})$/i);
                        if (test === null) return false;

                        return {
                            space: 'HEX',
                            hex: parseInt('0x' + test[1].toString())
                        };

                    },

                    write: toString

                },

                CSS_RGB: {

                    read: function(original) {

                        var test = original.match(/^rgb\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\)/);
                        if (test === null) return false;

                        return {
                            space: 'RGB',
                            r: parseFloat(test[1]),
                            g: parseFloat(test[2]),
                            b: parseFloat(test[3])
                        };

                    },

                    write: toString

                },

                CSS_RGBA: {

                    read: function(original) {

                        var test = original.match(/^rgba\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\,\s*(.+)\s*\)/);
                        if (test === null) return false;

                        return {
                            space: 'RGB',
                            r: parseFloat(test[1]),
                            g: parseFloat(test[2]),
                            b: parseFloat(test[3]),
                            a: parseFloat(test[4])
                        };

                    },

                    write: toString

                }

            }

        },

        // Numbers
        {

            litmus: common.isNumber,

            conversions: {

                HEX: {
                    read: function(original) {
                        return {
                            space: 'HEX',
                            hex: original,
                            conversionName: 'HEX'
                        }
                    },

                    write: function(color) {
                        return color.hex;
                    }
                }

            }

        },

        // Arrays
        {

            litmus: common.isArray,

            conversions: {

                RGB_ARRAY: {
                    read: function(original) {
                        if (original.length != 3) return false;
                        return {
                            space: 'RGB',
                            r: original[0],
                            g: original[1],
                            b: original[2]
                        };
                    },

                    write: function(color) {
                        return [color.r, color.g, color.b];
                    }

                },

                RGBA_ARRAY: {
                    read: function(original) {
                        if (original.length != 4) return false;
                        return {
                            space: 'RGB',
                            r: original[0],
                            g: original[1],
                            b: original[2],
                            a: original[3]
                        };
                    },

                    write: function(color) {
                        return [color.r, color.g, color.b, color.a];
                    }

                }

            }

        },

        // Objects
        {

            litmus: common.isObject,

            conversions: {

                RGBA_OBJ: {
                    read: function(original) {
                        if (common.isNumber(original.r) &&
                            common.isNumber(original.g) &&
                            common.isNumber(original.b) &&
                            common.isNumber(original.a)) {
                            return {
                                space: 'RGB',
                                r: original.r,
                                g: original.g,
                                b: original.b,
                                a: original.a
                            }
                        }
                        return false;
                    },

                    write: function(color) {
                        return {
                            r: color.r,
                            g: color.g,
                            b: color.b,
                            a: color.a
                        }
                    }
                },

                RGB_OBJ: {
                    read: function(original) {
                        if (common.isNumber(original.r) &&
                            common.isNumber(original.g) &&
                            common.isNumber(original.b)) {
                            return {
                                space: 'RGB',
                                r: original.r,
                                g: original.g,
                                b: original.b
                            }
                        }
                        return false;
                    },

                    write: function(color) {
                        return {
                            r: color.r,
                            g: color.g,
                            b: color.b
                        }
                    }
                },

                HSVA_OBJ: {
                    read: function(original) {
                        if (common.isNumber(original.h) &&
                            common.isNumber(original.s) &&
                            common.isNumber(original.v) &&
                            common.isNumber(original.a)) {
                            return {
                                space: 'HSV',
                                h: original.h,
                                s: original.s,
                                v: original.v,
                                a: original.a
                            }
                        }
                        return false;
                    },

                    write: function(color) {
                        return {
                            h: color.h,
                            s: color.s,
                            v: color.v,
                            a: color.a
                        }
                    }
                },

                HSV_OBJ: {
                    read: function(original) {
                        if (common.isNumber(original.h) &&
                            common.isNumber(original.s) &&
                            common.isNumber(original.v)) {
                            return {
                                space: 'HSV',
                                h: original.h,
                                s: original.s,
                                v: original.v
                            }
                        }
                        return false;
                    },

                    write: function(color) {
                        return {
                            h: color.h,
                            s: color.s,
                            v: color.v
                        }
                    }

                }

            }

        }


    ];

    return interpret;


})(dat.color.toString,
    dat.utils.common);


dat.GUI = dat.gui.GUI = (function (css, styleSheet, Controller, BooleanController, ColorController, CustomOptionController, NumberController, OptionController, StringController, UnitController, dom, common) {

    //css.inject(styleSheet);

    /** Outer-most className for GUI's */
    var CSS_NAMESPACE = 'dg';

    /**
     * A lightweight controller library for JavaScript. It allows you to easily
     * manipulate variables and fire functions on the fly.
     * @class
     *
     * @member dat.gui
     *
     * @param {Object} [params]
     * @param {String} [params.name] The name of this GUI.
     * @param {Object} [params.load] JSON object representing the saved state of
     * this GUI.
     * @param {Boolean} [params.auto=true]
     * @param {dat.gui.GUI} [params.parent] The GUI I'm nested in.
     * @param {Boolean} [params.closed] If true, starts closed
     */
    var GUI = function(params) {

        var _this = this;

        /**
         * Outermost DOM Element
         * @type el
         */
        this.el = document.createElement('div');
        this.__ul = document.createElement('ul');

        dom.addClass(this.el, CSS_NAMESPACE);

        /**
         * Nested GUI's by name
         * @ignore
         */
        this.__folders = {};

        this.__controllers = [];

        params = params || {};

        Object.defineProperties(this,

            /** @lends dat.gui.GUI.prototype */
            {

                /**
                 * The parent <code>GUI</code>
                 * @type dat.gui.GUI
                 */
                parent: {
                    get: function() {
                        return params.parent;
                    }
                },

                /**
                 * The name of <code>GUI</code>. Used for folders. i.e
                 * a folder's name
                 * @type String
                 */
                name: {
                    get: function() {
                        return params.name;
                    },
                    set: function(v) {
                        // TODO Check for collisions among sibling folders
                        params.name = v;
                        if (title_row_name) {
                            title_row_name.innerHTML = params.name;
                        }
                    }
                },

                /**
                 * Whether the <code>GUI</code> is collapsed or not
                 * @type Boolean
                 */
                closed: {
                    get: function() {
                        return params.closed;
                    },
                    set: function(v) {
                        params.closed = v;
                        if (params.closed) {
                            dom.addClass(_this.__ul, GUI.CLASS_CLOSED);
                        } else {
                            dom.removeClass(_this.__ul, GUI.CLASS_CLOSED);
                        }
                    }
                }

            });

        if (common.isUndefined(params.parent)) {

            // Are we a root level GUI?

            params.closed = false;

            dom.addClass(this.el, GUI.CLASS_MAIN);
            dom.makeSelectable(this.el, false);


        } else {

            // Oh, you're a nested GUI!

            params.closed = false;

            var title_row_name = document.createTextNode(params.name);

            var title_row = document.createElement('div');
            title_row.appendChild(title_row_name);

            var caret = document.createElement('div');
            dom.addClass(caret, 'caret-down');
            title_row.appendChild(caret);

            this.el.appendChild(title_row);

            var on_click_title = function(e) {
                e.preventDefault();
                _this.closed = !_this.closed;
                return false;
            };

            dom.addClass(title_row, 'title');
            dom.bind(title_row, 'click', on_click_title);

            if (!params.closed) {
                this.closed = false;
            }

        }

        this.el.appendChild(this.__ul);

    };

    GUI.CLASS_MAIN = 'main';
    GUI.CLASS_CONTROLLER_ROW = 'cr';
    GUI.CLASS_TOO_TALL = 'taller-than-window';
    GUI.CLASS_CLOSED = 'closed';
    GUI.CLASS_CLOSE_BUTTON = 'close-button';
    GUI.CLASS_DRAG = 'drag';

    GUI.DEFAULT_WIDTH = 245;
    GUI.TEXT_CLOSED = 'Close Controls';
    GUI.TEXT_OPEN = 'Open Controls';

    common.extend(

        GUI.prototype,

        /** @lends dat.gui.GUI */
        {

            /**
             * @param object
             * @param property
             * @returns {dat.controllers.Controller} The new controller that was added.
             * @instance
             */
            add: function(controller) {
                return add(this, controller);
            },

            /**
             * @param controller
             * @instance
             */
            remove: function(controller) {

                // TODO listening?
                this.__ul.removeChild(controller.el);
                this.__controllers.splice(this.__controllers.indexOf(controller), 1);

            },

            /**
             * @param name
             * @returns {dat.gui.GUI} The new folder.
             * @throws {Error} if this GUI already has a folder by the specified
             * name
             * @instance
             */
            addFolder: function(name) {

                // We have to prevent collisions on names in order to have a key
                // by which to remember saved values
                if (this.__folders[name] !== undefined) {
                    throw new Error('You already have a folder in this GUI by the' +
                    ' name "' + name + '"');
                }

                var gui = new GUI({ name: name, parent: this });
                this.__folders[name] = gui;

                var li = addRow(this, gui.el);
                dom.addClass(li, 'folder');
                return gui;

            },

            open: function() {
                this.closed = false;
            },

            close: function() {
                this.closed = true;
            }

        }

    );

    function add(gui, controller) {

        var name = document.createElement('span');
        dom.addClass(name, 'property-name');
        name.innerHTML = controller.getName();

        var info = controller.getOption('info');
        if (info) {
            var el = document.createElement('span');
            dom.addClass(el, 'ui-info-badge');
            el.setAttribute('data-tooltip-hover', '');
            el.setAttribute('title', info);
            el.innerHTML = '?';
            name.appendChild(el);
        }

        if (controller.getOption('editable')) {
            var toggle = document.createElement('span');
            toggle.style.float = 'right';
            toggle.innerHTML = controller.getReadonly() ? 'edit' : 'x';

            var toggleReadonly = function() {
                var readonly = !controller.getReadonly();
                controller.setReadonly(readonly);
                toggle.innerHTML = readonly ? 'edit' : 'x';
                if (readonly) controller.resetValue();
            };

            dom.bind(toggle, 'click', function() {
                toggleReadonly();
            });

            dom.bind(controller.el, 'click', function() {
                if (controller.getReadonly()) {
                    toggleReadonly();
                }
            });

            name.appendChild(toggle);
        }

        var container = document.createElement('div');
        container.appendChild(name);
        container.appendChild(controller.el);

        var li = addRow(gui, container);

        dom.addClass(li, GUI.CLASS_CONTROLLER_ROW);
        dom.addClass(li, controller.getType());

        gui.__controllers.push(controller);

        return controller;

    }

    /**
     * Add a row to the end of the GUI or before another row.
     *
     * @param gui
     * @param [dom] If specified, inserts the dom content in the new row
     * @param [liBefore] If specified, places the new row before another row
     */
    function addRow(gui, dom) {
        var li = document.createElement('li');
        if (dom) li.appendChild(dom);
        gui.__ul.appendChild(li);
        return li;
    }

    return GUI;

})(dat.utils.css = (function () {
        return {
            load: function (url, doc) {
                doc = doc || document;
                var link = doc.createElement('link');
                link.type = 'text/css';
                link.rel = 'stylesheet';
                link.href = url;
                doc.getElementsByTagName('head')[0].appendChild(link);
            },
            inject: function(css, doc) {
                doc = doc || document;
                var injected = document.createElement('style');
                injected.type = 'text/css';
                injected.innerHTML = css;
                doc.getElementsByTagName('head')[0].appendChild(injected);
            }
        }
    })(),
    ".dg {\n  /** Clear list styles */\n  /* Auto-place container */\n  /* Auto-placed GUI's */\n  /* Line items that don't contain folders. */\n  /** Folder names */\n  /** Hides closed items */\n  /** Controller row */\n  /** Name-half (left) */\n  /** Controller-half (right) */\n  /** Controller placement */\n  /** Shorter number boxes when slider is present. */\n  /** Ensure the entire boolean and function row shows a hand */ }\n  .dg ul {\n    list-style: none;\n    margin: 0;\n    padding: 0;\n    width: 100%;\n    clear: both; }\n  .dg.ac {\n    position: fixed;\n    top: 0;\n    left: 0;\n    right: 0;\n    height: 0;\n    z-index: 0; }\n  .dg:not(.ac) .main {\n    /** Exclude mains in ac so that we don't hide close button */\n    overflow: hidden; }\n  .dg.main {\n    -webkit-transition: opacity 0.1s linear;\n    -o-transition: opacity 0.1s linear;\n    -moz-transition: opacity 0.1s linear;\n    transition: opacity 0.1s linear; }\n    .dg.main.taller-than-window {\n      overflow-y: auto; }\n      .dg.main.taller-than-window .close-button {\n        opacity: 1;\n        /* TODO, these are style notes */\n        margin-top: -1px;\n        border-top: 1px solid #2c2c2c; }\n    .dg.main ul.closed .close-button {\n      opacity: 1 !important; }\n    .dg.main:hover .close-button,\n    .dg.main .close-button.drag {\n      opacity: 1; }\n    .dg.main .close-button {\n      /*opacity: 0;*/\n      -webkit-transition: opacity 0.1s linear;\n      -o-transition: opacity 0.1s linear;\n      -moz-transition: opacity 0.1s linear;\n      transition: opacity 0.1s linear;\n      border: 0;\n      position: absolute;\n      line-height: 19px;\n      height: 20px;\n      /* TODO, these are style notes */\n      cursor: pointer;\n      text-align: center;\n      background-color: #000; }\n      .dg.main .close-button:hover {\n        background-color: #111; }\n  .dg.a {\n    float: right;\n    margin-right: 15px;\n    overflow-x: hidden; }\n    .dg.a.has-save > ul {\n      margin-top: 27px; }\n      .dg.a.has-save > ul.closed {\n        margin-top: 0; }\n    .dg.a .save-row {\n      position: fixed;\n      top: 0;\n      z-index: 1002; }\n  .dg li {\n    -webkit-transition: height 0.1s ease-out;\n    -o-transition: height 0.1s ease-out;\n    -moz-transition: height 0.1s ease-out;\n    transition: height 0.1s ease-out; }\n  .dg li:not(.folder) {\n    cursor: auto;\n    height: 27px;\n    line-height: 27px;\n    overflow: hidden;\n    padding: 0 4px 0 5px; }\n  .dg li.folder {\n    padding: 0;\n    border-left: 4px solid rgba(0, 0, 0, 0); }\n  .dg li.title {\n    cursor: pointer;\n    margin-left: -4px; }\n  .dg .closed li:not(.title),\n  .dg .closed ul li,\n  .dg .closed ul li > * {\n    height: 0;\n    overflow: hidden;\n    border: 0; }\n  .dg .cr {\n    clear: both;\n    padding-left: 3px;\n    height: 27px; }\n  .dg .property-name {\n    cursor: default;\n    float: left;\n    clear: left;\n    width: 40%;\n    overflow: hidden;\n    text-overflow: ellipsis; }\n  .dg .c {\n    float: left;\n    width: 60%; }\n  .dg .c input[type=text] {\n    border: 0;\n    margin-top: 4px;\n    padding: 3px;\n    width: 100%;\n    float: right; }\n  .dg .has-slider input[type=text] {\n    width: 30%;\n    /*display: none;*/\n    margin-left: 0; }\n  .dg .slider {\n    float: left;\n    width: 66%;\n    margin-left: -5px;\n    margin-right: 0;\n    height: 19px;\n    margin-top: 4px; }\n  .dg .slider-fg {\n    height: 100%; }\n  .dg .c input[type=checkbox] {\n    margin-top: 9px; }\n  .dg .c select {\n    margin-top: 5px; }\n  .dg .cr.function,\n  .dg .cr.function .property-name,\n  .dg .cr.function *,\n  .dg .cr.boolean,\n  .dg .cr.boolean * {\n    cursor: pointer; }\n  .dg .selector {\n    display: none;\n    position: absolute;\n    margin-left: -9px;\n    margin-top: 23px;\n    z-index: 10; }\n  .dg .c:hover .selector,\n  .dg .selector.drag {\n    display: block; }\n  .dg li.save-row {\n    padding: 0; }\n    .dg li.save-row .button {\n      display: inline-block;\n      padding: 0px 6px; }\n  .dg.dialogue {\n    background-color: #222;\n    width: 460px;\n    padding: 15px;\n    font-size: 13px;\n    line-height: 15px; }\n\n/* TODO Separate style and structure */\n#dg-new-constructor {\n  padding: 10px;\n  color: #222;\n  font-family: Monaco, monospace;\n  font-size: 10px;\n  border: 0;\n  resize: none;\n  box-shadow: inset 1px 1px 1px #888;\n  word-wrap: break-word;\n  margin: 12px 0;\n  display: block;\n  width: 440px;\n  overflow-y: scroll;\n  height: 100px;\n  position: relative; }\n\n#dg-local-explain {\n  display: none;\n  font-size: 11px;\n  line-height: 17px;\n  border-radius: 3px;\n  background-color: #333;\n  padding: 8px;\n  margin-top: 10px; }\n  #dg-local-explain code {\n    font-size: 10px; }\n\n#dat-gui-save-locally {\n  display: none; }\n\n/** Main type */\n.dg {\n  color: #eee;\n  font: 11px 'Lucida Grande', sans-serif;\n  text-shadow: 0 -1px 0 #111;\n  /** Auto place */\n  /* Controller row, <li> */\n  /** Controllers */ }\n  .dg.main {\n    /** Scrollbar */ }\n    .dg.main::-webkit-scrollbar {\n      width: 5px;\n      background: #1a1a1a; }\n    .dg.main::-webkit-scrollbar-corner {\n      height: 0;\n      display: none; }\n    .dg.main::-webkit-scrollbar-thumb {\n      border-radius: 5px;\n      background: #676767; }\n  .dg li:not(.folder) {\n    background: #1a1a1a;\n    border-bottom: 1px solid #2c2c2c; }\n  .dg li.save-row {\n    line-height: 25px;\n    background: #dad5cb;\n    border: 0; }\n    .dg li.save-row select {\n      margin-left: 5px;\n      width: 108px; }\n    .dg li.save-row .button {\n      margin-left: 5px;\n      margin-top: 1px;\n      border-radius: 2px;\n      font-size: 9px;\n      line-height: 7px;\n      padding: 4px 4px 5px 4px;\n      background: #c5bdad;\n      color: #fff;\n      text-shadow: 0 1px 0 #b0a58f;\n      box-shadow: 0 -1px 0 #b0a58f;\n      cursor: pointer; }\n      .dg li.save-row .button.gears {\n        background: #c5bdad url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQJJREFUeNpiYKAU/P//PwGIC/ApCABiBSAW+I8AClAcgKxQ4T9hoMAEUrxx2QSGN6+egDX+/vWT4e7N82AMYoPAx/evwWoYoSYbACX2s7KxCxzcsezDh3evFoDEBYTEEqycggWAzA9AuUSQQgeYPa9fPv6/YWm/Acx5IPb7ty/fw+QZblw67vDs8R0YHyQhgObx+yAJkBqmG5dPPDh1aPOGR/eugW0G4vlIoTIfyFcA+QekhhHJhPdQxbiAIguMBTQZrPD7108M6roWYDFQiIAAv6Aow/1bFwXgis+f2LUAynwoIaNcz8XNx3Dl7MEJUDGQpx9gtQ8YCueB+D26OECAAQDadt7e46D42QAAAABJRU5ErkJggg==) 2px 1px no-repeat;\n        height: 7px;\n        width: 8px; }\n      .dg li.save-row .button:hover {\n        background-color: #bab19e;\n        box-shadow: 0 -1px 0 #b0a58f; }\n  .dg li.folder {\n    border-bottom: 0; }\n  .dg li.title {\n    padding-left: 16px;\n    background: black url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;\n    cursor: pointer;\n    border-bottom: 1px solid rgba(255, 255, 255, 0.2); }\n  .dg .closed li.title {\n    background-image: url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlGIWqMCbWAEAOw==); }\n  .dg .cr.boolean {\n    border-left: 3px solid #806787; }\n  .dg .cr.function {\n    border-left: 3px solid #e61d5f; }\n  .dg .cr.number {\n    border-left: 3px solid #2fa1d6; }\n    .dg .cr.number input[type=text] {\n      color: #2fa1d6; }\n  .dg .cr.string {\n    border-left: 3px solid #1ed36f; }\n    .dg .cr.string input[type=text] {\n      color: #1ed36f; }\n  .dg .cr.function:hover, .dg .cr.boolean:hover {\n    background: #111; }\n  .dg .c input[type=text] {\n    background: #303030;\n    outline: none; }\n    .dg .c input[type=text]:hover {\n      background: #3c3c3c; }\n    .dg .c input[type=text]:focus {\n      background: #494949;\n      color: #fff; }\n  .dg .c .slider {\n    background: #303030;\n    cursor: ew-resize; }\n  .dg .c .slider-fg {\n    background: #2fa1d6; }\n  .dg .c .slider:hover {\n    background: #3c3c3c; }\n    .dg .c .slider:hover .slider-fg {\n      background: #44abda; }\n",
    dat.controllers.Controller,
    dat.controllers.BooleanController = (function (Controller, dom, common) {

        /**
         * @class Provides a checkbox input to alter the boolean property of an object.
         * @extends dat.controllers.Controller
         *
         * @param {Object} object The object to be manipulated
         * @param {string} property The name of the property to be manipulated
         *
         * @member dat.controllers
         */
        var BooleanController = function(name, value, options) {

            BooleanController.superclass.call(this, name, value, 'boolean', options);

            var _this = this;
            this.__prev = this.getValue();

            this.__checkbox = document.createElement('input');
            this.__checkbox.setAttribute('type', 'checkbox');
            this.__checkbox.style.display = 'block';


            dom.bind(this.__checkbox, 'change', onChange, false);

            this.el.appendChild(this.__checkbox);

            // Match original value
            this.updateDisplay();

            function onChange() {
                _this.setValue(!_this.__prev);
            }

        };

        BooleanController.superclass = Controller;

        common.extend(

            BooleanController.prototype,
            Controller.prototype,

            {

                setValue: function(v) {
                    var toReturn = BooleanController.superclass.prototype.setValue.call(this, v);
                    if (this.__onFinishChange) {
                        this.__onFinishChange.call(this, this.getValue());
                    }
                    this.__prev = this.getValue();
                    return toReturn;
                },

                updateDisplay: function() {

                    if (this.getValue() === true) {
                        this.__checkbox.setAttribute('checked', 'checked');
                        this.__checkbox.checked = true;
                    } else {
                        this.__checkbox.checked = false;
                    }

                    this.__checkbox.disabled = this.getReadonly();

                    return BooleanController.superclass.prototype.updateDisplay.call(this);

                }


            }

        );

        return BooleanController;

    })(dat.controllers.Controller,
        dat.dom.dom,
        dat.utils.common),
    dat.controllers.ColorController = (function (Controller, dom, Color, interpret, common) {

        var ColorController = function(name, value, options) {

            ColorController.superclass.call(this, name, value, 'color', options);

            this.__color = new Color(this.getValue());
            this.__temp = new Color(0);

            var _this = this;

            var alpha_grid = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAC9JREFUGBljvH///n8GJCAtLY3EY2BgQuFh4VCugPHXr18obnj69CmKRZRbQdAEADT3Cphpg+hIAAAAAElFTkSuQmCC")';

            dom.makeSelectable(this.el, false);

            this.__swatch = document.createElement('div');
            this.__swatch.className = 'ui-swatch';

            this.__swatch_container = document.createElement('div');
            this.__swatch_container.className = 'swatch-container';

            this.__selector = document.createElement('div');
            this.__selector.className = 'selector';

            this.__saturation_field = document.createElement('div');
            this.__saturation_field.className = 'saturation-field';

            this.__field_knob = document.createElement('div');
            this.__field_knob.className = 'field-knob';
            this.__field_knob_border = '2px solid ';

            this.__hue_knob = document.createElement('div');
            this.__hue_knob.className = 'hue-knob';

            this.__hue_field = document.createElement('div');
            this.__hue_field.className = 'hue-field';

            this.__alpha_knob = document.createElement('div');
            this.__alpha_knob.className = 'alpha-knob';

            this.__alpha_field = document.createElement('div');
            this.__alpha_field.className = 'alpha-field';

            this.__alpha_container = document.createElement('div');
            this.__alpha_container.className = 'alpha-container';

            this.__input = document.createElement('input');
            this.__input.type = 'text';
            this.__input_textShadow = '0 1px 1px ';

            this.__input_container = document.createElement('div');
            this.__input_container.style.marginLeft = '33px';

            dom.bind(this.__input, 'keydown', function(e) {
                if (e.keyCode === 13) { // on enter
                    onBlur.call(this);
                }
            });

            dom.bind(this.__input, 'blur', onBlur);

            dom.bind(this.__selector, 'mousedown', function(e) {

                dom
                    .addClass(this, 'drag')
                    .bind(window, 'mouseup', function(e) {
                        dom.removeClass(_this.__selector, 'drag');
                    });

            });

            var value_field = document.createElement('div');

            common.extend(this.__selector.style, {
                width: '123px',
                height: '123px',
                padding: '3px',
                backgroundColor: '#222',
                boxShadow: '0px 1px 3px rgba(0,0,0,0.3)',
                display: 'none'
            });

            common.extend(this.__field_knob.style, {
                position: 'absolute',
                width: '12px',
                height: '12px',
                border: this.__field_knob_border + (this.__color.v < .5 ? '#fff' : '#000'),
                boxShadow: '0px 1px 3px rgba(0,0,0,0.5)',
                borderRadius: '12px',
                zIndex: 1
            });

            common.extend(this.__hue_knob.style, {
                position: 'absolute',
                width: '16px',
                height: '2px',
                borderRight: '4px solid #fff',
                zIndex: 1
            });

            common.extend(this.__alpha_knob.style, {
                position: 'absolute',
                width: '2px',
                height: '16px',
                borderBottom: '4px solid #fff',
                zIndex: 1
            });

            common.extend(this.__saturation_field.style, {
                width: '100px',
                height: '100px',
                border: '1px solid #555',
                marginRight: '3px',
                display: 'inline-block',
                cursor: 'pointer'
            });

            common.extend(value_field.style, {
                width: '100%',
                height: '100%',
                background: 'none'
            });

            linearGradient(value_field, 'top', 'rgba(0,0,0,0)', '#000');

            common.extend(this.__hue_field.style, {
                width: '16px',
                height: '100px',
                display: 'inline-block',
                border: '1px solid #555',
                cursor: 'ns-resize'
            });

            hueGradient(this.__hue_field);

            common.extend(this.__alpha_container.style, {
                width: '121px',
                height: '16px',
                display: 'inline-block',
                border: '1px solid #555',
                marginTop: '1px',
                cursor: 'ew-resize',
                backgroundImage: alpha_grid
            });

            common.extend(this.__alpha_field.style, {
                width: '100%',
                height: '100%'
            });

            common.extend(this.__input.style, {
                outline: 'none',
                border: 0
            });

            common.extend(this.__swatch_container.style, {
                width: '18px',
                height: '18px',
                backgroundImage: alpha_grid
            });

            common.extend(this.__swatch.style, {
                marginTop: '0px'
            });

            this.__visible = false;
            this.__firstClick = false;
            dom.bind(this.__swatch, 'click', function() {
                if (_this.getReadonly()) return;
                else _this.__visible = !_this.__visible;
                if (_this.__visible) {
                    _this.__firstClick = true;
                    dom.bind(window, 'click', closePopup);
                } else {
                    dom.unbind(window, 'click', closePopup);
                }
                common.extend(_this.__selector.style, {
                    display: _this.__visible ? '' : 'none'
                });
            });

            dom.bind(this.__saturation_field, 'mousedown', fieldDown);
            dom.bind(this.__field_knob, 'mousedown', fieldDown);

            dom.bind(this.__hue_field, 'mousedown', function(e) {
                setH(e);
                dom.bind(window, 'mousemove', setH);
                dom.bind(window, 'mouseup', unbindH);
            });

            dom.bind(this.__alpha_field, 'mousedown', function(e) {
                setA(e);
                dom.bind(window, 'mousemove', setA);
                dom.bind(window, 'mouseup', unbindA);
            });

            function fieldDown(e) {
                setSV(e);
                dom.bind(window, 'mousemove', setSV);
                dom.bind(window, 'mouseup', unbindSV);
            }

            function unbindSV() {
                dom.unbind(window, 'mousemove', setSV);
                dom.unbind(window, 'mouseup', unbindSV);
            }

            function onBlur() {
                var i = interpret(this.value);
                if (i !== false) {
                    _this.__color.__state = i;
                    _this.setValue(_this.__color.toOriginal());
                } else {
                    this.value = _this.__color.toString();
                }
            }

            function unbindH() {
                dom.unbind(window, 'mousemove', setH);
                dom.unbind(window, 'mouseup', unbindH);
            }

            function unbindA() {
                dom.unbind(window, 'mousemove', setA);
                dom.unbind(window, 'mouseup', unbindA);
            }

            function closePopup(e) {
                if (_this.__firstClick) {
                    _this.__firstClick = false;
                } else {
                    var el = e.target;
                    while(el) {
                        if (el == _this.__selector) return;
                        else el = el.parentNode;
                    }
                    _this.__visible = false;
                    common.extend(_this.__selector.style, {
                        display: 'none'
                    });
                    dom.unbind(window, 'click', closePopup);
                }
            }

            this.__saturation_field.appendChild(value_field);
            this.__selector.appendChild(this.__field_knob);
            this.__selector.appendChild(this.__saturation_field);
            this.__selector.appendChild(this.__hue_field);
            this.__hue_field.appendChild(this.__hue_knob);
            this.__selector.appendChild(this.__alpha_container);
            this.__alpha_container.appendChild(this.__alpha_field);
            this.__alpha_field.appendChild(this.__alpha_knob);
            this.__swatch_container.appendChild(this.__swatch);
            this.__input_container.appendChild(this.__input);

            this.el.appendChild(this.__swatch_container);
            this.el.appendChild(this.__input_container);
            this.el.appendChild(this.__selector);

            this.updateDisplay();

            function setSV(e) {

                e.preventDefault();

                var w = dom.getWidth(_this.__saturation_field);
                var o = dom.getOffset(_this.__saturation_field);
                var scroll = getScroll(_this.__saturation_field);
                var s = (e.clientX - o.left + scroll.left) / w;
                var v = 1 - (e.clientY - o.top + scroll.top) / w;

                if (v > 1) v = 1;
                else if (v < 0) v = 0;

                if (s > 1) s = 1;
                else if (s < 0) s = 0;

                _this.__color.v = v;
                _this.__color.s = s;

                _this.setValue(_this.__color.toOriginal());

                return false;

            }

            function setH(e) {

                e.preventDefault();

                var s = dom.getHeight(_this.__hue_field);
                var o = dom.getOffset(_this.__hue_field);
                var scroll = getScroll(_this.__hue_field);
                var h = 1 - (e.clientY - o.top + scroll.top) / s;

                if (h > 1) h = 1;
                else if (h < 0) h = 0;

                _this.__color.h = h * 360;

                _this.setValue(_this.__color.toOriginal());

                return false;

            }

            function setA(e) {

                e.preventDefault();

                var s = dom.getWidth(_this.__alpha_field);
                var o = dom.getOffset(_this.__alpha_field);
                var scroll = getScroll(_this.__alpha_field);
                var w = (e.clientX - o.left + scroll.left) / s;

                if (w > 1) w = 1;
                else if (w < 0) w = 0;

                _this.__color.a = w.toFixed(2);

                _this.setValue(_this.__color.toOriginal());

                return false;

            }

            function getScroll(el) {

                var scroll = { top: el.scrollTop, left: el.scrollLeft };
                while(el = el.parentNode) {
                    scroll.top += (el.scrollTop || 0);
                    scroll.left += (el.scrollLeft || 0);
                }
                return scroll;

            }

        };

        ColorController.superclass = Controller;

        common.extend(

            ColorController.prototype,
            Controller.prototype,

            {

                setReadonly: function(value) {
                    this.__visible = false;
                    common.extend(this.__selector.style, {
                        display: 'none'
                    });
                    ColorController.superclass.prototype.setReadonly.call(this, value);
                },

                updateDisplay: function() {

                    var i = interpret(this.getValue());

                    if (i !== false) {

                        var mismatch = false;

                        // Check for mismatch on the interpreted value.

                        common.each(Color.COMPONENTS, function(component) {
                            if (!common.isUndefined(i[component]) &&
                                !common.isUndefined(this.__color.__state[component]) &&
                                i[component] !== this.__color.__state[component]) {
                                mismatch = true;
                                return {}; // break
                            }
                        }, this);

                        // If nothing diverges, we keep our previous values
                        // for statefulness, otherwise we recalculate fresh
                        if (mismatch) {
                            common.extend(this.__color.__state, i);
                        }

                    }

                    common.extend(this.__temp.__state, this.__color.__state);

                    this.__temp.a = 0;
                    var x = this.__temp.toString();

                    this.__temp.a = 1;
                    var y = this.__temp.toString();

                    linearGradient(this.__alpha_field, 'left', x, y);

                    var a = common.isUndefined(this.__color.a) ? 1 : this.__color.a;
                    this.__alpha_knob.style.marginLeft = (a * 121) - 1 + 'px';

                    var flip = (this.__color.v < .5 || this.__color.s > .5) ? 255 : 0;

                    common.extend(this.__field_knob.style, {
                        marginLeft: 100 * this.__temp.s - 7 + 'px',
                        marginTop: 100 * (1 - this.__temp.v) - 7 + 'px',
                        backgroundColor: this.__temp.toString(),
                        border: this.__field_knob_border + 'rgb(' + flip + ',' + flip + ',' + flip +')'
                    });

                    this.__hue_knob.style.marginTop = ((1 - this.__color.h / 360) * 100) - 1 + 'px';

                    this.__temp.s = 1;
                    this.__temp.v = 1;

                    linearGradient(this.__saturation_field, 'left', '#fff', this.__temp.toString());

                    common.extend(this.__swatch.style, {
                        backgroundColor: this.__input.value = this.__color.toString()
                    });

                    this.__input.disabled = this.getReadonly();

                }

            }

        );

        var vendors = ['-moz-','-o-','-webkit-','-ms-',''];

        function linearGradient(elem, x, a, b) {
            elem.style.background = '';
            common.each(vendors, function(vendor) {
                elem.style.cssText += 'background: ' + vendor + 'linear-gradient('+x+', '+a+' 0%, ' + b + ' 100%); ';
            });
        }

        function hueGradient(elem) {
            elem.style.background = '';
            elem.style.cssText += 'background: -moz-linear-gradient(top,  #ff0000 0%, #ff00ff 17%, #0000ff 34%, #00ffff 50%, #00ff00 67%, #ffff00 84%, #ff0000 100%);'
            elem.style.cssText += 'background: -webkit-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);'
            elem.style.cssText += 'background: -o-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);'
            elem.style.cssText += 'background: -ms-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);'
            elem.style.cssText += 'background: linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);'
        }


        return ColorController;

    })(dat.controllers.Controller,
        dat.dom.dom,
        dat.color.Color = (function (interpret, math, toString, common) {

            var Color = function() {

                this.__state = interpret.apply(this, arguments);

                if (this.__state === false) {
                    throw 'Failed to interpret color arguments';
                }

                this.__state.a = this.__state.a || 1;


            };

            Color.COMPONENTS = ['r','g','b','h','s','v','hex','a'];

            common.extend(Color.prototype, {

                toString: function() {
                    return toString(this);
                },

                toOriginal: function() {
                    return this.__state.conversion.write(this);
                }

            });

            defineRGBComponent(Color.prototype, 'r', 2);
            defineRGBComponent(Color.prototype, 'g', 1);
            defineRGBComponent(Color.prototype, 'b', 0);

            defineHSVComponent(Color.prototype, 'h');
            defineHSVComponent(Color.prototype, 's');
            defineHSVComponent(Color.prototype, 'v');

            Object.defineProperty(Color.prototype, 'a', {

                get: function() {
                    return this.__state.a;
                },

                set: function(v) {
                    this.__state.a = v;
                }

            });

            Object.defineProperty(Color.prototype, 'hex', {

                get: function() {

                    if (!this.__state.space !== 'HEX') {
                        this.__state.hex = math.rgb_to_hex(this.r, this.g, this.b);
                    }

                    return this.__state.hex;

                },

                set: function(v) {

                    this.__state.space = 'HEX';
                    this.__state.hex = v;

                }

            });

            function defineRGBComponent(target, component, componentHexIndex) {

                Object.defineProperty(target, component, {

                    get: function() {

                        if (this.__state.space === 'RGB') {
                            return this.__state[component];
                        }

                        recalculateRGB(this, component, componentHexIndex);

                        return this.__state[component];

                    },

                    set: function(v) {

                        if (this.__state.space !== 'RGB') {
                            recalculateRGB(this, component, componentHexIndex);
                            this.__state.space = 'RGB';
                        }

                        this.__state[component] = v;

                    }

                });

            }

            function defineHSVComponent(target, component) {

                Object.defineProperty(target, component, {

                    get: function() {

                        if (this.__state.space === 'HSV')
                            return this.__state[component];

                        recalculateHSV(this);

                        return this.__state[component];

                    },

                    set: function(v) {

                        if (this.__state.space !== 'HSV') {
                            recalculateHSV(this);
                            this.__state.space = 'HSV';
                        }

                        this.__state[component] = v;

                    }

                });

            }

            function recalculateRGB(color, component, componentHexIndex) {

                if (color.__state.space === 'HEX') {

                    color.__state[component] = math.component_from_hex(color.__state.hex, componentHexIndex);

                } else if (color.__state.space === 'HSV') {

                    common.extend(color.__state, math.hsv_to_rgb(color.__state.h, color.__state.s, color.__state.v));

                } else {

                    throw 'Corrupted color state';

                }

            }

            function recalculateHSV(color) {

                var result = math.rgb_to_hsv(color.r, color.g, color.b);

                common.extend(color.__state,
                    {
                        s: result.s,
                        v: result.v
                    }
                );

                if (!isNaN(result.h)) {
                    color.__state.h = result.h;
                } else if (common.isUndefined(color.__state.h)) {
                    color.__state.h = 0;
                }

            }

            return Color;

        })(dat.color.interpret,
            dat.color.math = (function () {

                var tmpComponent;

                return {

                    hsv_to_rgb: function(h, s, v) {

                        var hi = Math.floor(h / 60) % 6;

                        var f = h / 60 - Math.floor(h / 60);
                        var p = v * (1.0 - s);
                        var q = v * (1.0 - (f * s));
                        var t = v * (1.0 - ((1.0 - f) * s));
                        var c = [
                            [v, t, p],
                            [q, v, p],
                            [p, v, t],
                            [p, q, v],
                            [t, p, v],
                            [v, p, q]
                        ][hi];

                        return {
                            r: c[0] * 255,
                            g: c[1] * 255,
                            b: c[2] * 255
                        };

                    },

                    rgb_to_hsv: function(r, g, b) {

                        var min = Math.min(r, g, b),
                            max = Math.max(r, g, b),
                            delta = max - min,
                            h, s;

                        if (max != 0) {
                            s = delta / max;
                        } else {
                            return {
                                h: NaN,
                                s: 0,
                                v: 0
                            };
                        }

                        if (r == max) {
                            h = (g - b) / delta;
                        } else if (g == max) {
                            h = 2 + (b - r) / delta;
                        } else {
                            h = 4 + (r - g) / delta;
                        }
                        h /= 6;
                        if (h < 0) {
                            h += 1;
                        }

                        return {
                            h: h * 360,
                            s: s,
                            v: max / 255
                        };
                    },

                    rgb_to_hex: function(r, g, b) {
                        var hex = this.hex_with_component(0, 2, r);
                        hex = this.hex_with_component(hex, 1, g);
                        hex = this.hex_with_component(hex, 0, b);
                        return hex;
                    },

                    component_from_hex: function(hex, componentIndex) {
                        return (hex >> (componentIndex * 8)) & 0xFF;
                    },

                    hex_with_component: function(hex, componentIndex, value) {
                        return value << (tmpComponent = componentIndex * 8) | (hex & ~ (0xFF << tmpComponent));
                    }

                }

            })(),
            dat.color.toString,
            dat.utils.common),
        dat.color.interpret,
        dat.utils.common),
    dat.controllers.CustomOptionController = (function (Controller, dom, common) {

        /**
         * @class Provides a select input to alter the property of an object, using a
         * list of accepted values.
         *
         * @extends dat.controllers.Controller
         *
         * @param {Object} object The object to be manipulated
         * @param {string} property The name of the property to be manipulated
         * @param {Object|string[]} options A map of labels to acceptable values, or
         * a list of acceptable string values.
         *
         * @member dat.controllers
         */
        var CustomOptionController = function (name, value, params, options) {

            CustomOptionController.superclass.call(this, name, value, 'option', options);

            var _this = this;

            params = params || {};

            /**
             * The drop down menu
             * @ignore
             */
            this.__select = document.createElement('div');
            dom.addClass(this.__select, 'select select-wide');

            this.__toggle = document.createElement('input');
            this.__toggle.setAttribute('id', params.key + ':toggle');
            this.__toggle.setAttribute('type', 'checkbox');
            dom.addClass(this.__toggle, 'select-controller');

            this.__current_label = document.createElement('label');
            this.__current_label.setAttribute('for', params.key + ':toggle');
            dom.addClass(this.__current_label, 'select-current');

            this.__current_content = document.createElement('div');
            dom.addClass(this.__current_content, 'select-content');
            this.__current_label.appendChild(this.__current_content);

            var span = document.createElement('span');
            dom.addClass(span, 'button-segment');

            var caret = document.createElement('div');
            dom.addClass(caret, 'caret-down');

            span.appendChild(caret);
            this.__current_label.appendChild(span);

            this.__dropdown = document.createElement('div');
            dom.addClass(this.__dropdown, 'select-dropdown');

            if (common.isArray(params)) {
                var map = {};
                common.each(params, function (element) {
                    map[element] = element;
                });
                params = map;
            }

            this.__radios = [];
            for (var i = 0; i < params.options.length; i++) {

                var param = params.options[i];

                var option = document.createElement('label');
                option.setAttribute('for', params.key + ':toggle');
                dom.addClass(option, 'select-group');

                var radio = document.createElement('input');
                radio.setAttribute('id', params.key + ':option:' + i);
                radio.setAttribute('value', param.value);
                radio.setAttribute('type', 'radio');
                radio.setAttribute('name', params.key);
                dom.addClass(radio, 'select-option');
                dom.bind(radio, 'change', onRadioChange);

                var option_label = document.createElement('label');
                option_label.setAttribute('for', params.key + ':option:' + i);
                dom.addClass(option_label, 'select-option');
                option_label.innerHTML = param.display;

                option.appendChild(radio);
                option.appendChild(option_label);

                _this.__dropdown.appendChild(option);
                _this.__radios.push(radio);

            }

            function onRadioChange(e) {
                var value = e.target.getAttribute('value');
                _this.setValue(value);
            }

            // Acknowledge original value
            this.updateDisplay();

            this.__firstClick = false;
            dom.bind(this.__toggle, 'click', function(e) {
                if (this.checked) {
                    _this.__firstClick = true;
                    dom.bind(window, 'click', closeDropdown);
                }
            });

            dom.bind(this.__current_label, 'click', function(e) {
                e.stopPropagation();
            });

            function closeDropdown(e) {
                if (_this.__firstClick) {
                    _this.__firstClick = false;
                } else {
                    _this.__toggle.checked = false;
                    dom.unbind(window, 'click', closeDropdown);
                }
            }

            this.__select.appendChild(this.__toggle);
            this.__select.appendChild(this.__current_label);
            this.__select.appendChild(this.__dropdown);

            this.el.appendChild(this.__select);
        };

        CustomOptionController.superclass = Controller;

        common.extend(
            CustomOptionController.prototype,
            Controller.prototype,

            {

                updateDisplay: function () {

                    var value = this.getValue();
                    var radio = null;
                    common.each(this.__radios, function(r) {
                        if (value == r.getAttribute('value')) {
                            radio = r;
                            r.checked = true;
                        } else {
                            r.checked = false;
                        }
                    });

                    if (radio) this.__current_content.innerHTML = radio.nextSibling.innerHTML;

                    this.__toggle.disabled = this.getReadonly();

                    return CustomOptionController.superclass.prototype.updateDisplay.call(this);

                }

            }
        );

        return CustomOptionController;

    })(dat.controllers.Controller,
        dat.dom.dom,
        dat.utils.common),
    dat.controllers.NumberController = (function (Controller, dom, common) {

        /**
         * @class Represents a given property of an object that is a number.
         *
         * @extends dat.controllers.Controller
         *
         * @param {Object} object The object to be manipulated
         * @param {string} property The name of the property to be manipulated
         * @param {Object} [params] Optional parameters
         * @param {Number} [params.min] Minimum allowed value
         * @param {Number} [params.max] Maximum allowed value
         * @param {Number} [params.step] Increment by which to change value
         *
         * @member dat.controllers
         */
        var NumberController = function(name, value, params, options) {

            NumberController.superclass.call(this, name, value, 'number', options);

            if (typeof this.getValue() !== 'number') {
                throw 'Provided value is not a number';
            }

            var _this = this;

            params = params || {};

            var UP_ARROW = 38;
            var DOWN_ARROW = 40;

            this.min(params.min);
            this.max(params.max);
            this.step(params.step || 1);

            this.__input = document.createElement('input');
            this.__input.setAttribute('type', 'text');

            this.__decrement_button = document.createElement('span');
            this.__decrement_button.textContent = '-';

            this.__increment_button = document.createElement('span');
            this.__increment_button.textContent = '+';

            dom.bind(this.__input, 'change', function() {
                var value = _this.__input.value;
                _this.setValue(isNaN(value) ? _this.getValue() : value);
            });

            dom.bind(this.__input, 'keydown', function(e) {
                switch(e.keyCode) {
                    case DOWN_ARROW:
                        e.preventDefault();
                        decrement();
                        break;
                    case UP_ARROW:
                        e.preventDefault();
                        increment();
                        break;
                }
            });

            dom.bind(this.__decrement_button, 'click', decrement);
            dom.bind(this.__increment_button, 'click', increment);

            function decrement() {
                if (_this.getReadonly()) return;
                _this.setValue(_this.__value - _this.__step);
            }

            function increment() {
                if (_this.getReadonly()) return;
                _this.setValue(_this.__value + _this.__step);
            }

            this.updateDisplay();

            this.el.appendChild(this.__decrement_button);
            this.el.appendChild(this.__input);
            this.el.appendChild(this.__increment_button);

        };

        NumberController.superclass = Controller;

        common.extend(

            NumberController.prototype,
            Controller.prototype,

            /** @lends dat.controllers.NumberController.prototype */
            {

                setValue: function(v) {

                    // make sure v is a Number
                    v = parseFloat(v);

                    if (this.__min !== undefined && v < this.__min) {
                        v = this.__min;
                    } else if (this.__max !== undefined && v > this.__max) {
                        v = this.__max;
                    }

                    if (this.__step !== undefined && v % this.__step != 0) {
                        v = Math.round(v / this.__step) * this.__step;
                    }

                    if (this.__precision !== undefined) {
                        v = parseFloat(v.toFixed(this.__precision));
                    }

                    return NumberController.superclass.prototype.setValue.call(this, v);

                },

                updateDisplay: function() {
                    this.__input.value = this.getValue();
                    this.__input.disabled = this.getReadonly();
                },

                /**
                 * Specify a minimum value for <code>object[property]</code>.
                 *
                 * @param {Number} minValue The minimum value for
                 * <code>object[property]</code>
                 * @returns {dat.controllers.NumberController} this
                 */
                min: function(v) {
                    this.__min = v;
                    return this;
                },

                /**
                 * Specify a maximum value for <code>object[property]</code>.
                 *
                 * @param {Number} maxValue The maximum value for
                 * <code>object[property]</code>
                 * @returns {dat.controllers.NumberController} this
                 */
                max: function(v) {
                    this.__max = v;
                    return this;
                },

                /**
                 * Specify a step value that dat.controllers.NumberController
                 * increments by.
                 *
                 * @param {Number} stepValue The step value for
                 * dat.controllers.NumberController
                 * @default if minimum and maximum specified increment is 1% of the
                 * difference otherwise stepValue is 1
                 * @returns {dat.controllers.NumberController} this
                 */
                step: function(v) {
                    this.__step = v;
                    this.__precision = numDecimals(v);
                    return this;
                }

            }

        );

        function numDecimals(x) {
            x = x.toString();
            if (x.indexOf('.') > -1) {
                return x.length - x.indexOf('.') - 1;
            } else {
                return 0;
            }
        }

        return NumberController;

    })(dat.controllers.Controller,
        dat.dom.dom,
        dat.utils.common),
    dat.controllers.OptionController = (function (Controller, dom, common) {

        /**
         * @class Provides a select input to alter the property of an object, using a
         * list of accepted values.
         *
         * @extends dat.controllers.Controller
         *
         * @param {Object} object The object to be manipulated
         * @param {string} property The name of the property to be manipulated
         * @param {Object|string[]} options A map of labels to acceptable values, or
         * a list of acceptable string values.
         *
         * @member dat.controllers
         */
        var OptionController = function(name, value, params, options) {

            OptionController.superclass.call(this, name, value, 'option', options);

            var _this = this;
            this.CUSTOM_FLAG = '';

            params = params || {};

            /**
             * The drop down menu
             * @ignore
             */
            this.__select = document.createElement('select');
            this.__overlay = document.createElement('div');
            dom.addClass(this.__overlay, 'overlay');

            this.__arrow = document.createElement('label');
            dom.addClass(this.__arrow, 'caret-down');

            if (common.isArray(params)) {
                var map = {};
                common.each(params, function(element) {
                    map[element] = element;
                });
                params = map;
            }

            common.each(params, function(value, key) {

                var opt = document.createElement('option');
                opt.innerHTML = key;
                opt.setAttribute('value', value);
                _this.__select.appendChild(opt);

            });

            if (options.custom) {
                var opt = document.createElement('option');
                opt.innerHTML = options.custom.display || 'Custom';
                opt.setAttribute('value', _this.CUSTOM_FLAG);
                _this.__select.appendChild(opt);

                this.__custom_controller = options.custom.controller;
            }

            // Acknowledge original value
            this.updateDisplay();

            dom.bind(this.__select, 'change', function() {
                var value = this.options[this.selectedIndex].value;
                if (value == _this.CUSTOM_FLAG)
                    value = _this.__custom_controller.getValue();
                _this.setValue(value);
            });

            if (this.__custom_controller) {
                this.__custom_controller.onChange(function() {
                    var value = this.getValue();
                    _this.setValue(value);
                });
            }

            this.el.appendChild(this.__select);
            this.el.appendChild(this.__arrow);
            if (this.__custom_controller) {
                var custom_container = document.createElement('div');
                dom.addClass(custom_container, 'cr');
                dom.addClass(custom_container, this.__custom_controller.getType());
                custom_container.appendChild(this.__custom_controller.el);
                this.el.appendChild(custom_container);
            }
            this.el.appendChild(this.__overlay);
        };

        OptionController.superclass = Controller;

        common.extend(

            OptionController.prototype,
            Controller.prototype,

            {

                updateDisplay: function() {

                    var value = this.getValue();
                    var custom = true;
                    if (value != this.CUSTOM_FLAG) {
                        common.each(this.__select.options, function(option) {
                            if (value == option.value) custom = false;
                        });
                    }

                    this.__select.value = custom ? this.CUSTOM_FLAG : value;
                    this.__select.disabled = this.getReadonly();

                    if (this.__custom_controller) {
                        this.__custom_controller.el.style.display = custom ? 'block' : 'none';
                        this.__custom_controller.setReadonly(this.getReadonly());
                    }

                    return OptionController.superclass.prototype.updateDisplay.call(this);

                }

            }

        );

        return OptionController;

    })(dat.controllers.Controller,
        dat.dom.dom,
        dat.utils.common),
    dat.controllers.StringController = (function (Controller, dom, common) {

        /**
         * @class Provides a text input to alter the string property of an object.
         *
         * @extends dat.controllers.Controller
         *
         * @param {Object} object The object to be manipulated
         * @param {string} property The name of the property to be manipulated
         *
         * @member dat.controllers
         */
        var StringController = function(name, value, options) {

            StringController.superclass.call(this, name, value, 'string', options);

            var _this = this;

            this.__input = document.createElement('input');
            this.__input.setAttribute('type', 'text');

            if (options.placeholder) {
                this.__input.setAttribute('placeholder', options.placeholder);
            }

            dom.bind(this.__input, 'blur', onBlur);
            dom.bind(this.__input, 'keydown', function(e) {
                if (e.keyCode === 13) {
                    this.blur();
                }
            });


            function onBlur() {
                _this.setValue(_this.__input.value);
            }

            this.updateDisplay();

            this.el.appendChild(this.__input);

        };

        StringController.superclass = Controller;

        common.extend(

            StringController.prototype,
            Controller.prototype,

            {

                updateDisplay: function() {
                    // Stops the caret from moving on account of:
                    // keyup -> setValue -> updateDisplay
                    if (!dom.isActive(this.__input)) {
                        this.__input.value = this.getValue();
                    }
                    this.__input.disabled = this.getReadonly();
                    return StringController.superclass.prototype.updateDisplay.call(this);
                }

            }

        );

        return StringController;

    })(dat.controllers.Controller,
        dat.dom.dom,
        dat.utils.common),
    dat.controllers.UnitController = (function (Controller, dom, common) {

        var units = [
            'px',
            //'em',
            'pt'
        ];

        var Unit = function(value) {

            if (value.substr) {
                this.num = value.substr(0, value.length - 2);
                this.unit = value.substr(-2);
            }

            if (this.num == '' || isNaN(this.num) || !common.contains(units, this.unit)) {
                throw 'Failed to interpret unit argument';
            }

            this.num = parseFloat(this.num);

        };

        common.extend(Unit.prototype, {

            toString: function() {
                return this.num + this.unit;
            }

        });


        /**
         * @class Represents a given property of an object that is a css unit.
         *
         * @extends dat.controllers.Controller
         *
         * @param {Object} object The object to be manipulated
         * @param {string} property The name of the property to be manipulated
         * @param {Object} [params] Optional parameters
         * @param {Number} [params.min] Minimum allowed value
         * @param {Number} [params.max] Maximum allowed value
         * @param {Number} [params.step] Increment by which to change value
         *
         * @member dat.controllers
         */
        var UnitController = function(name, value, options) {

            UnitController.superclass.call(this, name, value, 'unit', options);

            this.__unit = new Unit(this.getValue());

            var _this = this;

            var UP_ARROW = 38;
            var DOWN_ARROW = 40;

            this.__input = document.createElement('input');
            this.__input.setAttribute('type', 'text');

            this.__select = document.createElement('select');

            this.__arrow = document.createElement('label');
            this.__arrow.className = 'caret-down';

            common.each(units, function(unit) {
                var option = document.createElement('option');
                option.innerHTML = unit;
                option.setAttribute('value', unit);
                _this.__select.appendChild(option);
            });

            dom.bind(this.__input, 'change', function() {
                var value = _this.__input.value;
                if (!isNaN(value)) _this.__unit.num = value;
                _this.setValue(_this.__unit.toString());
            });

            dom.bind(this.__input, 'keydown', function(e) {
                switch(e.keyCode) {
                    case DOWN_ARROW:
                        e.preventDefault();
                        _this.__unit.num--;
                        _this.setValue(_this.__unit.toString());
                        break;
                    case UP_ARROW:
                        e.preventDefault();
                        _this.__unit.num++;
                        _this.setValue(_this.__unit.toString());
                        break;
                }
            });

            dom.bind(this.__select, 'change', function() {
                var value = this.options[this.selectedIndex].value;
                _this.__unit.unit = value;
                _this.setValue(_this.__unit.toString());
            });

            this.updateDisplay();

            this.el.appendChild(this.__input);
            this.el.appendChild(this.__select);
            this.el.appendChild(this.__arrow);

        };

        UnitController.superclass = Controller;

        common.extend(

            UnitController.prototype,
            Controller.prototype,

            /** @lends dat.controllers.NumberController.prototype */
            {

                updateDisplay: function() {
                    this.__unit = new Unit(this.getValue());
                    this.__input.value = this.__unit.num;
                    this.__select.value = this.__unit.unit;

                    this.__input.disabled = this.getReadonly();
                    this.__select.disabled = this.getReadonly();
                }

            }

        );

        return UnitController;

    })(dat.controllers.Controller,
        dat.dom.dom,
        dat.utils.common),
    dat.dom.dom,
    dat.utils.common);
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g=(g.Phaser||(g.Phaser = {}));g=(g.Plugin||(g.Plugin = {}));g.ECS = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var message = require("./message")

function Components(Cs) {
  this._count = Cs.length
  this._types = Cs
}

Components.prototype.index = function(C) {
  for (var i = 0; i < this._types.length; i++) {
    if (this._types[i] === C) return i
  }

  throw new TypeError(message("unknown_component", C))
}

Components.prototype.mask = function(C) {
  return 1 << this.index(C)
}

Object.defineProperty(Components.prototype, "count", {
  get: function() {
    return this._count
  }
})

module.exports = Components

},{"./message":6}],2:[function(require,module,exports){
var utils = require("./utils")
var arrayCreate = utils.arrayCreate
var arrayExpand = utils.arrayExpand
var arrayFill = utils.arrayFill

function ContiguousStorage(components, capacity) {
  if (capacity === void 0) {
    capacity = 0
  }

  this._count = components.count
  this._components = arrayCreate(this._count * capacity, null)
}

ContiguousStorage.prototype.get = function(id, index) {
  return this._components[this._count * id + index]
}

ContiguousStorage.prototype.set = function(id, index, component) {
  this._components[this._count * id + index] = component
}

ContiguousStorage.prototype.delete = function(id, index) {
  this.set(id, index, null)
}

ContiguousStorage.prototype.destroy = function(id) {
  arrayFill(this._components, null, this._count * id, this._count * (id + 1))
}

ContiguousStorage.prototype.resize = function(capacity) {
  arrayExpand(this._components, this._count * capacity, null)
}

module.exports = ContiguousStorage

},{"./utils":7}],3:[function(require,module,exports){
function Entity(manager, id) {
  this._manager = manager
  this._id = id
}

Entity.prototype.add = function(C) {
  this._manager._add(this._id, C)
}

Entity.prototype.remove = function(C) {
  this._manager._remove(this._id, C)
}

Entity.prototype.has = function(C) {
  return this._manager._has(this._id, C)
}

Entity.prototype.get = function(C) {
  return this._manager._get(this._id, C)
}

Entity.prototype.destroy = function() {
  return this._manager._destroy(this._id)
}

Object.defineProperty(Entity.prototype, "id", {
  get: function() {
    return this._id
  }
})

Object.defineProperty(Entity.prototype, "valid", {
  get: function() {
    return this._manager.valid(this)
  }
})

module.exports = Entity

},{}],4:[function(require,module,exports){
var Entity = require("./entity")
var utils = require("./utils")

var arrayCreate = utils.arrayCreate
var arrayExpand = utils.arrayExpand
var typedArrayExpand = utils.typedArrayExpand

var INITIAL_CAPACITY = 1024
var ENTITY_DEAD = 0
var ENTITY_ALIVE = 1

function EntityManager(components, storage) {
  // Components storages
  this._components = components
  this._storage = storage
  this._storage.resize(INITIAL_CAPACITY)

  // Entities storages
  this._entityFlag = new Uint8Array(INITIAL_CAPACITY)
  this._entityMask = new Uint32Array(INITIAL_CAPACITY)
  this._entityInst = arrayCreate(INITIAL_CAPACITY, null)

  this._entityPool = []
  this._entityCounter = 0
}

EntityManager.prototype.create = function() {
  var id
  if (this._entityPool.length > 0) {
    id = this._entityPool.pop()
  } else {
    id = this._entityCounter++
    this._entityInst[id] = new Entity(this, id)
    this._accomodate(id)
  }

  var entity = this._entityInst[id]
  this._entityFlag[id] = ENTITY_ALIVE

  return entity
}

EntityManager.prototype.get = function(id) {
  return this._entityInst[id]
}

EntityManager.prototype.query = function() {
  var mask = 0
  for (var i = 0; i < arguments.length; i++) {
    mask |= this._components.mask(arguments[i])
  }

  if (mask === 0) {
    return []
  }

  var result = []
  for (var id = 0; id < this._entityCounter; id++) {
    if (this._entityFlag[id] === ENTITY_ALIVE && (this._entityMask[id] & mask) === mask) {
      result.push(this._entityInst[id])
    }
  }

  return result
}

EntityManager.prototype.valid = function(entity) {
  var id = entity._id
  return this._entityFlag[id] === ENTITY_ALIVE && this._entityInst[id] === entity
}

EntityManager.prototype._accomodate = function(id) {
  var capacity = this._entityFlag.length
  if (capacity <= id) {
    capacity *= 2

    this._entityFlag = typedArrayExpand(this._entityFlag, capacity)
    this._entityMask = typedArrayExpand(this._entityMask, capacity)
    this._entityInst = arrayExpand(this._entityInst, capacity, null)
    this._storage.resize(capacity)
  }
}

EntityManager.prototype._add = function(id, component) {
  var ctor = component.constructor
  var index = this._components.index(ctor)
  this._entityMask[id] |= 1 << index
  this._storage.set(id, index, component)
}

EntityManager.prototype._remove = function(id, C) {
  var index = this._components.index(C)
  this._entityMask[id] &= ~(1 << index)
  this._storage.delete(id, index)
}

EntityManager.prototype._has = function(id, C) {
  var mask = this._components.mask(C)
  return (this._entityMask[id] & mask) !== 0
}

EntityManager.prototype._get = function(id, C) {
  var index = this._components.index(C)
  return this._storage.get(id, index)
}

EntityManager.prototype._destroy = function(id) {
  if (this._entityFlag[id] === ENTITY_ALIVE) {
    this._entityFlag[id] = ENTITY_DEAD
    this._entityMask[id] = 0
    this._entityPool.push(id)
    this._storage.destroy(id)
  }
}

Object.defineProperty(EntityManager.prototype, "capacity", {
  get: function() {
    return this._entityFlag.length
  }
})

module.exports = EntityManager

},{"./entity":3,"./utils":7}],5:[function(require,module,exports){
var Components = require("./components")
var ContiguousStorage = require("./contiguous_storage")
var EntityManager = require("./entity_manager")
var message = require("./message")

module.exports = function() {
  var count = arguments.length
  if (count > 32) throw new RangeError(message("too_many_components", 32))

  var Cs = new Array(count)
  for (var i = 0; i < Cs.length; i++) {
    Cs[i] = arguments[i]
  }

  var components = new Components(Cs)
  var storage = new ContiguousStorage(components)

  return new EntityManager(components, storage)
}

},{"./components":1,"./contiguous_storage":2,"./entity_manager":4,"./message":6}],6:[function(require,module,exports){
var messages = {
  "too_many_components":  "Too many components declared (only {0} allowed)",
  "unknown_component":    "Unknown component type '{0}'",
  "invalid_entity":       "Invalid entity '{0}'",
  "illegal_entity":       "Illegal access to entity '{0}'",
  "realloc_performed":    "Reallocation performed to handle {0} entities"
}

function message(type) {
  return messages[type].replace(/{(\d+)}/g, function(i) {
    return arguments[i + 1]
  })
}

module.exports = message

},{}],7:[function(require,module,exports){
exports.arrayCreate = arrayCreate
exports.arrayExpand = arrayExpand
exports.arrayFill = arrayFill
exports.typedArrayExpand = typedArrayExpand

// Arrays
// ------

function arrayCreate(length, value) {
  return arrayFill(new Array(length), value, 0, length)
}

function arrayExpand(source, length, value) {
  return arrayFill(source, value, source.length, length)
}

function arrayFill(target, value, start, end) {
  for (var i = start; i < end; i++) {
    target[i] = value
  }

  return target
}

// Typed arrays
// ------------

function typedArrayExpand(source, length) {
  var SourceTypedArray = source.constructor
  var target = new SourceTypedArray(length)

  target.set(source)
  return target
}

},{}],8:[function(require,module,exports){
var World = require('./world');

/**
 * @class Phaser.Plugin.ECS
 * @classdesc Phaser - ECS Plugin based on makrjs by ooflorent
 *
 * @constructor
 * @extends Phaser.Plugin
 *
 * @param {scene} scene - A reference to the currently running scene.
 */
var ECSPlugin = function(scene) {
    this.scene = scene;
    this.systems = scene.sys;
    this.world = new World(scene);

    if (!scene.sys.settings.isBooted)
    {
        scene.sys.events.once('boot', this.boot, this);
    }
}

ECSPlugin.register = function(PluginManager)
{
    PluginManager.register('ECS', ECSPlugin, 'ecs');
}

//  Extends the Phaser.Plugin template, setting up values we need
ECSPlugin.prototype = {
    boot: function()
    {
        var eventEmitter = this.systems.events;
        eventEmitter.on('start', this.start, this);

        eventEmitter.on('preupdate', this.preUpdate, this);
        eventEmitter.on('update', this.update, this);
        eventEmitter.on('postupdate', this.postUpdate, this);

        eventEmitter.on('pause', this.pause, this);
        eventEmitter.on('resume', this.resume, this);

        eventEmitter.on('sleep', this.sleep, this);
        eventEmitter.on('wake', this.wake, this);

        eventEmitter.on('shutdown', this.shutdown, this);
        eventEmitter.on('destroy', this.destroy, this);
    },

    //  Called when a Scene is started by the SceneManager. The Scene is now active, visible and running.
    start: function ()
    {
    },

    //  Called every Scene step - phase 1
    preUpdate: function (time, delta)
    {
    },

    //  Called every Scene step - phase 2
    update: function (time, delta)
    {
        this.world.update(delta);
    },

    //  Called every Scene step - phase 3
    postUpdate: function (time, delta)
    {
    },

    //  Called when a Scene is paused. A paused scene doesn't have its Step run, but still renders.
    pause: function ()
    {
    },

    //  Called when a Scene is resumed from a paused state.
    resume: function ()
    {
    },

    //  Called when a Scene is put to sleep. A sleeping scene doesn't update or render, but isn't destroyed or shutdown. preUpdate events still fire.
    sleep: function ()
    {
    },

    //  Called when a Scene is woken from a sleeping state.
    wake: function ()
    {
    },

    //  Called when a Scene shuts down, it may then come back again later (which will invoke the 'start' event) but should be considered dormant.
    shutdown: function ()
    {

    },

    //  Called when a Scene is destroyed by the Scene Manager. There is no coming back from a destroyed Scene, so clear up all resources here.
    destroy: function ()
    {
        this.shutdown();
        delete this.world;
        this.scene = undefined;
    }

}

ECSPlugin.prototype.constructor = ECSPlugin;

module.exports = ECSPlugin;

},{"./world":11}],9:[function(require,module,exports){
'use strict';

var makr = require('makr');

function System(scene) {
    makr.IteratingSystem.call(this);
    this.scene = scene;
}

System.prototype = Object.create(makr.IteratingSystem.prototype);
System.prototype.constructor = System;

System.prototype.getComponent = function(component) {
    return Phaser.ECS.getComponent(component);
};

module.exports = System;

},{"makr":5}],10:[function(require,module,exports){
var utils = module.exports = {};

utils.ComponentRegister = (function() {
    var nextType = 0;
    var ctors = [];
    var types = [];

    return {
        register: function(ctor) {
            var i = ctors.indexOf(ctor);
            if (i < 0) {
                ctors.push(ctor);
                types.push(nextType++);
                return nextType-1;
            } else {
                return types[i];
            }
        },
        get: function(ctor) {
            var i = ctors.indexOf(ctor);
            if (i < 0) {
                throw "Unknown type " + ctor;
            }

            return types[i];
        }
    };
})();

utils.inherits = function(ctor, superCtor, methods) {
    ctor.prototype = Object.create(superCtor.prototype);
    ctor.prototype.constructor = ctor;

    if (methods) {
        for (var p in methods) {
            if (methods.hasOwnProperty(p)) {
                ctor.prototype[p] = methods[p];
            }
        }
    }
};

},{}],11:[function(require,module,exports){
var makr = require('makr'),
    System = require('./system'),
    utils = require('./utils');

function World(scene) {
    makr.World.call(this);
    this.game = false;
    this.componentRegister = utils.ComponentRegister;
    this.System = new System(scene);
}

//  Extends the Phaser.Plugin template, setting up values we need
World.prototype = Object.create(makr.World.prototype);
World.prototype.constructor = makr.World;

World.prototype.getComponent = function(component) {
    return this.componentRegister.get(component);
};

World.prototype.registerComponent = function(component) {
    return this.componentRegister.register(component);
};

module.exports = World;

},{"./system":9,"./utils":10,"makr":5}]},{},[8])(8)
});

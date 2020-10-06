var makr = require('makr'),
    System = require('./system'),
    utils = require('./utils');

function World(scene) {
    makr.World.call(this);
    this.game = false;
    this.componentRegister = utils.ComponentRegister;
    this.System = System(scene);
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

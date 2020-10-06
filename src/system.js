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

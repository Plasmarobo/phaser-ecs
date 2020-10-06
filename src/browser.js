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

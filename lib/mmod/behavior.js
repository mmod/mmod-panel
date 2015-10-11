/**
 * package: mmod-panel
 * sub-package: lib.mmod.behavior
 * author:  Richard B. Winters <a href='mailto:rik@mmogp.com'>rik AT mmogp DOT com</a>
 * copyright: 2011-2015 Massively Modified, Inc.
 * license: Apache, Version 2.0 <http://www.apache.org/licenses/LICENSE-2.0>
 */


// Deps
const shell = imports.gi.Shell;
const st = imports.gi.St;
const meta = imports.gi.Meta;

const main = imports.ui.main;
const layout = imports.ui.layout;
const tweener = imports.ui.tweener;

const mainloop = imports.mainloop;

const lang = imports.lang;


// Defines
const HOT_CORNER_DISABLED = 54321;
const PRESSURE_TIMEOUT = 1000;


/**
 * Class for modifying the behavior of the panel
 *
 * @since 0.1.0
 */
function mod( o )
{
    if( o )
    {
        if( o.rig )
        {
            this.rig = o.rig;
        }
    }
    else
    {
        this.rig = null;
    }

    this.autohide = new autohide( { rig: this.rig } );
    this.hotCorner = new hotCorner( { rig: this.rig } );

    this.active = false;
}


/**
 * Method for initializing behavior modifications to the panel
 *
 * @since 0.1.0
 */
mod.prototype.init = function()
{
    // We invoke init regardless because of certain processes that need
    // to happen for supporting real-time application of preference changes
    this.autohide.init();

    this.hotCorner.init();

    this.active = true;
};


/**
 * Method for removing behavior modifications to the panel
 *
 * @since 0.1.0
 */
mod.prototype.destroy = function()
{
    if( this.active )
    {
        // And we always call disable so that realize is properly handled.
        this.autohide.disable();

        // hotCorners is always active anyhow as well.
        this.hotCorner.enable();

        this.active = false;
    }
};


/**
 * Autohide class provides behavioral modifications to the panel
 *
 * @since 0.1.0
 */
function autohide( o )
{
    if( o )
    {
        if( o.rig )
        {
            this.rig = o.rig;
        }
    }
    else
    {
        this.rig = null;
    }

    this.favorites = null;

    // Check for barrier support
    this.barriers = global.display.supports_extended_barriers();
    this.pressureBarrier = null;
    this.pressureThreshold = null;
    this.barrier = null;
    this.barrierTriggered = null;

    this.panelBox = main.panel.actor.get_parent();
    this.uiGroup = this.panelBox.get_parent();

    this.monitor = main.layoutManager.primaryMonitor;

    this.hoverBox = null;
    this.hoverStates = null;
    this.visibleStates = null;
    this.hidden = null;
    this.config = null;

    this.connections = null;

    this.activities = main.panel.statusArea.activities;
    this.app = main.panel.statusArea.appMenu;
    this.date = main.panel.statusArea.dateMenu;
    this.aggregate = main.panel.statusArea.aggregateMenu;

    this.realize = -1;

    this.active = false;
}


/**
 * Method to initialize auto-hide behavior for the panel
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.init = function()
{
    if( this.rig.settings.get_boolean( 'autohide-panel' ) )
    {
        // Handle realize if applicable
        if( this.realize < 0 )
        {   // Shell/Extension has just initialized
            this.realize = this.panelBox.connect( 'realize', lang.bind( this, this.init ) );

            // Do not allow the method to continue
            return;
        }

        if( this.realize > 0 )
        {   // We're initializing after a disable/enable combo-invocation
            this.panelBox.disconnect( this.realize );
            this.realize = 0;
        }

        if( this.barriers )
        {
            // Get a handle to the appSystem for later use
            this.appSystem = shell.AppSystem.get_default();

            // Get the pressure threshold setting
            this.pressureThreshold = this.rig.settings.get_double( 'autohide-pressure-threshold' );

            // Create a new pressure barrier for triggering the panel into display when hidden
            this.pressureBarrier = new layout.PressureBarrier
            (
                this.pressureThreshold,
                PRESSURE_TIMEOUT,
                shell.KeyBindingMode.NORMAL | shell.KeyBindingMode.OVERVIEW
            );

            // Connect to the trigger signal that will be emitted by our pressure barrier so we can handle it.
            this.pressureBarrier.connect
            (
                'trigger',
                lang.bind
                (
                    this,
                    function( barrier )
                    {
                        this.onBarrierTriggered();
                    }
                )
            );

            // We need to know the edge the panel is on so that we can create - and properly position  - a box for
            // detecting mouse moves off of the panel.
            let x = 0, y;
            switch( main.panel.edge )
            {
                case 0:
                {   // If on the bottom, we want the hover detection device to sit primarily above the panel with a 5 pixel clip.
                    // The clip fixes a notify::hover signal emit issue.
                    y = this.monitor.height - ( this.panelBox.get_height() * 2 ) + 5;
                }break;

                case 1:
                {   // If on top we still want the clip, but we want the hover detection device to sit primarily below the panel
                    y = this.monitor.y + ( this.panelBox.get_height() - 5 );
                }break;
            }

            // Let's create that hover detection device we've been going on about
            this.hoverBox = new st.BoxLayout( { name: 'autohideHoverBox', reactive: true, track_hover: true } );
            this.hoverBox.triggered = false;

            // Then add it to the uiGroup so that we - not only have it on the stage to be manipulated, but - can toy with its z-index
            this.uiGroup.add_actor( this.hoverBox );

            // Now that its on the stage let's toy with its appearance and position.
            this.hoverBox.set_height( this.panelBox.get_height() );
            this.hoverBox.set_width( this.monitor.width );
            this.hoverBox.set_position( x, y );
            this.hoverBox.set_x = x;
            this.hoverBox.set_y = y;

            // And then its z-index. It needs to be above the panelBox - and clipping it by at least 1 pixel - to trigger events properly.
            this.hoverBox.raise( this.panelBox );

            // We initialize a flag for hover states of the panel's actors (built-in menus)
            this.hoverStates =
            {
                activities: false,
                favorites: false,
                app: false,
                date: false,
                aggregate: false,
                hoverBox: false
            };

            // And a flag for visible states of the panel's actors (built-in menus which have a true pop-up; i.e. excludes activities)
            this.visibleStates =
            {
                activities: false,
                favorites: false,
                app: false,
                date: false,
                aggregate: false
            };

            // Prepare settings for our event handlers
            this.config =
            {
                delay: ( this.rig.settings.get_double( 'autohide-delay' ) * 1000 ),
                animationTime: this.rig.settings.get_double( 'autohide-animation-time' ),
                animationDelay: this.rig.settings.get_double( 'autohide-animation-delay' )
            };

            // If favorites are displayed, we will fetch the actor and make sure to connect our event handlers to it
            // so we can properly process autohide logic for the panel.
            if( this.rig.settings.get_boolean( 'display-favorites-enabled' ) )
            {
                let index = 1;
                if( !this.rig.settings.get_boolean( 'favorites-before-preferences' ) )
                {
                    index = 2;
                }
                this.favorites = main.panel._leftBox.get_child_at_index( index );
            }

            // Setup handling of hover notifications for autohide logic
            this.connect();

            // Initially hide the panel
            this.hide();

            this.active = true;
        }
    }
};


/**
 * Method for disabling auto-hide behavior
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.disable = function()
{
    if( this.active )
    {// Disconnect any signals so we aren't causing problems
        this.disconnect();

        // Remove the autohide barrier
        this.removeBarrier();

        // The pressure barrier
        if( this.pressureBarrier )
        {
            this.pressureBarrier.destroy();
            this.pressureBarrier = null;
            this.pressureThreshold = null;
            this.barrierTriggered = null;
        }

        // The autohide Hover box
        if( this.hoverBox )
        {
            this.uiGroup.remove_actor( this.hoverBox );
            this.hoverBox.destroy();
            this.hoverBox = null;
        }

        // And all our variables/flags
        if( this.hoverStates )
        {
            this.hoverStates = null;
        }

        if( this.visibleStates )
        {
            this.visibleStates = null;
        }

        if( this.config )
        {
            this.config = null;
        }

        if( this.favorites )
        {
            this.favorites = null;
        }

        this.active = false;
    }

    // With autohide and all modifications relying on realize, we will set realize to 0 upon disable
    // so that if by default the extension did not initialize, but was enabled after the panelBox was
    // realized; it will initialize properly. Remember disable will run before enable is called after
    // realization and an extension preference is changed or disabled/re-enabled.
    this.realize = 0;
};


/**
 * Method to hide the panel
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.hide = function()
{
    // Here we tween the panel up or down off of the viewable stage depending on panel position
    let y;
    switch( main.panel.edge )
    {
        case 0:
        {
            y = this.monitor.height;
        }break;

        case 1:
        {
            y = this.monitor.y - this.panelBox.get_height();
        }break;
    }

    tweener.addTween
    (
        this.panelBox,
        {
            y: y,
            time: this.config.animationTime,
            delay: this.config.animationDelay,
            transition: 'easeOutQuad',
            onComplete: lang.bind
            (
                this,
                function()
                {
                    // Then instantiate a barrier for our pressure barrier for toggling the panel into display once hidden
                    this.addBarrier();

                    // Set the autohide status
                    this.hidden = true;

                    // Hide the autohideHoverBox while the panel is hidden
                    this.hoverBox.hide();
                }
            )
        }
    );
};


/**
 * Method to show the panel
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.show = function()
{
    // Here we tween the panel up or down on to the viewable stage depending on panel position
    let y;
    switch( main.panel.edge )
    {
        case 0:
        {
            y = this.monitor.height - this.panelBox.get_height();
        }break;

        case 1:
        {
            y = this.monitor.y;
        }break;
    }

    tweener.addTween
    (
        this.panelBox,
        {
            y: y,
            time: this.config.animationTime,
            delay: this.config.animationDelay,
            transition: 'easeOutQuad',
            onComplete: lang.bind
            (
                this,
                function()
                {
                    // Remove the barrier for our pressure barrier to avoid issues with accessing the viewable stage while the panel is shown
                    this.removeBarrier();

                    // Set the autohide status
                    this.hidden = false;

                    // Set autohideHoverBoxTriggered flag and unhide the autohideHoverBox so it can be triggered
                    this.hoverBox.triggered = false;

                    if( !main.overview.visible )
                    {
                        this.hoverBox.show();
                    }

                    // Set a delayed invocation of hoverChanged to start autohide logic
                    mainloop.timeout_add
                    (
                        this.config.delay,
                        lang.bind
                        (
                            this,
                            function()
                            {
                                this.hoverChanged();
                            }
                        )
                    );
                }
            )
        }
    );
};


/**
 * Method to start auto-hide logic when the pressure barrier is triggered
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.onBarrierTriggered = function()
{
    this.barrierTriggered = true;

    this.hoverChanged();
};


/**
 * Method for processing auto-hide logic
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.hoverChanged = function()
{
    // Here we check if any of the visible elements of the panel are hovered. If so we set up a 3 second delayed
    // invocation of this method and check again. If none of the elements are hovered we hide the panel, unless barrierTriggered
    // is set to true, in which case we set barrierTriggered to false and set up a 3 second delayed invocation of this method
    // to check again like above. We also check if the hoverBox has been tripped while nothing is hovered, and if so we go
    // ahead and hide the panel - even if barrierTriggered is true since the user would have triggered that flag.
    if( !this.hoverStates )
    {
        return;
    }

    let hovered = false, hiding = this.hoverStates[5];
    for( let i in this.hoverStates )
    {
        if( this.hoverStates[i] && i !== 'hoverBox' )
        {
            hovered = true;
        }
    }

    for( let i in this.visibleStates )
    {
        if( this.visibleStates[i] )
        {
            hovered = true;
        }
    }

    if( hiding && !hovered )
    {
        if( !this.hidden )
        {
            this.hide();
        }
        return;
    }

    if( hovered || this.barrierTriggered || main.overview.visible )
    {
        // Reset barrierTriggered flag
        this.barrierTriggered = false;

        // Delay an invocation of this method to check conditions again after ensuring panel is shown
        if( this.hidden )
        {
            this.show();
        }else
        {
            // Set autohideHoverBoxTriggered flag and unhide the autohideHoverBox so it can be triggered
            this.hoverBox.triggered = false;
            this.hoverBox.show();

            mainloop.timeout_add
            (
                this.config.delay,
                lang.bind
                (
                    this,
                    function()
                    {
                        this.hoverChanged();
                    }
                )
            );
        }

        return;
    }

    // If for some reason this method was invoked but none of the above cases are true, check whether
    // the panel is hidden, and if not let us hide it.
    if( !this.hiden && !hovered )
    {
        this.hide();
    }
};


/**
 * Method to set event handlers used in auto-hide logic
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.connect = function()
{

    this.connections =
    [
        [
            this.hoverBox, this.hoverBox.connect( 'notify::hover', lang.bind( this, this.boxHoverChanged ) )
        ],
        [
            this.activities.actor, this.activities.actor.connect( 'notify::hover', lang.bind( this, this.activitiesHoverChanged ) )
        ],
        [
            this.date.actor, this.date.actor.connect( 'notify::hover', lang.bind( this, this.dateHoverChanged ) )
        ],
        [
            this.date.menu, this.date.menu.connect( 'open-state-changed', lang.bind( this, this.dateStateChanged ) )
        ],
        [
            this.aggregate.actor, this.aggregate.actor.connect( 'notify::hover', lang.bind( this, this.aggregateHoverChanged ) )
        ],
        [
            this.aggregate.menu, this.aggregate.menu.connect( 'open-state-changed', lang.bind( this, this.aggregateStateChanged ) )
        ],
        [
            this.app.actor, this.app.actor.connect( 'notify::hover', lang.bind( this, this.appPrefsHoverChanged ) )
        ],
        [
            this.appSystem, this.appSystem.connect( 'app-state-changed', lang.bind( this, this.appStateChanged ) )
        ],
        [
            main.overview, main.overview.connect( 'showing', lang.bind( this, this.onToggleOverview ) )
        ],
        [
            main.overview, main.overview.connect( 'hidden', lang.bind( this, this.onToggleOverview ) )
        ]
    ];

    if( this.favorites )
    {
        this.connections.push
        (
            [
                this.favorites, this.favorites.connect( 'notify::hover', lang.bind( this, this.favoritesHoverChanged ) )
            ]
        );
    }
};


/**
 * Method to remove event handlers used in auto-hide logic
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.disconnect = function()
{
    if( this.connections )
    {
        for( let i = 0; i < this.connections.length; i++ )
        {
            this.connections[i][0].disconnect( this.connections[i][1] );
        }

        this.connections = null;
    }
};


/**
 * Method to initialize the barrier for triggering the panel when hidden and auto-hide is enabled
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.addBarrier = function()
{
    let x = 0, y;
    switch( main.panel.edge )
    {
        case 0:
        {
            y = this.monitor.height;
        }break;

        case 1:
        {
            y = this.monitor.y;
        }break;
    }

    let direction;
    if( this.panelBox.get_text_direction() === 2 )
    {
        direction = meta.BarrierDirection.NEGATIVE_X;
    }
    else
    {
        direction = meta.BarrierDirection.POSITIVE_X;
    }

    // Create an actual barrier to be triggered by pressure sensing (will block status panel on bottom)
    this.barrier = new meta.Barrier
    (
        {
            display: global.display,
            x1: x,
            x2: this.monitor.width,
            y1: y,
            y2: y,
            directions: direction
        }
    );

    if( this.pressureBarrier )
    {
        this.pressureBarrier.addBarrier( this.barrier );
    }
};


/**
 * Method to disable the barrier for triggering the panel when it is hidden and auto-hide is enabled
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.removeBarrier = function()
{
    if( this.barrier )
    {
        if( this.pressureBarrier )
        {
            this.pressureBarrier.removeBarrier( this.barrier );

            // We are required to manually reset this flag since we remove the barrier the avoid problems
            // when we show the panel
            this.pressureBarrier._isTriggered = false;
        }

        this.barrier.destroy();
        this.barrier = null;
    }
};


/**
 * Event handler for auto-hide logic processing
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.boxHoverChanged = function()
{
    if( this.hoverStates )
    {
        if( this.hoverStates.hoverBox )
        {
            this.hoverStates.hoverBox = false;
        }
        else
        {
            this.hoverStates.hoverBox = true;
        }

        this.hoverBox.triggered = true;
    }
};


/**
 * Event handler for auto-hide logic processing
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.favoritesHoverChanged = function()
{
    if( this.hoverStates )
    {
        if( this.hoverStates.favorites )
        {
            this.hoverStates.favorites = false;
        }
        else
        {
            this.hoverStates.favorites = true;
        }
    }
};


/**
 * Event handler for auto-hide logic processing
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.activitiesHoverChanged = function()
{
    if( this.hoverStates )
    {
        if( this.hoverStates.activities )
        {
            this.hoverStates.activities = false;
        }
        else
        {
            this.hoverStates.activities = true;
        }
    }
};


/**
 * Event handler for auto-hide logic processing
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.activitiesStateChanged = function()
{
    if( this.visibleStates )
    {
        if( this.visibleStates.activities )
        {
            this.visibleStates.activities = false;
        }
        else
        {
            this.visibleStates.activities = true;
        }
    }
};


/**
 * Event handler for auto-hide logic processing
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.dateHoverChanged = function()
{
    if( this.hoverStates )
    {
        if( this.hoverStates.date )
        {
            this.hoverStates.date = false;
        }
        else
        {
            this.hoverStates.date = true;
        }
    }
};


/**
 * Event handler for auto-hide logic processing
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.dateStateChanged = function()
{
    if( this.visibleStates )
    {
        if( this.visibleStates.date )
        {
            this.visibleStates.date = false;
        }
        else
        {
            this.visibleStates.date = true;
        }
    }
};


/**
 * Event handler for auto-hide logic processing
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.aggregateHoverChanged = function()
{
    if( this.hoverStates )
    {
        if( this.hoverStates.aggregate )
        {
            this.hoverStates.aggregate = false;
        }
        else
        {
            this.hoverStates.aggregate = true;
        }
    }
};


/**
 * Event handler for auto-hide logic processing
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.aggregateStateChanged = function()
{
    if( this.visibleStates )
    {
        if( this.visibleStates.aggregate )
        {
            this.visibleStates.aggregate = false;
        }
        else
        {
            this.visibleStates.aggregate = true;
        }
    }
};


/**
 * Event handler for auto-hide logic processing
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.appPrefsHoverChanged = function()
{
    if( this.hoverStates )
    {
        if( this.hoverStates.app )
        {
            this.hoverStates.app = false;
        }
        else
        {
            this.hoverStates.app = true;
        }
    }
};


/**
 * Event handler for auto-hide logic processing
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.appStateChanged = function()
{
    if( this.rig.settings.get_boolean( 'autohide-panel' ) )
    {
        this.hide();
    }
};


/**
 * Event handler for auto-hide logic processing
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
autohide.prototype.onToggleOverview = function()
{
    if( this.rig.settings.get_boolean( 'autohide-panel' ) )
    {
        if( main.overview.visible )
        {
            this.show();

            let x = 0, y;
            switch( main.panel.edge )
            {
                case 0:
                {
                    y = this.monitor.height;
                }break;

                case 1:
                {
                    y = this.monitor.y - this.panelBox.get_height();
                }break;
            }

            this.hoverBox.set_position( x, y );
        }
        else
        {
            this.hide();

            let x = 0, y;
            switch( main.panel.edge )
            {
                case 0:
                {
                    y = this.monitor.height - ( this.panelBox.get_height() * 2 ) + 5;
                }break;

                case 1:
                {
                    y = this.monitor.y + ( this.panelBox.get_height() - 5 );
                }break;
            }

            this.hoverBox.set_position( x, y );
        }
    }
};




/**
 * Modification class for enabling/disabling the system provided hot corner for toggling the overview.
 *
 * @since 0.1.0
 */
function hotCorner( o )
{
    if( o )
    {
        if( o.rig )
        {
            this.rig = o.rig;
        }
    }
    else
    {
        this.rig = null;
    }

    this.realize = -1;

    this.panelBox = main.panel.actor.get_parent();

    // Check for barrier support
    this.barriers = global.display.supports_extended_barriers();
    this.threshold = main.layoutManager.hotCorners[main.layoutManager.primaryIndex]._pressureBarrier._threshold;
    this.toggleOverview = main.layoutManager.hotCorners[main.layoutManager.primaryIndex]._toggleOverview;

    this.active = false;
}


/**
 * Method for disabling the system provided hot-corner that toggles the overview
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
hotCorner.prototype.init = function()
{
    if( !this.rig.settings.get_boolean( 'hot-corner-enabled' ) )
    {
        // Handle realize if applicable
        if( this.realize < 0 )
        {   // Shell/Extension has just initialized
            this.realize = this.panelBox.connect( 'realize', lang.bind( this, this.init ) );

            // Do not allow the method to continue
            return;
        }

        if( this.realize > 0 )
        {   // We're initializing after a disable/enable combo-invocation
            this.panelBox.disconnect( this.realize );
            this.realize = 0;
        }

        if( this.barriers )
        {
            main.layoutManager.hotCorners[main.layoutManager.primaryIndex]._pressureBarrier._threshold = HOT_CORNER_DISABLED;
            main.layoutManager.hotCorners[main.layoutManager.primaryIndex]._toggleOverview = HOT_CORNER_DISABLED;

            this.active = true;
        }
    }
};


/**
 * Method for re-enabling the system provided hot-corner that toggles the overview
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
hotCorner.prototype.enable = function()
{
    this.init();
    if( this.rig.settings.get_boolean( 'hot-corner-enabled' ) )
    {
        if( this.barriers )
        {
            main.layoutManager.hotCorners[main.layoutManager.primaryIndex]._pressureBarrier._threshold = this.threshold;
            main.layoutManager.hotCorners[main.layoutManager.primaryIndex]._toggleOverview = this.toggleOverview;

            this.active = false;
        }
    }

    // With hotCorner and all modifications relying on realize, we will set realize to 0 upon disable
    // so that if by default the extension did not initialize, but was enabled after the panelBox was
    // realized; it will initialize properly. Remember disable will run before enable is called after
    // realization and an extension preference is changed or disabled/re-enabled.
    this.realize = 0;
};
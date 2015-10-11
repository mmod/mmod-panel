/**
 * package: mmod-panel
 * sub-package: lib.mmod.favorites
 * author:  Richard B. Winters <a href='mailto:rik@mmogp.com'>rik AT mmogp DOT com</a>
 * copyright: 2011-2015 Massively Modified, Inc.
 * license: Apache, Version 2.0 <http://www.apache.org/licenses/LICENSE-2.0>
 */


// Deps
const shell = imports.gi.Shell;
const clttr = imports.gi.Clutter;
const st = imports.gi.St;
const meta = imports.gi.Meta;

const main = imports.ui.main;

const favs = imports.ui.appFavorites;
const adisp = imports.ui.appDisplay;
const dnd = imports.ui.dnd;
const dash = imports.ui.dash;

const lang = imports.lang;


/**
 * Favorites modification allows for the display of favorite and running apps on the panel, and allows the end user
 * to manage the favorite apps included in the display, their order, etc.; as if managing favorites in the overview.
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

    this.comfortSettings = null;

    this.appSystem = null;
    this.panelBox = main.panel.actor.get_parent();
    this.container = main.panel._leftBox;

    this.box = null
    this.workId = null;

    this.loaded = null;
    this.active = null;

    this.connections = null;

    this.list = null;
    this.previous = null;
    this.favorites = null;
    this.running = null;
    this.displayed = null;

    this.dragCancelled = false;
    this.dragMonitor = null;

    this.active = false;
}


/**
 * Method to initialize the display of favorites and/or running apps on the panel
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
mod.prototype.init = function()
{
    if( this.rig.settings.get_boolean( 'display-favorites-enabled' ) )
    {
        this.box = new st.BoxLayout( { name: 'favoritesBox', reactive: true, track_hover: true, clip_to_allocation: true } );

        if( !this.workId )
        {
            // This asks Gnome to defer invocation of this method until it will not affect normal system operations?
            this.workId = main.initializeDeferredWork( this.box, lang.bind( this, this.update ) );
        }

        this.appSystem = shell.AppSystem.get_default();
        this.active = true;

        // We must force an update regardless if deferred work is initialized
        this.update();
    }
};


/**
 * Method to disable modification(s) to the panel
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
mod.prototype.destroy = function()
{
    if( this.active )
    {
        // Disconnect any signals so we aren't causing problems
        this.disconnect();

        // Nullify oalist if necessary
        if( this.previous )
        {
            this.previous = null
        }

        // Remove the list of favorite apps
        if( this.list )
        {
            this.list = null;
        }

        // Our list of favorite and running apps to display can be destroyed now
        if( this.displayed )
        {
            for( let i in this.displayed )
            {
                // Remove the actor (array of favorites to be displayed) from the favorite container
                //this.alaunch.remove_actor( this.inDisplay[o].item.actor );
                this.displayed[i].item.actor.destroy();
                this.displayed[i].item = null;
            }

            this.displayed = null;
        }

        // Remove the container used to display the array of favorite apps on the panel
        if( this.loaded )
        {
            this.container.remove_child( this.box );
            this.loaded = false;
        }

        // Now delete our list of favorites
        if( this.favorites )
        {
            this.favorites = null;
        }

        // The list of running apps
        if( this.running )
        {
            this.running = null;
        }

        if( this.appSystem )
        {
            this.appSystem = null;
        }

        // The box
        if( this.box )
        {
            this.box.destroy();
            this.box = null;
        }

        // And finally the workId since we'll need to get a new one
        if( this.workId )
        {
            this.workId = null;
        }

        this.active = false;
    }
};


/**
 * Method to update the display of favorites and/or running apps on the panel
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
mod.prototype.update = function()
{
    // Load the container to be displayed even prior to adding children to it in order to avoid get_theme_node() errors
    if( !this.loaded )
    {
        let index = 1;
        if( !this.rig.settings.get_boolean( 'favorites-before-preferences' ) )
        {
            index = 2;
        }

        this.container.insert_child_at_index( this.box, index );

        // Connect to the signals that are needed in order to properly reload the list of favorite/running apps at various times
        this.connect();

        this.loaded = true;
    }

    // First get the current map of favorites
    this.favorites = favs.getAppFavorites().getFavoriteMap();

    // Next we create a list including apps which are supposed to be displayed on the panel based on current favorites list
    this.list = [];

    // Add the stored/registered favorites to the list
    for( let id in this.favorites )
    {
        this.list.push( this.favorites[id] );
    }

    // Do the same for any running apps if applicable
    if( this.rig.settings.get_boolean( 'show-running-apps' ) == true )
    {
        this.running = this.appSystem.get_running();
        for( let i = 0; i < this.running.length; i++ )
        {
            if( !( this.running[i].get_id() in this.favorites ) )
            {
                this.list.push( this.running[i] );
            }
        }
    }

    // The obvious next step is to display an icon for each unique application within the display on the MMOD-Panel. However, we need to keep
    // in mind that as favorites are managed, apps executed, manipulated and closed, the icons for our displayed favorites and running apps
    // are required to respond to those changes. The icon's display each need to reflect the current global status.

    // This requires us to keep track of old and new positions so that we can properly update the existing display of favorites and/or running apps

    // But now we have a list of apps (favorite and/or running) in the old order they were in, and a list in the new order they are supposed
    // to be in. We also know the state and children of the current display.

    // If multiple instances of a single app are in the list, that application will feature an icon which
    // signifies it is running (hover state) constantly.  Clicking on that icon will display a list of all running instances to choose from.
    if( !this.displayed )
    {
        this.displayed = [];
        this.previous = null;
    }
    else
    {
        this.previous = this.displayed;
        for( let i = 0; i < this.displayed.length; i++ )
        {
            this.box.remove_actor( this.displayed[i].item.actor );
        }
        this.displayed = null;
        this.displayed = [];
    }

    let realIndex = 0;
    for( let item in this.list )
    {
        // Let's us know whether to create a new app-well-icon or not, used below
        let skip = false;

        // Check if an old list exists - determines whether we execute some additional logic in hopes of improving efficiency
        if( this.previous )
        {
            // See if the favorite at the current index has already been instantiated as an icon to be display previously
            if(  this.previous[item] && this.list[item] == this.previous[item].app )
            {
                // Great, the icon is already initialized and in display at the correct index, move it over
                this.displayed.push( this.previous[item] );
                this.displayed[realIndex].pos = realIndex;

                // Let the method know to skip creating a new icon
                skip = true;
            }
            else
            {
                // It doesn't mean that its doesn't already exist, it could have been moved or repositioned as a result of a move
                // let's do the dirty and search for it
                for( let i in this.previous )
                {
                    if( this.previous[i].app == this.list[item] )
                    {
                        // Move it over
                        this.displayed.push( this.previous[i] );
                        this.displayed[realIndex].pos = realIndex;

                        // Let the method know to skip creating a new icon
                        skip = true;
                    }
                }

            }
        }

        if( !skip )
        {
            // If we're not skipping, then push another object onto our in-display list
            this.displayed.push( { app: this.list[item], item: new adisp.AppIcon( this.list[item], {} ), pos: realIndex } );

            // Setup dnd handlers in the AppIcon container
            this.displayed[realIndex].item.handleDragOver = this.handleDragOver;
            this.displayed[realIndex].item.acceptDrop = this.acceptDrop;
            this.displayed[realIndex].item.settings = this.rig.settings;

            // Immediately add the new actor the the app launch container
            this.box.add_actor( this.displayed[realIndex].item.actor );

            // Once the actor is on the stage let's start messing with its theme in order to avoid error
            let child = this.box.get_child_at_index( realIndex );

            // Set sizes based on settings, and attempt to support themes as best as possible
            let iconWidth = this.comfortSettings.favoriteSize, iconHeight = this.comfortSettings.favoriteSize;

            child.set_size( this.comfortSettings.containerSize, this.comfortSettings.containerSize );
            child.set_y_align( clttr.ActorAlign.CENTER );

            // The way that favorites are rendered in 3.16 differs from  how they are rendered
            // in gnome-shell versions 3.8 through 3.14            
            let newer_favorites_wrapping = false;
            let running_dots = false;
            
            // 3.8 through 3.14
            if( child.get_children()[0] && child.get_children()[0].has_style_class_name( 'overview-icon-with-label' ) )
            {
                child.get_children()[0].remove_style_class_name( 'overview-icon-with-label' );
                child.get_children()[0].set_position( 7, 10 );
            }
            else
            {
                // 3.16
                newer_favorites_wrapping = true;
                if( child.get_children()[0].get_children()[0] && child.get_children()[0].get_children()[0].has_style_class_name( 'overview-icon-with-label' ) )
                {
                    child.get_children()[0].get_children()[0].remove_style_class_name( 'overview-icon-with-label' );
                    child.get_children()[0].get_children()[0].set_position( 7, 10 );
                }
                else
                {
                    if( child.get_children()[0].get_children()[1] && child.get_children()[0].get_children()[1].has_style_class_name( 'overview-icon-with-label' ) )
                    {
                        // We won't reposition the icon if there are running dots, as they display below the icon
                        running_dots = true;
                        child.get_children()[0].get_children()[1].remove_style_class_name( 'overview-icon-with-label' );
                    }
                }
            }

            // 3.8 through 3.14 continuation
            if( !newer_favorites_wrapping )
            {
                child.get_children()[0].get_children()[0].get_children()[0].set_size( iconWidth, iconHeight );
                child.get_children()[0].get_children()[0].get_children()[1].set_size( 0, 0 );
            }
            else
            {            
                // 3.16 continuation
                if( running_dots )
                {
                    child.get_children()[0].get_children()[1].get_children()[0].get_children()[0].set_size( iconWidth, iconHeight );
                    child.get_children()[0].get_children()[1].get_children()[0].get_children()[1].set_size( 0, 0 );
                }
                else
                {
                    child.get_children()[0].get_children()[0].get_children()[0].get_children()[0].set_size( iconWidth, iconHeight );
                    child.get_children()[0].get_children()[0].get_children()[0].get_children()[1].set_size( 0, 0 );
                }
                
            }
        }
        else
        {
            this.box.add_actor( this.displayed[realIndex].item.actor );
        }

        // Don't forget to increment
        realIndex++;
    }
};


/**
 * Method to requeue deferred work for the gnome-shell
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
mod.prototype.queueUpdate = function()
{
   if( this.workId )
   {
       main.queueDeferredWork( this.workId );
   }
};


/**
 * Method to initialize event handlers for signals related to the display of favorites on the panel
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
mod.prototype.connect = function()
{
    this.connections =
    [
        [
            this.appSystem,
            this.appSystem.connect
            (
                'installed-changed',
                lang.bind
                (
                    this,
                    function()
                    {
                        favs.getAppFavorites().reload();
                        this.queueUpdate();
                    }
                )
            )
        ],
        [
            favs.getAppFavorites(), favs.getAppFavorites().connect( 'changed', lang.bind( this, this.queueUpdate ) )
        ],
        [
            this.appSystem, this.appSystem.connect( 'app-state-changed', lang.bind( this, this.queueUpdate ) )
        ],
        [
            main.overview, main.overview.connect( 'item-drag-begin', lang.bind( this, this.onDragBegin ) )
        ],
        [
            main.overview, main.overview.connect( 'item-drag-end', lang.bind( this, this.onDragEnd ) )
        ],
        [
            main.overview, main.overview.connect( 'item-drag-cancelled', lang.bind( this, this.onDragCancelled ) )
        ],
        [
            main.overview, main.overview.connect( 'showing', lang.bind( this, this.onToggleOverview ) )
        ],
        [
            main.overview, main.overview.connect( 'hidden', lang.bind( this, this.onToggleOverview ) )
        ]
    ];
};




/**
 * Method to remove the display of favorites from the panel
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
mod.prototype.disconnect = function()
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
 * Logic handler determining favorites visibility based on overview visibility
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
mod.prototype.onToggleOverview = function()
{
    if( this.loaded )
    {
        if( main.overview.visible )
        {
            this.box.hide();
        }
        else
        {
            this.box.show();
        }
    }
};


/**
 * Drag and Drop handler for item-drag-begin event
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
mod.prototype.onDragBegin = function()
{
    this.panelBox.raise( global.top_window_group );
    this.dragCancelled = false;
    this.dragMonitor =
    {
        dragMotion: lang.bind( this, this.onDragMotion )
    };
    dnd.addDragMonitor( this.dragMonitor );
};


/**
 * Drag and Drop handler for item-drag-cancelled event
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
mod.prototype.onDragCancelled = function()
{
    this.dragCancelled = true;
    this.endDrag();
};


/**
 * Drag and Drop handler for item-drag-end event
 *
 * @args none
 *
 * @return none
 *
 * @since 0.1.0
 */
mod.prototype.onDragEnd = function()
{
    if( this.dragCancelled )
    {
        return;
    }

    this.endDrag();
};


/**
 * Method to processes post-drag tasks
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */

mod.prototype.endDrag = function()
{
    // Remove placeholder(s) from the alaunch
    let children = this.box.get_children();
    for( let i in children )
    {
        if( children[i].has_style_class_name instanceof Function )
        {
            if( children[i].has_style_class_name( 'dash-item-container' ) )
            {
                this.box.get_child_at_index( i ).destroy();
            }
        }
    }

    // Free up additional memory
    for( let child in this.displayed )
    {
        if( child && child.item && child.item.placeholder )
        {
            child.item.placeholder.destroy();
            child.item.placeholder = null;

            if( child.item.placeholderPos )
            {
                child.item.placeholderPos = null;
            }
        }
    }

    dnd.removeDragMonitor( this.dragMonitor );


    this.panelBox.lower( main.messageTray.actor.get_parent() );
};


/**
 * Drag and Drop handler for DragMonitor events
 *
 * @param de    DragEvent   Defines params specific to the drag event
 *
 * @return dnd.DragMotionResult
 *
 * @since 0.1.0
 */

mod.prototype.onDragMotion = function( de )
{
    let app = dash.getAppFromSource( de.source );
    if( !app )
    {
        return dnd.DragMotionResult.CONTINUE;
    }

    return dnd.DragMotionResult.CONTINUE;
};


/**
 * Drag and Drop handler for DragMonitor events
 *
 * @param s     Defines the source object
 * @param a     Defines the dragged actor
 * @param x     Defines the x position of the mouse(source) within the target
 * @param y     Defines the y position of the mouse(source) within the target
 * @param t     Defines the time of the event
 *
 * @return dnd.DragMotionResult
 *
 * @since 0.1.0
 */
mod.prototype.handleDragOver = function( s, a, x, y, t )
{
    if( !this.settings.get_boolean( 'display-favorites-enabled' ) )
    {
        return dnd.DragMotionResult.NO_DROP;
    }

    let app = dash.getAppFromSource( s );
    if( !app || app.is_window_backed() )
    {
        return dnd.DragMotionResult.NO_DROP;
    }

    let favorites = favs.getAppFavorites().getFavorites();

    let cafavPos = favorites.indexOf( app );
    let ctfavPos = favorites.indexOf( this.app );

    if( ctfavPos == -1 )
    {
        // If the dragged actor (cafavPos) is not in the list of favorites (-1), the move is not allowed

        // If the target actor (ctfavPos) is not in the list of favorites (-1 ), the move is not allowed

        return dnd.DragMotionResult.NO_DROP;
    }

    let move = false;
    if( cafavPos > -1 )
    {
        move = true;
    }


    // Otherwise the dragged item can be moved to the target position, let's put a placeholder there which
    // will display until the drag is ended or the dragged actor is moved to another position.

    // Since this could be that extended drag to a new position, let's test to see if we have any placeholders
    // in the alaunch that need to be removed:
    let children = a.get_parent().get_children();                                   // The parent is UIGroup
    let panelBoxIndex = children.indexOf( main.panel.actor.get_parent() );          // Get the index of the panelBox
    let panelBox = a.get_parent().get_child_at_index( panelBoxIndex );              // To get a handle to the panelBox

    // Next we figure out which index the favoritesBox should be within the leftBox of the panel
    let favoritesBoxIndex = 1;
    if( !this.settings.get_boolean( 'favorites-before-preferences' ) )
    {
        favoritesBoxIndex = 2;
    }

    // And get a handle to our favorites box. We had to go through all this trouble because handleDragOver belongs to the
    // app-well-icon, and not to our favorites modification; making this.box and this.container unavailable to us.
    let favoritesBox = panelBox.get_child_at_index( 0 ).get_child_at_index( 0 ).get_child_at_index( favoritesBoxIndex );

    // Now go ahead and remove all found placeholders
    for( let i = 0; i < favoritesBox.get_n_children(); i++ )
    {
        let child = favoritesBox.get_child_at_index( i );
        if( child.has_style_class_name instanceof Function )
        {
            if( child.has_style_class_name( 'dash-item-container' ) )
            {
                child.destroy();
            }
        }
    }

    // And create a new placeholder (moving just leads to need to iterate again anyhow to remove any extras)
    this.placeholder = null;
    this.placeholderPos = null;

    // This is a check to ensure we're actually making a move, and also
    // allows us to configure where the placeholder will go so the item
    // is moved to the appropriate 'side' of the target actor.
    if( cafavPos < ctfavPos )
    {
        this.placeholderPos = ctfavPos + 1;
    }
    else
    {   // We can't let == work.
        if( cafavPos > ctfavPos )
        {
            this.placeholderPos = ctfavPos;
        }
        else
        {
            return dnd.DragMotionResult.NO_DROP;
        }
    }

    // If we're going to display a placeholder
    if( this.placeholderPos !== null )
    {
        this.placeholder = new dash.DragPlaceholderItem();
        this.placeholder.child.set_width( 12 );
        this.placeholder.child.set_height( 36 );

        // Insert it at the target position
        favoritesBox.insert_child_at_index( this.placeholder, this.placeholderPos );

        // Then show it once it's on the stage to avoid errors
        this.placeholder.show( true );
    }

    if( move )
    {
        return dnd.DragMotionResult.MOVE_DROP;
    }

    return dnd.DragMotionResult.COPY_DROP;
};


/**
 * Drag and Drop handler for DragMonitor events
 *
 * @param s     Defines the source object
 * @param a     Defines the dragged actor
 * @param x     Defines the x position of the mouse(source) within the target
 * @param y     Defines the y position of the mouse(source) within the target
 * @param t     Defines the time of the event
 *
 * @return dnd.DragMotionResult | boolean
 *
 * @since 0.1.0
 */
mod.prototype.acceptDrop = function( s, a, x, y, t )
{
    if( !this.settings.get_boolean( 'display-favorites-enabled' ) )
    {
        return true;
    }

    let app = dash.getAppFromSource( s );
    if( !app || app.is_window_backed() )
    {
        return false;
    }

    let favorites = favs.getAppFavorites().getFavorites();

    let cafavPos = favorites.indexOf( app );
    let ctfavPos = favorites.indexOf( this.app );

    let move = false;
    if( ctfavPos == -1 )
    {
        // If the target actor (ctfavPos) is not in the list of favorites (-1 ), the move or addition is not handled by steward
        return false;
    }
    if( cafavPos > -1 )
    {
        // As long as the dragged actor (cafavPos) is in the list of favorites (> -1), its a move (if we've gotten this far, anyhow)
        move = true;
    }


    // Let's see if the user meant to make a move or addition, but first we'll return true if it is being dropped someplace without
    // a placeholder since that would mean we put it back to its original position
    if( !this.placeholder )
    {
        return true;
    }

    // Let's get the id of the application
    let id = app.get_id();

    // And actually manipulate our favorites list accordingly
    meta.later_add
    (
        meta.LaterType.BEFORE_REDRAW,
        lang.bind
        (
            this,
            function()
            {
                let favorites = favs.getAppFavorites();
                if( move )
                {
                    favorites.moveFavoriteToPos( id, ctfavPos );
                }
                else
                {
                    favorites.addFavoriteAtPos( id, ctfavPos );
                }
            }
        )
    );

    return false;
};
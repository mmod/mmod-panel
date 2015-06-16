/**
 * package: mmod-panel
 * sub-package: lib.mmod.settings
 * author:  Richard B. Winters <a href='mailto:rik@mmogp.com'>rik AT mmogp DOT com</a>
 * copyright: 2011-2015 Massively Modified, Inc.
 * license: Apache, Version 2.0 <http://www.apache.org/licenses/LICENSE-2.0>
 */


// Deps
const eutils = imports.misc.extensionUtils;
const esys = eutils.getCurrentExtension();
const lib = esys.imports.lib;

const conv = esys.imports.convenience;


/**
 * Handles fetching and storing of extension preferences
 *
 * @param v     Gnome-Shell version split into array
 *
 * @since 0.1.0
 */
function rig( v )
{
    this.version = v;
    if( this.version[1] <= 2 )
    {
        this.path = imports.misc.extensionSystem.extensionMeta['mgnome@rik.mmogp.com'].path;
    }
    else
    {
        this.path = esys.path;
    }

    this.init();
}


/**
 * Initializes the rig
 *
 * @since 0.1.0
 */
rig.prototype.init = function()
{
    this.schema = "org.gnome.shell.extensions.mmod-panel";
    this.settings = conv.getSettings( this.schema );
};


/**
 * Undefined method for synchronizing settings to a remote account
 *
 * @since ?
 */
rig.prototype.syncToRemote = function( o )
{
    // Sync settings with mmod account
};


/**
 * Undefined method for synchronizing settings from a remote account
 *
 * @since ?
 */
rig.prototype.syncFromRemote = function()
{
    // Sync settings from mmod account
};


/**
 * Stewards the settings for the extension
 *
 * @param o     Options
 *
 * @return void
 *
 * @since 0.1.0
 */
function steward( o )
{
    // Get a handle on our rig
    if( o.rig )
    {
        this.rig = o.rig;
    }
    else
    {
        this.rig = null;
    }

    this.init( o );
}


/**
 * Initializes the extensions steward
 *
 * @param o     Options
 *
 * @return void
 *
 * @since 0.1.0
 */
steward.prototype.init = function( o )
{
    // Fetch the comfort level and compile comfort settings
    this.comfortLevel = null;
    this.comfortSettings = null;

    // Prepare the worker for the aggregate menu modifications
    this.aggregate = new lib.mmod.aggregate.mod( { rig: o.rig } );

    // Prepare the worker for the panel position modifications
    this.position = new lib.mmod.position.mod( { rig: o.rig } );

    // Prepare the worker for the activities link modifications
    this.activities = new lib.mmod.activities.mod( { rig: o.rig } );

    // Prepare the worker for the favorites display modifications
    this.favorites = new lib.mmod.favorites.mod( { rig: o.rig } );

    // Prepare the worker for the date menu modifications
    this.date = new lib.mmod.date.mod( { rig: o.rig } );

    // Prepare the worker for behavioral modifications to the shell
    this.behavior = new lib.mmod.behavior.mod( { rig: o.rig } );
};


/**
 * Method to load the UI elements/modifications of the extension
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
steward.prototype.modify = function()
{
    if( this.rig.settings.get_boolean( 'mmod-panel-enabled' ) )
    {
        // Load comfort settings
        this.loadComfortSettings();

        // Initialize any modifications to:
        this.aggregate.init();
        this.position.init();
        this.activities.init();
        this.favorites.init();
        this.date.init();
        this.behavior.init();
    }
};


/**
 * Method for removing/disabling UI elements and modifications made by this extension - to the shell - when it was enabled
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
steward.prototype.unmodify = function()
{
    // Destroy any modifications to:
    this.aggregate.destroy();
    this.position.destroy();
    this.activities.destroy();
    this.favorites.destroy();
    this.date.destroy();
    this.behavior.destroy();

    // Reset comfort level settings
    this.comfortLevel = null;
    this.comfortSettings = null;
};


/**
 * Method to load the comfort level settings stored within the rig
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
steward.prototype.loadComfortSettings = function()
{
    this.comfortLevel = this.rig.settings.get_enum( 'comfort-level' );

    let r = null;
    switch( this.comfortLevel )
    {
        case 0:
        {
            // Compact ( 24/16)
            r =
            {
                containerStyle: 'mmod-panel-style-compact',
                containerHeight: 28,
                buttonStyle: 'mmod-panel-button-icon-style-compact',
                favoriteSize: 16
            };
        }break;

        case 2:
        {   // Comfortable ( 48/36 )
            r =
            {
                containerStyle: 'mmod-panel-style-comfortable',
                containerHeight: 52,
                buttonStyle: 'mmod-panel-button-icon-style-comfortable',
                favoriteSize: 44
            };
        }break;

        default:
        {   // Cozy (36/22)
            r =
            {
                containerStyle: 'mmod-panel-style-cozy',
                containerHeight: 36,
                buttonStyle: 'mmod-panel-button-icon-style-cozy',
                favoriteSize: 22
            };
        }break;
    }

    // Because we keep everything instantiated even if disabled, we must update comfort settings manually
    this.comfortSettings = r;
    this.position.comfortSettings = r;
    this.activities.comfortSettings = r;
    this.favorites.comfortSettings = r;
};
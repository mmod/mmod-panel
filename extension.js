/**
 * package: mmod-panel
 * version: 1.1.1-7
 * author:  Richard B. Winters <a href='mailto:rik@mmogp.com'>rik AT mmogp DOT com</a>
 * copyright: 2011-2015 Massively Modified, Inc.
 * license: Apache, Version 2.0 <http://www.apache.org/licenses/LICENSE-2.0>
 */


// Deps
const main = imports.ui.main;

const lang = imports.lang;

const sver = imports.misc.config.PACKAGE_VERSION.split( '.' );

const eutils = imports.misc.extensionUtils;
const esys = eutils.getCurrentExtension();
const lib = esys.imports.lib;


/**
 * Class provides the Entry Point to MMOD-Panel for the Gnome-Shell
 *
 * @since 0.1.0
 */
function mmodge()
{
    this.init();
}


/**
 * Initializes MMOD-Panel
 *
 * @since 0.1.0
 */
mmodge.prototype.init = function()
{
    // Setup some stuffs
    this.rig = new lib.mmod.settings.rig( sver );
    this.steward = new lib.mmod.settings.steward( { rig: this.rig } );

    this.firstRun = false;
    if( this.rig.settings.get_boolean( 'first-run' ) )
    {
        this.firstRun = true;
        this.rig.settings.set_boolean( 'first-run', false );
    }
};


/**
 * Enables MMOD-Panel
 *
 * @since 0.1.0
 */
mmodge.prototype.enable = function()
{
    this.steward.modify();
    this.connect();

    if( this.firstRun )
    {
        this.loadPreferences();
    }
};


/**
 * Disables MMOD-Panel
 */
mmodge.prototype.disable = function( r )
{
    this.disconnect();
    this.steward.unmodify();
};


/**
 * Registers event handlers for the preference window signals so that we can actively
 * extend the shell in real-time without requiring manual restart of the extension
 * by the user
 *
 * @since 0.1.0
 */
mmodge.prototype.connect = function()
{
    this.connections =
    [
         this.rig.settings.connect( 'changed::mmod-panel-enabled', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::comfort-level', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::panel-position', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::show-in-tray-menu', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::panel-button-enabled', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::panel-button-icon', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::panel-button-icon-path', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::display-favorites-enabled', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::show-running-apps', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::favorites-before-preferences', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::date-in-sys-tray', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::autohide-panel', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::autohide-pressure-threshold', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::autohide-delay', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::autohide-animation-time', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::autohide-animation-delay', lang.bind( this, this.onPreferenceChanged ) ),
         this.rig.settings.connect( 'changed::hot-corner-enabled', lang.bind( this, this.onPreferenceChanged ) )
    ];
};


/**
 * Disconnects our event handlers from the signals they are registered to
 *
 * @since 0.1.0
 */
mmodge.prototype.disconnect = function()
{
    if( this.connections )
    {
        this.connections.forEach
        (
            function( connectionId )
            {
                this.rig.settings.disconnect( connectionId );
            },
            this
        );
        this.connections = null;
    }
}


/**
 * Restarts the extension when a preference is changed within the extension preferences
 * window or ai tweak tool, or any other valid method
 *
 * @since 0.1.0
 */
mmodge.prototype.onPreferenceChanged = function()
{
    this.disable();
    this.enable();
};


/**
 * Attempts to launch the extension preferences window for MMOD-Panel for the
 * user
 *
 * @since 0.1.0
 */
mmodge.prototype.loadPreferences = function()
{
    main.Util.trySpawnCommandLine( 'gnome-shell-extension-prefs ' + esys.metadata.uuid );
};


/**
 * Main entry point to the application
 *
 * @returns { mmodge }
 */


function init()
{
    return new mmodge();
}

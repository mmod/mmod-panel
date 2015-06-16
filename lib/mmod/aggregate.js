/**
 * package: mmod-panel
 * sub-package: lib.mmod.aggregate
 * author:  Richard B. Winters <a href='mailto:rik@mmogp.com'>rik AT mmogp DOT com</a>
 * copyright: 2011-2015 Massively Modified, Inc.
 * license: Apache, Version 2.0 <http://www.apache.org/licenses/LICENSE-2.0>
 */


// Deps
const st = imports.gi.St;
const gio = imports.gi.Gio;

const main = imports.ui.main;
const pum = imports.ui.popupMenu;

const lang = imports.lang;

const eutils = imports.misc.extensionUtils;
const esys = eutils.getCurrentExtension();


/**
 * Modification class for creating a menu specific to MMOD Panel within the user or aggregate menu.
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

    this.gicon = null;
    this.icon = null;
    this.popup = null;
    this.menu = null;

    this.connections = null;

    this.active = false;
}


/**
 * Method for adding a menu for MMOD-Panel to the user or aggregate menu
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
mod.prototype.init = function()
{
    if( this.rig.settings.get_boolean( 'show-in-tray-menu' ) )
    {
        // Create a new popup submenu item for the aggregate menu
        this.gicon = gio.icon_new_for_string( this.rig.path + '/res/img/mico/mstar/mmod-logo-fin-24.png' );
        this.icon = new st.Icon( { gicon: this.gicon, style_class: 'popup-menu-icon' } );
        this.popup = new pum.PopupSubMenuMenuItem( 'MMOD-Panel' );
        this.popup.actor.insert_child_at_index( this.icon, 1 ); // Easy insert of an icon into a menu item

        // Create popup menu items for the popup submenu we created
        this.menu = new Object;

        this.menu.preferences = new pum.PopupMenuItem( 'Preferences' );
        this.popup.menu.addMenuItem( this.menu.preferences );

        this.menu.feedback = new pum.PopupMenuItem( 'Feedback' );
        this.popup.menu.addMenuItem( this.menu.feedback );

        // Register our event handlers
        this.connect();

        // Fix for 3.10+ ( https://github.com/hackedbellini/Gnome-Shell-Notifications-Alert/issues/18#issuecomment-28749827 )
        if( main.panel.statusArea.aggregateMenu !== undefined )
        {
            let function_model = function(){ return 1; };
            // Sometimes the extension starts too fast and 9 hasn't loaded yet (i.e. Debian with a 6-core i7 and SSD, other times it just doesn't exist (i.e. Ubuntu)
            for( let i = 9; i >= 0; i-- )
            {
                if( main.panel.statusArea.aggregateMenu.menu._getMenuItems()[i] )
                {
                    if( typeof( main.panel.statusArea.aggregateMenu.menu._getMenuItems()[i].addMenuItem ) === typeof( function_model ) )
                    {
                        main.panel.statusArea.aggregateMenu.menu._getMenuItems()[i].addMenuItem( new pum.PopupSeparatorMenuItem(), 1 );
                        main.panel.statusArea.aggregateMenu.menu._getMenuItems()[i].addMenuItem( this.popup, 2 );

                        i = -1;
                    }
                    else
                    {
                        log( '[MMOD Panel]: Could not find a point of entry to the Aggregate Menu.' );
                    }
                }
            }
        }
        else
        {
            // Should work in 3.8
            main.panel.statusArea.userMenu.menu.addMenuItem( this.popup, 5 );
        }

        this.active = true;
    }
};


/**
 * Method for removing the menu for MMOD Panel from the user or aggregate menu
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
        this.disconnect();

        if( this.popup )
        {
            this.popup.destroy();
            this.popup = null;
        }

        if( this.menu )
        {
            for( let i in this.menu )
            {
                this.menu[i].destroy();
                this.menu[i] = null;
            }

            this.menu = null;
        }

        if( this.icon )
        {
            this.icon.destroy();
            this.icon = null;
        }

        if( this.gicon )
        {
            this.gicon = null;
        }

        this.active = false;
    }
};


/**
 * Method to register event handlers for the menu items
 *
 * @since 0.1.0
 */
mod.prototype.connect = function()
{
    this.connections =
    [
         [
             this.menu.preferences, this.menu.preferences.connect( 'activate', lang.bind( this, this.loadPreferences ) )
         ],
         [
             this.menu.feedback, this.menu.feedback.connect( 'activate', lang.bind( this, this.loadFeedback ) )
         ]
    ];
};


/**
 * Method to remove event handlers for the menu items
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
 * Method to attempt loading the extension preferences window for the
 * user
 *
 * @since 0.1.0
 */
mod.prototype.loadPreferences = function()
{
    main.Util.trySpawnCommandLine( 'gnome-shell-extension-prefs ' + esys.metadata.uuid );
};


/**
 * Method to attempt loading the default browser and directing the user to
 * the mmogp.com home page
 *
 * @since 0.1.0
 */
mod.prototype.loadFeedback = function()
{
    main.Util.trySpawnCommandLine( 'xdg-open http://www.mmogp.com' );
};
/**
 * package: mmod-panel
 * sub-package: lib.mmod.date
 * author:  Richard B. Winters <a href='mailto:rik@mmogp.com'>rik AT mmogp DOT com</a>
 * copyright: 2011-2015 Massively Modified, Inc.
 * license: Apache, Version 2.0 <http://www.apache.org/licenses/LICENSE-2.0>
 */


// Deps
const main = imports.ui.main;

const lang = imports.lang;


/**
 * Modification class for repositioning the Date Menu within the panel
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

    this.panelBox = main.panel.actor.get_parent();

    this.menu = main.panel.statusArea.dateMenu;
    this.cbox = main.panel._centerBox;
    this.rbox = main.panel._rightBox;

    this.realize = -1;

    this.active = false;
}


/**
 * Method for moving the date menu to the right of the user/aggregate menu
 *
 * @args none
 *
 * @return void
 *
 * @since 0.1.0
 */
mod.prototype.init = function()
{
    if( this.rig.settings.get_boolean( 'date-in-sys-tray' ) )
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

        this.menu.actor.reparent( this.rbox );
        this.menu.inTray = true;
    }
    else
    {
        this.menu.inTray = false;
    }

    this.active = true;
};


/**
 * Method for repositioning the date menu back to its rightful place within the centerbox of the panel
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
        if( this.menu.inTray )
        {
            this.menu.actor.reparent( this.cbox );
            this.menu.inTray = null;
        }

        delete this.menu.inTray;

        this.active = false;
    }

    // With date and all modifications relying on realize, we will set realize to 0 upon disable
    // so that if by default the extension did not initialize, but was enabled after the panelBox was
    // realized; it will initialize properly. Remember disable will run before enable is called after
    // realization and an extension preference is changed or disabled/re-enabled.
    this.realize = 0;
};
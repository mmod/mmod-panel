/**
 * package: mmod-panel
 * sub-package: lib.mmod.position
 * author:  Richard B. Winters <a href='mailto:rik@mmogp.com'>rik AT mmogp DOT com</a>
 * copyright: 2011-2015 Massively Modified, Inc.
 * license: Apache, Version 2.0 <http://www.apache.org/licenses/LICENSE-2.0>
 */


// Deps
const main = imports.ui.main;

const lang = imports.lang;


// Defines
const EDGE_BOTTOM = 0;
const EDGE_TOP = 1;


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
    this.box = main.panel.actor.get_parent();
    this.monitor = main.layoutManager.primaryMonitor;

    this.realize = -1;

    this.active = false;
}


mod.prototype.init = function()
{
    // Apply style modifications first so that we get proper the height calculated for bottom positioning
    main.panel._addStyleClassName( this.comfortSettings.containerStyle );

    // Handle realize if applicable
    if( this.realize < 0 )
    {   // Shell/Extension has just initialized
        this.realize = this.box.connect( 'realize', lang.bind( this, this.init ) );

        // Do not allow the method to continue
        return;
    }

    if( this.realize > 0 )
    {   // This is the second invocation, called after realization of the panelBox
        this.box.disconnect( this.realize );
        this.realize = 0;
    }

    let e = this.rig.settings.get_enum( 'panel-position' );
    switch( e )
    {
        case EDGE_BOTTOM:
        {
            this.box.set_y( this.monitor.height - ( this.box.get_height() ) );
        }break;

        case EDGE_TOP:
        {
            this.box.set_y( this.monitor.y );
        }break;
    }

    main.panel.edge = e;
    this.active = true;
};


mod.prototype.destroy = function()
{
    if( this.active )
    {
        // Replace the panelBox to its rightful position
        this.box.set_y( this.monitor.y );

        // Remove styling over-ride applied to the panel
        main.panel._removeStyleClassName( this.comfortSettings.containerStyle );

        // Delete our custom property inside of Main.panel
        delete main.panel.edge;
        this.active = false;
    }

    this.realize = 0;
};

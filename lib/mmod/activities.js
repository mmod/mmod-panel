/**
 * package: mmod-panel
 * sub-package: lib.mmod.activities
 * author:  Richard B. Winters <a href='mailto:rik@mmogp.com'>rik AT mmogp DOT com</a>
 * copyright: 2011-2015 Massively Modified, Inc.
 * license: Apache, Version 2.0 <http://www.apache.org/licenses/LICENSE-2.0>
 */


// Deps
const st = imports.gi.St;
const gio = imports.gi.Gio;

const main = imports.ui.main;

const lang = imports.lang;

/**
 * activities.link class modifies the activities link on the panel
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

    this.panelBox = main.panel.actor.get_parent();
    this.activities = main.panel.statusArea.activities;
    this.originalLabel = null;

    this.realize = -1;

    this.active = false;
}


/**
 * Initializes the modifications to the activities link on the panel
 *
 * @since 0.1.0
 */
mod.prototype.init = function()
{

    if( this.rig.settings.get_boolean( 'panel-button-enabled' ) )
    {
        // Handle realize if applicable
        if( this.realize < 0 )
        {   // Shell/Extension has just initialized
            this.realize = this.panelBox.connect( 'realize', lang.bind( this, this.init ) );

            // Do not allow the method to continue
            return;
        }

        if( this.realize > 0 )
        {   // This is the second invocation, called after realization of the panelBox
            this.panelBox.disconnect( this.realize );
            this.realize = 0;
        }

        this.button = new st.Bin                                // The panel button like a windows 'start' button
        (
            {
                style_class: 'panel-button mmod-panel-button-style',
                reactive: true,
                can_focus: true,
                x_fill: false,
                y_fill: false,
                track_hover: false
            }
        );

        // Replaces Activities Link
        this.icon = new st.Icon
        (
            {
                gicon: gio.icon_new_for_string( this.rig.settings.get_string( 'panel-button-icon-path' ) ),
                style_class: this.comfortSettings.buttonStyle
            }
        );

        this.button.set_child( this.icon );

        this.originalLabel = this.activities.actor.get_children()[0];  // Get a handle on the original clutter text used for the link
        this.activities.actor.remove_child( this.originalLabel );      // Remove it
        this.activities.actor.add_child( this.button );                // Replace it

        this.active = true;
    }
};


/**
 * Removes the modifications to the activities link on the panel
 *
 * @since 0.1.0
 */
mod.prototype.destroy = function()
{
    if( this.active )
    {
        this.activities.actor.remove_child( this.button );        // Remove our replacement
        this.activities.actor.add_child( this.originalLabel );     // And replace the original

        if( this.button )
        {   // Should get rid of our icon as well
            this.button.destroy();
            this.button = null;
            this.icon = null;
        }

        if( this.originalLabel )
        {
            this.originalLabel = null;
        }

        this.active = false;
    }

    // With activities and all modifications relying on realize, we will set realize to 0 upon disable
    // so that if by default the extension did not initialize, but was enabled after the panelBox was
    // realized; it will initialize properly. Remember disable will run before enable is called after
    // realization and an extension preference is changed or disabled/re-enabled.
    this.realize = 0;
};
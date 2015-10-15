/**
 * package: mmod-panel
 * sub-package: preferences
 * author:  Richard B. Winters <a href='mailto:rik@mmogp.com'>rik AT mmogp DOT com</a>
 * copyright: 2011-2015 Massively Modified, Inc.
 * license: Apache, Version 2.0 <http://www.apache.org/licenses/LICENSE-2.0>
 */

const gio = imports.gi.Gio;
const gdk = imports.gi.Gdk;
const gdkpb = imports.gi.GdkPixbuf;
const gobject = imports.gi.GObject;
const gtk = imports.gi.Gtk;

const lang = imports.lang;
const gt = imports.gettext.domain( 'mmod-panel' );
const _ = gt.gettext;

const config = imports.misc.config;
const sver = imports.misc.config.PACKAGE_VERSION.split( "." ).map( function ( x ) { return + x; } );

const eutils = imports.misc.extensionUtils;
const ext = eutils.getCurrentExtension();
const conv = ext.imports.convenience;
const lib = ext.imports.lib;

const mver = '1.1.1-7';

const schema = "org.gnome.shell.extensions.mmod-panel";

//Edges
const EDGE_TOP      = 0;
const EDGE_BOTTOM   = 1;
const EDGE_LEFT     = 2;
const EDGE_RIGHT    = 3;

//const RESETCOLOR = 'rgba(0,0,0,0)';
//const BLACKCOLOR = 'rgba(0,0,0,1)';
const ICON_LOGO = ext.path + '/res/img/mico/mmod-plain-96-20.png';
const ICON_M4IKEN = ext.path + '/res/img/mico/mstar/mmod-logo-fin-24.png';
const ICON_M4IKEN_RED = ext.path + '/res/img/mico/mstar/mmod-logo-red-24.png';
const ICON_DONATE = ext.path + '/res/img/ppico/donate/btn_donate_LG.gif';
const ICON_GMAIL = ext.path + '/res/img/gico/gmail/gmail-24.png';
const ICON_EMAIL = ext.path + '/res/img/generic/email/email-24.png';
const ICON_GNOME = ext.path + '/res/img/gnico/gnome/gnome-24.png';
const ICON_GLOOK = ext.path + '/res/img/gnico/gnome/gnome-24.png';


/**
 * Init
 *
 * @since 0.1.0
 */
function init()
{
    initTranslations( "mmod-panel" );
}




/**
 * Initialize Gettext to load translations from extensionsdir/locale.
 *
 * [NOTE]
 * If the domain is not provided, it will be taken from metadata['gettext-domain']
 *
 * @param string d     Optional gettext domain to use
 *
 * @return void
 *
 * @since 0.1.0
 */
function initTranslations( d )
{
    let extension = eutils.getCurrentExtension();

    d = d || ext.metadata['gettext-domain'];

    // check if this extension was built with "make zip-file", and thus
    // has the locale files in a subfolder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell
    let ld = ext.dir.get_child( 'locale' );
    if( ld.query_exists( null ) )
    {
        imports.gettext.bindtextdomain( d, ld.get_path() );
    }
    else
    {
        imports.gettext.bindtextdomain( d, config.LOCALEDIR );
    }
}




/**
 * Returns a widget to Gnome Extensions Preferences
 *
 * @since 0.1.0
 */
function buildPrefsWidget()
{
    let prefs = new preferences( schema );
    return prefs.buildPrefsWidget();
}




/**
 * Preferences class
 *
 * @param s     schema
 *
 * @since 0.1.0
 */
function preferences( s )
{
    this.init( s );
}


preferences.prototype =
{
    settings: null,

    init: function( s )
    {
        this.settings = conv.getSettings( s );
    },

    buildPrefsWidget: function()
    {
        this.notebook = new gtk.Notebook();
        this.notebook.set_scrollable( true );
        this.newValueAppearance = null;
        this.oldValueAppearance = null;


        this.gridGPreferences = new gtk.Grid();
        this.gridGPreferences.set_column_homogeneous( false );
        //this.gridGPreferences.set_hexpand( false );
        this.gridGPreferences.margin = this.gridGPreferences.row_spacing = 10;
        this.gridGPreferences.column_spacing = 2;
        this.scrollWindowGPreferences = new gtk.ScrolledWindow(
        {
            'hscrollbar-policy': gtk.PolicyType.AUTOMATIC,
            'vscrollbar-policy': gtk.PolicyType.AUTOMATIC,
            'hexpand': true, 'vexpand': true
        });
        this.scrollWindowGPreferences.add( this.gridGPreferences );     // add_with_viewport has been deprecated since 3.8 (https://developer.gnome.org/gtk3/stable/GtkScrolledWindow.html#gtk-scrolled-window-add-with-viewport)
        this.scrollWindowGPreferences.show_all();
        this.labelGeneral = new gtk.Label( { label: _( "General" ) } );    // Tab
        this.notebook.append_page( this.scrollWindowGPreferences, this.labelGeneral );


        // General panel and associated settings
        this.labelPanel = new gtk.Label( { label: _( "MMod Panel " ), xalign: 0 } );     // Menu Item    drop-down
        this.valuePanelBox = new gtk.Box( { hexpand: false, vexpand: false } );
        this.valuePanel = new gtk.Switch( { active: this.settings.get_boolean( "mmod-panel-enabled" ), vexpand: false } );
        this.valuePanel.connect( 'notify::active', lang.bind( this, this.changePanelSetting ) );
        this.valuePanelBox.add( this.labelPanel );
        this.valuePanelBox.add( this.valuePanel );
        this.gridGPreferences.attach( this.valuePanelBox, 1, 1, 1, 1 );

        // Panel comfort settings
        this.labelComfort = new gtk.Label( { label: _( "Comfort level " ), xalign: 0 } );     // Menu Item    drop-down
        this.gridGPreferences.attach( this.labelComfort, 3, 1, 1, 1 );
        this.valueComfort = new gtk.ComboBoxText();
        this.valueComfort.append_text( _( "Compact" ) );
        this.valueComfort.append_text( _( "Cozy" ) );
        this.valueComfort.append_text( _( "Comfortable" ) );
        this.valueComfort.set_active( this.settings.get_enum( "comfort-level" ) );
        this.valueComfort.connect( 'changed', lang.bind( this, this.changeComfortLevel ) );
        this.gridGPreferences.attach( this.valueComfort, 4, 1, 2, 1 );

        // Panel position setting
        this.labelPanelPosition = new gtk.Label( { label: _( "Position " ), xalign: 1 } );
        this.gridGPreferences.attach( this.labelPanelPosition, 3, 2, 1, 1 );
        this.valuePanelPosition = new gtk.ComboBoxText();
        this.valuePanelPosition.append_text( _( "Bottom" ) );
        this.valuePanelPosition.append_text( _( "Top" ) );
        this.valuePanelPosition.set_active( this.settings.get_enum( "panel-position" ) );
        this.valuePanelPosition.connect( 'changed', lang.bind( this, this.changePanelPosition ) );
        this.gridGPreferences.attach( this.valuePanelPosition, 4, 2, 2, 1 );

        // Show in menu tray setting
        this.valueShowInTrayMenuBox = new gtk.Box( { hexpand: false } );
        this.valueShowInTrayMenu = new gtk.CheckButton( { label: _( "Menu in tray menu" ), active: this.settings.get_boolean( "show-in-tray-menu" ) } );
        this.valueShowInTrayMenu.connect( 'notify::active', lang.bind( this, this.changeShowInTrayMenu ) );
        this.valueShowInTrayMenuBox.add( this.valueShowInTrayMenu );
        this.gridGPreferences.attach( this.valueShowInTrayMenuBox, 4, 3, 1, 1 );

        // Add a little space between setting groups so that we don't confuse the end user
        this.pbssep = new gtk.Box( { hexpand: false } );
        this.pbssep.add( new gtk.Label( { label: "\t" } ) );
        this.gridGPreferences.attach( this.pbssep, 1, 4, 1, 1 );

        // Panel Button and associated settings
        this.labelPanelButton = new gtk.Label( { label: _( "Panel button " ), xalign: 0 } );    // Menu Item    switch
        this.valuePanelButtonBox = new gtk.Box( { hexpand: false } );   // Place switch in gtk.Box with no hexpand, allows it to align left.
        this.valuePanelButton = new gtk.Switch( { active: this.settings.get_boolean( "panel-button-enabled" ) } );
        this.valuePanelButton.connect( 'notify::active', lang.bind( this, this.changePanelButton ) );
        this.valuePanelButtonBox.add( this.labelPanelButton );
        this.valuePanelButtonBox.add( this.valuePanelButton );
        this.gridGPreferences.attach( this.valuePanelButtonBox, 1, 5, 1, 1 );

        // Associated menu item     Panel button icon
        this.labelPanelButtonIcon = new gtk.Label( { label: _( "Icon " ), xalign: 1 } );     // Menu Item    drop-down
        this.gridGPreferences.attach( this.labelPanelButtonIcon, 3, 5, 1, 1 );

        // Drop down for Panel button icon
        this.valuePanelButtonIcon = new gtk.ComboBoxText();
        this.valuePanelButtonIcon.append_text( _( "M4Iken" ) );
        this.valuePanelButtonIcon.append_text( _( "Apps" ) );
        this.valuePanelButtonIcon.append_text( _( "Debian" ) );
        this.valuePanelButtonIcon.append_text( _( "Fedora" ) );
        let cicon = this.settings.get_enum( "panel-button-icon" );
        if( cicon === 4 )
        {
            this.valuePanelButtonIcon.append_text( _( "Custom" ) );
        }
        this.valuePanelButtonIcon.set_active( cicon );
        this.valuePanelButtonIcon.connect( 'changed', lang.bind( this, this.changePanelButtonIcon ) );
        //this.valuePanelButtonIconBox.add( this.valuePanelButtonIcon );
        this.gridGPreferences.attach( this.valuePanelButtonIcon, 4, 5, 2, 1 );

        // Associated menu item     Custom Panel Button Icon & Preview
        this.customPanelButtonIconFilename = this.settings.get_string( "panel-button-icon-path" );
        this.dipath = this.customPanelButtonIconFilename;
        this.valueCustomPanelButtonIcon = new gtk.Image();
        this.loadCustomPanelButtonIcon();
        this.valueCustomPanelButtonIconBox = new gtk.Box( { hexpand: false } );
        this.valueCustomPanelButtonIcon2 = new gtk.Button( { image: this.valueCustomPanelButtonIcon, hexpand: false } );
        this.valueCustomPanelButtonIcon2.connect( 'clicked', lang.bind( this, this.changeCustomPanelButtonIcon ) );
        this.valueCustomPanelButtonIconBox.add( this.valueCustomPanelButtonIcon2 );
        this.gridGPreferences.attach( this.valueCustomPanelButtonIconBox, 4, 6, 2, 1 );


        // Add a little space between setting groups so that we don't confuse the end user
        this.pbissep = new gtk.Box( { hexpand: false } );
        this.pbissep.add( new gtk.Label( { label: "\t" } ) );
        this.gridGPreferences.attach( this.pbissep, 1, 7, 1, 1 );


        // Associated menu item     Display favorites
        this.labelDisplayFavorites = new gtk.Label( { label: _( "Display favorites " ), xalign: 0 } );    // Menu Item
        this.gridGPreferences.attach( this.labelDisplayFavorites, 1, 8, 1, 1 );
        this.valueDisplayFavoritesBox = new gtk.Box( { hexpand: false } );
        this.valueDisplayFavorites = new gtk.Switch( { active: this.settings.get_boolean( "display-favorites-enabled" ) } );
        this.valueDisplayFavorites.connect( 'notify::active', lang.bind( this, this.changeDisplayFavorites ) );
        this.valueDisplayFavoritesBox.add( this.valueDisplayFavorites );
        this.gridGPreferences.attach( this.valueDisplayFavoritesBox, 4, 8, 1, 1 );

        this.valueShowRunningAppsBox = new gtk.Box( { hexpand: false } );
        this.valueShowRunningApps = new gtk.CheckButton( { label: _( "Show running" ), active: this.settings.get_boolean( "show-running-apps" ) } );
        this.valueShowRunningApps.connect( 'notify::active', lang.bind( this, this.changeShowRunningApps ) );
        this.valueShowRunningAppsBox.add( this.valueShowRunningApps );
        this.gridGPreferences.attach( this.valueShowRunningAppsBox, 4, 9, 1, 1 );

        this.valueShowFavsBeforePrefsBox = new gtk.Box( { hexpand: false } );
        this.valueShowFavsBeforePrefs = new gtk.CheckButton( { label: _( "Before prefs" ), active: this.settings.get_boolean( "favorites-before-preferences" ) } );
        this.valueShowFavsBeforePrefs.connect( 'notify::active', lang.bind( this, this.changeShowFavsBeforePrefs ) );
        this.valueShowFavsBeforePrefsBox.add( this.valueShowFavsBeforePrefs );
        this.gridGPreferences.attach( this.valueShowFavsBeforePrefsBox, 4, 10, 1, 1 );

        // Add a little space between setting groups so that we don't confuse the end user
        this.ditssep = new gtk.Box( { hexpand: false } );
        this.ditssep.add( new gtk.Label( { label: "\t" } ) );
        this.gridGPreferences.attach( this.ditssep, 1, 11, 1, 1 );

        // Associated menu item     Display date in tray area
        this.labelDateInTray = new gtk.Label( { label: _( "Show date in tray" ), xalign: 0 } );    // Menu Item
        this.gridGPreferences.attach( this.labelDateInTray, 1, 12, 1, 1 );
        this.valueDateInTrayBox = new gtk.Box( { hexpand: false } );
        this.valueDateInTray = new gtk.Switch( { active: this.settings.get_boolean( "date-in-sys-tray" ) } );
        this.valueDateInTray.connect( 'notify::active', lang.bind( this, this.changeDateInTray ) );
        this.valueDateInTrayBox.add( this.valueDateInTray );
        this.gridGPreferences.attach( this.valueDateInTrayBox, 4, 12, 1, 1 );

        // Tab footer / page number
        let labelSpaceGPreferences0 = new gtk.Label( { label: "\t", xalign: 0 } );
        this.gridGPreferences.attach( labelSpaceGPreferences0, 0, 13, 1, 1 );
        let labelSpaceGPreferences2 = new gtk.Label( { label: "\t", xalign: 0, hexpand: true } );
        this.gridGPreferences.attach( labelSpaceGPreferences2, 2, 13, 1, 1 );
        let labelSpaceGPreferences3 = new gtk.Label( { label: "\t", xalign: 0, hexpand: false } );
        this.gridGPreferences.attach( labelSpaceGPreferences3, 3, 13, 1, 1 );
        let labelSpaceGPreferences5 = new gtk.Label( { label: "1/3", xalign: 1 } );
        this.gridGPreferences.attach( labelSpaceGPreferences5, 5, 13, 1, 1 );
        let labelSpaceGPreferences6 = new gtk.Label( { label: "\t", xalign: 0 } );
        this.gridGPreferences.attach( labelSpaceGPreferences6, 6, 13, 1, 1 );


        // Behavior tab
        this.gridBPreferences = new gtk.Grid();
        this.gridBPreferences.set_column_homogeneous( false );
        this.gridBPreferences.margin = this.gridBPreferences.row_spacing = 10;
        this.gridBPreferences.column_spacing = 2;
        this.scrollWindowBPreferences = new gtk.ScrolledWindow(
        {
            'hscrollbar-policy': gtk.PolicyType.AUTOMATIC,
            'vscrollbar-policy': gtk.PolicyType.AUTOMATIC,
            'hexpand': true, 'vexpand': true
        });
        this.scrollWindowBPreferences.add( this.gridBPreferences );     // add_with_viewport has been deprecated since 3.8 (https://developer.gnome.org/gtk3/stable/GtkScrolledWindow.html#gtk-scrolled-window-add-with-viewport)
        this.scrollWindowBPreferences.show_all();
        this.labelBehavior = new gtk.Label( { label: _( "Behavior" ) } );    // Tab
        this.notebook.append_page( this.scrollWindowBPreferences, this.labelBehavior );

        // Auto-hide settings
        this.labelAutohide = new gtk.Label( { label: _( "Auto-hide panel " ), xalign: 0 } );    // Menu Item    switch
        this.valueAutohideBox = new gtk.Box( { hexpand: false } );   // Place switch in gtk.Box with no hexpand, allows it to align left.
        this.valueAutohide = new gtk.Switch( { active: this.settings.get_boolean( "autohide-panel" ) } );
        this.valueAutohide.connect( 'notify::active', lang.bind( this, this.changeAutohide ) );
        this.valueAutohideBox.add( this.labelAutohide );
        this.valueAutohideBox.add( this.valueAutohide );
        this.gridBPreferences.attach( this.valueAutohideBox, 1, 1, 1, 1 );

        // Associated menu item - pressure threshold
        this.labelPressure = new gtk.Label( { label: _( "Pressure " ), xalign: 1 } );     // Menu Item    drop-down
        this.gridBPreferences.attach( this.labelPressure, 3, 1, 1, 1 );
        this.valuePressure = new gtk.SpinButton( { halign: gtk.Align.START, margin_top: 0 } );
        this.valuePressure.set_sensitive( true );
        this.valuePressure.set_range( 10, 500 );
        this.valuePressure.set_value( this.settings.get_double( "autohide-pressure-threshold") * 1 );
        this.valuePressure.set_increments( 10, 20 );
        this.valuePressure.connect
        (
            'value-changed',
            lang.bind
            (
                this,
                function( b )
                {
                    let s = b.get_value_as_int() / 1;
                    this.settings.set_double( "autohide-pressure-threshold", s );
                }
            )
        );
        this.gridBPreferences.attach( this.valuePressure, 4, 1, 1, 1 );

        // Associated menu item - auto-hide delay
        this.labelAutohideDelay = new gtk.Label( { label: _( "Auto-hide delay " ), xalign: 1 } );     // Menu Item    drop-down
        this.gridBPreferences.attach( this.labelAutohideDelay, 3, 2, 1, 1 );
        this.valueAutohideDelay = new gtk.SpinButton( { halign: gtk.Align.START, margin_top: 0 } );
        this.valueAutohideDelay.set_sensitive( true );
        this.valueAutohideDelay.set_range( 0, 10 );
        this.valueAutohideDelay.set_value( this.settings.get_double( "autohide-delay" ) * 1 );
        this.valueAutohideDelay.set_increments( 1, 2 );
        this.valueAutohideDelay.connect
        (
            'value-changed',
            lang.bind
            (
                this,
                function( b )
                {
                    let d = b.get_value_as_int() / 1;
                    this.settings.set_double( "autohide-delay", d );
                }
            )
        );
        this.gridBPreferences.attach( this.valueAutohideDelay, 4, 2, 1, 1 );

        // Associated menu item - auto-hide animation time
        this.labelAutohideAnimationTime = new gtk.Label( { label: _( "Animation time " ), xalign: 1 } );     // Menu Item    drop-down
        this.gridBPreferences.attach( this.labelAutohideAnimationTime, 3, 3, 1, 1 );
        this.valueAutohideAnimationTime = new gtk.SpinButton( { halign: gtk.Align.START, margin_top: 0 } );
        this.valueAutohideAnimationTime.set_sensitive( true );
        this.valueAutohideAnimationTime.set_range( 0, 3 );
        this.valueAutohideAnimationTime.set_value( this.settings.get_double( "autohide-animation-time" ) * 1 );
        this.valueAutohideAnimationTime.set_increments( 1, 2 );
        this.valueAutohideAnimationTime.connect
        (
            'value-changed',
            lang.bind
            (
                this,
                function( b )
                {
                    let t = b.get_value_as_int() / 1;
                    this.settings.set_double( "autohide-animation-time", t );
                }
            )
        );
        this.gridBPreferences.attach( this.valueAutohideAnimationTime, 4, 3, 1, 1 );

        // Associated menu item - auto-hide animation delay
        this.labelAutohideAnimationDelay = new gtk.Label( { label: _( "Animation delay " ), xalign: 1 } );     // Menu Item    drop-down
        this.gridBPreferences.attach( this.labelAutohideAnimationDelay, 3, 4, 1, 1 );
        this.valueAutohideAnimationDelay = new gtk.SpinButton( { halign: gtk.Align.START, margin_top: 0 } );
        this.valueAutohideAnimationDelay.set_sensitive( true );
        this.valueAutohideAnimationDelay.set_range( 0, 5 );
        this.valueAutohideAnimationDelay.set_value( this.settings.get_double( "autohide-animation-delay" ) * 1 );
        this.valueAutohideAnimationDelay.set_increments( 1, 2 );
        this.valueAutohideAnimationDelay.connect
        (
            'value-changed',
            lang.bind
            (
                this,
                function( b )
                {
                    let d = b.get_value_as_int() / 1;
                    this.settings.set_double( "autohide-animation-delay", d );
                }
            )
        );
        this.gridBPreferences.attach( this.valueAutohideAnimationDelay, 4, 4, 1, 1 );

        // Add a little space between setting groups so that we don't confuse the end user
        this.hcssep = new gtk.Box( { hexpand: false } );
        this.hcssep.add( new gtk.Label( { label: "\t" } ) );
        this.gridBPreferences.attach( this.hcssep, 1, 5, 1, 1 );

        // Enabled hot corner settings
        this.labelEnableHotCorner = new gtk.Label( { label: _( "Hot corner enabled" ), xalign: 0 } );    // Menu Item
        this.gridBPreferences.attach( this.labelEnableHotCorner, 1, 6, 1, 1 );

        // Is the switch for the enable hot corner settings
        this.valueEnableHotCornerBox = new gtk.Box( { hexpand: false } );
        this.valueEnableHotCorner = new gtk.Switch( { active: this.settings.get_boolean( "hot-corner-enabled" ) } );
        this.valueEnableHotCorner.connect( 'notify::active', lang.bind( this, this.changeEnableHotCorner ) );
        this.valueEnableHotCornerBox.add( this.valueEnableHotCorner );
        this.gridBPreferences.attach( this.valueEnableHotCornerBox, 4, 6, 1, 1 );

        // Tab footer / page number for the behavior tab
        let labelSpaceBPreferences0 = new gtk.Label( { label: "\t", xalign: 0 } );
        this.gridBPreferences.attach( labelSpaceBPreferences0, 0, 7, 1, 1 );
        let labelSpaceBPreferences2 = new gtk.Label( { label: "\t", xalign: 0, hexpand: true } );
        this.gridBPreferences.attach( labelSpaceBPreferences2, 2, 7, 1, 1 );
        let labelSpaceBPreferences3 = new gtk.Label( { label: "\t", xalign: 0, hexpand: false } );
        this.gridBPreferences.attach( labelSpaceBPreferences3, 3, 7, 1, 1 );
        let labelSpaceBPreferences5 = new gtk.Label( { label: "2/3", xalign: 1 } );
        this.gridBPreferences.attach( labelSpaceBPreferences5, 5, 7, 1, 1 );
        let labelSpaceBPreferences6 = new gtk.Label( { label: "\t", xalign: 0 } );
        this.gridBPreferences.attach( labelSpaceBPreferences6, 6, 7, 1, 1 );


        this.gridAbout = new gtk.Grid();     // New tab
        this.gridAbout.set_column_homogeneous( false );
        this.gridAbout.margin = this.gridAbout.row_spacing = 10;
        this.gridAbout.column_spacing = 2;
        this.scrollWindowAbout = new gtk.ScrolledWindow(
        {
            'hscrollbar-policy': gtk.PolicyType.AUTOMATIC,
            'vscrollbar-policy': gtk.PolicyType.AUTOMATIC,
            'hexpand': true, 'vexpand': true
        });
        this.scrollWindowAbout.add( this.gridAbout );     // add_with_viewport has been deprecated since 3.8 (https://developer.gnome.org/gtk3/stable/GtkScrolledWindow.html#gtk-scrolled-window-add-with-viewport)
        this.scrollWindowAbout.show_all();
        this.labelAbout = new gtk.Label( { label: _( "About" ) } );    // Tab
        this.notebook.append_page( this.scrollWindowAbout, this.labelAbout );


        //https://mail.google.com/mail/?extsrc=mailto&url=mailto:support@mmogp.com?subject=Feedback/Suggestions%20for%20MMOD%20Gnome
        //https://mail.google.com/mail/?extsrc=mailto&url=mailto:support@mmogp.com?subject=Issue/Bug%20for%20MMOD%20Gnome:%20
        this.linkMMODHomeImage = new gtk.Image( { file: ICON_LOGO } );
        this.linkMMODPanelRepoImage = new gtk.Image( { file: ICON_M4IKEN } );
        this.linkMMODPanelIssueImage = new gtk.Image( { file: ICON_M4IKEN_RED } );
        this.linkGLHomeImage = new gtk.Image( { file: ICON_GLOOK } );
        this.linkDonateImage = new gtk.Image( { file: ICON_DONATE } );
        this.linkMMODGFeedbackImage = new gtk.Image( { file: ICON_GMAIL } );
        this.linkMMODEFeedbackImage = new gtk.Image( { file: ICON_EMAIL } );
        this.linkGnomeImage = new gtk.Image( { file: ICON_GNOME } );

        this.labelMMODHomeLink = new gtk.LinkButton
        (
            {
                image: this.linkMMODHomeImage,
                //label: " .",
                uri: "http://www.mmogp.com",
                xalign: 0,
                hexpand: false
            }
        );
        if( sver[1] !== 4 )
        {
            this.labelMMODHomeLink.set_always_show_image( true );
        }
        this.gridAbout.attach( this.labelMMODHomeLink, 0, 0, 1, 1 );

        this.labelMMODPanelVersion = new gtk.Label( { label: _( "MMOD-Panel v" ) + mver, xalign: 1, hexpand: false } );
        this.gridAbout.attach( this.labelMMODPanelVersion, 3, 0, 1, 1 );

        let labelSpaceGPreferencesXX = new gtk.Label( { label: "\t\t\t\t", xalign: 1 } );
        this.gridAbout.attach( labelSpaceGPreferencesXX, 2, 1, 1, 1 );

        this.labelMMODPanelRepoLink = new gtk.LinkButton
        (
            {
                image: this.linkMMODPanelRepoImage,
                label: " MMOD Git Repository",
                uri: "https://code.mmogp.com/mmod/mmod-panel",
                xalign: 0,
                hexpand: false
            }
        );
        if( sver[1] !== 4 )
        {
            this.labelMMODPanelRepoLink.set_always_show_image( true );
        }
        this.gridAbout.attach( this.labelMMODPanelRepoLink, 3, 1, 1, 1 );

        this.labelGLHomeLink = new gtk.LinkButton
        (
            {
                image: this.linkGLHomeImage,
                label: " gnome-look.org",
                uri: "https://extensions.gnome.org/extension/898/mmod-panel",
                xalign: 0,
                hexpand: false
            }
        );
        if( sver[1] !== 4 )
        {
            this.labelGLHomeLink.set_always_show_image( true );
        }
        this.gridAbout.attach( this.labelGLHomeLink, 3, 2, 1, 1 );

        this.labelMMODPanelIssueLink = new gtk.LinkButton
        (
            {
                image: this.linkMMODPanelIssueImage,
                label: " Report an issue",
                uri: "https://code.mmogp.com/mmod/mmod-panel/issues",
                xalign: 0,
                hexpand: false
            }
        );
        if( sver[1] !== 4 )
        {
            this.labelMMODPanelIssueLink.set_always_show_image( true );
        }
        this.gridAbout.attach( this.labelMMODPanelIssueLink, 3, 3, 1, 1 );

        this.labelDonateLink = new gtk.LinkButton
        (
            {
                image: this.linkDonateImage,
                //label: " Donate",
                uri: "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=H6QJC5JS7PEAC",
                xalign: 0,
                hexpand: false
            }
        );
        if( sver[1] !== 4 )
        {
            this.labelDonateLink.set_always_show_image( true );
        }
        this.gridAbout.attach( this.labelDonateLink, 0, 4, 1, 1 );

        this.emailMeBox = new gtk.Box( { hexpand: true } );
        this.labelGmailMeLink = new gtk.LinkButton
        (
            {
                image: this.linkMMODGFeedbackImage,
                label: " Gmail me",
                uri: "https://mail.google.com/mail/?extsrc=mailto&url=mailto:support@mmogp.com?subject=Feedback/Suggestions%20for%20MMOD%20Panel",
                xalign: 0,
                hexpand: false
            }
        );
        if( sver[1] !== 4 )
        {
            this.labelGmailMeLink.set_always_show_image( true );
        }
        //this.gridAbout.attach( this.labelGmailMeLink, 3, 6, 1, 1 );

        this.labelEmailMeLink = new gtk.LinkButton
        (
            {
                image: this.linkMMODEFeedbackImage,
                label: " Email me",
                uri: "mailto:support@mmogp.com?subject=Feedback/Suggestions%20for%20MMOD%20Panel&Body=mmod-panel%20v0.1.0:\n\n",
                xalign: 0,
                hexpand: false
            }
        );
        if( sver[1] !== 4 )
        {
            this.labelEmailMeLink.set_always_show_image( true );
        }

        this.emailMeBox.add( this.labelGmailMeLink );
        this.emailMeBox.add( this.labelEmailMeLink );
        this.gridAbout.attach( this.emailMeBox, 3, 4, 1, 1 );
        //this.gridAbout.attach( this.labelEmailMeLink, 4, 6, 1, 1 );

        //let labelSpaceAbout = new gtk.Label( { label: "2/2", xalign: 1, hexpand: true } );
        //this.gridAbout.attach( labelSpaceAbout, 3, 8, 1, 1 );
        //let labelSpaceAbout1 = new gtk.Label( { label: "\t", xalign: 0 } );
        //this.gridAbout.attach( labelSpaceAbout1, 0, 8, 1, 1 );
        //let labelSpaceAbout2 = new gtk.Label( { label: "\t", xalign: 0, hexpand: false } );
        //this.gridAbout.attach( labelSpaceAbout2, 3, 8, 1, 1 );
        let labelSpaceAbout = new gtk.Label( { label: "3/3", xalign: 1, hexpand: false } );
        this.gridAbout.attach( labelSpaceAbout, 3, 8, 1, 1 );




        this.notebook.show_all();
        return this.notebook;
    },

    changePanelSetting: function( object )
    {
        this.settings.set_boolean( 'mmod-panel-enabled', object.active );
    },

    changePanelPosition: function( object )
    {
        this.settings.set_enum( 'panel-position', object.active );
    },

    changePanelButton: function( object, pspec )
    {
        this.settings.set_boolean( 'panel-button-enabled', object.active );
    },

    changePanelButtonIcon: function( object, pspec )
    {
        // Get comfort level so we can set appropriate icon size in the path
        let comfortLevel = this.settings.get_enum( 'comfort-level' ), iconSize;
        switch( comfortLevel )
        {
            case 0:
            {
                iconSize = 24;
            }break;

            case 2:
            {
                iconSize = 48;
            }break;

            default:
            {
                iconSize = 32;
            }break;
        }

        // Now set the panel button icon path
        let old = this.settings.get_enum( 'panel-button-icon' ), inew = this.valuePanelButtonIcon.get_active();
        switch( inew )
        {
            case 0: // M4Star
            {
                this.valueCustomPanelButtonIcon.set_from_file( ext.path + '/res/img/mico/mstar/mmod-logo-fin-' + iconSize + '.png' );
                this.dipath = ext.path + '/res/img/mico/mstar/mmod-logo-fin-' + iconSize + '.png';
                this.settings.set_string( 'panel-button-icon-path', this.dipath );
            }break;

            case 1: // Apps
            {
                this.valueCustomPanelButtonIcon.set_from_file( ext.path + '/res/img/mico/mapp/mapp-' + iconSize + '.png' );
                this.dipath = ext.path + '/res/img/mico/mapp/mapp-' + iconSize + '.png';
                this.settings.set_string( 'panel-button-icon-path', this.dipath );
            }break;

            case 2: // Debian
            {
                this.valueCustomPanelButtonIcon.set_from_file( ext.path + '/res/img/debico/drnd/debico_' + iconSize + '.png' );
                this.dipath = ext.path + '/res/img/debico/drnd/debico_' + iconSize + '.png';
                this.settings.set_string( 'panel-button-icon-path', this.dipath );
            }break;

            case 3: // Fedora
            {
                this.valueCustomPanelButtonIcon.set_from_file( ext.path + '/res/img/fedico/fgrey/fedora-' + iconSize + '.png' );
                this.dipath = ext.path + '/res/img/fedico/fgrey/fedora-' + iconSize + '.png';
                this.settings.set_string( 'panel-button-icon-path', this.dipath );
            }break;
        }

        if( old === 4 && inew !== 4 )
        {
            this.valuePanelButtonIcon.remove( 4 );
        }

        this.settings.set_enum( 'panel-button-icon', inew );
    },

    changeCustomPanelButtonIcon: function( object, pspec )
    {
        // Get the current path to the icon
        let ipath = this.settings.get_string( 'panel-button-icon-path' );

        // Build a file picker for selecting the icon
        this.ipicker = new gtk.FileChooserDialog
        (
            {
                title: _( 'MMOD Panel - Panel Button Icon' ),
                action: gtk.FileChooserAction.OPEN
            }
        );
        this.ipicker.add_button( gtk.STOCK_CANCEL, gtk.ResponseType.CANCEL );
        this.ipicker.add_button( gtk.STOCK_OPEN, gtk.ResponseType.ACCEPT );
        this.ipicker.add_button( 'Reset', gtk.ResponseType.NONE );
        this.ipicker.set_filename( ipath );

        // Add an image preview
        this.ipreview = new gtk.Image();
        this.ipreview.set_from_file( ext.path + '/res/img/appico/appview-button-default.svg' );
        this.ipicker.set_preview_widget( this.ipreview );
        //this.ipicker.set_use_preview_label( false );
        if( ipath !== this.dipath )
        {
            this.dipath = ipath;
        }
        this.loadCustomPanelButtonIconPreview();
        this.updatepreview = this.ipicker.connect( 'update-preview', lang.bind( this, this.loadCustomPanelButtonIconPreview ) );

        // Add image file filters
        let filter = new gtk.FileFilter();
        filter.set_name( _( 'Images' ) );
        filter.add_pattern( '*.png' );
        filter.add_pattern( '*.jpg' );
        filter.add_pattern( '*.gif' );
        filter.add_pattern( '*.svg' );
        filter.add_pattern( '*.ico' );
        this.ipicker.add_filter( filter );

        // Load file picker, await response from user
        let response = this.ipicker.run();

        switch( response )
        {
            case -3:    // open
            {
                this.customPanelButtonIconFilename = this.ipicker.get_filename();
                if( this.customPanelButtonIconFilename !== this.dipath )
                {
                    this.dipath = this.customPanelButtonIconFilename;
                    this.settings.set_string( 'panel-button-icon-path', this.dipath );
                    this.loadCustomPanelButtonIcon();
                }
            }break;

            case -1:    // reset
            {
                this.customPanelButtonIconFilename = ext.path + '/res/img/mico/mstar/mmod-logo-fin-48.png';
                this.dipath = this.customPanelButtonIconFilename;
                this.settings.set_string( 'panel-button-icon-path', this.dipath );
                this.loadCustomPanelButtonIcon();
            }break;
        }

        this.ipicker.disconnect( this.updatepreview );
        this.ipicker.destroy();

        this.valuePanelButtonIcon.append_text( _( "Custom" ) );
        this.valuePanelButtonIcon.set_active( 4 );

        this.settings.set_enum( 'panel-button-icon', 4 );
    },

    loadCustomPanelButtonIconPreview: function()
    {
        let preview = false;

        this.ipfilename = this.ipicker.get_preview_filename();

        if( !this.ipfilename )
        {
            if( this.dipath )
            {
                this.ipfilename = this.dipath;
            }
        }

        try
        {
            this.ipreview.clear();
            this.ipreview.set_from_file( this.ipfilename );
            preview = true;
        }
        catch( e )
        {
            log( 'Error: ' + e.what() + ' [prefs.js `loadCustomPanelButtonIconPreview`' );
            preview = false;
        }

        this.ipicker.set_preview_widget_active( preview );
    },

    loadCustomPanelButtonIcon: function()
    {
        this.valueCustomPanelButtonIcon.clear();
        if( this.dipath )
        {
            this.valueCustomPanelButtonIcon.set_from_file( this.dipath );
        }
        else
        {
            this.valueCustomPanelButtonIcon.set_from_file( ext.path + '/res/img/mico/mstar/mmod-logo-fin-48.png' );
        }
    },

    changeDateInTray: function( object )
    {
        this.settings.set_boolean( 'date-in-sys-tray', object.active );
    },

    changeDisplayFavorites: function( object )
    {
        this.settings.set_boolean( 'display-favorites-enabled', object.active );
    },

    changeShowRunningApps: function( object )
    {
        this.settings.set_boolean( 'show-running-apps', object.active );
    },

    changeShowFavsBeforePrefs: function( object )
    {
        this.settings.set_boolean( 'favorites-before-preferences', object.active );
    },

    changeShowInTrayMenu: function( object )
    {
        this.settings.set_boolean( 'show-in-tray-menu', object.active );
    },

    changeComfortLevel: function( object )
    {
        this.settings.set_enum( 'comfort-level', object.active );
    },

    changeAutohide: function( object )
    {
        this.settings.set_boolean( 'autohide-panel', object.active );
    },

    changeEnableHotCorner: function( object )
    {
        this.settings.set_boolean( 'hot-corner-enabled', object.active );
    },

    onHoverEvent: function( object )
    {
        this.hoverComponent = this.settings.get_enum( 'placement-elements-selection' );
        this.settings.set_int( 'hover-event', this.hoverComponent + 1 );
    }
}

/**
 * package: mmod-panel
 * sub-package: lib.mmod.overrides
 * author:  Justin Nichols <a href='mailto:justin@nichols.mobi'>justin AT nichols DOT mobi</a>
 * copyright: 2011-2015 Massively Modified, Inc.
 * license: Apache, Version 2.0 <http://www.apache.org/licenses/LICENSE-2.0>
 */

const AppDisplay = imports.ui.appDisplay;
const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Shell = imports.gi.Shell;

const Main = imports.ui.main;
const Lang = imports.lang;
const DND = imports.ui.dnd;

const Signals = imports.signals;
const GLib = imports.gi.GLib;
const Params = imports.misc.params;
const Mainloop = imports.mainloop;
const Gtk = imports.gi.Gtk;
const PopupMenu = imports.ui.popupMenu;
const IconGrid = imports.ui.iconGrid;

const MENU_POPUP_TIMEOUT = 600;
const AppIconOverride = new Lang.Class({
    Name: 'AppIconOverride',
    Extends: AppDisplay.AppIcon,

    _init : function(app, iconParams) {
        this.app = app;
        this.id = app.get_id();
        this.name = app.get_name();

        this.actor = new St.Button({ style_class: 'app-well-app',
            reactive: true,
            button_mask: St.ButtonMask.ONE | St.ButtonMask.TWO,
            can_focus: true,
            x_fill: true,
            y_fill: true });

        this._dot = new St.Widget({ style_class: 'app-well-app-running-dot',
            layout_manager: new Clutter.BinLayout(),
            x_expand: true, y_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.END });

        this._iconContainer = new St.Widget({ layout_manager: new Clutter.BinLayout(),
            x_expand: true, y_expand: true });

        this.actor.set_child(this._iconContainer);
        this._iconContainer.add_child(this._dot);

        this.actor._delegate = this;

        if (!iconParams)
            iconParams = {};

        // Get the isDraggable property without passing it on to the BaseIcon:
        let appIconParams = Params.parse(iconParams, { isDraggable: true }, true);
        let isDraggable = appIconParams['isDraggable'];
        delete iconParams['isDraggable'];

        iconParams['createIcon'] = Lang.bind(this, this._createIcon);
        iconParams['setSizeManually'] = true;
        this.icon = new IconGrid.BaseIcon(app.get_name(), iconParams);
        this._iconContainer.add_child(this.icon.actor);

        this.actor.label_actor = this.icon.label;

        this.actor.connect('leave-event', Lang.bind(this, this._onLeaveEvent));
        this.actor.connect('button-press-event', Lang.bind(this, this._onButtonPress));
        this.actor.connect('touch-event', Lang.bind(this, this._onTouchEvent));
        this.actor.connect('clicked', Lang.bind(this, this._onClicked));
        this.actor.connect('popup-menu', Lang.bind(this, this._onKeyboardPopupMenu));

        this._menu = null;
        this._menuManager = new PopupMenu.PopupMenuManager(this);

        if (isDraggable) {
            this._draggable = DND.makeDraggable(this.actor);
            this._draggable.connect('drag-begin', Lang.bind(this,
                function () {
                    this._removeMenuTimeout();
                    Main.overview.beginItemDrag(this);
                }));
            this._draggable.connect('drag-cancelled', Lang.bind(this,
                function () {
                    Main.overview.cancelledItemDrag(this);
                }));
            this._draggable.connect('drag-end', Lang.bind(this,
                function () {
                    Main.overview.endItemDrag(this);
                }));
        }

        this.actor.connect('destroy', Lang.bind(this, this._onDestroy));

        this._menuTimeoutId = 0;
        this._stateChangedId = this.app.connect('notify::state', Lang.bind(this,
            function () {
                this._updateRunningStyle();
            }));
        this._updateRunningStyle();
    },

    _onDestroy: function() {
        if (this._stateChangedId > 0)
            this.app.disconnect(this._stateChangedId);
        this._stateChangedId = 0;
        this._removeMenuTimeout();
    },

    _createIcon: function(iconSize) {
        return this.app.create_icon_texture(iconSize);
    },

    _removeMenuTimeout: function() {
        if (this._menuTimeoutId > 0) {
            Mainloop.source_remove(this._menuTimeoutId);
            this._menuTimeoutId = 0;
        }
    },

    _updateRunningStyle: function() {
        if (this.app.state != Shell.AppState.STOPPED)
            this._dot.show();
        else
            this._dot.hide();
    },

    _setPopupTimeout: function() {
        this._removeMenuTimeout();
        this._menuTimeoutId = Mainloop.timeout_add(MENU_POPUP_TIMEOUT,
            Lang.bind(this, function() {
                this._menuTimeoutId = 0;
                this.popupMenu();
                return GLib.SOURCE_REMOVE;
            }));
        GLib.Source.set_name_by_id(this._menuTimeoutId, '[gnome-shell] this.popupMenu');
    },

    _onLeaveEvent: function(actor, event) {
        this.actor.fake_release();
        this._removeMenuTimeout();
    },

    _onButtonPress: function(actor, event) {
        let button = event.get_button();
        if (button == 1) {
            this._setPopupTimeout();
        } else if (button == 3) {
            this.popupMenu();
            return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    },

    _onTouchEvent: function (actor, event) {
        if (event.type() == Clutter.EventType.TOUCH_BEGIN)
            this._setPopupTimeout();

        return Clutter.EVENT_PROPAGATE;
    },

    _onClicked: function(actor, button) {
        this._removeMenuTimeout();
        let windows = this.app.get_windows().filter(function(w) {
            return !w.skip_taskbar;
        });
        for (let i = 0; i < windows.length; i++) {
            let window = windows[i];
            if (!window.minimized && window.has_focus()) {
                window.minimize();
            } else {
                this.activate(button);
            }
        }
    },

    _onKeyboardPopupMenu: function() {
        this.popupMenu();
        this._menu.actor.navigate_focus(null, Gtk.DirectionType.TAB_FORWARD, false);
    },

    getId: function() {
        return this.app.get_id();
    },

    popupMenu: function() {
        this._removeMenuTimeout();
        this.actor.fake_release();

        if (this._draggable)
            this._draggable.fakeRelease();

        if (!this._menu) {
            this._menu = new AppDisplay.AppIconMenu(this);
            this._menu.connect('activate-window', Lang.bind(this, function (menu, window) {
                this.activateWindow(window);
            }));
            this._menu.connect('open-state-changed', Lang.bind(this, function (menu, isPoppedUp) {
                if (!isPoppedUp)
                    this._onMenuPoppedDown();
            }));
            let id = Main.overview.connect('hiding', Lang.bind(this, function () { this._menu.close(); }));
            this.actor.connect('destroy', function() {
                Main.overview.disconnect(id);
            });

            this._menuManager.addMenu(this._menu);
        }

        this.emit('menu-state-changed', true);

        this.actor.set_hover(true);
        this._menu.popup();
        this._menuManager.ignoreRelease();
        this.emit('sync-tooltip');

        return false;
    },

    activateWindow: function(metaWindow) {
        if (metaWindow) {
            Main.activateWindow(metaWindow);
        } else {
            Main.overview.hide();
        }
    },

    _onMenuPoppedDown: function() {
        this.actor.sync_hover();
        this.emit('menu-state-changed', false);
    },

    activate: function (button) {
        let event = Clutter.get_current_event();
        let modifiers = event ? event.get_state() : 0;
        let openNewWindow = this.app.can_open_new_window () &&
            modifiers & Clutter.ModifierType.CONTROL_MASK &&
            this.app.state == Shell.AppState.RUNNING ||
            button && button == 2;

        if (this.app.state == Shell.AppState.STOPPED || openNewWindow)
            this.animateLaunch();

        if (openNewWindow)
            this.app.open_new_window(-1);
        else
            this.app.activate();

        Main.overview.hide();
    },

    animateLaunch: function() {
        this.icon.animateZoomOut();
    },

    shellWorkspaceLaunch : function(params) {
        params = Params.parse(params, { workspace: -1,
            timestamp: 0 });

        this.app.open_new_window(params.workspace);
    },

    getDragActor: function() {
        return this.app.create_icon_texture(Main.overview.dashIconSize);
    },

    // Returns the original actor that should align with the actor
    // we show as the item is being dragged.
    getDragActorSource: function() {
        return this.icon.icon;
    },

    shouldShowTooltip: function() {
        return this.actor.hover && (!this._menu || !this._menu.isOpen);
    },
});
Signals.addSignalMethods(AppIconOverride.prototype);
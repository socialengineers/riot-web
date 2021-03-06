/*
Copyright 2015, 2016 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

import React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import classNames from 'classnames';
import KeyCode from 'matrix-react-sdk/lib/KeyCode';
import sdk from 'matrix-react-sdk';
import dis from 'matrix-react-sdk/lib/dispatcher';
import MatrixClientPeg from 'matrix-react-sdk/lib/MatrixClientPeg';
import CallHandler from 'matrix-react-sdk/lib/CallHandler';
import AccessibleButton from 'matrix-react-sdk/lib/components/views/elements/AccessibleButton';
import VectorConferenceHandler from '../../VectorConferenceHandler';

var LeftPanel = React.createClass({
    displayName: 'LeftPanel',

    // NB. If you add props, don't forget to update
    // shouldComponentUpdate!
    propTypes: {
        collapsed: React.PropTypes.bool.isRequired,
    },

    getInitialState: function() {
        return {
            searchFilter: '',
        };
    },

    componentWillMount: function() {
        this.focusedElement = null;
    },

    shouldComponentUpdate: function(nextProps, nextState) {
        // MatrixChat will update whenever the user switches
        // rooms, but propagating this change all the way down
        // the react tree is quite slow, so we cut this off
        // here. The RoomTiles listen for the room change
        // events themselves to know when to update.
        // We just need to update if any of these things change.
        if (
            this.props.collapsed !== nextProps.collapsed ||
            this.props.disabled !== nextProps.disabled
        ) {
            return true;
        }

        if (this.state.searchFilter !== nextState.searchFilter) {
            return true;
        }

        return false;
    },

    _onFocus: function(ev) {
        this.focusedElement = ev.target;
    },

    _onBlur: function(ev) {
        this.focusedElement = null;
    },

    _onKeyDown: function(ev) {
        if (!this.focusedElement) return;
        let handled = false;

        switch (ev.keyCode) {
            case KeyCode.UP:
                this._onMoveFocus(true);
                handled = true;
                break;
            case KeyCode.DOWN:
                this._onMoveFocus(false);
                handled = true;
                break;
        }

        if (handled) {
            ev.stopPropagation();
            ev.preventDefault();
        }
    },

    _onMoveFocus: function(up) {
        var element = this.focusedElement;

        // unclear why this isn't needed
        // var descending = (up == this.focusDirection) ? this.focusDescending : !this.focusDescending;
        // this.focusDirection = up;

        var descending = false; // are we currently descending or ascending through the DOM tree?
        var classes;

        do {
            var child = up ? element.lastElementChild : element.firstElementChild;
            var sibling = up ? element.previousElementSibling : element.nextElementSibling;

            if (descending) {
                if (child) {
                    element = child;
                }
                else if (sibling) {
                    element = sibling;
                }
                else {
                    descending = false;
                    element = element.parentElement;
                }
            }
            else {
                if (sibling) {
                    element = sibling;
                    descending = true;
                }
                else {
                    element = element.parentElement;
                }
            }

            if (element) {
                classes = element.classList;
                if (classes.contains("mx_LeftPanel")) { // we hit the top
                    element = up ? element.lastElementChild : element.firstElementChild;
                    descending = true;
                }
            }

        } while(element && !(
            classes.contains("mx_RoomTile") ||
            classes.contains("mx_SearchBox_search") ||
            classes.contains("mx_RoomSubList_ellipsis")));

        if (element) {
            element.focus();
            this.focusedElement = element;
            this.focusedDescending = descending;
        }
    },

    onHideClick: function() {
        dis.dispatch({
            action: 'hide_left_panel',
        });
    },

    onSearch: function(term) {
        this.setState({ searchFilter: term });
    },

    render: function() {
        const RoomList = sdk.getComponent('rooms.RoomList');
        const BottomLeftMenu = sdk.getComponent('structures.BottomLeftMenu');
        const CallPreview = sdk.getComponent('voip.CallPreview');

        let topBox;
        if (MatrixClientPeg.get().isGuest()) {
            const LoginBox = sdk.getComponent('structures.LoginBox');
            topBox = <LoginBox collapsed={ this.props.collapsed }/>;
        } else {
            const SearchBox = sdk.getComponent('structures.SearchBox');
            topBox = <SearchBox collapsed={ this.props.collapsed } onSearch={ this.onSearch } />;
        }

        let classes = classNames(
            "mx_LeftPanel", "mx_fadable",
            {
                "collapsed": this.props.collapsed,
                "mx_fadable_faded": this.props.disabled,
            }
        );

        return (
            <aside className={classes} onKeyDown={ this._onKeyDown } onFocus={ this._onFocus } onBlur={ this._onBlur }>
                { topBox }
                <CallPreview ConferenceHandler={VectorConferenceHandler} />
                <RoomList
                    collapsed={this.props.collapsed}
                    searchFilter={this.state.searchFilter}
                    ConferenceHandler={VectorConferenceHandler} />
                <BottomLeftMenu collapsed={this.props.collapsed}/>
            </aside>
        );
    }
});

module.exports = DragDropContext(HTML5Backend)(LeftPanel);

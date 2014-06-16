//
//statetools.js (UI Tools, extension of Element State Library)
//  public domain,
//  requires transev.js (transition events),
//           elemstate.js (element state library)
//
//Some UI tools for toggling using the state model provided by 
//elemstate.js (see there for doc).
//
//Can be used to create nested toggling popups/panels that have
//'situational awareness'.
//
//
//WIDGET TOOL (ESMWidgetTool)
//  Attributes:
//    ESMFocusId = <id>
//      When first clicked, focus will be set to 'id' (child),
//        most recently focused child will receive focus after
//
//
//TOGGLE TOOL (ESMToggleTool)
//  typically a button (toggler) and popup (target),
//    target must be of type ESMWidgetTool
//
//  Attributes:
//    ESMToggleTarget = <id>  (required)
//      <id>: elem to target with new states (eg, popup)
//    ESMDeactivateId = <id>
//      All states in target cleared when 'id' clicked 
//       (eg, close button, in target)
//
//  States added:
//    'togglerhover', hover on toggler, set in target
//    'toggled', alternating clicks on toggler set/clear 
//       (set in toggler and target)
//    'suggested', hover on toggler only (no other toggle tools
//       in same level have 'toggled' state set)
//    'childfocused', set in parent node(s); indicates 
//       a child widget has the focus
//    'childfocused_toggletool', set in parent node(s); indicates 
//      a popup has the focus (which can be used to gray the 
//      background for example)
//
//
//PANEL TOOL (ESMPanelTool)
//  typically a button (toggler) and panel (target),
//    target must be of type ESMWidgetTool
//
//  Attributes:
//    ESMPanelTarget = <id>  (required)
//      <id>: elem to target with new states (eg, panel)
//    ESMDeactivateId = <id>
//      All states in target cleared when 'id' clicked 
//       (eg, close button, in target)
//
//  States added:
//    'togglerhover', hover on toggler
//    'toggled', alternating clicks on toggler set/clear state  
//       (also set in toggler)
//    'childfocused', set in parent node(s); indicates 
//       a child widget has the focus
//    'childfocused_paneltool', set in parent node(s); indicates 
//       a child panel has the focus
//
//
ESM.registerStates( [
  "childfocused",
  "childfocused_widgettool",
  "childfocused_paneltool",
  "childfocused_toggletool",
  "suggested",
  "toggled",
  "togglerhover"
] );
ESM.attributeClasses[ESM.attributeClasses.length] = {
  name:"focusid",jsclass:"ESMWidgetTool"}
ESM.attributeClasses[ESM.attributeClasses.length] = {
  name:"toggletarget",jsclass:"ESMToggleTool"}
ESM.attributeClasses[ESM.attributeClasses.length] = {
  name:"paneltarget",jsclass:"ESMPanelTool"}


/*
 * Widget (inherits from ESMElem)
 */
function ESMWidgetTool( ) {

  this.widgetTool_setParentState = function( state, enable ) {
    var p = ESM.findParentElem( this.elem.parentNode );
    p = ESM.getElemObj( p );
    if (p && state) {
      if (state.substr(0,5) != 'child') //(initiate)
        state = 'child' + state + '_' + 
                   (this.masterjsclass ?
                     this.masterjsclass.substr(3).toLowerCase() :
                     this.def.attributes.jsclass.substr(3).toLowerCase());
      if (state.substr(0,12) == 'childfocused')
        ESM.setState( p.elem, state, enable ),
        ESM.setState( p.elem, 'childfocused', enable );
    }
  }
  this.widgetTool_setFocus = function( ) {
    if (this.def.attributes.focusid) {
      var fe = this.focusedElem;
      if (fe && fe.disabled)
        fe = null;
      if (!fe)
        fe = document.getElementById( this.def.attributes.focusid );
      if (fe && !fe.disabled && fe != document.activeElement) {
        fe.focus();
        //TEM.burstEvent( "focus", fe );
        return fe;
      }
    }
  }
  this.widgetTool_restoreFocus = function( TEMe ) {
    if (this.def.attributes.focusid)
      /*(set focus if not already set somewhere below)*/
      if (!TEM.isParentOf( this.elem, document.activeElement ))
        return this.setFocus();
  }
  this.widgetTool_saveFocus = function() {
    if (this.def.attributes.focusid && TEM.getSystemFocus()) {
      var match = function( elem ) {
        var t = ESM.getElemObj( elem );
        return t && t.def.attributes.focusid;
      }
      /*(save focus if no child tool is handling it)*/
      if (TEM.findParent( TEM.getSystemFocus(), match ) == this.elem) {
        var sf = TEM.getSystemFocus();
        if (!(TEM.getElem(sf) instanceof HTMLButtonElement))
          this.focusedElem = sf;
      }
    }
  }
  this.widgetTool_setState = function( state, enable ) {
    if (state == 'focused' && enable)
      this.saveFocus();
    var alreadytoggled = this.state && this.state.enabled( 'toggled' );
    this.elem_setState( state, enable );
    if (enable && state == 'toggled' && !alreadytoggled)
      this.restoreFocus();
    this.setParentState( state, enable );
  }
  this.widgetTool_init = function( def ) {
    this.elem_init( def );
  }
  /*override*/
  this.init = this.widgetTool_init;
  this.setState = this.widgetTool_setState;
  /*widget methods*/
  this.setFocus = this.widgetTool_setFocus;
  this.saveFocus = this.widgetTool_saveFocus;
  this.restoreFocus = this.widgetTool_restoreFocus;
  this.setParentState = this.widgetTool_setParentState;
}
ESMWidgetTool.prototype = new ESMElem();


/*
 * Toggle (inherits from ESMElem)
 */
ESM.toggleTools = [];
function ESMToggleTool( ) {

  this.toggleTool_getTarget = function( ) {
    return ESM.getElemObj( this.def.attributes.toggletarget );
  }
  this.toggleTool_grayDeactivateId = function() {
    var t = this.getTarget();
    if (!t || !this.def.attributes.deactivateid)
      return;
    var de = document.getElementById( this.def.attributes.deactivateid );
    if (de)
      de.disabled = !t.state.enabled( 'toggled' );
  }
  this.toggleTool_clickedDeactivateId = function( ) {
    if (!this.def.attributes.deactivateid)
      return;
    var de = document.getElementById( this.def.attributes.deactivateid );
    if (de && !de.disabled)
      return ESM.isEventInside( this.elem, de );
    return false;
  }
  this.toggleTool_isInTarget = function( ) {
    var targ = this.def.attributes.toggletarget;
    return ESM.isEventInside( this.elem, targ );
  }
  this.toggleTool_isAnotherToggled = function( ) {
    for( var i=0; i<ESM.toggleTools.length; i++ )
      if (ESM.toggleTools[i] != this)
        if (ESM.toggleTools[i].state.enabled('toggled')) {
          var par = ESM.toggleTools[i].getTarget();
          if (par)
            if (!TEM.isParentOf( par.elem, this.elem ))
              return true;
        }
    return false;
  }
  this.toggleTool_setToggleState_ = function( enable ) {
    var t = this.getTarget();
    if (t) {
      t.setState( 'toggled', enable );
      if (!enable)
        t.setState();
    }
    return enable;
  }
  this.toggleTool_setToggleState = function( enable ) {
    this.setState( 'toggled', enable );
    return enable;
  }
  this.toggleTool_toggle = function( enable ) {
    if (enable) {
      if (this.state.enabled( 'toggled' ))
        enable = false;
    }
    else
      if (!enable && this.clickedDeactivateId()) {
        //getContainerOfSelf().setFocus();
        this.elem.focus();
        if (!(this.elem instanceof HTMLButtonElement))
          TEM.burstEvent( "focus", this.elem );
      }
      else
        if (this.toggleTool_isInTarget())
          enable = true;
    this.setToggleState( enable );
  }
  this.toggleTool_focus = function( enable ) {
    if (enable) {
      //TODO: toggle off if focus-only, not assoc w/clk
    }
    else {
      if (this.toggleTool_isInTarget())
        enable = true;
      if (!ESM.isEventInside( this.elem, this.def.attributes.deactivateid ))
        this.setToggleState( enable );
    }
  }
  this.toggleTool_hover = function( enable ) {
    var t = this.getTarget();
    if (t) {
      t.setState( 'togglerhover', enable );
      if (this.toggleTool_isAnotherToggled())
        enable = false;
      t.setState( 'suggested', enable );
    }
  }
  this.toggleTool_setState = function( state, enable ) {
    if (this.getTarget()) this.getTarget().masterjsclass = this.def.attributes.jsclass;
    this.elem_setState( state, enable );
    if (state == 'clicked')
      this.toggle( enable );
    else
      if (state == 'focused')
        this.toggleTool_focus( enable );
      else
        if (state == 'hover')
          this.toggleTool_hover( enable );
        else
          if (state == 'toggled')
            this.toggleTool_setToggleState_( enable );
    this.grayDeactivateId();
  }
  this.toggleTool_init = function( def ) {
    //this.widgetTool_init( def );
    this.elem_init( def );
    ESM.toggleTools.push( this );
  }
  /*override*/
  this.init = this.toggleTool_init;
  this.setState = this.toggleTool_setState;
  /**/
  this.getTarget = this.toggleTool_getTarget;
  this.setToggleState = this.toggleTool_setToggleState;
  this.toggle = this.toggleTool_toggle;
  this.clickedDeactivateId = this.toggleTool_clickedDeactivateId;
  this.grayDeactivateId = this.toggleTool_grayDeactivateId;
}
//ESMToggleTool.prototype = new ESMWidgetTool();
ESMToggleTool.prototype = new ESMElem();


/*
 * Panel (inherits from ESMElem)
 */
function ESMPanelTool( ) {

  this.panelTool_getTarget = function( ) {
    return ESM.getElemObj( this.def.attributes.paneltarget );
  }
  this.panelTool_grayDeactivateId = function() {
    var t = this.getTarget();
    if (!t || !this.def.attributes.deactivateid)
      return;
    var de = document.getElementById( this.def.attributes.deactivateid );
    if (de)
      de.disabled = !t.state.enabled( 'toggled' );
  }
  this.panelTool_clickedDeactivateId = function( ) {
    if (!this.def.attributes.deactivateid)
      return;
    var de = document.getElementById( this.def.attributes.deactivateid );
    if (de && !de.disabled)
      return ESM.isEventInside( this.elem, de );
    return false;
  }
  this.panelTool_isInTarget = function( ) {
    var targ = this.def.attributes.paneltarget;
    return ESM.isEventInside( this.elem, targ );
  }
  this.panelTool_canUntoggle = function( ) {
    return ESM.isEventInside( this.elem, this.elem ) ||
           this.clickedDeactivateId();
  }
  this.panelTool_setToggleState_ = function( enable ) {
    var t = this.getTarget();
    if (t) {
      t.setState( 'toggled', enable );
      if (!enable)
        t.setState();
    }
    return enable;
  }
  this.panelTool_setToggleState = function( enable ) {
    if (enable || this.panelTool_canUntoggle())
      this.setState( 'toggled', enable );
    return enable;
  }
  this.panelTool_toggle = function( enable ) {
    if (enable) {
      if (this.state.enabled( 'toggled' ))
        enable = false;
    }
    else
      if (!enable && this.clickedDeactivateId()) {
        this.elem.focus();
        if (!(this.elem instanceof HTMLButtonElement))
          TEM.burstEvent( "focus", this.elem );
      }
      else
        if (this.panelTool_isInTarget())
          enable = true;
    this.setToggleState( enable );
  }
  this.panelTool_focus = function( enable ) {
    if (!enable) {
      if (this.panelTool_isInTarget())
        enable = true;
      if (!ESM.isEventInside( this.elem, 
                              this.def.attributes.deactivateid ))
        this.setToggleState( enable );
    }
  }
  this.panelTool_hover = function( enable ) {
    var t = this.getTarget();
    if (t)
      t.setState( 'togglerhover', enable );
  }
  this.panelTool_setState = function( state, enable ) {
    if (this.getTarget()) this.getTarget().masterjsclass = this.def.attributes.jsclass;
    this.elem_setState( state, enable );
    if (state == 'clicked')
      this.toggle( enable );
    else
      if (state == 'focused')
        this.panelTool_focus( enable );
      else
        if (state == 'hover')
          this.panelTool_hover( enable );
        else
          if (state == 'toggled')
            this.panelTool_setToggleState_( enable );
    this.grayDeactivateId();
  }
  this.panelTool_init = function( def ) {
    this.elem_init( def );
  }
  /*override*/
  this.init = this.panelTool_init;
  this.setState = this.panelTool_setState;
  /**/
  this.getTarget = this.panelTool_getTarget;
  this.setToggleState = this.panelTool_setToggleState;
  this.toggle = this.panelTool_toggle;
  this.clickedDeactivateId = this.panelTool_clickedDeactivateId;
  this.grayDeactivateId = this.panelTool_grayDeactivateId;
}
ESMPanelTool.prototype = new ESMElem();



//
//elemstate.js, Element State Library (public domain)
//  tested with FF, Chrome (2013 versions), IE8 (legacy)
//  requires transev.js (transition events)
//
//Implements a simple state machine model to set CSS classes on 
//elements.
//
//ESM adds combined and custom states to the usual CSS states 
//(ie, :hover, :focus, :active).  When a state is added or 
//removed on an element (during an event or with a call to 
//ESM.setState), the CSS class is changed to reflect the new 
//combination.
//
//Since states combine, this type of CSS declaration is possible:
//
//  .hello: (focused + toggled + waiting + hover) {..}
//
//which would be expressed in CSS for use by ESM as:
//
//  .hello_focused_toggled_waiting_hover {..}
//
//By default, ESM combines CSS names as well as states, so it is
//only necessary to declare CSS names for the base states, ie:
//
//  .hello {..}
//  .hello_focused {..}
//  .hello_toggled {..}
//  .hello_waiting {..}
//
//Assuming all these states are active on an element, ESM would
//set:
//
//  class = 'hello hello_focused hello_toggled hello_waiting'
//
//CSS names for different state combinations can also be specified 
//individually (see CSS CLASS below).
//
//STATE
//
//ESM's built-in states are:
//
//  'focused'    element or child has focus
//  'clicked'    clicked/tapped inside (a click outside clears)
//  'pressed'    mouse/finger is pressed 
//  'dragging'   mouse/finger is down and moving
//  'waiting'    elem is waiting
//  'hover'      mouse on element
//
//Any number of custom states can also be added (for an example,
//see doc for the toggler tool in statetools.js).
//
//The states are combined in the order listed above (ie,
//clicked_focused is not a possible combination).
//
//Clicks set/clear 'focused' state regardless of how system 
//focus is set. System focus events will also change 'focused' 
//state.
//
//HTML
//
//ESM will initialize using HTML attributes when ESM.initPage
//is called during page load, ie:
//
//  <body onload='ESM.initPage()'>
//
//During the call, ESM functionality is applied to all HTML
//elements having a 'ESMCssRoot=<root>' attribute, ie:
//
//  <div ESMCssRoot='hello'>hello, i'm the hello tool</div>
//
//<root> is used as the prefix for the CSS names to be set for
//each state combination as described above.
//
//Most other ESM options can also be expressed with HTML 
//attributes, which have the form ESM<option>=<value>.  The 
//base ESM options are:
//
//  ESMCssRoot = <root>, as described
//  ESMCssMethod = 'stepback' | 'combine'
//    Determines how CSS names are selected, see CSS CLASS
//  ESMJSclass = <jsclassname>
//    The JS subclass (derived from ESMElem), see JAVASCRIPT
//
//CSS CLASS
//
//When ESMCssMethod='combine' (default), CSS names for the base 
//states are combined as described above.
//
//When ESMCssMethod='stepback', a stepback rule is used to select 
//a CSS name from those available:
//
//  When CSS for a state combination not available, higher index
//  state is stripped, repeats until match found, ie:
//    clicked_waiting_hover => clicked_waiting' => 'clicked'
//
//The stepback method can be used as the default for all elems by
//setting ESM.defaultAttributes.cssmethod = 'stepback' prior to
//initialization.
//
//JAVASCRIPT
//
//ESM functionality can be applied to elements without using
//HTML attributes by initializing with:
//  ESM.initElems( array of elemDef [, onStateChangeCallback] )
//    onStateChangeCallback used when !elemDef[i].callback
//    see elemDef below
//
//Other initialization functions:
//  [object ESMElem] = ESM.initElem( elemDef )
//  ESM.initPage( [onStateChangeCallback] )
//    all elements in document.body with ESMCssRoot defined 
//      are ESMified
//
//ESM.setState( elemOrId, state, enable )
//  add or remove states on an element
//    ie, ESM.setState('myWidget','waiting',true);
//
//ESM.registerStates( array of string )
//  add custom states to ESM, custom states are placed in same 
//    order registered
//
//[object ESM.state] = ESM.getElemObj(elemOrId).state
//  obtain an element's state machine object,
//  state object methods:
//    toString(), [boolean] enabled(substate)
//
//Custom tools can be defined by deriving JS classes from 
//ESMElem or a subclass of it (see ESMWidgetTool in 
//statetools.js).  The JS class can be specified in HTML using 
//ESMJSclass=<jsclassname>, ie:
//  <div ESMcssroot='rabbit' ESMjsclass='rabbitTool'>rabbit</div>
//
//elemDef (ESM.getElemObj(elemOrId).def):
//  elemOrId: identifies the element
//  attributes:
//    any not defined are populated from HTML attributes 
//      ESM<name>=<value>, <name> converted to lower case
//    base attributes:
//      cssroot: root css name
//      jsclass: JS class (ESMElem or subclass)
//      cssmethod: 'stepback'|'combine'
//    (global ESM.defaultAttributes used for any not defined nor
//    available from HTML)
//  triggers (to trigger states in other elems):
//    array of {state,target[,targetState]}:
//      state: sub-state that will trigger
//      target: idOrElem of dest elem
//      targetState: sub-state to set/clear in target
//        if ommitted, =trigger state
//  callback:
//    function onStateChange( elem, sobj, state, enable )
//      this: ESMElem or subclass
//      elem: DOM elem
//      sobj: state machine object
//      state: substate added or removed
//      enable: true=substate was added, false=removed
//
//
var ESM = {};
ESM.defaultAttributes = {
  cssroot:"ESM",
  jsclass:"ESMElem",
  cssmethod:"combine"
}
ESM.attributeClasses = []; //attr name -> jsclass mappings
//sample: ESM.attributeClasses[0] = {
//                  name:"rabbittoolname",jsclass:"rabbitTool"}


/*
 * Register states
 */
ESM.stateOrder = {};
ESM.nextStateOrder = 0;
ESM.registerStates = function( states ) {
  for( var i=0; i<states.length; i++ ) {
    ESM.stateOrder[states[i]] = ESM.nextStateOrder;
    ESM.nextStateOrder++;
  }
}
ESM.registerStates(
  [ "focused", "clicked", "pressed", "dragging", "waiting", "hover" ] );


/*
 * State object class
 */
function ESMState() {
  this.state_clear = function( ) {
    for( var i=0; i<this.states.length; i++ )
      this.states[i] = null;
  }
  this.state_set = function( substate, enable ) {
    if (substate)
      this.states[ESM.stateOrder[substate]] = (enable ? substate : null);
    else
      this.clear();
  }
  this.state_enabled = function( substate ) {
    if (ESM.stateOrder[substate] < this.states.length)
      return this.states[ESM.stateOrder[substate]];
    return false;
  }
  this.state_toString = function( maxState, sep ) {
    var fullst = "";
    if (!sep)
      sep = '_';
    var mx = this.states.length - 1;
    if (maxState != undefined)
      if (mx > maxState)
        mx = maxState;
    for( var i=0; i<=mx; i++ ) {
      if (this.states[i]) {
        if (fullst)
          fullst += sep;
        fullst += this.states[i];
      }
    }
    return fullst;
  }
  this.state_init = function( ) {
    /*set data for instance*/
    this.states = new Array;
  }
  /*set overridable methods*/
  this.init = this.state_init;
  this.clear = this.state_clear;
  this.set = this.state_set;
  this.enabled = this.state_enabled;
  this.toString = this.state_toString;
}
ESM.initState = function( subclass ) {
  var s = ESM.createInstanceOf( subclass?subclass:ESMState );
  if (s)
    s.init();
  return s;
}


/*
 * CSS name generator classes
 */
function ESMCssName( ) {
  this.cssName_makeClassName = function( fullst ) {
    if (!fullst)
      if (this.state)
        fullst = this.state.toString();
    var cls = this.cssRoot;
    if (fullst)
      cls += '_' + fullst;
    return cls;
  }
  this.cssName_toString = function( ) {
    return this.makeClassName();
  }
  this.cssName_setElemClassName = function( elem, state ) {
    this.state = state;
    var cls = this.toString();
    if (cls && elem.className != (this.cssOtherClasses + cls))
      elem.className = this.cssOtherClasses + cls;
  }
  this.cssName_init = function( cssRoot ) {
    /*set instance data*/
    if (!cssRoot)
      cssRoot = ESM.defaultAttributes.cssroot;
    cssRoot = cssRoot.toString().split( ' ' );
    this.cssRoot = cssRoot[cssRoot.length-1];
    this.cssOtherClasses = '';
    for( var i=0; i<cssRoot.length-1; i++ )
      this.cssOtherClasses += cssRoot[i] + ' ';
  }
  /*set overridable methods*/
  this.init = this.cssName_init;
  this.makeClassName = this.cssName_makeClassName;
  this.toString = this.cssName_toString;
  this.setElemClassName = this.cssName_setElemClassName;
}

function ESMCssNamestepback( ) {
  this.stepbackCssName_findNextClassName = function( fullst ) {
    var cls = this.makeClassName( fullst );
    if (!ESM.findCssSelector( cls ))
      cls = null;
    return cls;
  }
  this.stepbackCssName_findClassName = function( state ) {
    var cls=null, fullst, prevfullst=null;
    var maxState = ESM.nextStateOrder-1;
    do {
      fullst = state.toString( maxState );
      if (fullst != prevfullst)
        cls = this.stepbackCssName_findNextClassName( fullst );
      prevfullst = fullst;
      maxState--;
    }
    while ((maxState >= 0) && !cls);
    if (!cls)
      cls = this.cssRoot;
    return cls;
  }
  this.stepbackCssName_toString = function( ) {
    if (!this.state)
      return this.cssRoot;
    var cls = this.makeClassName();
    /*(optimization:use previously stored state->name mapping)*/
    if (this.cssAvail)
      if (this.cssAvail[cls])
        return this.cssAvail[cls];
    var fallcls = this.stepbackCssName_findClassName( this.state );
    /*(optimization:store state->name mapping)*/
    if (!this.cssAvail)
      this.cssAvail = {};
    this.cssAvail[cls] = fallcls;
    return fallcls;
  }
  /*override methods*/
  this.toString = this.stepbackCssName_toString;
}
ESMCssNamestepback.prototype = new ESMCssName();

function ESMCssNamecombine( ) {
  this.combineCssName_makeClassName = function( ) {
    if (!this.state || !this.state.toString())
      return this.cssRoot;
    return this.cssRoot + ' ' + this.cssRoot + '_' +
                  this.state.toString( undefined, ' '+this.cssRoot+'_' );
  }
  /*override methods*/
  this.makeClassName = this.combineCssName_makeClassName;
}
ESMCssNamecombine.prototype = new ESMCssName();

ESM.initCssName = function( cssMethod, cssRoot ) {
  cssMethod = cssMethod.toLowerCase();
  var cn = 'ESMCssName' + cssMethod;
  var n = ESM.createInstanceOf( cn );
  if (!n)
    n = new ESMCssNamestepback();
  n.init( cssRoot );
  return n;
}


/*
 * TEM event traps
 */
//ESM._msEnt = function() {this.userData.setState('hover',true);}
ESM._msEnt = function() {ESM._setState(this.userData,'hover',true);}
ESM._msExit = function() {ESM._setState(this.userData,'hover',false);}
ESM._dnIn = function() {ESM._setState(this.userData,'pressed',true);}
ESM._upIn = function() {ESM._setState(this.userData,'pressed',false);}
ESM._clkIn = function() {ESM._setState(this.userData,'clicked',true);}
ESM._clkOut = function() {ESM._setState(this.userData,'clicked',false);}
ESM._focIn = function() {ESM._setState(this.userData,'focused',true);}
ESM._focOut = function() {ESM._setState(this.userData,'focused',false);}
ESM._evs = { 
  click:{Inside:ESM._clkIn, Outside: ESM._clkOut},
  mouse:{Enter:ESM._msEnt,  Exit: ESM._msExit}, 
  down: {Inside:ESM._dnIn}, 
  up:   {Inside:ESM._upIn},
  focus:{Inside:ESM._focIn, Outside: ESM._focOut}
}
ESM._pending = [];
ESM._setState = function( ee, s, en ) { //(prevent state flickering off/on/off or on/off/on)
  ee.setState( s, en );
  /*
  function doit() {
    for( var i=0; i<ESM._pending.length; i++ )
      ESM._pending[i].esmElem.state.set( ESM._pending[i].state, ESM._pending[i].enable );
    for( var i=0; i<ESM._pending.length; i++ )
      ESM._pending[i].esmElem.setClass();
    ESM._pending = [];
  }
  ESM._pending.push( {esmElem:ee, state:s, enable:en} );
  if (ESM._pending.length == 1)
    setTimeout( doit, 15 );
  */
}


/*
 * Base object class for a ESM-enabled element
 */
function ESMElem( ) {

  this.elem__setClass = function( ) {
    this.cssMethod.setElemClassName( this.elem, this.state );
  }
  this.elem_setClass = function( hardset ) {
hardset = true;
    var _this = this;
    // wait for states to combine (to stop flickering when on/off/on or off/on/off)
    function doit() {
      _this.cssMethod.setElemClassName( _this.elem, _this.state );
      _this._pending = 0;
    }
    if (hardset)
      this.cssMethod.setElemClassName( this.elem, this.state );
    else {
      if (!this._pending) this._pending = 0;
      this._pending++;
      if (this._pending == 1)
        setTimeout( doit, 15 );
    }
  }
  this.elem_setTriggers = function( state, enable ) {
    var triggers = this.def.triggers;
    if (triggers)
      for( var i=0; i<triggers.length; i++ )
        if (triggers[i])
          if (state == triggers[i].state) {
            var targstate = state;
            if (triggers[i].targetState)
              targstate = triggers[i].targetState;
            ESM.setState( triggers[i].target, targstate, enable );
          }
  }
  this.elem_setState = function( state, enable ) {
    var ret = false, init = false;
    if (!this.elem)
      return;
    var prevst = '-';
    if (this.state)
      prevst = this.state.toString();
    else
      this.state = ESM.initState(), init = true;
    if (this.elem.disabled)
      this.state.clear();
    else
      this.state.set( state, enable );
    if (prevst != this.state.toString()) {
      this.setClass( init );
      if (this.callback)
        this.callback( this.elem, this.state, state, enable );
      if (state == 'clicked' && enable)
        if (this.def.attributes.onclick)
          eval( this.def.attributes.onclick );
      this.setTriggers( state, enable );
      ret = true;
    }
    return ret;
  }
  this.XsetState = function( s, en ) { //(prevent state flickering off/on/off or on/off/on)
    var _this = this;
    function doit() {
      for( var i=0; i<_this._pending.length; i++ )
        _this.state.set( _this._pending[i].state, _this._pending[i].enable );
      _this.elem__setState( _this._pending[i].state, _this._pending[i].enable );
      _this._pending = [];
    }
    this._pending.push( {state:s, enable:en} );
    if (this._pending.length == 1)
      setTimeout( doit, 15 );
  }
  this.getElem = function() {
    return this.elem;
  }
  this.elem_init = function( def ) {
    /*set instance data*/
    if (!def)
      return;
    this.def = def;
    this.callback = def.callback;
    this.elem = TEM.getElem( def.elemOrId );
    if (!this.elem)
      return;
    this.cssMethod = ESM.initCssName( def.attributes.cssmethod, 
                                      def.attributes.cssroot );
    var TEMdef = [{elemOrId:this.elem, events:ESM._evs, userData:this}];
    TEM.init( TEMdef );
    this.setState();
    return true;
  }
  /*set overridable methods*/
  this.init = this.elem_init;
  this.setClass = this.elem_setClass;
  this.setTriggers = this.elem_setTriggers;
  this.setState = this.elem_setState;
}


/*
 * Init functions
 */
ESM.populateAttributes = function( def ) {
  if (!def)
    return;
  var e = TEM.getElem( def.elemOrId );
  if (!e)
    return;
  if (!def.attributes)
    def.attributes = {};
  var attr, n;
  for( var i=0; i<e.attributes.length; i++ ) {
    attr = e.attributes[i];
    if (attr.specified)
      if (attr.nodeName.search( /ESM/i ) >= 0) {
        n = attr.nodeName.replace( /ESM/i, '' );
        n = n.toLowerCase();
        if (!def.attributes[n])
          def.attributes[n] = attr.value?attr.value:attr.nodeValue;
      }
  }
  if (!def.attributes.jsclass)
    for( var i=0; i<ESM.attributeClasses.length; i++ )
      if (def.attributes[ESM.attributeClasses[i].name])
        def.attributes.jsclass = ESM.attributeClasses[i].jsclass;
  for (n in ESM.defaultAttributes)
    if (!def.attributes[n])
      def.attributes[n] = ESM.defaultAttributes[n];
  return true;
}

ESM.initElem = function( def ) {
  if (!ESM.populateAttributes( def ))
    return;
  var t = ESM.createInstanceOf( def.attributes.jsclass );
  t.init( def );
  return t;
}

ESM.initElems = function( defs, onStateChange ) {
  for( var i=0; i<defs.length; i++ ) {
    if (onStateChange && defs[i])
      if (!defs[i].callback)
        defs[i].callback = onStateChange;
    ESM.initElem( defs[i] );
  }
}

ESM.initPage = function( onStateChange ) {
  function cb( e ) {
    if (e.getAttribute && TEM.isElemEventable( e ))
      if (e.getAttribute( 'ESMCssRoot' ))
        ESM.initElem( {elemOrId:e,callback:onStateChange} );
  }
  TEM.populateDOM( document.body, cb );
}


/*
 * Utility functions
 */
ESM.createInstanceOf = function( name ) {
  var n = null;
  if (typeof name == 'function')
    n = new name();
  else
    if (typeof name == 'string')
      if (eval('typeof '+name) == 'function')
        n = eval( 'new ' + name + '()' );
  return n;
}

ESM.setState = function( elemOrId, state, enable ) {
  var t = ESM.getElemObj( elemOrId );
  if (t)
    return t.setState( state, enable );
}

ESM.getElemObj = function( elemOrId ) {
  var e = TEM.getElemAttachment( elemOrId );
  if (e && e.userData)
    if (e.userData instanceof ESMElem)
      return e.userData;
  return null;
}

ESM.isEventInside = function( evelem, targ ) {
  var te = TEM.getElem( targ );
  var TEMe = TEM.getElemAttachment( evelem );
  if (TEMe)
    return TEM.isParentOf( te, TEMe.toElem );
  return false;
}

ESM.findParentElem = function( child ) {
  function matchFun( elem ) {
    return ESM.getElemObj( elem );
  }
  return TEM.findParent( child, matchFun );
}

ESM.setParentState = function( child, state, enable ) {
  if (!ESM.getElemObj( child ))
    child = ESM.findParentElem( child );
var id = child.id;
  var pe = child ? ESM.findParentElem( child.parentNode ) : child;
id = child.id;
  if (pe && state in {'focused':0,'clicked':0,'hover':0} && enable)
    TEM.postBurstEvent( state=='hover'?'mouse':state.substr(0,5), TEM.getElem(pe) );
  else
    if (pe)
      ESM.setState( pe, state, enable );
}

ESM.getCssRules = function( styleSheet ) {
  //(prevents script stopping with 'SecurityError: The operation is insecure.')
  //(seems not to be needed)
  var rules = null;
  if (styleSheet) {
    try {
      rules = styleSheet.rules || styleSheet.cssRules;
    }
    catch( e ) {
      rules = null;
    }
  }
  return rules;
}

/*apply doFun to document's style sheets*/
ESM.doStyles = function( doFun ) {
  if (document.styleSheets)
    for( var i=0, rules; i<document.styleSheets.length; i++ ) {
      rules = ESM.getCssRules( document.styleSheets[i] );
      if (rules)
        for( var x in rules )
          if (typeof rules[x].selectorText == 'string')
            if (doFun( rules[x] ))
              return rules[x];
    }
  return null;
}

/*find selector in doc's style sheets*/
ESM.findCssSelector = function( selector ) {
  function matchSel( rule ) {
    var seltxt = ' ' + rule.selectorText;
    var rexp = new RegExp( "\\b" + selector + "\\b", "i" );
    var n = seltxt.search( rexp );
    return n >= 0;
  }
  return ESM.doStyles( matchSel );
}

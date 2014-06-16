//
//transev.js, Transition Event Model (public domain)
//  tested with FF,Chrome,IE8(legacy)
//
//Extends elements with handlers to detect inside vs. outside and
//inside/outside transitions, also custom events possible.
//
//Handlers have the form:
//
//  <eventCategory>'Enter'|'Exit'|'Inside'|'Outside'
//
//Handlers are invoked by system events or by calls to:
//
//  TEM.burstEvent( eventCategory, insideElem )
//
//Inside and outside for an event category is tracked for each 
//element that handles TEM events.  The Enter and Exit handlers 
//are fired on transitions from outside to inside and vise versa.
//
//For example, for the 'click' event category:
//
//  clickEnter( elem ): 
//    A click inside after a click somewhere outside
//  clickExit( elem ):
//    A click outside after a click inside
//  clickInside( elem ): 
//    A click inside
//  clickOutside( elem ):
//    A click somewhere outside
//
//Events bubble up, but Enter/Exit handlers are not called when 
//transition is from one child to another.
//
//The other built-in event categories are:
//
//  'focus', focus is changing
//  'mouse', mouse/finger is moving
//  'up', mouse/finger is released
//  'down', mouse/finger is pressed
//
//All elements receive focus events.  TEM.getSystemFocus() can be
//used to determine if an element is receiving system focus
//(document.activeElement is the element that has system focus).
//
//Firing order: Enter before Inside, Exit before Outside, 
//events always bubble up from the bottom.
//
//During event firing, 'this' == [object TEMElem]:
//  userData:
//    any data attached with addEvent functions
//  toElem:
//    actual elem causing enter/inside, may be child
//  fromElem:
//    actual elem causing exit/outside, may be child
//  JSevent:
//    the original implicated JS event object (not normalized)
//
//TEM.addEvent( idOrElem, eventName, handler, userData )
//  attach an event to an element
//    idOrElem:
//      elem to attach the extended events to (id if string)
//    eventName: such as "mouseEnter"
//    userData: any data to be accessible during event firing
//
//TEM.addEvents( elemOrId, events, userData )
//  attach multiple events to an element
//    events:
//      structure containing event handlers to be attached
//        such as {mouse:{Enter:ome},click:{Inside:oci} }
//
//TEM.init( def array )
//  setup multiple elements:
//    def array iTEM {idOrElem,events,userData}
//      such as: {idOrElem:widget,
//                events:{mouse:{Enter:widgetOnMouseEnter}},
//                userData:widgetData}
//
//TEM.burstEvent( eventCategory, targetElem )
//  fire TEM events associated with an action
//    targetElem: destination (can be child/outside, null==outside all)
//
//
var TEM = {};
TEM.outsideElem = null;
TEM.error = "";


///////////////////////////////
/////JS event listeners
  TEM.OUTSIDE__normalize = function( eventJS, evTag, debugCombine ) {
    if (!eventJS)
      eventJS = window.event;
    if (!eventJS)
      return null;
    var targ = eventJS.target;
    if (!targ)
      targ = eventJS.srcElement;
    if (TEM.debuggr)
      TEM.debuggr.addJSev( eventJS, evTag, debugCombine );
    return targ;
  }
  TEM._curFocus = null; //(to stop repeating focus events)
  TEM._sysFocus = null; //(track focus)
  TEM.OUTSIDE__onfocus = function( eventJS ) {
    var targ = TEM.OUTSIDE__normalize( eventJS, "foc" );
    if (targ != TEM._curFocus) {
      var ev = eventJS;
      TEM._setFocus( ev );
      /*
      function sf() {  //(to delay focus until mouse is up)
        if (!TEM._curDown)
          TEM._setFocus( ev );
        else
          setTimeout( sf, 50 );
      }
      setTimeout( sf, 50 );*/
    }
  }
  TEM._setFocus = function( eventJS ) {
    var targ = TEM.OUTSIDE__normalize( eventJS, "foc" );
    TEM._sysFocus = targ;
    if (targ != TEM._curFocus)
      TEM.burstEvent( "focus", targ, eventJS );
    TEM._sysFocus = null;
    TEM._curFocus = targ;
  }
  TEM.OUTSIDE__onclick = function( eventJS ) {
    var targ = TEM.OUTSIDE__normalize( eventJS, "clk" );
    if (targ != TEM._curFocus)
      TEM.burstEvent( "focus", targ, eventJS );
    TEM._curFocus = targ;
    TEM.burstEvent( "click", targ, eventJS );
  }
  TEM._curDown = null; //(to make sure elem gets mouseup)
  TEM.OUTSIDE__onmousedown = function( eventJS ) {
    var targ = TEM.OUTSIDE__normalize( eventJS, "dn " );
    TEM._curDown = targ;
    TEM.burstEvent( "down", targ, eventJS );
  }
  TEM.OUTSIDE__onmouseup = function( eventJS ) {
    var targ = TEM.OUTSIDE__normalize( eventJS, "up " );
    if (TEM._curDown) {
      targ = TEM._curDown;
      TEM._curDown = null;
    }
    TEM.burstEvent( "up", targ, eventJS );
  }
  TEM.OUTSIDE__onmousemove = function( eventJS ) {
    var targ = TEM.OUTSIDE__normalize( eventJS, "mov", true );
    TEM.burstEvent( "mouse", targ, eventJS );
  }
/////


///////////////////////////////////
/////TEM elem (attached to element)
function TEMElem( elem ) {

  this._fire = function( evcatn, evn, JSevent ) {
    var funn = evcatn+evn;
    if (this[funn]) {
      this.fromElem = this[evcatn].fromElem;
      this.toElem = this[evcatn].toElem;
      this.JSevent = JSevent;
      if (!this.paused) {
        if (TEM.debuggr)
          TEM.debuggr.addEvent( this, evcatn, evn, 
                      evcatn=="mouse" && 
                           (evn=="Inside"||evn=="Outside"));
        this[funn]( this.elem );
      }
    }
  }

  this._inside = function( evcatn, JSevent ) {
    if (!this[evcatn].isInside) {
      this[evcatn].isInside = true;
      this._fire( evcatn, "Enter", JSevent );
    }
    this._fire( evcatn, "Inside", JSevent );
  }

  this._outside = function( evcatn, JSevent ) {
    if (this[evcatn].isInside) {
      this[evcatn].isInside = false;
      this._fire( evcatn, "Exit", JSevent );
    }
    this._fire( evcatn, "Outside", JSevent );
  }

  this._fireEvent = function( eventCategory, target, isInside, JSevent ) {
    if (!eventCategory)
      return;
    if (!this[eventCategory])
      this[eventCategory] = {fromElem:null, toElem:null, isInside:false};
    if (this[eventCategory].toElem)
      this[eventCategory].fromElem = this[eventCategory].toElem;
    this[eventCategory].toElem = target;
    if (isInside)
      this._inside( eventCategory, JSevent );
    else
      this._outside( eventCategory, JSevent );
  }

  function pauseEvents( ps ) {
    this.paused = ps;
  }
  this.pauseEvents = pauseEvents;

  function addEvent( eventName, handler, userData ) {
    this[eventName] = handler;
    if (userData)
      this.userData = userData;
    return true;
  }
  this.addEvent = addEvent;

  function getElem( ) {
    return this.elem;
  }
  this.getElem = getElem;

  this._createOutsideArray = function( ) {
    var oute = TEM.outsideElem;
    if (!oute)
      return null;
    oute.TEM_attachment = {outside:[this]};
    TEM.addEventListener( oute, "click", TEM.OUTSIDE__onclick, false );
    TEM.addEventListener( oute, "mousemove", 
              TEM.OUTSIDE__onmousemove, false );
    TEM.addEventListener( oute, "mouseup", 
              TEM.OUTSIDE__onmouseup, false );
    TEM.addEventListener( oute, "mousedown", 
              TEM.OUTSIDE__onmousedown, false );
    TEM.populateEventListener( oute, "focus", TEM.OUTSIDE__onfocus );
  }

  this._addToOutsideArray = function( ) {
    var oute = TEM.outsideElem;
    if (!oute)
      return null;
    if (oute.TEM_attachment && oute.TEM_attachment.outside)
      oute.TEM_attachment.outside[oute.TEM_attachment.outside.length] = this;
    else
      this._createOutsideArray();
    return oute.TEM_attachment.outside;
  }

  ///init
    this.elem = elem;
    elem.TEM_attachment = {obj:this};
    if (!TEM.outsideElem)
      TEM.outsideElem = document.body;
    if (!this._addToOutsideArray())
      TEM.setError( "no outside element" );
}
/////

///get element bursting system focus event (valid during event only)
TEM.getSystemFocus = function() {
  //if (document.activeElement)
    //return document.activeElement;
  return TEM._sysFocus;
}

///pause or resume event firing
TEM.pauseEvents = function( p ) {
  var o = TEM.outsideElem;
  if (o && o.TEM_attachment) {
    o = o.TEM_attachment.outside;
    for( var i=0; i<o.length; i++ )
      o[i].pauseEvents( p );
  }
}

///get all parents of target that are TEM evented elems
TEM.insideOf = function( target ) {
  var p = [];
  var par = TEM.findParentWithAttr( target, 'TEM_attachment' );
  while( par ) {
    if (par.TEM_attachment.obj)
      p[p.length] = par.TEM_attachment.obj;
    par = TEM.findParentWithAttr( par.parentNode, 'TEM_attachment' );
  }
  return p;
}

///fire all TEM events associated with action inside target(s)
TEM.burstEvent = function( eventCategory, targets, JSevent ) {
  var target = null;
  if (targets)
    if (typeof targets == 'array')
      target = targets[0];
    else
      target = targets;
  var o = TEM.outsideElem;
  if (o)
    o = o.TEM_attachment.outside;
  if (!o)
    return;
  var p = TEM.insideOf( target );
  //fire outside events
  for( var i=0; i<o.length; i++ ) {
    var insd = false;
    for( var j=0; j<p.length; j++ )
      if (o[i] == p[j]) {
        insd = true;
        break;
      }
    if (!insd)
      o[i]._fireEvent( eventCategory, target, false, JSevent );
  }
  //fire inside events
  for( var i=0; i<p.length; i++ )
    p[i]._fireEvent( eventCategory, target, true, JSevent );
}

///burst an event later
TEM.postBurstEvent = function( eventCategory, targets, JSevent ) {
  var ec = eventCategory, t = targets, e = JSevent;
  function doit() {
    TEM.burstEvent( ec, t, e );
  }
  setTimeout( doit, 10 );
}

///get TEM attachment of elem
TEM.getElemAttachment = function( elemOrId ) {
  var e = TEM.getElem( elemOrId );
  if (e && e.TEM_attachment)
    return e.TEM_attachment.obj;
  return null;
}

///get/create TEM attachment of elem
TEM.makeAttachment = function( elemOrId ) {
  var e = TEM.getElem( elemOrId );
  if (e) {
    if (!e.TEM_attachment)
      new TEMElem( e );
    if (e.TEM_attachment)
      return e.TEM_attachment.obj;
  }
  return null;
}

///add a TEM event to elem
TEM.addEvent = function( elemOrId, eventName, handler, userData ) {
  var ea = TEM.makeAttachment( elemOrId );
  if (!ea)
    return false;
  return ea.addEvent( eventName, handler, userData );
}

///add event handlers in category to elem
TEM.addCategoryEvents = function( 
                     elemOrId, eventCategory, events, userData ) {
  if (!events)
    return false;
  en = eventCategory + "Enter";
  TEM.addEvent( elemOrId, en, events.Enter, userData );
  en = eventCategory + "Exit";
  TEM.addEvent( elemOrId, en, events.Exit, userData );
  en = eventCategory + "Inside";
  TEM.addEvent( elemOrId, en, events.Inside, userData );
  en = eventCategory + "Outside";
  TEM.addEvent( elemOrId, en, events.Outside, userData );
}

///add events to elem
TEM.addEvents = function( elemOrId, events, userData ) {
  if (events)
    for( ec in events )
      TEM.addCategoryEvents( elemOrId, ec, events[ec], userData );
}

///add events to multiple elems
TEM.init = function( defs ) {
  for( var i=0; i<defs.length; i++ )
    TEM.addEvents( defs[i].elemOrId, defs[i].events, defs[i].userData );
}


///////////////////////////////
//Utility functions

///set error string
TEM.setError = function( elem, msg ) {
  TEM.error = "TEM error,elem:" + elem + " (id:'" + elem.id + "') " + msg;
  return false;
}

///find first parent node matching matchFun
TEM.findParent = function( elem, matchFun ) {
  if (elem == null)
    return null;
  do {
    if (matchFun( elem ))
      return elem;
    elem = elem.parentNode;
  }
  while( elem );
  return null;
}

///determine if par is parent of elem 
TEM.isParentOf = function( par, ch ) {
  function matchFun( elem ) {return (par==elem);}
  return TEM.findParent( ch, matchFun );
}

///find first parent node containing attr or attr=val
TEM.findParentWithAttr = function( elem, attrName, matchVal ) {
  function matchFun( elem ) {
    if (elem[attrName])
      if (!matchVal)
        return true;
      else
        if (elem[attrName] == matchVal)
          return true;
    return false;
  }
  return TEM.findParent( elem, matchFun );
}

///get elem from id as needed
TEM.getElem = function( elemOrElemId ) {
  if (elemOrElemId)
    if (typeof elemOrElemId == 'string')
      return document.getElementById( elemOrElemId );
  return elemOrElemId;
}

///add listener to JS event
TEM.addEventListener = function( elem, evtype, handler, f ) {
  if (elem.addEventListener)
    elem.addEventListener( evtype, handler, f );
  else
    if (elem.attachEvent)
      elem.attachEvent( 'on' + evtype, handler );
    else
      return false;
  return true;
}

///determine if elem can listen to events
TEM.isElemEventable = function( node ) {
  /*if (typeof node == "object" && "nodeType" in node &&
      node.nodeType == 1) */
  if (node)
    return node.addEventListener || node.attachEvent;
  return false;
}

///do something to part of DOM tree
TEM.populateDOM = function( e, cbfun ) {
  if (!e)
    return;
  if (cbfun)
    cbfun( e );
  var c = e.childNodes;
  if (!c)
    return;
  for( var i=0; i<c.length; i++ )
    TEM.populateDOM( c[i], cbfun );
}

///add an event listener to all eventable child nodes
TEM.populateEventListener = function( e, lis, lisfun, cntxt, cntxtData ) {
  function cb( ce ) {
    if (TEM.isElemEventable( ce )) {
      TEM.addEventListener( ce, lis, lisfun, false );
      if (cntxt && cntxtData)
        ce[cntxt] = cntxtData;
    }
  }
  TEM.populateDOM( e, cb );
}

///add attr to all eventable child nodes
TEM.populateAttr = function( e, cntxt, cntxtData ) {
  function cb( ce ) {
    if (TEM.isElemEventable( ce ))
      ce[cntxt] = cntxtData;
  }
  TEM.populateDOM( e, cb );
}

///normalize event targets to W3C standard (not used by TEM)
TEM.JStargetsNormalize = function( eventJS ) {
  var ev = {target:null,relatedTarget:null};
  if (!eventJS)
    eventJS = window.event;
  if (!eventJS)
    return null;
  ev.eventJS = eventJS;
  ev.target = eventJS.target || eventJS.srcElement;
  /*if (ev.target)
    if (eventJS.nodeType == 3) //Safari bug
      ev.target = ev.target.parentNode;*/
  //
  ev.relatedTarget = eventJS.relatedTarget || eventJS.fromElement;
  if ((eventJS.type == "mouseout") || (eventJS.type == "blur"))
    ev.relatedTarget = eventJS.relatedTarget || eventJS.toElement;
  return ev;
}


///////////////////////////////
//////debug module
function TEMDebuggerModule() {

  function showTrace( addstr ) {
    if (addstr)
      this.trace += addstr;
    if (this.callback)
      this.callback( this.trace ), this.trace="";
    else
      this.trace += "<br/>";
  }
  this.showTrace = showTrace;

  function addJSev( eventJS, evstr, debugCombine ) {
    if (!this.addJSevents)
      return;
    var ev = TEM.JStargetsNormalize( eventJS );
    if (debugCombine)
      if (this.lastElem == ev.target)
        return;
    this.lastElem = ev.target;
    if (evstr) {
      if (ev.target)
        this.trace += "---JS:" + 
                      evstr + ",target:" + 
                      "id='"+ev.target.id+"'";
      else
        this.trace += " [" + evstr + "]";
      if (ev.relatedTarget)
        this.trace += ",reltarget:" + 
                      "id='"+ev.relatedTarget.id+"'";
      this.trace += "---";
      this.showTrace();
    }
  }
  this.addJSev = addJSev;

  function fmtid( id, tag ) {
    var et = "";
    if (tag)
      et += tag + ":";
    et += "'" + id + "'";
    return et;
  }
  this.fmtid = fmtid;

  function fmtdet( e, tag ) {
    if (!e)
      return "";
    var et = "\r\n<br/>&nbsp;&nbsp;&nbsp;&nbsp;" + tag;
    et += ":" + e;
    et += "\r\n<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
    if (e.id)
      et += " (" + this.fmtid( e.id, "id" ) + ")";
    var xep = TEM.insideOf( e );
    if (xep.length) {
      if (xep.length > 1)
        et += 
"\r\n<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
      et += " in ";
      for( var i=0; i<xep.length; i++ ) {
        et += this.fmtid(xep[i].elem.id);
        if ((i+1) < xep.length)
          et += ",";
      }
    }
    else
      et += " in outside";
    return et;
  }
  this.fmtdet = fmtdet;

  function fmtevn( xelem, evc, evn ) {
    var t = evc+evn;
    if (this.classes[evc])
      t = "<span class='" + this.classes[evc] + "'>" + t + "</span>";
    else
      t = "<span style='" + this.styles[evc] + "'>" + t + "</span>";
    return t;
  }
  this.fmtevn = fmtevn;

  function fmtEvent( xelem, evc, evn ) {
    var vt = "[" + this.evi + "] " + this.fmtid(xelem.elem.id) + ", " + 
             this.fmtevn( xelem, evc, evn );
    if (this.details) {
      if (xelem.fromElem)
        vt += this.fmtdet(xelem.fromElem,"from");
      vt += this.fmtdet(xelem.toElem,"&nbsp;&nbsp;to");
    }
    return vt;
  }
  this.fmtEvent = fmtEvent;

  function addEvent( xelem, evc, evn, combine ) {
    if (!this.addTEMevents)
      return;
    if (combine)
      if (xelem.fromElem == xelem.toElem)
        return;
    if (this.eventsExclude)
      for( var i=0; i<this.eventsExclude.length; i++ )
        if ((this.eventsExclude[i] == evn) ||
            (this.eventsExclude[i] == evc))
          return;
    this.trace += this.fmtEvent( xelem, evc, evn );
    this.showTrace();
    this.evi++;
  }
  this.addEvent = addEvent;

  ///init
    this.evi = 1;
    this.addJSevents = false;
    this.addTEMevents = true;
    this.trace = "";
    this.lastElem = null;
    this.classes = {mouse:null,click:null,focus:null};
    this.styles = {mouse:"color:green;",click:"color:red;",focus:"color:blue;"};
  ///
}
TEM.debuggr = null;
TEM.debuggerStart = function() {
  TEM.debuggr = new TEMDebuggerModule();
  return TEM.debuggr;
}


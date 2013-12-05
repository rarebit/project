/*
  Crude rarebit client
*/


var demoSeedData = JSON.stringify( {
  "A pretend transaction (partial)": {
    "hash": "acbeaeecdfacadceaaae1becdfaffabcadee9bddfcfaaadcedaaeeafabcdbdf0",
    "time": "2013-08-03 11:53:17",
    "out": [
      {
        "comment": "funding for seeding and fees " +
                   "(3rd output of transaction)",
        "index": 2,
        "value": "10.0",
        "Address": "196A3G4M5xf16jdSxY3LiRwb1AQZ4o5SzH"
      }
    ]
  }
}, null, 2 );
var demoStatement = "Hello world";
var demoIssuer = "wind glue oat golf ear mug seat wave wire";
var demoOwner = "wine tale bits oval sine rose drab if weld song when";
var demoOwnerPub = "";
var demoOwner2Pub = 
  "04f49a2b697137978bb31d8059d94dce7e713c2e023805d18eb0"+
  "1f7e2f469747642e90ff2a3817ed9165392d7ebe879ea5e508ff"+
  "d19d9dee98956ca5f35a587fa5";
var demoSeedKey = "5JQZWoGQWGPMDwtuUkR5ri6PaLVQpfegCykXVtW41uDbKsGSqoj";


/*
UI helpers
*/
function getel( id ) {
  var e = document.getElementById( id ), v = "";
  if (e)
    if ((e instanceof HTMLInputElement) ||
        (e instanceof HTMLTextAreaElement))
      v = e.value;
    else
      v = e.innerHTML;
  return v;
}
function setel( id, v ) {
  v = v ? v : "";
  var e = document.getElementById( id );
  if (e)
    if ((e instanceof HTMLInputElement) ||
        (e instanceof HTMLTextAreaElement))
      e.value = v;
    else
      e.innerHTML = v;
}
function setelin( id, v ) {
  if (!getel( id ))
    setel( id, v );
}
function selectPane( pane ) {
  var btns = ['certbtn','seedbtn','issuebtn','transferbtn',
               'provenancebtn','utilbtn','introbtn'];
  var panes = ['certpane','seedpane','issuepane','transferpane',
               'provenancepane','utilpane','intropane'];
  for( var n=0; n<panes.length; n++ )
    if (panes[n] == pane)
      document.getElementById(btns[n]).className = "toggledpanebtn",
      document.getElementById(pane).className = "visiblepane";
    else
      document.getElementById(btns[n]).className = "panebtn",
      document.getElementById(panes[n]).className = "hiddenpane";
}


/*
  body onload()
*/
function pgload() {
  setelin( "cert_statement", demoStatement  );
  setelin( "cert_key", demoIssuer  );
  setelin( "txdb_data", demoSeedData );
  setelin( "origtx_seedkey", demoSeedKey );
  setelin( "xfertx_seedkey", demoSeedKey );
}


/*
  create a signed certificate 
*/
function certCreate() {
  var res = "", cid = "", json = "", issuer = "";
  try { 
    if (!getel( "cert_key" ))
      throw new Error( "Private key/passphrase needed" );
    var cert = Rarebit.createCertificate( 
                              {work:getel("cert_statement")},
                              getel("cert_key") );
    cid = cert.getCID();
    issuer = cert.getSigner();
    json = cert.toString( 2 );
    setel( "origtx_cert", json );
    setel( "origtx_key", getel("cert_key") );
    setel( "origtx_err", "" );
    setel( "xfertx_err", "" );
    setel( "ver_JSON", json );
    setel( "ver_err", "" );
  }
  catch( e ) {
    res = "X &nbsp; " + e.toString();
  }
  setel( "cert_JSON", json );
  setel( "cert_CID", cid );
  setel( "cert_issuer", issuer );
  setel( "cert_err", res );
}


/*
  verify a certificate 
*/
function certVerify() {
  var res = "", cid = "", issuer = "";
  try { 
    var cert = Rarebit.createCertificateFromJSON( getel("ver_JSON") );
    cid = cert.getCID();
    issuer = cert.getSigner();
  }
  catch( e ) {
    res = "X &nbsp; " + e.toString();
  }
  setel( "ver_CID", cid );
  setel( "ver_issuer", issuer );
  setel( "ver_err", res );
}


/*
  verify transaction cache 
*/
function txdbCreate() {
  var res = "", jsondb = "";
  try { 
    var seed = Rarebit.Tx.createSeedWallet( 
                           getel("txdb_data"), [] );
    res = "OK";
  }
  catch( e ) {
    res = "X &nbsp; " + e.toString();
  }
  setel( "txdb_err", res );
}


/*
  add/reset/show lot qtys in origination tx 
*/
var origtx_qtys = [], origtx_multlotsenabled = false;
function origtxLotsShowQtys( ) {
  var html = "";
  if (origtx_qtys.length)
    html = "<br/>";
  for( var i=0, tq='0'; i<origtx_qtys.length; i++ )
    html += i ? ", " : "",
    html += "<span class='tt qty'>" + origtx_qtys[i] + "</span>",
    html += "<span class='small'> units</span>",
    tq = Rarebit.Tx.addQty( tq, origtx_qtys[i] );
  if (origtx_qtys.length > 1)
    html += "<br/><br/><span class='tt qty'>" + tq + "</span>" +
            "<span class='small'> total units to issue</span>";
  setel( "origtx_qtys", html );
}
function origtxLotsAddQty( ) {
  var q = Rarebit.Tx.cleanQty( getel("origtx_qty") );
  if (Rarebit.Tx.compareQtys( q, '0' ) > 0)
    origtx_qtys.push( q ),
    origtxLotsShowQtys(),
    setel( "origtx_err", "" );
  else
    if (!origtx_multlotsenabled)
      throw new Error( "X &nbsp; Qty > 0 needed" );
    else
      setel( "origtx_err", "X &nbsp; Qty > 0 needed" );
}
function origtxLotsClear() {origtx_qtys=[]; origtxLotsShowQtys();}


/*
  create new origination tx 
*/
function origtxCreate() {
  var res = "", cid = "", issuer = "", json = "", jsondb = "", raw = "";
  var issuerkey = "", seedkey = "", qty = "", jsoncert;
  try { 
    if (origtx_multlotsenabled && !origtx_qtys.length)
      throw new Error( "No lots added" );
    if (!origtx_multlotsenabled)
      origtxLotsClear(),
      origtxLotsAddQty();
    var cert = Rarebit.createCertificateFromJSON( 
                           getel("origtx_cert") );
    var seed = Rarebit.Tx.createSeedWallet( 
                           getel("txdb_data"),
                           [getel("origtx_seedkey")] );
    var tx = Rarebit.Tx.createOrigination( 
                           cert, 
                           getel("origtx_key"), 
                           origtx_qtys,
                           seed, 
                           getel("origtx_fee") );
    issuer = cert.getSigner();
    cid = cert.getCID();
    json = Rarebit.Tx.toJSON( tx );
    json = JSON.stringify( JSON.parse('{"1":'+json+'}'), null, 2 );
    raw = Rarebit.Tx.toRaw( tx );
    //propagate to other panes
    Rarebit.Tx.addDataToWallet( json, seed );
    setel( "txdb_data", Bitcoin.ImpExp.BBE.export(seed).text );
    setel( "xfertx_cert", cert.toString(2) );
    setel( "xfertx_key", getel("origtx_key") );
    setel( "xfertx_seedkey", getel("origtx_seedkey") );
    if (!getel( "xfertx_pub"))
      demoOwnerPub = Bitcoin.Address.fromPrivOrPass(demoOwner).pubHex,
      setel( "xfertx_pub", demoOwnerPub );
    xfertxSetup( null, cert );
  }
  catch( e ) {
    res = "X &nbsp; " + e.toString();
  }
  lotsSetup( cid, issuer );
  origtxLotsClear();
  setel( "origtx_JSON", json );
  setel( "origtx_raw", raw );
  setel( "origtx_issuer", issuer );
  setel( "origtx_CID", cid );
  setel( "origtx_err", res );
}


/*
  prep qty for new transfer tx 
*/
function xfertxSetup( seed, cert ) {
  if (!seed)
    seed = Rarebit.Tx.createSeedWallet( 
                           getel("txdb_data"),
                           [getel("xfertx_seedkey")] );
  xfertxNewOwnersClear();
  var t = xfertxGetTotal( seed, cert );
  setel( "xfertx_qty", t?t:"" );
  setel( "xfertx_err", "" );
}
function xfertxGetTotal( seed, cert ) {
  var ownkey = getel( "xfertx_key" );
  if (!ownkey)
    return null;
  var owner = Bitcoin.Address.fromPrivOrPass(ownkey).addressStr;
  var res = Rarebit.Tx.queryLots( seed, cert.getCID(), 
                                  cert.getSigner(), owner );
  return res.ttlqty;
}
function xfertxGetAvail() {
  res = "";
  try {
    var cert = Rarebit.createCertificateFromJSON( getel("xfertx_cert") );
    var seed = Rarebit.Tx.createSeedWallet( 
                           getel("txdb_data"),
                           [getel("xfertx_seedkey")] );
    var aq = Rarebit.Tx.sumQtys( xfertx_newowners );
    var tq = xfertxGetTotal( seed, cert );
    if (!tq)
      throw new Error( "Current owner's private key needed" );
    return Rarebit.Tx.subtractQty( tq, aq );
  }
  catch( e ) {
    res = "X &nbsp; " + e.toString();
  }
  setel( "xfertx_err", res );
}


/*
  add/reset/show new owners in transfer tx
*/
var xfertx_newowners = [];
function xfertxNewOwnersShow( avail ) {
  var html = "";
  if (xfertx_newowners.length)
    html = "<br/>";
  for( var i=0; i<xfertx_newowners.length; i++ )
    html += i ? "<br/>" : "",
    html += "<span class='tt qty'>" + xfertx_newowners[i].qty + "</span>",
    html += " <span class='small'>units to</span> " + 
            "<span class='tt owner'>" + 
            Rarebit.Tx.verifyPubKey(xfertx_newowners[i].pubkey) + "</span>";
  if (xfertx_newowners.length > 1)
    html += "<br/><br/><span class='tt qty'>" + 
            Rarebit.Tx.sumQtys(xfertx_newowners) + "</span>" +
            "<span class='small'> to transfer</span>";
  if (avail)
    html += xfertx_newowners.length > 1 ? ", " : "<br/><br/>",
    html += "<span class='tt qty'>" + avail + "</span>" +
            "<span class='small'> remaining</span>";
  setel( "xfertx_newowners", html );
}
function xfertxNewOwnerAdd( toavail ) {
  res = "";
  try {
    var aq = xfertxGetAvail();
    if (!aq) return;
    var q = toavail ? aq : Rarebit.Tx.cleanQty( getel("xfertx_qty") );
    if (Rarebit.Tx.compareQtys( q, '0' ) <= 0)
      throw new Error( "Qty > 0 needed" );
    if (Rarebit.Tx.compareQtys( q, aq ) > 0)
      throw new Error( "Available quantity exceeded" );
    Rarebit.Tx.verifyPubKey( getel("xfertx_pub") );
    xfertx_newowners.push( {pubkey:getel("xfertx_pub"), qty:q} );
    xfertxNewOwnersShow( Rarebit.Tx.subtractQty(aq,q) );
  }
  catch( e ) {
    res = "X &nbsp; " + e.toString();
  }
  setel( "xfertx_err", res );
}
function xfertxNewOwnersClear() {xfertx_newowners=[]; xfertxNewOwnersShow();}



/*
  create new transfer tx 
*/
function xfertxCreate() {
  var res = "", cid = "", issuer = "", json = "", raw = "";
  try { 
    if (!xfertx_newowners.length)
      throw new Error( "New owners needed" );
      //xfertx_newowners.push( {qty:'0',pubkey:getel('xfertx_pub')} );
    var cert = Rarebit.createCertificateFromJSON( getel("xfertx_cert") );
    var seed = Rarebit.Tx.createSeedWallet( 
                           getel("txdb_data"),
                           [getel("xfertx_seedkey")] );
    var sel = Rarebit.Tx.selectLotsToSpend( 
                           cert, 
                           [getel("xfertx_key")], 
                           seed, 
                           xfertx_newowners );
    var tx = Rarebit.Tx.createTransfer( 
                           cert,
                           sel.lots,
                           sel.newowners,
                           seed,
                           getel("xfertx_fee") );
    issuer = cert.getSigner();
    cid = cert.getCID();
    json = Rarebit.Tx.toJSON( tx );
    json = JSON.stringify( JSON.parse('{"1":'+json+'}'), null, 2 );
    raw = Rarebit.Tx.toRaw( tx );
    //propagation
    Rarebit.Tx.addDataToWallet( json, seed );
    setel( "txdb_data", Bitcoin.ImpExp.BBE.export(seed).text );
    if (!demoOwnerPub)
      demoOwnerPub = Bitcoin.Address.fromPrivOrPass(demoOwner).pubHex;
    if (xfertx_newowners[0].pubkey.toString() == demoOwnerPub)
      setel( "xfertx_key", demoOwner ),
      setel( "xfertx_pub", demoOwner2Pub );
    xfertxSetup( null, cert );
  }
  catch( e ) {
    res = "X &nbsp; " + e.toString();
  }
  lotsSetup( cid, issuer );
  setel( "xfertx_JSON", json );
  setel( "xfertx_raw", raw );
  setel( "xfertx_CID", cid );
  setel( "xfertx_issuer", issuer );
  setel( "xfertx_err", res );
}


/*
  find lots
*/
function lotsFind() {
  function clker( lot, err ) {
    var html = '"' + "lotTrace_('lots1'," + 
               "'" + lot.txhash + "'," + lot.txoutindex + 
               ",null," + (err?"true":"false") +  
               //",'" + getel("lots_issuer") + "'" + 
               ");" + '"';
    return "<button class='btngo med' onclick=" + 
           html + 
           ">show trace</button>";
  }
  function txinfo( lot ) {
    return "<span class='med tt'>tx:" + lot.txhash.substr(0,15) + 
           "...</span>" +
           " &nbsp; &nbsp; " +
           "<span class='med tt'>index:" + lot.txoutindex + "</span>";
  }
  function populateinvlotlist( lots ) {
    var html = "";
    if (lots.length)
      html = lots.length + " invalid lots<br/><br/>";
    for( var i=0; i<lots.length; i++ )
      html += "<span class='med'>" + 
              lots[i].provenance.err + "</span>" +
              "<br/> &nbsp; &nbsp; " +
              txinfo(lots[i]) + " &nbsp; &nbsp; " + 
              clker(lots[i],lots[i].provenance.recerr.substr(0,4)=='Orig')               + "<br/>";
    return html;
  }
  function populatelotlist( lots, ttlqty ) {
    var html = "";
    if (lots.length)
    html = lots.length + " valid unspent lots " +  
           "(<span class='tt qty'>" + 
           ttlqty + "</span> total units)<br/><br/>";
    for( var i=0; i<lots.length; i++ )
      html += "<span class='tt qty'>" + lots[i].provenance.qty + 
              "</span>" +
              " &nbsp; &nbsp; " +
              "<span class='tt owner'>" + 
                                  lots[i].provenance.owner + "</span>" +
              "<br/> &nbsp; &nbsp; " +
              txinfo(lots[i]) + " &nbsp; &nbsp; " + clker(lots[i]) +
              "<br/>";
    return html + "<br/>";
  }
  var res = "", qlr = {lots:[],invalidlots:[]};
  try { 
    lotsSetup();
    var seed = Rarebit.Tx.createSeedWallet( 
                           getel("txdb_data"), [] );
    qlr = Rarebit.Tx.queryLots( 
                           seed, 
                           getel("lots_CID"),
                           getel("lots_issuer"),
                           getel("lots_owner") );
    if (!qlr.lots.length && !qlr.invalidlots.length)
      res = "No matching lots found";
  }
  catch( e ) {
    res = "X &nbsp; " + e.toString();
  }
  setel( "lots_valid", populatelotlist(qlr.lots,qlr.ttlqty) );
  setel( "lots_invalid", populateinvlotlist(qlr.invalidlots) );
  setel( "lots_err", res );
}
function lotsSetup( cid, issuer ) {
  if (cid) setel( "lots_CID", cid );
  if (issuer) setel( "lots_issuer", issuer );
  setel( "lots_valid", "" );
  setel( "lots_invalid", "" );
  setel( "lots_err", "" );
  traceSetup( "lots1" );
}


/*
  trace lot 
*/
function lotTrace_( id, txhash, txoutindex, issuerinp, origerr ) {
  var res = "", json = "", cid = "", 
      issuer = "", issuererr = "", owner = "", qty = "";
  try { 
    var seed = Rarebit.Tx.createSeedWallet( 
                           getel("txdb_data"), [] );
    trace = Rarebit.Tx.traceLotProvenance( 
                           seed, 
                           txhash,
                           txoutindex,
                           issuerinp );
    json = JSON.stringify( trace, null, 2 );
    if (trace.err)
      res = trace.err;
    else
      cid = trace.CID, issuer = origerr?"":trace.issuer, 
      issuererr = origerr?trace.issuer:"",
      owner = trace.owner, qty = trace.qty;
  }
  catch( e ) {
    res = "X &nbsp; " + e.toString();
  }
  traceSetup( id, json, cid, issuer, owner, qty, res, issuererr );
}
function traceSetup( id, json, cid, issuer, owner, qty, res, issuererr ) {
  setel( id+"_graph", json );
  setel( id+"_CID", cid );
  setel( id+"_issuer", issuer );
  setel( id+"_issuererr", issuererr );
  setel( id+"_owner", owner );
  setel( id+"_qty", qty );
  setel( id+"_err", res );
}


/*
  trace lot from hash,index user entries
*/
function lotTrace() {
  lotTrace_( "lottrace", getel("lottrace_hash"), 
             getel("lottrace_index"), getel("lottrace_issuerinp") );
}


/*
  gen or mine keypair 
*/
function genKey( key ) {
  try { 
    if (key && key.length < 20)
      throw new Error( "20 or more chars expected for passphrase" );
    var keyinfo = Bitcoin.Address.fromPrivOrPass( key, key_to_english );
    genSetup( keyinfo );
  }
  catch( e ) {
    setel( "gen_addr", "" );
    setel( "gen_priv", "" );
    setel( "gen_pub", "" );
    setel( "gen_err", "X &nbsp; " + e.toString() );
  }
}
function genSetup( keyinfo, err ) {
  setel( "gen_key", keyinfo.pass ? keyinfo.pass : keyinfo.privateStr );
  setel( "gen_addr", keyinfo.addressStr );
  setel( "gen_priv", keyinfo.privateStr );
  setel( "gen_pub", keyinfo.pubHex );
  setel( "gen_err", err?err:"" );
}
var gen_mining = false;
var gen_cancelled = false;
function genMine( ) {
  if (gen_mining)
    return genMinedone();
  function testsub( id ) {
    if (getel(id) &&  // /^[1-9A-HJ-NP-Za-km-z]+$/
        getel(id).replace( Bitcoin.Base58.validRegex, '' ))
      return setel( "gen_err", "Invalid chars in substring" );
    return true;
  }
  if (!getel( "gen_sub1" ))
    return setel( "gen_err", "Substring needed" );
  if (!testsub( "gen_sub1" ) || !testsub( "gen_sub2" ) || 
      !testsub( "gen_sub3" ))
    return false;
  gen_cancelled = false;
  gen_mining = true;
  setel( "gen_mine", "Cancel" );
  function cb( msg, i, keyinfo ) {
    if (gen_cancelled)
      return true;
    if (keyinfo)
      genSetup( keyinfo, "Calculating ("+(i+1)+")..." );
    if (msg == "complete")
      genMinedone( "Vanity substring found ("+(i+1)+" addresses tested)" );
  }
  Bitcoin.Address.mine( 
       [getel("gen_sub1"),getel("gen_sub2"),getel("gen_sub3")], 
       cb, key_to_english );
}
function genMinedone( msg ) {
  gen_cancelled = true;
  gen_mining = false;
  setel( "gen_mine", "Mine" );
  setel( "gen_err", msg?msg:"" );
}


/*
  Rarebit client *WEB1*
*/
var _testnet = true;
var txHRef = 'https://btc.blockr.io/tx/info/';
if (_testnet)
  //txHRef = 'https://blockexplorer.com/testnet/tx/';
  txHRef = "https://tbtc.blockr.io/tx/info/";
var addrHRef = 'http://btc.blockr.io/address/info/';
if (_testnet)
  //addrHRef = 'https://blockexplorer.com/testnet/address/';
  addrHRef = "https://tbtc.blockr.io/address/info/";
var lineclass = "fmtline";
var sublineclass = "fmtsubline";
var smallclass = "f0 tminus4 small";
var ownerclass = "f1 owner";
var authorclass = "f1 author";
var CIDclass = "f1 CID";
var qtyclass = "f1 qty";
var qtytagclass = "f0 tminus6 qtytag";
var tagclass = "f0 tminus6 tag";
var smtagclass = "f0 tminus8 tag";
var qtysumclass = "qtysum";
var intclass = "f1 int";
var szclass = "f1 sz";
var txhashclass = "f1 txhash";

var demoSeedData = JSON.stringify( {
  "A pretend transaction": { 
    comment: "seed funding for demo identity",
    "hash": "acbeaeecdfacadceaaae1becdfaffabcadee9bddfcfaaadcedaaeeafabcdbdf0",
    "time": "2013-08-03 11:53:17",
    "out": [ {
        "comment": "3rd output of transaction, spendable with passphrase " + 
                   "'demo identity (seeded with 1.00 btc)'",
        "index": 2,
        "value": "1.0",
        "Address": "1ArE1GD53bYqtUWLUJePyW11sifdChiLsm"
      }
    ]
  }
}, null, 2 );
//var demoIssuer = "wind glue oat golf ear mug seat wave wire";
var demoOwner = "wine tale bits oval sine rose drab if weld song when";
var demoOwnerPub = "";
var demoOwner2Pub = 
  "04f49a2b697137978bb31d8059d94dce7e713c2e023805d18eb0"+
  "1f7e2f469747642e90ff2a3817ed9165392d7ebe879ea5e508ff"+
  "d19d9dee98956ca5f35a587fa5";
//var demoSeedKey = "5JQZWoGQWGPMDwtuUkR5ri6PaLVQpfegCykXVtW41uDbKsGSqoj";
var demoSeedKey = "demo identity (seeded with 1.00 btc)";


/*
  some globals
*/
var contentHashKey = null;
var seedWallet = null;


/*
  body onload()
*/
function pgload() {
  contentClear();
  seedClear( true );
  origtxClear();
  xfertxClear();
  genClear();
  setelin( 'txdb_data', demoSeedData );
  setelin( 'gen_key', demoSeedKey );
  if (!Rarebit)
    return alert( "Some app files did not fully load (rarebit).  Page reload needed." );
  if (!Bitcoin)
    return alert( "Some app files did not fully load (bitcoinjs).  Page reload needed." );
  if (!Bitcoin.ImpExp)
    return alert( "Some app files did not fully load (ImpExp).  Page reload needed." );
  if (!ESM || !TEM)
    return alert( "Some app files did not fully load (ESM/TEM).  Page reload needed." );
  if (!Bitcoin.Wallet.prototype.queryOutputs)
    return alert( "Some app files did not fully load (mbitcoinjs).  Page reload needed." );
}


/*
  position media TODO
*/
function positionImg( imgel, xfit, yfit ) {
  var w = imgel.width;
  var h = imgel.height;
}


/*
  open media
*/
function clrimgel( imgid ) {
  id2el(imgid).src = "";
  clrel( imgid );
}
function setimgel( iid, src, ty ) {
  var imgid = iid;
  var imgel = id2el( iid );
  var typ  = ty;
  showel( imgid );
  function onerr( ev ) {
    clrel( imgid );
    //setelv( 'cert_mediafail', "Browser unable to play media (content "+typ+" OK)" );
    //showel( 'cert_mediafail' );
  }
  imgel.addEventListener( 'error', onerr, false );
  imgel.src = src;
}
function setImg( file, imgid ) {
  clrimgel('cert_img'), clrimgel('cert_video'), clrimgel('cert_audio');
  var t = file.type;
  var targel = t.match( /image.*/ ) ? 'cert_img' : "";
  targel = t.match( /video.*/ ) ? 'cert_video' : targel;
  targel = t.match( /audio.*/ ) ? 'cert_audio' : targel;
  if (!targel)
    return t;
  setelv( 'content_stat', "Loading media content..." );
  var reader = new FileReader();
  reader.onload = function( e ) { 
    setimgel( targel, e.target.result, t );
  }
  reader.readAsDataURL( file );
  return t;
}



/*
  process content
*/
function contentShowNew( ) {
  setelv( 'content_hash', contentHashKey.toString() );
  setelv( ['cert_CID','content_CID','lots_CID','seed_CID'], 
          contentHashKey.getIDStr() );
  setelv( 'content_stat', "" );
  seedReshow();
  lotsSetup( getelv('content_CID') );
}
function hashFile( file ) {
  function hf() {
    var reader = new FileReader();
    reader.onerror = function( e ) {
      setelv( 'content_stat', "" );
      setTimeout( function() {
        setelv( 'content_err', 
         "Failed reading file (see section help if using Chrome)" )}, 20 );
    }
    reader.onload = function( e ) { 
      var c = new Uint8Array( e.target.result );
      contentShowSize( c.length );
      contentHashKey = new Rarebit.HashKey();
      contentHashKey.setFromContent( c );
      contentShowNew();
    }
    reader.readAsArrayBuffer( file );
  }
  setelv( 'content_stat', "Hashing content..." );
  setTimeout( hf, 50 );
}
function shortName( n ) {
  return n.length > 34 ? n.substr(0,31)+"..." : n;
}


function seterr( id, e ) {
  setelv( ['cert_err','content_err','seed_err','origtx_err',
           'xfertx_err','lots_err','lots1_err','txdb_err'], 
          "" );
  setelv( id, err(e) );
}


/*
  open and hash media 
*/
function contentShowSize( sz ) {
  setelv( 'content_size', fmtsz(sz) );
}
function contentShowInfo( ft, name, hash, size ) {
  if (ft) setelv( ['content_type'], ft?ft:"[undefined]" );
  if (name) {
    setelv( ['cert_name','content_name'], shortName(name) );
    id2el('cert_name').title = name;
    id2el('content_name').title = name;
  }
  if (hash) setelv( 'content_hash', hash );
  if (size) contentShowSize( size );
}
function contentClear( reset ) {
  contentHashKey = null;
  setelv( ['content_err','content_type','content_size','content_name','cert_name',
           'cert_CID','content_CID','seed_CID',
           'content_hash'], "" );
  reset ? clrel( 'content_none' ) : showel( 'content_none' );
}
function contentOpen( file ) {
  contentClear( true );
  var res = "", ft = "", name = "";
  try {
    ft = setImg( file, "cert_img" );
    hashFile( file );
    name = file.name;
  }
  catch( e ) {
    res = e;
  }
  contentShowInfo( ft, name );
  seterr( "content_err", res );
}


/*
  open seed wallet
*/
function seedSetAvail( seed ) {
  if (!seed) seed = seedWallet;
  var out = seed.selectOutputs();
  var bal = fmtval( out.avail );
  setelv( ['seed_avail'], bal.length>6?bal:bal+"&nbsp;&nbsp;" );
  /*
  var vals = fmtvals( out.outsStats, ' ', 'value' );
  var uns = "";
      uns = fmtlist( out.outsStats,
                     [ {typ:'val', pad:' ', getitem:function(i){return vals[i]}},
                       {typ:'tag', item:' FROM '},
                       {typ:'txhash', len:17, b64:true, item:'txHash'} ] );
  setelv( 'seed_availouts', uns );
  */
}
function seedReshow( ) {
  if (!seedWallet)
    return seedClear();
  var ki = seedKey;
  var seed = seedWallet;
  setelv( ['seed_addr'], ki?fmtaddr(ki.addressStr):
                            "<span class='tminus2'>[specify/create key]</span>" );
  setelv( ['gen_testnetaddr'], (ki&&_testnet)?fmtaddr(ki.addressStr,0,0,true):"" );
  if (ki) seedSetAvail( seed );
  if (getelv( 'cert_CID' )) {
    var s = Rarebit.Tx.queryLots( seed, getelv('cert_CID') );
    if (s.lots.length && s.lots[0].issuer != ki.addressStr)
      setelv( 'seed_issuer', fmtaddr(s.lots[0].issuer,0,authorclass) );
    var t = xfertxSetup();
    if (Rarebit.Tx.isQtyZero( t ))
      setelv( 'seed_lots', "" );
    else
      setelv( 'seed_lots', fmtqty(t) );
  }
}
var seedKey = null;
function seedResetDB( keyerrid ) {
  delete seedWallet;
  var ki = seedKey;
  seedWallet = Rarebit.Tx.createSeedWallet( getelv('txdb_data'), ki?[ki.key]:null );
  seedReshow();
}
function seedReset( keyerrid, rand ) {
  seedKey = genKey( rand );
  seedResetDB( keyerrid );
  return seedKey;
}
function seedClear( start ) {
  seedWallet = seedKey = null;
  setelv( ['gen_addr','seed_lots','seed_issuer',
           'seed_avail','seed_availouts','seed_err','gen_err'], "" );
}
function seedOpen( rand ) {
  var res = "";
  seedClear();
  origtxClear();
  xfertxClear();
  try {
    seedReset( 'gen_err', rand );
    return true;
  }
  catch( e ) {
    seterr( 'gen_err', e );
  }
}
function sync( ) {
  var addrs = [];
  if (seedKey)
    addrs.push( seedKey.addressStr );
  if (getelv('content_CID'))
    addrs.push( '1'+getelv('content_CID').substr(1) );
  if (getelv('lots_CID'))
    if (getelv('lots_CID') != getelv('content_CID'))
      addrs.push( '1'+getelv('lots_CID').substr(1) );
  if (getelv('lots_issuer'))
    if (getelv('lots_issuer') != getelv('seed_addr'))
      addrs.push( getelv('lots_issuer') );
  if (getelv('lots_owner'))
    if (getelv('lots_owner') != getelv('seed_addr'))
      if (getelv('lots_owner') != getelv('lots_issuer'))
        addrs.push( getelv('lots_owner') );
  if (!addrs.length)
    return warn( 'sync_err', "Nothing to load" );
  if (!seedWallet)
    seedResetDB( 'sync_err' );
  if (!seedWallet)
    return;
  var err = false;
  var callbacks = {
    onprogress: function() {warn('sync_stat',"Downloading data...");},
    onerror: function( msg ) {warn('sync_err',msg);err=true;},
    oncomplete: function( wallet, txsin ) {
      if (err && !txsin) return;
      setelv( "txdb_data", Bitcoin.ImpExp.BBE.export(seedWallet).text );
      warn( 'sync_stat',
            "Sync complete" );  // (" + txsin + " transactions imported)" );
      setelv( 'sync_err', "" );
      seedReshow();
    }
  }
  Bitcoin.ImpExp.Sync.loadAddrs( seedWallet, callbacks, addrs, null, _testnet );
}


/*
  verify transaction cache 
*/
function txdbCreate() {
  try { 
    seedResetDB( 'txdb_err' );
    seterr( "txdb_err", "OK" );
  }
  catch( e ) {
    seterr( 'txdb_err', e );
  }
}


/*
  new tx verification/send
*/
function newtxSetupVerify( tx, idpre ) {
  var json = Rarebit.Tx.toJSON( tx );
  var txhash = JSON.parse(json).hash;
  json = JSON.stringify( JSON.parse('{"1":'+json+'}'), null, 2 );
  raw = Rarebit.Tx.toRaw( tx );
  enel(   idpre+'_sendbtn', true );
  enel(   idpre+'_send', true );
  setelv( idpre+'_sendlabel', "send this transaction (IRREVERSIBLE!)" );
  setelv( idpre+'_JSON', json );
  setelv( idpre+'_raw', raw );
  setelv( idpre+'_txhash', txhash );
}
function newtxVerifyClear( idpre ) {
  enel(   idpre+'_sendbtn', false );
  enel(   idpre+'_send', false );
  setelv( idpre+'_sendlabel', "" );
  setelv( idpre+'_JSON', "" );
  setelv( idpre+'_raw', "" );
  setelv( idpre+'_txhash', "" );
}
function newtxSend( idpre ) {
  var tx = null, json = getelv( idpre+'_JSON' );
  var txhash = Bitcoin.ImpExp.BBE.importHash( getelv(idpre+'_txhash') );
  enel( idpre+'_send', false );
  function onok() {
    Rarebit.Tx.addDataToWallet( json, seedWallet );
    setelv( "txdb_data", Bitcoin.ImpExp.BBE.export(seedWallet).text );
    id2el( idpre+'_txhash' ).focus();
    setelv( idpre+'_sendlabel', "this transaction SENT" );
    seedReshow();
    lotsSetup( getelv('cert_CID'), "", getelv('seed_addr') );
  }
  function onerr() {
    enel( idpre+'_send', false );  //let user retry
  }
  try {
    var json = getelv( idpre+'_JSON' );
    var txhash = Bitcoin.ImpExp.BBE.importHash( getelv(idpre+'_txhash') );
    var tx = Rarebit.Tx.addDataToWallet(json).getTx( txhash );
    //return Bitcoin.ImpExp.sendTx( tx, onok, onerr );
    // simulate async send
    setTimeout( onok, 10 );
    return true;
  }
  catch( e ) {
    seterr( idpre+'_err', e );
    onerr();
  }
}


/*
  add/reset/show lot qtys in origination tx 
*/
var origtx_qtys = [], origtx_multlotsenabled = false;
function origtxLotsShowQtys( ) {
  var html = "";
  for( var i=0, tq='0'; i<origtx_qtys.length; i++ )
    html += i ? ", " : "",
    html += fmtqty( origtx_qtys[i], " UNITS" ),
    tq = Rarebit.Tx.addQty( tq, origtx_qtys[i] );
  if (origtx_qtys.length > 1)
    html += ", " + fmtqty( tq, " TOTAL" );
  setelv( "origtx_qtys", html );
}
function origtxLotsAddQty( ) {
  var q = Rarebit.Tx.cleanQty( getelv("origtx_qty") );
  if (Rarebit.Tx.compareQtys( q, '0' ) > 0)
    origtx_qtys.push( q ),
    origtxLotsShowQtys(),
    setelv( "origtx_err", "" );
  else
    if (!origtx_multlotsenabled)
      throw new Error( err("Qty > 0 needed") );
    else
      seterr( "origtx_err", err( "Qty > 0 needed") );
}
function origtxLotsClear() {origtx_qtys=[]; origtxLotsShowQtys();}

function origtxClear( ) {
  newtxVerifyClear( 'origtx' );
  setelv( ['origtx_err','origtx_err'], "" );
}


/*
  create new origination tx 
*/
function origtxCreate() {
  var res = "", qty = "", txhash = "";
  newtxVerifyClear( 'origtx' );
  if (origtx_multlotsenabled && !origtx_qtys.length)
    return seterr( 'origtx_err', "Lots needed", true );
  if (!contentHashKey)
    return seterr( 'origtx_err', "Content needed", true );
  if (!seedWallet)
    return seterr( 'origtx_err', "Seed wallet needed", true );
  if (!seedKey)
    return seterr( 'origtx_err', "Author/owner needed", true );
  try { 
    if (!origtx_multlotsenabled)
      origtxLotsClear(),
      origtxLotsAddQty();
    var tx = Rarebit.Tx.createOrigination( 
                           contentHashKey, 
                           seedKey, 
                           origtx_qtys,
                           seedWallet, 
                           getelv("seed_fee") );
    newtxSetupVerify( tx, 'origtx' );
  }
  catch( e ) {
    res = err( e );
  }
  seterr( "origtx_err", res );
}


/*
  send new tx 
*/
function origtxSend() {
  newtxSend( 'origtx' );
  if (!getelv( "xfertx_pub"))
    demoOwnerPub = Bitcoin.Address.fromPrivOrPass(demoOwner).pubHex,
    setelv( "xfertx_pub", demoOwnerPub );
}


/*
  prep qty for new transfer tx 
*/
function xfertxSetup( seed, hashkey ) {
  var hashkey = contentHashKey;
  var seed = seedWallet;
  xfertx_newowners=[];
  var t = xfertxGetAvail();
  setelv( 'xfertx_qty', t?t:"" );
  setelv( ['xfertx_err','xfertx_puberr'], "" );
  xfertxNewOwnersShow( t );
  return t;
}
function xfertxGetTotal( seed, hashkey ) {
  if (!seedKey)
    throw new Error( "Current owner's private key needed" );
  var res = Rarebit.Tx.queryLots( seed, hashkey.getIDStr(), 
                                  "", 
                                  seedKey.addressStr );
  if (res.invalidlots.length)
    throw new Error( "Invalid lot(s) found (try Search)" );
  return res.ttlqty;
}
function xfertxGetAvail() {
  res = "";
  if (!contentHashKey)
    return seterr( 'xfertx_err', "Content needed", true );
  if (!seedWallet)
    txdbCreate();
  if (!seedWallet)
    return seterr( 'xfertx_err', "Transactions needed", true );
  if (!seedKey)
    return seterr( 'xfertx_err', "Current owner needed", true );
  try {
    var aq = Rarebit.Tx.sumQtys( xfertx_newowners );
    var tq = xfertxGetTotal( seedWallet, contentHashKey );
    return Rarebit.Tx.subtractQty( tq, aq );
  }
  catch( e ) {
    res = err( e );
  }
  seterr( "xfertx_err", res );
}


/*
  add/reset/show new owners in transfer tx
*/
var xfertx_newowners = [];
function xfertxNewOwnersShow( avail ) {
  var html = fmtlist( xfertx_newowners,
                      [ {typ:'qty', tag:' TO ', item:'qty'},
                        {typ:'ownerfrompub', item:'pubkey'} ] );
  html += "<div><div class='" + qtysumclass + "'>";
  if (xfertx_newowners.length > 1)
    html += fmtlinesec( {sumqty:Rarebit.Tx.sumQtys(xfertx_newowners)},
                        [ {typ:'qty', tag:' TOTAL', item:'sumqty'} ] );
  html += (xfertx_newowners.length>1?", ":"") + 
          fmtqty(avail,xfertx_newowners.length?" REMAINING":" UNITS AVAILABLE");
  html += "</div></div>";
  setelv( "xfertx_newowners", html );
}
function xfertxNewOwnerAdd( toavail ) {
  res = "";
  var aq = xfertxGetAvail();
  if (!aq) return;
  try {
    var q = toavail ? aq : Rarebit.Tx.cleanQty( getelv("xfertx_qty") );
    if (Rarebit.Tx.compareQtys( q, '0' ) <= 0)
      throw new Error( "Qty > 0 needed" );
    if (Rarebit.Tx.compareQtys( q, aq ) > 0)
      throw new Error( "Available quantity exceeded" );
    Rarebit.Tx.verifyPubKey( getelv("xfertx_pub") );
    xfertx_newowners.push( {pubkey:getelv("xfertx_pub"), qty:q} );
    xfertxNewOwnersShow( Rarebit.Tx.subtractQty(aq,q) );
    return true;
  }
  catch( e ) {
    res = err( e );
  }
  seterr( "xfertx_puberr", res );
  seterr( "xfertx_err", res );
}
function xfertxClear( ) {
  xfertxSetup();
  newtxVerifyClear( 'xfertx' );
  setelv( ['xfertx_err','xfertx_puberr'], "" );
}
function xfertxShowOwnedLots( ) {
  lotsSetup();
  return true;
}


/*
  create new transfer tx 
*/
function xfertxCreate() {
  var res = "";
  newtxVerifyClear( 'xfertx' );
  if (!contentHashKey)
    return seterr( 'xfertx_err', "Content needed", true );
  if (!seedWallet)
    return seterr( 'xfertx_err', "Seed wallet needed", true );
  if (!seedKey)
    return seterr( 'xfertx_err', "Current owner needed", true );
  if (!xfertx_newowners.length)
    return seterr( 'xfertx_err', "New owners needed", true );
  try { 
    var sel = Rarebit.Tx.selectLotsToSpend( 
                    contentHashKey,
                    getelv('seed_issuer')?getelv('seed_issuer'):seedKey.addressStr,
                    [seedKey], 
                    seedWallet, 
                    xfertx_newowners );
    var tx = Rarebit.Tx.createTransfer( 
                    contentHashKey,
                    sel.lots,
                    sel.newowners,
                    seedWallet,
                    getelv('seed_fee') );
    newtxSetupVerify( tx, 'xfertx' );
  }
  catch( e ) {
    res = err( e );
  }
  seterr( "xfertx_err", res );
}


/*
  send new transfer tx 
*/
function xfertxSend() {
  enel( 'origtx_send', false );
  newtxSend( 'xfertx' );
  //if (!demoOwnerPub)
    //demoOwnerPub = Bitcoin.Address.fromPrivOrPass(demoOwner).pubHex;
  //if (xfertx_newowners[0].pubkey.toString() == demoOwnerPub)
    //setelv( "xfertx_pub", demoOwner2Pub );
}


/*
  find lots
*/
function lotsFind2( CIDid, issuerid, ownerid, validid, invalidid, errid ) {
  function populateinvlotlist( lots ) {
    return fmtlist( lots,
            [ {typ:'tag', item:'ERROR: '},
              {typ:'str',item:'err'},
              {typ:'br'},
              {typ:'tag', item:'TX '},
              {typ:'txhash', len:20, item:'txhash'},
              {typ:'tag', item:' OUTPUT '},
              {typ:'int', item:'txoutindex'},
              {typ:'tag', item:' &nbsp; &nbsp; '},
              {typ:'button', tag:'show trace &gt;',
               action:'onclick', clickfun:'lotTrace_',
               params:["'lots1'",'txhash','txoutindex']}
            ] );
  }
  function populatelotlist( lots, ttlqty ) {
    var html = fmtlist( lots,
            [ {typ:'qty', item:'qty', tag:' UNITS OF '},
              {typ:'CID', item:'refID'},
              {typ:'br'},
              {typ:'tag', item:' &nbsp; &nbsp; &nbsp; &nbsp; TO '},
              {typ:'ownerauthor', item:'owner', alt:'issuer' },
              {typ:'br'},
              {typ:'tag', item:' &nbsp; &nbsp; &nbsp; &nbsp; TX '},
              {typ:'txhash', len:20, item:'txhash'},
              {typ:'tag', item:' OUTPUT '},
              {typ:'int', item:'txoutindex'},
              {typ:'tag', item:' &nbsp; &nbsp; '},
              {typ:'button', tag:' show trace ',
               action:'onclick', clickfun:'lotTrace_',
               params:["'lots1'",'txhash','txoutindex']}
            ] );
    if (lots.length && ttlqty)
      html += fmtsum( {'qty':ttlqty}, [ {typ:'qty',tag:' TOTAL',item:'qty'} ] );
    return html;
  }
  if (!getelv(CIDid) && !getelv(issuerid) && !getelv(ownerid))
    return warn( 'lots_err', "Content ID, owner, and/or author needed" );
  var res = "", qlr = {lots:[],invalidlots:[]};
  try { 
    var seed = seedWallet;
    if (!seed) seed = Rarebit.Tx.createSeedWallet( getelv("txdb_data"), [] );
    qlr = Rarebit.Tx.queryLots( 
                           seed, 
                           getelv(CIDid),
                           getelv(issuerid),
                           getelv(ownerid) );
    if (!qlr.lots.length && !qlr.invalidlots.length)
      res = "No matching lots found";
    else
      if (qlr.err)
        res = qlr.err;
  }
  catch( e ) {
    res = err( e );
  }
  setelv( validid, populatelotlist(qlr.lots,qlr.ttlqty) );
  setelv( invalidid, populateinvlotlist(qlr.invalidlots) );
  setelv( errid, res );
}
function lotsFind() {
  lotsSetup();
  lotsFind2( "lots_CID", "lots_issuer", "lots_owner", 
             'lots_valid', 'lots_invalid', 'lots_err' );
}
function lotsSetup2() {
}
function lotsSetup( cid, issuer, owner ) {
  if (cid && !getelv("lots_CID")) {
    setelv( "lots_CID", cid );
    setelv( "lots_issuer", issuer );
    setelv( "lots_owner", owner );
  }
  setelv( "lots_valid", "" );
  setelv( "lots_invalid", "" );
  setelv( "lots_err", "" );
  traceSetup( "lots1" );
}


/*
  trace lot 
*/
function lotTrace_( id, txhash, txoutindex, issuerinp, origerr ) {
  function fmttrace( t ) {
    var html = "<span class='b'>LOT SUMMARY</span><br/><br/>" + fmtline( t,
            [ {typ:'qty', item:'qty', tag:' UNITS OF ' },
              {typ:'CID', item:'refID' }
            ] );
    html += fmtline( t,
            [ {typ:'tag', item:'OWNED BY ' },
              {typ:'owner', item:'owner' }
            ] );
    html += fmtline( t,
            [ {typ:'tag', item:'ISSUED BY ' },
              {typ:'author', item:'issuer' }
            ] );
    if (t.warn)
      html += "<br/><span class='b'>*** " + t.warn + " ***</span><br/>";
    html += "<br/><br/><span class='b'>PROVENANCE OF EACH UNIT IN " + 
                                       "LOT</span><br/><br/>";
    html += fmtlist( t.trace,
            [ {typ:'indent', item:'distancetoroot' },
              //{typ:'tag', item:'OUTPUT TYPE: '},
              {typ:'str', item:'outputtype' },
              {typ:'tag', item:': '},
              {typ:'qty', item:'qty', tag:' UNITS TO ' },
              {typ:'ownerauthor', item:'owner', alt:'issuer' },
              {typ:'tag', item:' &nbsp; TX '},
              {typ:'txhash', len:10, item:'txhash'},
              {typ:'tag', item:' OUTPUT '},
              {typ:'int', item:'txoutindex'},
              {typ:'tag', item:' &nbsp; ' }
            ], null, null, {item:'outputtype',val:'Seed/other'} );
    return html;
  }
  var res = "", json = "", cid = "", trace = null,
      issuer = "", issuererr = "", owner = "", qty = "";
  try {
    var seed = seedWallet;
    if (!seed) seed = Rarebit.Tx.createSeedWallet( getelv("txdb_data"), [] );
    trace = Rarebit.Tx.traceLotProvenance( 
                           seed, 
                           txhash,
                           txoutindex,
                           issuerinp );
    //json = JSON.stringify( trace, null, 2 );
    json = fmttrace( trace );
    if (trace.err)
      res = trace.err;
    else
      cid = trace.CID, issuer = origerr?"":trace.issuer, 
      issuererr = origerr?trace.issuer:"",
      owner = trace.owner, qty = trace.qty;
  }
  catch( e ) {
    res = err( e );
  }
  traceSetup( id, json, cid, issuer, owner, qty, res, issuererr );
  if (onTraceUpdated)
    onTraceUpdated();
}
function traceSetup( id, json, cid, issuer, owner, qty, res, issuererr ) {
  setelv( id+"_graph", json );
  setelv( id+"_CID", cid );
  setelv( id+"_issuer", issuer );
  setelv( id+"_issuererr", issuererr );
  setelv( id+"_owner", owner );
  setelv( id+"_qty", qty );
  setelv( id+"_err", res );
}


/*
  trace lot from hash,index user entries
*/
function lotTrace() {
  lotTrace_( "lottrace", getelv("lottrace_hash"), 
             getelv("lottrace_index"), getelv("lottrace_issuerinp") );
}


/*
  gen or mine keypair 
*/
function genKey( rand ) {
  try {
    var key = rand ? "" : getelv( 'gen_key' );
    if (!rand && key.length < 20)
      throw new Error( "At least 20 characters expected" );
    var keyinfo = Bitcoin.Address.fromPrivOrPass( key, key_to_english );
    if (!rand && key.substr(0,1) == '5' && keyinfo.privateStr != key)
      throw new Error( "Bitcoin standard expected ('5...')" );
    genSetup( keyinfo );
    return keyinfo;
  }
  catch( e ) {
    setelv( "gen_addr", "" );
    setelv( "gen_priv", "" );
    setelv( "gen_pub", "" );
    setelv( "gen_err", err(e) );
  }
}
function genSetup( keyinfo, err ) {
  setelv( "gen_key", keyinfo.pass ? keyinfo.pass : keyinfo.privateStr );
  setelv( "gen_addr", fmtaddr(keyinfo.addressStr) );
  setelv( "gen_priv", keyinfo.privateStr );
  setelv( "gen_pub", keyinfo.pubHex );
  setelv( "gen_err", err?err:"" );
}
function genClear( ) {
  genSetup( {} );
}
var gen_mining = false;
var gen_cancelled = false;
function genMine( ) {
  if (gen_mining)
    return genMinedone();
  function testsub( id ) {
    if (getelv(id) &&  // /^[1-9A-HJ-NP-Za-km-z]+$/
        getelv(id).replace( Bitcoin.Base58.validRegex, '' ))
      return setelv( "gen_err", "Invalid chars in substring" );
    return true;
  }
  if (!getelv( "gen_sub1" ))
    return setelv( "gen_err", "Substring needed" );
  if (!testsub( "gen_sub1" ) || !testsub( "gen_sub2" ) || 
      !testsub( "gen_sub3" ))
    return false;
  gen_cancelled = false;
  gen_mining = true;
  setelv( "gen_mine", "Cancel" );
  function cb( msg, i, keyinfo ) {
    if (gen_cancelled)
      return true;
    if (keyinfo)
      genSetup( keyinfo, "Calculating ("+(i+1)+")..." );
    if (msg == "complete")
      genMinedone( "Vanity substring found ("+(i+1)+" addresses tested)" );
  }
  Bitcoin.Address.mine( 
       [getelv("gen_sub1"),getelv("gen_sub2"),getelv("gen_sub3")], 
       cb, key_to_english );
}
function genMinedone( msg ) {
  gen_cancelled = true;
  gen_mining = false;
  setelv( "gen_mine", "Mine" );
  setelv( "gen_err", msg?msg:"" );
}


/*
UI helpers
*/
function id2el( id ) {
  return document.getElementById( id );
}
function setelcls( id, c ) {
  if (id2el(id)) id2el(id).className = c;
}
function enel( id, enable ) {
  if (id2el(id)) id2el(id).disabled = !enable;
}
function showel( eid, inline ) {
  if (id2el(eid)) id2el(eid).style.display = inline ? inline : "block";
}
function clrel( eid ) {
  if (id2el(eid)) id2el(eid).style.display = "none";
}
function extractv( t ) {
  if (t.substr(0,1) == '<') {
    var i1 = t.indexOf( ": " );
    if (i1) {
      var t2 = t.substr( i1+2 );
      var i2 = t2.indexOf( "'" );
      if (i2 < 0) i2 = t2.indexOf( '"' );
      if (i2 < 0) i2 = t2.indexOf( ',' );
      if (i2) t = t2.substr( 0, i2 );
    }
  }
  return t;
}
function getelv( id ) {
  var e = id2el( id ), v = "";
  if (e)
    if ((e instanceof HTMLInputElement) ||
        (e instanceof HTMLTextAreaElement))
      v = e.value;
    else {
      v = e.innerHTML;
      if (v == "&nbsp;" || v == "&nbsp; " || v == " &nbsp;")
        v = "";
      v = extractv( v );
    }
  return v;
}
function isarr( v ) {
  v = v ? v : "";
  v = JSON.stringify( v );
  return v.substr(0,1) == '[';
}
function toarr( id ) {
  id = id ? id : "";
  return isarr(id) ? id : [id];
}
function showrelel( id, v ) {
  v = v ? v : "";
  if (id2el( '_'+id ))
    v ? showel( '_'+id ) : clrel( '_'+id );
  if (id2el( '_x_'+id ))
    v ? clrel( '_x_'+id ) : showel( '_x_'+id );
  if (id2el( '_c_'+id ))
    v ? showel( '_c_'+id, 'table-cell' ) : clrel( '_c_'+id );
  if (id2el( '_i_'+id ))
    v ? showel( '_i_'+id, 'inline-block' ) : clrel( '_i_'+id );
  if (id2el( '_xc_'+id ))
    v ? clrel( '_xc_'+id ) : showel( '_xc_'+id, 'table-cell' );
  if (id2el( '_xi_'+id ))
    v ? clrel( '_xi_'+id ) : showel( '_xi_'+id, 'inline-block' );
}
function setelv( id, v ) {
  v = v ? v : "";
  id = toarr( id );
  for( var i=0; i<id.length; i++ ) {
    var e = id2el( id[i] );
    if (e) {
      if ((e instanceof HTMLInputElement) ||
          (e instanceof HTMLTextAreaElement))
        e.value = v;
      else
        e.innerHTML = v;  //? v : "&nbsp;";
      showrelel( id[i], v );
    }
  }
}
function addelv( id, v ) {
  setelv( id, getelv(id)+v );
}
function setelin( id, v ) {
  if (!getelv( id ))
    setelv( id, v );
}
function err( e ) {
  if (e && e.toString())
    return e.toString();
  return "";
}
function warn( id, e ) {
  setelv( id, e );
}
function fmtval( v, pad, wlen ) {
  v = Bitcoin.Util.formatValue2( v );
  if (!pad)
    return v;
  pad = pad == ' ' ? '&nbsp;' : pad;
  var f = v.split( '.' );
  for( var i=f[0].length; i<wlen; i++ )
    v = '&nbsp;' + v;
  for( var i=f[1].length; i<8; i++ )
    v += pad;
  return v;
}
function fmtvals( v, pad, sel ) {
  for( var i=0,w,maxl=0; i<v.length; i++ ) {
    w = v[i];
    if (sel)
      w = w[sel];
    w = fmtval(w).split('.')[0];
    maxl = maxl > w.length ? maxl : w.length;
  }
  var vo = [];
  for( i=0; i<v.length; i++ )
    vo.push( fmtval(sel?v[i][sel]:v[i],pad,maxl) );
  return vo;
}
function fmttxhash( h, len, b64 ) {
  if (b64)
    h = Bitcoin.ImpExp.BBE.exportHash( h );
  len = len ? len : 20;
  var href = txHRef + h;
  return "<a title='Bitcoin transaction: " + h + "' class='"+txhashclass+"' " + 
            "href='" + href + "' target=_blank>" + 
           h.substr(0,len) + "..." + 
         "</a>";
}
function fmtaddr( a, len, cls, testnet, nolink ) {
  if (!a)
    return "";
  len = len ? len : 100;
  var ba = a;
  var ta = Bitcoin.ImpExp.Sync.fmtAddr( a, true );
  if (testnet)
    a = ta;
  var href = addrHRef + (_testnet ? ta : a);
  var title = "title='Bitcoin address: " + ba + 
              (_testnet ? (", Address in testnet: "+ta):"") + "' ";
  if (!nolink)
    return "<a " +
              "class='" + cls + "' " + title + 
              "href='" + href + "' target=_blank>" + 
             (a.toString()).substr(0,len) + (len<100?"...":"") + 
           "</a>";
  return "<span " + title + " class='" + cls + "'>" + 
           (a.toString()).substr(0,len) + (len<100?"...":"") + 
         "</span>";
}
function fmtCID( a, len ) {
  len = len ? len : 100;
  return "<div title='Content ID: " + a + "' class='"+CIDclass+"'>" + 
           a.substr(0,len) + (len<100?"...":"") + 
         "</div>";
}
function fmttag( tag, cls ) {
  cls = cls ? cls : tagclass;
  tag = tag ? tag : "";
  return "<span class='" + cls + "'>" + tag + "</span>";
}
function fmtindent( n ) {
  html = "";
  for( var i=0; i<n; i++ )
    html += " &nbsp; &nbsp; ";
  return html;
}
function fmtqty( q, tag ) {
  q = q ? q : "0";
  return "<span class='" + qtyclass + "'>" + q + "</span>" + 
         fmttag( tag, qtytagclass );
}
function fmtsz( sz ) {
  var sz = new Number( sz?sz:0 );
  sz = sz < (1024*1024) ? (sz/1024).toFixed() + fmttag("KB",'smtagclass') : 
                          (sz/(1024*1024)).toFixed(2) + fmttag("MB",'smtagclass');
  return "<span class='" + szclass + "'>" + sz + "</span>";
}
function fmtbtn( data, descr ) {
  var html = descr.action == "onhover" ? descr.hoverfun : descr.clickfun;
  for( var i=0; i<descr.params.length; i++ )
    html += (i ? ',' : '(') + 
            (descr.params[i].substr(0,1) == "'" ? descr.params[i] : 
                                      "'" + data[descr.params[i]].toString() + "'");
  return "<button " + descr.action + '="' + html + ');">' + 
         descr.tag + "</button>";
}
function fmtitem( data, descr, linenum ) {
  if (descr.typ == 'tag')
    return fmttag( descr.item );
  if (descr.typ == 'smtag')
    return fmttag( descr.item, 'smtagclass' );
  if (descr.typ == 'button')
    return fmtbtn( data, descr );
  if (descr.typ == 'br')
    return "<div class='" + sublineclass + "'></div>";
  item = descr.getitem ? descr.getitem(linenum) : data[descr.item];
  if (item == undefined)
    return "";
  if (descr.typ == 'indent')
    return fmtindent( item );
  if (descr.typ == 'author')
    return fmtaddr( item, 0, authorclass );
  if (descr.typ == 'owner')
    return fmtaddr( item, 0, ownerclass );
  if (descr.typ == 'ownerauthor')
    return fmtaddr( item, 0, data[descr.alt]==item?authorclass:ownerclass );
  if (descr.typ == 'ownerfrompub')
    return fmtaddr( Rarebit.Tx.verifyPubKey(item), 0, ownerclass );
  if (descr.typ == 'addr')
    return fmtaddr( item, 0, addrclass );
  if (descr.typ == 'CID')
    return fmtCID( item, 0, CIDclass );
  if (descr.typ == 'qty')
    return fmtqty( item, descr.tag );
  if (descr.typ == 'int')
    return fmttag( item?item:'0', intclass );
  if (descr.typ == 'txhash')
    return fmttxhash( item, descr.len, descr.b64 );
  return item;
}
function fmtlinesec( data, descr, linenum ) {
  var html = "";
  for( var i=0; i<descr.length; i++ )
    html += fmtitem( data, descr[i], linenum );
  return html;
}
function fmtline( data, descr, linenum ) {
  return "<div class='" + lineclass + "'>" + fmtlinesec(data,descr,linenum) + "</div>";
}
function fmtsum( data, descr ) {
  var html = "<div class='" + qtysumclass + "'><div>";
  html += fmtlinesec( data, descr );
  return html + "</div></div>";
}
function fmtlist( list, descr, sum, sumdescr, skip ) {
  var html = "";
  for( var i=0; i<list.length; i++ )
    if (!skip || ((list[i])[skip.item] != skip.val))
      html += fmtline( list[i], descr, i );
  if (sum && data.length > 1)
    html += fmtsum( sum, sumdescr );
  return html;
}


/*
  toggle panes
*/
function toggle( tog, maxtogs, sel, selcls ) {
  for( var n=0,c; n<maxtogs; n++ ) {
    c = id2el(tog+n).className;
    c = c.replace( " "+selcls, "" );
    setelcls( tog+n, n==sel ? c+" "+selcls : c );
  }
}
function selectPane( pane ) {
  var btns = ['certbtn','seedbtn','issuebtn','transferbtn',
               'provenancebtn','utilbtn','introbtn'];
  var panes = ['certpane','seedpane','issuepane','transferpane',
               'provenancepane','utilpane','intropane'];
  for( var n=0; n<panes.length; n++ )
    if (panes[n] == pane)
      setelcls( btns[n], "toggledpanebtn" ),
      setelcls( pane , "visiblepane" );
    else
      setelcls( btns[n], "panebtn" ),
      setelcls( panes[n], "hiddenpane" );
}



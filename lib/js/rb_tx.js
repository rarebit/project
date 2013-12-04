/*
Rarebit transaction functions
*/
Rarebit.Tx = {};


/*
  Create a wallet to be used for seeding/fees and lot transfers
    txdata: JSON transaction text in BBE format
    keys: private keys that can spend some of the outputs 
          (string[] or ECKey[])
      when transactions are created, change will be  
      refunded to address of keys[0]
*/
Rarebit.Tx.createSeedWallet = function( txdata, keys ) {
  var w = new Bitcoin.Wallet();
  for( var i=0; i<keys.length; i++ )
    w.addKey( keys[i] );
  return Rarebit.Tx.addDataToWallet( txdata, w );
}


/*
  Create origination transaction for certificate (issue lots)
    cert: signed Rarebit.Certificate
    issuerKey: issuer's private key 
      (user must prove they possess key used to sign cert to issue a lot)
    qtys[<int>,...]: # units in each lot to issue
    seedWallet: Bitcoin.Wallet, must contain sufficient spendable outs;
      important -- change is refunded to address of first key in seed wallet
      (user must have key for an address that receives change)
    fee: tx fee, string or BigInteger
*/
Rarebit.Tx.createOrigination = function( 
                                cert, issuerKey, qtys, seedWallet, fee ) {
  var keyinfo = Bitcoin.Address.fromPrivOrPass( issuerKey );
  if (cert.getSigner().toString() != keyinfo.addressStr)
    throw new Error( "Certificate was signed by a different issuer" );
  if (!qtys || !qtys.length)
    throw new Error( "Lot quantities needed" );
  var outs = [];
  for( var i=0; i<qtys.length; i++ )
    outs.push( Rarebit.Tx.prepOutput(
                           cert.getCIDPub(),keyinfo.pubHex,qtys[i]) );
  var chgto = Rarebit.Tx.prepChangeTo( seedWallet );
  var tx = seedWallet.createSend2( outs, chgto, fee );
  if (!tx)
    throw new Error( "Failed creating transaction" );
  return tx;
}


/*
  Create transfer transaction (transfer lots)
    cert: signed Rarebit.Certificate
    lots[{out:{},key:<>},...]:  (output from .selectLotsToSpend)
      out: {txhash:<>,txoutindex:<>}
        txhash: usual bitcoin tx hash in hexcode
        txoutindex: index of the output in tx
      key: private key of the owner of this lot
    newOwners[{pubkey:<>,qty:<>},...]: (output from .selectLotsToSpend)
      pubkey: pubkey of new owner
      qty: # units in lot (qtys must sum to qtys of .lots[])
    seedWallet: Bitcoin.Wallet
      contains txs with lots to transfer and spendable outs for fee;
      change from paying fee is refunded to first key in seed wallet
    fee: tx fee, string or BigInteger
*/
Rarebit.Tx.createTransfer = function( cert, lots, newOwners, seed, fee ) {
  var insum = BigInteger.ZERO, outsum = BigInteger.ZERO, tx = null;
  var seedWallet = seed;
  var backupkeys = seedWallet.getKeys();

  function undo_( faile ) {
    seedWallet.clear();
    for( var i=0; i<backupkeys.length; i++ )
      seedWallet.addKey( backupkeys[i] );
    seedWallet.reprocess();
    if (faile)
      throw faile;
  }

  try {
    if (!newOwners || !newOwners.length)
      throw new Error( "New owners needed" );
    if (!lots || !lots.length)
      throw new Error( "Lots to spend needed" );
    if (!fee || Bitcoin.Util.parseValue2(fee).compareTo(BigInteger.ZERO) <= 0)
      throw new Error( "Fee needed" );

    //  determine what output(s) are needed to pay fee
    var feespend = [];
    var sos = seedWallet.selectOutputs( null, null, fee );
    for( var i=0; i<sos.outsStats.length; i++ )
      if (sos.outsStats[i].willSpend)
        feespend.push( {out:{txhash:
                Bitcoin.ImpExp.BBE.exportHash(sos.outsStats[i].txHash), 
                                txoutindex:sos.outsStats[i].index}} );

    //  add cert key and all owner's keys into wallet
    seedWallet.addKey( cert.getCIDPrivateKey() );
    for( i=0; i<lots.length; i++ ) {
      var keyinfo = Bitcoin.Address.fromPrivOrPass( lots[i].key );
      o = Rarebit.Tx.getOutput( seedWallet, lots[i].out.txhash, 
                                 lots[i].out.txoutindex,  
                                 cert.getCID() );
      if (!o)
        throw new Error( "Output " + lots[i].out.txoutindex + 
               " in tx " + lots[i].out.txhash.substr(0,10) + 
               "... not found, spent, or invalid" );
      if (o.addrs[1].toString() != keyinfo.addressStr)
        throw new Error( "Output " + lots[i].out.txoutindex + 
               " in tx " + lots[i].out.txhash.substr(0,10) + 
               "... not spendable with key provided" );
      insum = insum.add( o.value );
      seedWallet.addKey( keyinfo.ecKey );
    }
    seedWallet.reprocess();

    function isin_( os, lots ) {
      for( var i=0; i<lots.length; i++ )
        if (Bitcoin.ImpExp.BBE.exportHash(os.txHash) == lots[i].out.txhash &&
            os.index == lots[i].out.txoutindex)
          return true;
      return false;
    }

    //  exclude all prev outs except those in lots[] or those for fee
    var x = [];
    var sos = seedWallet.selectOutputs();
    for( i=0; i<sos.outsStats.length; i++ )
      x[i] = !(isin_( sos.outsStats[i], lots ) || 
               isin_( sos.outsStats[i], feespend ));

    //  prep new bitcoin outputs
    var outs = [];
    for( i=0; i<newOwners.length; i++ ) {
      var o = Rarebit.Tx.prepOutput( cert.getCIDPub(),
                                      newOwners[i].pubkey,
                                      newOwners[i].qty );
      outsum = outsum.add( o.value );
      outs.push( o );
    }
    if (insum.compareTo( outsum ) != 0)
      throw new Error( "Qty to transfer does not sum to inputs" );

    // make tx
    var chgto = Rarebit.Tx.prepChangeTo( seedWallet );
    tx = seedWallet.createSend2( outs, chgto, fee, null, x );
    if (!tx)
      throw new Error( "Failed creating transaction" );
    undo_();
  }
  catch( e ) {
    undo_( e );
  }
  return tx;
}


/*
  Select valid lots to spend (choose lots of cert spendable with keys 
  until outqtys satisfied; full provenance validation is performed for
  each lot and only those that pass are selected)
    cert: signed Rarebit.Certificate
    keys[]: owners private keys
    seedWallet: Bitcoin.Wallet, the db to search
    outqtys[{qty:<>},...]: the new lot qtys; 
      if ommitted or outqtys[0].qty == 0,
      all matching unspent lots are summed to a single newowners output
    returns: {lots:[], ttlqty:<>,newowners:[]}
      ttlqty: may be > than outqtys if lots don't sum exactly
      lots: lots to spend, prepared param for .createTransfer()
      newowners: prepared param for .createTransfer();
        any change (leftover units) is returned to the owner's pubkey
*/
Rarebit.Tx.selectLotsToSpend = function( cert, keys, seedWallet, outqtys ) {
  var insum = BigInteger.ZERO, outsum = BigInteger.ZERO;
  var ret = {lots:[],newowners:[]};
  outqtys = outqtys ? outqtys : [{qty:'0'}];
  var all = Rarebit.Tx.compareQtys(outqtys[0].qty,'0') <= 0;
  if (all && outqtys.length != 1)
    throw new Error( "outqtys param invalid" );

  //  sum out qtys
  for( var i=0; i<outqtys.length; i++ ) {
    if (!all && Rarebit.Tx.compareQtys(outqtys[i].qty,'0') <= 0)
      throw new Error( "output qty invalid" );
    ret.newowners.push( {qty:outqtys[i].qty,pubkey:outqtys[i].pubkey} );
    outsum = outsum.add( Rarebit.Tx.qtyToValue(outqtys[i].qty) );
  }

  //  collect lots to spend
  for( var i=0,j,o,keyinfo; i<keys.length; i++ ) {
    keyinfo = Bitcoin.Address.fromPrivOrPass( keys[i] );
    o = Rarebit.Tx.queryLots( seedWallet, 
                              cert.getCID(), cert.getSigner(), 
                              keyinfo.addressStr );
    for( j=0; j<o.lots.length; j++ ) {
      ret.lots.push( {key:keys[i],
                     out:{txhash:o.lots[j].txhash,
                          txoutindex:o.lots[j].txoutindex,
                          qty:o.lots[j].provenance.qty}} );
      insum = insum.add( Rarebit.Tx.qtyToValue(o.lots[j].provenance.qty) );
      if (!all && insum.compareTo( outsum ) >= 0)
        break;
    }
    if (!all && insum.compareTo( outsum ) >= 0)
      break;
  }
  if (!all && insum.compareTo( outsum ) < 0)
    throw new Error( "Insufficient qty available" );

  //  handle leftover units
  ret.ttlqty = Rarebit.Tx.valueToQty( insum );
  if (all)
    ret.newowners[0].qty = ret.ttlqty;
  else {
    //  refund change units if any
    var chg = insum.subtract( outsum );
    if (chg.compareTo( BigInteger.ZERO ) > 0)
      ret.newowners.push( 
               {pubkey:keyinfo.pubHex,qty:Rarebit.Tx.valueToQty(chg)} );
  }
  return ret;
}


/*
  Prep a Rarebit output definition (for use by Bitcoin.Wallet.createSend2)
    CIDpub: CID in pubkey form (hex)
    ownPub: new owner's pubkey (hex)
    qty: # units string or int
*/
Rarebit.Tx.prepOutput = function( CIDpub, ownPub, qty ) {
  qty = Rarebit.Tx.qtyToValue( qty );
  if (qty.compareTo(BigInteger.ZERO) <= 0)
    throw new Error( "Lot quantity > 0 needed" );
  Rarebit.Tx.verifyPubKey( CIDpub );
  Rarebit.Tx.verifyPubKey( ownPub );
  return {value:qty, Multisig: {M:2, pubkeys:[CIDpub,ownPub]} };
}


/*
  Prep changeTo definition (for use by Bitcoin.Wallet.createSend2)
    seedWallet: Bitcoin.Wallet
      change is refunded to address of first key in seed wallet
*/
Rarebit.Tx.prepChangeTo = function( seedWallet ) {
  var seedAddrs = seedWallet.getAllAddresses();
  if (!seedAddrs.length)
    throw new Error( "Seed wallet has no keys" );
  return {Address:seedAddrs[0]};
}


/*
  Find and verify all unspent rarebit outputs containing CID
    CID: the CID to search for
    issuer (optional): expected issuer; 
      if not provided, issuer will be mined, but may be TricksterXXX
    owner (optional): search will match both CID and owner
    returns: {lots:[],invalidlots:[],ttlqty:<>};
      lot: {txhash:<>,txoutindex:<>,provenance:{}}
        provenance: result of .traceLotProvenance()
*/
Rarebit.Tx.queryLots = function( db, CID, issuer, owner ) {
  CID = Rarebit.Tx.verifyAddr( CID, "CID" ).toString();
  if (issuer) issuer = Rarebit.Tx.verifyAddr( issuer, "issuer" ).toString();
  if (owner) owner = Rarebit.Tx.verifyAddr( owner, "owner" ).toString();
  //  get unspent outputs matching CID
  var outs = db.queryOutputs( 'exitOuts', {eqM:2,eqN:2,addr0:CID} );
  var resstr = "", res = [], errres = [];
  var previssuer = null, issuersdiff = false;
  var q = BigInteger.ZERO;
  //  validate each ouput
  for( var i=0,oi,trace,vs; i<outs.outsStats.length; i++ ) {
    oi = outs.outsStats[i];
    if (!owner || owner == oi.addrs[1].toString()) {
      trace = Rarebit.Tx.traceLotProvenance( db,
                        Bitcoin.ImpExp.BBE.exportHash(oi.txHash),
                        oi.index, issuer, CID );
      if (!trace.err && !issuer && trace.issuer) {
        if (!previssuer)
          previssuer = trace.issuer;
        issuersdiff = trace.issuer != previssuer;
      }
      vs = { txhash:Bitcoin.ImpExp.BBE.exportHash(oi.txHash),
             txoutindex:oi.index, 
             provenance:trace };
      if (trace.err)
        errres.push( vs );
      else
        res.push( vs ),
        q = q.add( oi.value );
    }
  }
  q = Rarebit.Tx.valueToQty( q );
  if (issuersdiff) {
    // when no issuer specified, reject all lots on issuer mismatch
    for( var j=0; j<res.length; j++ )
      res[j].provenance.err = 
      res[j].provenance.recerr = "Originations different",
      errres.push( res[j] );
    res = [];
  }
  return {lots:res,invalidlots:errres,ttlqty:q};
}


/*
  Trace a lot's provenance
    txhash: usual bitcoin transaction hash
    outindex: index of output
    issuer (optional): required to verify origination(s);
      if not provided, issuer will be mined, but may be TricksterXXX
    CID (optional): for additional validation
    returns: { CID:<>, issuer:<>, owner:<>, qty:<>, 
               trace:[], err:<msg if fail>, errrecnum:<trace record of fail> }
      each trace record (each output visited):
        {txhash:<>,txoutindex:<>,recnum:<>,err:<msg if fail>,outputtype:<>}
          outputtype: "Seed/other" | "Origination" | "Transfer"
*/
Rarebit.Tx.traceLotProvenance = function( 
                         dbt, txhash, outindex, oissuer, oCID ) {
  var db = dbt;
  var CID = oCID, issuer = oissuer;
  var ret = { trace:[] };
  txhash = Bitcoin.ImpExp.BBE.importHash( txhash );

  if (CID) CID = Rarebit.Tx.verifyAddr( CID, "CID" ).toString();
  if (issuer) issuer = Rarebit.Tx.verifyAddr( issuer, "issuer" ).toString();
  
  // 
  function err_( r, msg ) {
    r.err = msg;
    ret.errrecnum = r.recnum;
    ret.recerr = msg;
    ret.err = "Trace failed, record " + r.recnum + " " +
              "[" + msg + "]";
  }

  // the recurser
  function trace_( targ, txh, i, parent, distance ) {
    var qv = BigInteger.ZERO;
    var r = { txhash:Bitcoin.ImpExp.BBE.exportHash(txh), 
              txoutindex:i, recnum:ret.trace.length, 
              distancetoroot:distance};
    if (parent >= 0) r.parentrecnum = parent;
    ret.trace.push( r );
    //  get this output
    var s = db.queryOutputs( targ, {txHash:txh,index:i} );
    if (!s.outsStats.length)
      err_( r, "Output not found" );
    else {
      var oo = s.outsStats[0];
      if (!Rarebit.Tx.verifyOutput( oo ))
        r.outputtype = "Seed/other";
      else {
        r.owner = oo.addrs[1].toString();
        if (!CID) CID = oo.addrs[0].toString();
        if (CID != oo.addrs[0].toString())
          err_( r, "Different CID" );
        else {
          qv = oo.value;
          r.qty = Rarebit.Tx.valueToQty( oo.value );
          //  retrieve all outputs in this tx for this CID
          s = db.queryOutputs( 'allOuts', 
                               {txHash:txh,eqM:2,eqN:2,addr:oo.addrs[0]} );
          if (!s.outsStats.length)
            err_( r, "(WTF?) cache possibly corrupted" );
          else {
            //  sum all outputs for this CID
            var sum = BigInteger.ZERO;
            for( var j=0; j<s.outsStats.length; j++ )
              sum = sum.add( s.outsStats[j].value );
            //  sum the inputs (prev outs)
            var insum = BigInteger.ZERO;
            if (!oo.tx.ins.length)
              err_( r, "Inputs not available "+
                       "(complete transactions needed to validate)" );
            for( j=0; j<oo.tx.ins.length; j++ ) {
              var sm = trace_( 'prunedOuts', 
                               oo.tx.ins[j].outpoint.hash, 
                               oo.tx.ins[j].outpoint.index,
                               r.recnum, distance+1 );
              if (!sm)
                break;
              insum = insum.add( sm );
            }
            //  check the in,out sums (if in==0, may be origination)
            if (!ret.err)
              if (insum.compareTo(BigInteger.ZERO) == 0) {
                r.outputtype = "Origination";
                if (!issuer) issuer = oo.addrs[1].toString();
                if (oo.addrs[1].toString() != issuer)
                  if (oissuer)
                    err_( r, "Origination invalid" );
                  else
                    err_( r, "Originations different" );
              }
              else {
                r.outputtype = "Transfer";
                if (sum.compareTo(insum) != 0)
                  err_( r, "Input qtys (" + Rarebit.Tx.valueToQty(insum) + 
                           ") do not sum to output qtys (" + 
                           Rarebit.Tx.valueToQty(sum) + ")" );
              }
          }
        }
      }
    }
    return r.err ? null : qv;
  }
  // get the output (should be unspent)
  if (!trace_( 'exitOuts', txhash, outindex, -1, 0 ))
    if (ret.trace[0].err == 'Output not found') {
      ret.trace = [];
      if (trace_( 'prunedOuts', txhash, outindex, -1, 0 ))
        err_( ret.trace[0], "Spent output" );
    }
  if (ret.trace[0].outputtype == 'Seed/other')
    err_( ret.trace[0], "Not Rarebit output" );
  if (!ret.err && CID) ret.CID = CID.toString();
  if (!ret.err && issuer) ret.issuer = issuer.toString();
  if (!ret.err) ret.owner = ret.trace[0].owner;
  if (!ret.err) ret.qty = ret.trace[0].qty;
  return ret;
}


/*
  Get info for unspent Rarebit output
    CID (optional): CID to match
    owner (optional): owner to match
    returns null if not found, invalid, or mismatch
*/
Rarebit.Tx.getOutput = function( db, txhash, txoutindex, CID, owner ) {
  o = db.queryOutputs( 'exitOuts', 
                  {txHash:Bitcoin.ImpExp.BBE.importHash(txhash),
                   index:txoutindex} );
  if (o.outsStats.length && Rarebit.Tx.verifyOutput(o.outsStats[0],CID,owner))
    return o.outsStats[0];
  return null;
}


/*
  Verify output info
    CID (optional): CID to match
    owner (optional): owner to match
    returns null if not found, invalid, or mismatch
*/
Rarebit.Tx.verifyOutput = function( o, CID, owner ) {
  if (o.M != 2 || o.N != 2)
    return false;
  if (CID && CID.toString() != o.addrs[0])
    return false;
  if (owner && owner.toString() != o.addrs[1])
    return false;
  return true;
}


/*
  Convert addr str to Bitcoin.Address
*/
Rarebit.Tx.verifyAddr = function( addr, errsfx ) {
  var a = Bitcoin.Address.validate( addr );
  if (!a) {
    errsfx = errsfx ? " (" + errsfx + ")" : addr;
    throw new Error( "Invalid bitcoin address " + errsfx );
  }
  return a;
}


/*
  Convert pub (hex str) to Bitcoin.Address
*/
Rarebit.Tx.verifyPubKey = function( pub ) {
  var a = Bitcoin.Address.validatePubKey( pub );
  if (!a)
    throw new Error( "Invalid public key (130 chars hex expected)" );
  return a;
}


/*
  Convert BigInteger representation of float to Qty
*/
Rarebit.Tx.valueToQty = function( v ) {
  return Bitcoin.Util.floatToSatoshisStr( Bitcoin.Util.formatValue2(v) );
}


/*
  Convert Qty to BigInteger representation of float
*/
Rarebit.Tx.qtyToValue = function( qty, failzeroneg ) {
  qty = Bitcoin.Util.satoshisToFloatStr( Rarebit.Tx.cleanQty(qty) );
  qty = Bitcoin.Util.parseValue2( qty );
  if (failzeroneg && qty.compareTo(BigInteger.ZERO) <= 0)
    throw new Error( "Quantity > 0 needed" );
  return qty;
}


/*
  Compare two qtys, return <0 (q1<q2), 0 (==), >0 (q1>q2)
    if q2 ommitted, q2 = '0'
*/
Rarebit.Tx.compareQtys = function( q1, q2 ) {
  q2 = q2 ? q2 : '0';
  q1 = Rarebit.Tx.qtyToValue( q1 );
  q2 = Rarebit.Tx.qtyToValue( q2 );
  return q1.compareTo( q2 );
}


/*
  Add qty, return q1 + q2
*/
Rarebit.Tx.addQty = function( q1, q2, failzeroneg ) {
  q1 = Rarebit.Tx.qtyToValue( q1, failzeroneg );
  q2 = Rarebit.Tx.qtyToValue( q2, failzeroneg );
  q1 = q1.add( q2 );
  return Rarebit.Tx.valueToQty( q1 );
}


/*
  Subtract qty, return q1 - q2
*/
Rarebit.Tx.subtractQty = function( q1, q2, failzeroneg ) {
  q1 = Rarebit.Tx.qtyToValue( q1, failzeroneg );
  q2 = Rarebit.Tx.qtyToValue( q2, failzeroneg );
  q1 = q1.subtract( q2 );
  return Rarebit.Tx.valueToQty( q1 );
}


/*
  Return sum of qtys [{qty:<>},...]
*/
Rarebit.Tx.sumQtys = function( qs ) {
  for( var i=0, tq='0'; i<qs.length; i++ )
    tq = Rarebit.Tx.addQty( qs[i].qty, tq );
  return tq;
}


/*
  Clean invalid chars from qty
*/
Rarebit.Tx.cleanQty = function( q ) {
  if (!q)
    q = "0";
  if (typeof(q) == 'string')
    q = q.replace( /[^0-9+\/]/ig, "" );
  else
    q = q.toString();
  while (q.substr(0,1) == '0') q = q.substr( 1, q.length-1 );
  return q;
}


/*
  Get JSON BBE text of transaction
*/
Rarebit.Tx.toJSON = function( tx ) {
  return Bitcoin.ImpExp.BBE.exportTx( tx, true ).JSON;
}


/*
  Get raw hex text of transaction
*/
Rarebit.Tx.toRaw = function( tx ) {
  var buf = tx.serialize();
  return Crypto.util.bytesToHex( buf );
}


/*
  Adds tx data to a seed wallet or tx db
    txdata: JSON transaction text in BBE format
    db: wallet or db; created if not provided
    returns: db/wallet
*/
Rarebit.Tx.addDataToWallet = function( txdata, db ) {
  if (!db) db = new Bitcoin.Wallet();
  var res = Bitcoin.ImpExp.BBE.import( txdata, db );
  if (!res || res.txsRejected > 0 || res.txsAccepted == 0)
    throw new Error( "Transaction data missing or invalid" );
  return db;
}


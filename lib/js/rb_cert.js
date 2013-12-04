/*
Rarebit certificate superclass
*/
var Rarebit = {};

/*
Create a certificate instance, optionally sign it
  clientContent is any client data, will be JSON.stringified
*/
Rarebit.createCertificate = function( clientContent, priv ) {
  var c = new Rarebit.Certificate();
  c.init( clientContent );
  if (priv)
    c.sign( priv );
  return c;
}

/*
Create a certificate instance from JSON text
*/
Rarebit.createCertificateFromJSON = function( text ) {
  var c = Rarebit.createCertificate();
  c.fromString( text );
  return c;
}

/*
Certificate structure
*/
Rarebit.certificateTemplate = {
  signature: "",                   //signature of .content
  content: { 
    signer: "",                    //who signed it, standard bitcoin address
    date: "",                      //time of signing
    clientcontent: {}              //anything, will be JSON.stringified
  }
}

/*
Certificate superclass
*/
Rarebit.Certificate = function() {
  /* set overridable methods */
  this.init = this.cert_init;
  this.copy = this.cert_copy;
  this.getContent = this.cert_getContent;
  this.getStringToSign = this.cert_getStringToSign;
  this.setClientContent = this.cert_setClientContent;
  this.getClientContent = this.cert_getClientContent;
  this.clear = this.cert_clear;
  this.toString = this.cert_toString;
  this.fromString = this.cert_fromString;
  this.sign = this.cert_sign;
  this.verify = this.cert_verify;
  this.getSigner = this.cert_getSigner;
  this.getCID = this.cert_getCID;
  this.getCIDPub = this.cert_getCIDPub;
  this.getCIDPrivateKey = this.cert_getCIDPrivateKey;
}

/*
Init a certificate instance
*/
Rarebit.Certificate.prototype.cert_init = function( clientContent ) {
  this.clear();
  if (clientContent)
    this.setClientContent( clientContent );
}

/*
Clear certificate instance (reset to default)
*/
Rarebit.Certificate.prototype.cert_clear = function( ) {
  this.fromString( JSON.stringify(Rarebit.certificateTemplate) );
}

/*
Get signer (who signed) from certificate instance, return <Bitcoin.Address>
  forces sig validation if needed
*/
Rarebit.Certificate.prototype.cert_getSigner = function() {
  if (!this.verifiesTo.signerPub)
    this.verify();
  return this.verifiesTo.signerPub.getBitcoinAddress();
}

/*
Get CID private key from certificate instance, returns <Bitcoin.ECKey>
  forces sig validation if needed
*/
Rarebit.Certificate.prototype.cert_getCIDPrivateKey = function() {
  if (!this.verifiesTo.CIDkey)
    this.verify();
  return this.verifiesTo.CIDkey;
}

/*
Get CID pub key from certificate instance, returns <ByteArray>
  forces sig validation if needed
*/
Rarebit.Certificate.prototype.cert_getCIDPub = function() {
  var k = this.getCIDPrivateKey();
  return k.getPub();
}

/*
Get CID of certificate instance, returns <Bitcoin.Address>
*/
Rarebit.Certificate.prototype.cert_getCID = function() {
  return Bitcoin.Address.fromPubKey( this.getCIDPub() );
}

/*
Get certificate's content as text (what will be signed, ie, message)
*/
Rarebit.Certificate.prototype.cert_getStringToSign = function() {
  return JSON.stringify( this.getContent() );
}

/*
Verify certificate instance
  returns { signer:<Bitcoin.Address>, CID:<Bitcoin.Address> }
*/
Rarebit.Certificate.prototype.cert_verify = function() {
  if (!this.struct.signature)
    throw new Error( "Certificate not signed" );
  // calculating pubkey from sig is computationally expensive, 
  //  so signer's pub is saved for subsequent queries, CID is also saved;
  //  .verifiesTo must be set to {} whenever anything in .struct changes
  this.verifiesTo = {};
  this.verifiesTo.signerPub = Bitcoin.Message.verifyTo( 
                          this.struct.signature, this.getStringToSign() );
  if (this.getSigner().toString() != this.getContent().signer)
    throw new Error( "Certificate content changed since signed" );
  var hash = Bitcoin.Message.getHash( this.toString() );
  this.verifiesTo.CIDkey = new Bitcoin.ECKey( hash );
  return { signer:this.getSigner(), CID:this.getCID() };
}

/*
Sign certificate instance with private key
*/
Rarebit.Certificate.prototype.cert_sign = function( priv ) {
  if (!priv)
    throw new Error( "Private key needed to sign certificate" );
  var t = new Date();
  this.verifiesTo = {};
  var keyinfo = Bitcoin.Address.fromPrivOrPass( priv );
  if (!keyinfo)
    throw new Error( "Private key needed to sign certificate" );
  this.getContent().date = t.toString();
  this.getContent().signer = keyinfo.addressStr;
  var sig = Bitcoin.Message.signMessage( 
                                 keyinfo.ecKey, this.getStringToSign() );
  this.struct.signature = sig;
}

/*
Get JSON text of certificate instance
*/
Rarebit.Certificate.prototype.cert_toString = function( fmt ) {
  return JSON.stringify( this.struct, null, fmt?fmt:0 );
}

/*
Set certificate instance from JSON text
*/
Rarebit.Certificate.prototype.cert_fromString = function( str ) {
  if (!str)
    throw new Error( "Certificate text needed" );
  this.verifiesTo = {};
  this.struct = JSON.parse( str );
  if (!this.getContent() || !this.getClientContent())
    throw new Error( "Certificate structure invalid" );
}

/*
Copy certificate instance
*/
Rarebit.Certificate.prototype.cert_copy = function( ) {
  var c = Rarebit.createCertificate();
  c.fromString( this.toString() );
  return c;
}

/*
Get content from certificate instance
*/
Rarebit.Certificate.prototype.cert_getContent = function( ) {
  return this.struct.content;
}

/*
Set client content of certificate instance
*/
Rarebit.Certificate.prototype.cert_setClientContent = function( 
                                      clientContent ) {
  this.verifiesTo = {};
  this.getContent().clientcontent = clientContent;
  this.struct.signature = "";
}

/*
Get client content from certificate instance
*/
Rarebit.Certificate.prototype.cert_getClientContent = function( ) {
  return this.getContent().clientcontent;
}


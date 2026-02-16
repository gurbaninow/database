/**
 * General utility functions
 */

const { anyid } = require( 'anyid' )
const { basename } = require( 'path' )
const crypto = require( 'crypto' )
const { findBestMatch } = require( 'string-similarity' )
const memoize = require( 'memoizee' )
const { promisify } = require( 'util' )
const recursiveCopy = require( 'recursive-copy' )
const { stripVishraams } = require( 'gurmukhi-utils' )
const { existsSync, mkdirSync, writeFile } = require( 'fs' )

// Wraps callback functions in a promise
const writeFileAsync = promisify( writeFile )

/**
 * Finds the needle in the haystack. Is memoized.
 * @param {*} needle The value to find.
 * @param {[*]} haystack A list of the values to find the needle in.
 */
const findIndex = memoize( ( needle, haystack ) => {
  const index = haystack.indexOf( needle )

  // If we can't find it, throw an error and find a better suggestion
  if ( index === -1 ) {
    const { bestMatch: { target } } = findBestMatch( needle, haystack )
    throw new Error( `Could not find value '${needle}', did you mean '${target}'?` )
  }

  return index
}, { primitive: true } )

/**
 * Random generates an id using a scheme of A-Z 0-9, excluding I and O.
 * @param {Number} length
 */
const generateId = length => anyid()
  .encode( '0A-IO' )
  .length( length )
  .random()
  .id()

/**
 * Pretty-stringifies and saves json to path, with a newline at the end.
 * @param {text} path The path to write the json file to
 * @param {Object} json The JS object to be serialised
 */
const writeJSON = ( path, json ) => writeFileAsync(
  path,
  `${JSON.stringify( json, null, 2 )}\n`,
  { flag: 'w' },
)

/**
 * Removes the .json extension from the given path.
 * @param {String} name The pathname to remove the extension from
 */
const stripExtension = name => basename( name, '.json' )

/**
 * Creates a directory at path if it doesn't already exist.
 * @param {String} path The directory path
 */
const createDir = path => {
  if ( !existsSync( path ) ) {
    mkdirSync( path )
  }
}

const fsCopy = async ( src, dest ) => {
  const copyOpts = { dot: true }
  await recursiveCopy( src, dest, copyOpts )
    .catch( e => console.error( e ) )
}

const larivaar = input => input
  .replace( /\s+/ug, '\u200B' )
  .replace( /(\d+)/ug, ' $1 ' )
  .replace( /(\]|\[) (\d+) /ug, '$1$2' )
  .replace( /(\D)(\]|\[)/ug, '$1 $2' )
  .replace( /(\]|\[)(\D)/ug, '$1 $2' )
  .replace( /\s+\u200B/ug, ' ' )
  .replace( /\u200B\s+/ug, ' ' )

const encrypt = ( string, password ) => {
  const passwordHash = crypto.createHash( 'sha256' ).update( password ).digest()
  const iv = crypto.randomBytes( 16 )
  const cipher = crypto.createCipheriv( 'aes-256-gcm', passwordHash, iv )
  const encrypted = Buffer.concat( [ cipher.update( string, 'utf8' ), cipher.final() ] )
  const tag = cipher.getAuthTag()
  return Buffer.concat( [ iv, tag, encrypted ] ).toString( 'base64' )
}

/**
 * Generates vishraams model from in-line vishraams.
 * Returns an empty array if no vishraam characters are present.
 * @param {String} input The input string potentially containing vishraam markers
 * @param {bool} larivaar If the input string is larivaar
 * @returns {Array<{ index: number, word: string, type: string }>} An array of vishraam objects
 */
const getVishraamsFromChars = ( input, larivaar = false ) => {
  // TODO: refactor using proper Enums
  const chars = [ ',', ';' ]
  const vishraamType = { ',': 'jamki', ';': 'pause' }

  const vishraams = []

  if ( chars.some( char => input.includes( char ) ) ) {
    const seperator = larivaar ? '\u200B' : ' '
    const words = input.split( seperator )

    words.forEach( ( word, index ) => {
      if ( !word ) return
      const last = word[ word.length - 1 ]
      if ( chars.includes( last ) ) {
        vishraams.push( {
          index,
          word: word.slice( 0, -1 ),
          type: vishraamType[ last ],
        } )
      }
    } )
  }

  return vishraams
}

const removeDiacritics = input => ( input
  .replaceAll( 'S', 's' )
  .replaceAll( '^', 'K' )
  .replaceAll( 'Z', 'g' )
  .replaceAll( 'z', 'j' )
  .replaceAll( '&', 'P' )
  .replaceAll( 'L', 'l' )
  .replaceAll( 'æ', '' )
  .replaceAll( '`', '' )
  .replaceAll( '~', '' )
  .replaceAll( '¤', '' )
)

const formatText = input => ( removeDiacritics( stripVishraams( input ) ) )

const formatTextDisplay = ( line, vishraams = [], larivaar = false ) => {
  let vishraamData = vishraams
  if ( vishraamData.length === 0 ) {
    vishraamData = getVishraamsFromChars( line, larivaar )
  }

  const lineContent = stripVishraams( line )

  if ( vishraamData.length !== 0 ) {
    const seperator = larivaar ? '\u200B' : ' '
    const words = lineContent.split( seperator )

    vishraamData.forEach( vishraam => {
      if ( vishraam.word === words[ vishraam.index ] ) {
        words[ vishraam.index ] = `<span class="${vishraam.type}">${words[ vishraam.index ]}</span>`
      }
    } )

    return removeDiacritics( words.join( seperator ) )
  }

  return removeDiacritics( lineContent )
}

module.exports = {
  writeJSON,
  stripExtension,
  createDir,
  generateId,
  findIndex,
  fsCopy,
  larivaar,
  encrypt,
  formatText,
  formatTextDisplay,
}

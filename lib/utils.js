/**
 * General utility functions
 */

const { anyid } = require( 'anyid' )
const { basename } = require( 'path' )
const { findBestMatch } = require( 'string-similarity' )
const memoize = require( 'memoizee' )
const { promisify } = require( 'util' )
const recursiveCopy = require( 'recursive-copy' )
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

module.exports = {
  writeJSON,
  stripExtension,
  createDir,
  generateId,
  findIndex,
  fsCopy,
  larivaar,
}

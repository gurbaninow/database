const build = require( './build-database' )
const { filename } = require( '..' )
const fs = require( 'fs' )

const OUTPUT_PATH = './build'

/**
 * Sets up SQLite pragma settings.
 */
const onInitialise = async knex => {
  await knex.raw( 'PRAGMA synchronous = "OFF"' )
  await knex.raw( 'PRAGMA journal_mode = "OFF"' )
  await knex.raw( 'PRAGMA cache_size = 100000' )
}

const beforeInitialise = async () => {
  // Create build folder
  if ( !fs.existsSync( OUTPUT_PATH ) ) {
    fs.mkdirSync( OUTPUT_PATH )
  }

  // Delete DB before building
  if ( fs.existsSync( filename ) ) {
    fs.unlinkSync( filename )
  }
}

build( { onInitialise, beforeInitialise, type: 'SQLite' } )

const build = require( './build-database' )
const { createDir } = require( './utils' )
const { knex } = require( '..' )
const rimraf = require( 'rimraf' )

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
  // Disconnect database file
  await knex.destroy()

  // Create directory for DB file
  await rimraf( OUTPUT_PATH )
  createDir( OUTPUT_PATH )

  // Reconnect database file
  await knex.initialize()
}

build( { onInitialise, beforeInitialise, type: 'SQLite ' } )

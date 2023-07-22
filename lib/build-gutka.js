require( './string-colors' )
const { GURMUKHI_SOURCES } = require( './utils' )
const build = require( './build-database' )
const { filename } = require( '..' )
const fs = require( 'fs' )

const OUTPUT_PATH = './build'
const outputFile = `${OUTPUT_PATH}/gutka-db.sqlite`

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
  if ( fs.existsSync( outputFile ) ) {
    fs.unlinkSync( outputFile )
  }
}

const afterBuild = async knex => {
  console.log( '\nBuilding gutka database...'.subheader )

  // Drop/remove un-needed data
  await knex.schema.alterTable( 'line_content', table => {
    table.dropColumn( 'vishraam_first_letters' )
    table.dropColumn( 'first_letters' )
    table.dropColumn( 'source_id' )
    table.primary( 'line_id' )
  } )
  await knex.schema.alterTable( 'lines', table => {
    table.dropColumn( 'pronunciation_information' )
    table.dropColumn( 'pronunciation' )
    table.dropColumn( 'source_line' )
    table.dropColumn( 'source_page' )
    table.dropForeign( 'shabad_id' )
    table.dropForeign( 'type_id' )
  } )

  // Drop tables
  await knex.schema.dropTable( 'transliterations' )
  await knex.schema.dropTable( 'translations' )
  await knex.schema.dropTable( 'translation_sources' )
  await knex.schema.dropTable( 'languages' )
  await knex.schema.dropTable( 'shabads' )
  await knex.schema.dropTable( 'writers' )
  await knex.schema.dropTable( 'subsections' )
  await knex.schema.dropTable( 'sections' )
  await knex.schema.dropTable( 'compositions' )
  await knex.schema.dropTable( 'sources' )
  await knex.schema.dropTable( 'line_types' )

  // Remove un-used lines
  const usedLines = knex.select( 'line_id' ).from( 'bani_lines' )
  await knex( 'line_content' )
    .whereNotIn( 'line_id', usedLines )
    .del()
  await knex( 'lines' )
    .whereNotIn( 'id', usedLines )
    .del()
  const nonVisibleLines = knex
    .select( 'id' )
    .from( 'lines' )
    .where( 'visible', 0 )
  await knex( 'line_content' )
    .whereIn( 'line_id', nonVisibleLines )
    .del()
  await knex( 'bani_lines' )
    .whereIn( 'line_id', nonVisibleLines )
    .del()
  await knex( 'lines' )
    .whereIn( 'id', nonVisibleLines )
    .del()
  await knex.schema.alterTable( 'lines', table => {
    table.dropColumn( 'visible' )
  } )

  // Compact sqlite db
  await knex.raw( 'VACUUM' )

  // Rename built DB
  if ( fs.existsSync( filename ) ) {
    fs.renameSync( filename, outputFile )
  }
}

build( {
  onInitialise,
  beforeInitialise,
  afterBuild,
  sourcesFallback: GURMUKHI_SOURCES,
  type: 'SQLite',
} )

require( './string-colors' )
const build = require( './build-database' )
const { filename } = require( '..' )
const fs = require( 'fs' )

const OUTPUT_PATH = './build'
const outputFile = `${OUTPUT_PATH}/gutka-db.sqlite`

// Gurmukhi sources with fallback ordering
const GURMUKHI_SOURCES = {
  Ardaas: [ 'SGPC' ],
  'Ganj Nama Bhai Nand Lal Ji': [ 'Master Jaswant Singh', 'Dr. Ganda Singh' ],
  'Ghazals Bhai Nand Lal Ji': [ 'Dr. Ganda Singh' ],
  'Jot Bigas Bhai Nand Lal Ji': [ 'Dr. Ganda Singh' ],
  'Kabit Savaiye Bhai Gurdas Ji': [ 'Seva Singh' ],
  'Sarabloh Granth': [ 'Amrit Keertan' ],
  'Sri Dasam Granth': [ 'GurbaniNow', 'SGPC', 'Piara Singh Padam', 'Budha Dal Mehron', 'Dr. Rattan Singh Jaggi' ],
  'Sri Guru Granth Sahib Ji': [ 'GurbaniNow', 'Bhai Sahib Randhir Singh', 'SGPC' ],
  'Vaaran Bhai Gurdas Ji': [ 'Amrit Keertan', 'SGPC' ],
  'Zindagi Nama Bhai Nand Lal Ji': [ 'Dr. Ganda Singh' ],
  Rehitname: [],
  Uggardanti: [],
}

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

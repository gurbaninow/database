/**
 * Sets up all the models and re-exports them with names.
 * @ignore
 */

// Must bind any models to knex database connection
const Knex = require( 'knex' )
const { Model } = require( 'objection' )

// Load config file from environment or locally
const { KNEXFILE } = process.env
// eslint-disable-next-line import/no-dynamic-require
const config = require( KNEXFILE || './knexfile' )

// Initialise knex with connection to sqlite file
const knex = Knex( config )
// Bind it to Objection
Model.knex( knex )

// Enable case-sensitivity for LIKE searches in SQLite3
const { client } = config
if ( client === 'sqlite3' || client === 'better-sqlite3' ) {
  knex.raw( 'PRAGMA case_sensitive_like = ON' ).then().catch()
}

// Import all the models
// eslint-disable-next-line require-sort/require-sort
const Banis = require( './lib/models/Banis' )
const Compositions = require( './lib/models/Compositions' )
const Languages = require( './lib/models/Languages' )
const LineContent = require( './lib/models/LineContent' )
const LineTypes = require( './lib/models/LineTypes' )
const Lines = require( './lib/models/Lines' )
const Sections = require( './lib/models/Sections' )
const Shabads = require( './lib/models/Shabads' )
const Sources = require( './lib/models/Sources' )
const Subsections = require( './lib/models/Subsections' )
const TranslationSources = require( './lib/models/TranslationSources' )
const Translations = require( './lib/models/Translations' )
const Transliterations = require( './lib/models/Transliterations' )
const Writers = require( './lib/models/Writers' )

const { connection: { filename } } = config

module.exports = {
  Banis,
  Languages,
  Lines,
  LineContent,
  LineTypes,
  Transliterations,
  Translations,
  TranslationSources,
  Sections,
  Subsections,
  Shabads,
  Compositions,
  Writers,
  Sources,
  knex,
  filename,
}

require( './string-colors' )
const GURMUKHI_SOURCES = require( '../data/sourcesList' )
const build = require( './build-database' )
const { filename } = require( '..' )
const fs = require( 'fs' )
const prompts = require( 'prompts' )
const { toAscii } = require( 'gurmukhi-utils' )
const { encrypt, formatText, formatTextDisplay } = require( './utils' )

const OUTPUT_PATH = './build'
const outputFile = `${OUTPUT_PATH}/gutka-db.sqlite`
const EXCLUDED_BANIS_FORMATTING = [ '4R' ]
const LINES_WITH_LONG_NUMBERS = [ 'DQ07', '4ASC', 'GM31' ]

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
    table.dropIndex( 'gurmukhi', 'idx_line_content_gurmukhi' )
    table.dropColumn( 'vishraam_first_letters' )
    table.dropColumn( 'first_letters' )
    table.dropColumn( 'source_id' )
    table.primary( 'line_id' )
  } )
  await knex.schema.alterTable( 'lines', table => {
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
  const usedLines = knex( 'bani_lines' ).select( 'line_id' )
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

  // Convert pronunciation to ascii gurmukhi
  await knex.select()
    .from( 'lines' )
    .whereNot( 'pronunciation', '' )
    .orWhereNot( 'pronunciation_information', '' )
    .then( lines => {
      lines.forEach( async line => {
        await knex( 'lines' )
          .where( 'id', line.id )
          .update( {
            pronunciation: toAscii( line.pronunciation || '' ),
            pronunciation_information: toAscii( line.pronunciation_information || '' ),
          } )
      } )
    } )

  // Format lines
  await knex.schema.alterTable( 'line_content', table => {
    table.text( 'gurmukhi_display' ).notNullable().defaultTo( '' )
    table.text( 'larivaar_display' ).notNullable().defaultTo( '' )
  } )

  const allMangals = knex( 'lines' ).select( 'id' ).where( 'type_id', 1 )
  await knex( 'line_content' )
    .whereIn( 'line_id', allMangals )
    .update( {
      gurmukhi: knex.raw( 'REPLACE(??, ?, ?)', [
        'gurmukhi',
        'siqgur pRswid',
        'siq gurpRswid',
      ] ),
    } )
  await knex( 'line_content' )
    .whereIn( 'line_id', allMangals )
    .update( {
      gurmukhi: knex.raw( 'REPLACE(??, ?, ?)', [
        'gurmukhi',
        'gur pRswid',
        'gurpRswid',
      ] ),
    } )

  await knex( 'line_content' )
    .update( {
      gurmukhi_display: knex.ref( 'gurmukhi' ),
      larivaar_display: knex.ref( 'larivaar' ),
    } )

  const formatLines = knex( 'bani_lines' )
    .distinct( 'line_id' )
    .whereNotIn( 'bani_id', EXCLUDED_BANIS_FORMATTING )
  await knex( 'lines' )
    .join( 'line_content', 'lines.id', 'line_content.line_id' )
    .whereIn( 'lines.id', formatLines )
    .orderBy( 'lines.order_id' )
    .then( lines => {
      lines.forEach( async line => {
        const vishraams = JSON.parse( line.vishraams )
        await knex.transaction( async trx => {
          await trx( 'line_content' )
            .where( 'line_id', line.id )
            .update( {
              gurmukhi: formatText( line.gurmukhi ),
              larivaar: formatText( line.larivaar ),
            } )
          await trx( 'line_content' )
            .where( 'line_id', line.id )
            .update( {
              gurmukhi_display: formatTextDisplay( line.gurmukhi_display, vishraams ),
              larivaar_display: formatTextDisplay( line.larivaar_display, vishraams, true ),
            } )
        } )
      } )
    } )

  await knex.schema.alterTable( 'lines', table => {
    table.dropColumn( 'vishraams' )
  } )

  // Fix yakash line break
  // WORD JOINER + acute + WORD JOINER
  await knex.transaction( async trx => {
    await trx( 'line_content' )
      .whereLike( 'gurmukhi_display', '%\u00B4%' )
      .update( {
        gurmukhi_display: knex.raw( 'REPLACE(??, ?, ?)', [
          'gurmukhi_display',
          '\u00B4',
          '\u2060\u00B4\u2060',
        ] ),
      } )
    await trx( 'line_content' )
      .whereLike( 'larivaar_display', '%\u00B4%' )
      .update( {
        larivaar_display: knex.raw( 'REPLACE(??, ?, ?)', [
          'larivaar_display',
          '\u00B4',
          '\u2060\u00B4\u2060',
        ] ),
      } )
  } )

  // Fix Bhatt Savaiye and Maru Soheley ending, long number sequence
  await knex.transaction( async trx => {
    await trx( 'line_content' )
      .whereIn( 'line_id', LINES_WITH_LONG_NUMBERS )
      .update( {
        gurmukhi_display: knex.raw( 'REPLACE(??, ?, ?)', [
          'gurmukhi_display',
          ']',
          ']\u200B',
        ] ),
      } )
    await trx( 'line_content' )
      .whereIn( 'line_id', LINES_WITH_LONG_NUMBERS )
      .update( {
        larivaar_display: knex.raw( 'REPLACE(??, ?, ?)', [
          'larivaar_display',
          ']',
          ']\u200B',
        ] ),
      } )
  } )

  // Encrypt data
  const response = await prompts( {
    type: 'password',
    name: 'key',
    message: 'Enter encryption key:',
  } )
  if ( response.key.length !== 0 ) {
    await knex.select().from( 'line_content' ).then( lines => {
      console.log( 'Encrypting data...' )
      lines.forEach( async line => {
        await knex( 'line_content' )
          .where( 'line_id', line.line_id )
          .update( {
            gurmukhi: encrypt( line.gurmukhi, response.key ),
            larivaar: encrypt( line.larivaar, response.key ),
            gurmukhi_display: encrypt( line.gurmukhi_display, response.key ),
            larivaar_display: encrypt( line.larivaar_display, response.key ),
          } )
      } )
    } )
  } else {
    console.log( 'No key provided. Data not encrypted.'.warning )
  }

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

/**
 * Sets up MySQL/MariaDB specific requirements.
 * @param {*} table The table to apply the requirements to.
 */
const setupMySQL = table => {
  table.engine( 'Aria' )
  table.charset( 'utf8mb4' )
  table.collate( 'utf8mb4_bin' )
}

/**
 * The schema as per `schema.png`, defined by Knex statements.
 */
const createSchema = ( knex, type ) => knex.schema
  .createTable( 'compositions', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable().unique()
    table.string( 'name_english' ).notNullable().unique()
    table.integer( 'length' ).notNullable()
    table.string( 'page_name_english' ).notNullable()
    table.string( 'page_name_gurmukhi' ).notNullable()
  } )
  .createTable( 'sections', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable().unique()
    table.string( 'name_english' ).notNullable().unique()
    table.text( 'description' ).notNullable()
    table.integer( 'start_page' ).notNullable()
    table.integer( 'end_page' ).notNullable()
    table.integer( 'composition_id' ).references( 'id' ).inTable( 'compositions' ).notNullable()
  } )
  .createTable( 'subsections', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.integer( 'section_id' ).references( 'id' ).inTable( 'sections' ).notNullable()
    table.string( 'name_gurmukhi' ).notNullable()
    table.string( 'name_english' ).notNullable()
    table.integer( 'start_page' )
    table.integer( 'end_page' )
  } )
  .createTable( 'writers', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable().unique()
    table.string( 'name_english' ).notNullable().unique()
  } )
  .createTable( 'shabads', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.string( 'id', '3' ).primary()
    table.integer( 'composition_id' ).references( 'id' ).inTable( 'compositions' ).notNullable()
    table.integer( 'writer_id' ).references( 'id' ).inTable( 'writers' ).notNullable()
    table.integer( 'section_id' ).references( 'id' ).inTable( 'sections' ).notNullable()
    table.integer( 'subsection_id' ).references( 'id' ).inTable( 'subsections' )
    table.integer( 'sttm_id' )
    table.integer( 'order_id' ).notNullable().unique()
  } )
  .createTable( 'line_types', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable().unique()
    table.string( 'name_english' ).notNullable().unique()
  } )
  .createTable( 'lines', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.string( 'id', 4 ).primary()
    table
      .string( 'shabad_id', 3 )
      .references( 'id' )
      .inTable( 'shabads' )
      .notNullable()
      .index()
    table.integer( 'source_page' ).notNullable()
    table.integer( 'source_line' )
    table.text( 'pronunciation' )
    table.text( 'pronunciation_information' )
    table.integer( 'type_id' ).references( 'id' ).inTable( 'line_types' )
    table.integer( 'order_id' ).notNullable().unique()
  } )
  .createTable( 'sources', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable().unique()
    table.string( 'name_english' ).notNullable().unique()
  } )
  .createTable( 'line_content', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.string( 'line_id', 4 ).references( 'id' ).inTable( 'lines' ).notNullable()
    table.integer( 'source_id' ).references( 'id' ).inTable( 'sources' ).notNullable()
    table.text( 'gurmukhi' ).notNullable()
    table.text( 'first_letters' )
    table.text( 'vishraam_first_letters' )
    table.primary( [ 'line_id', 'source_id' ] )
  } )
  .createTable( 'languages', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable().unique()
    table.string( 'name_english' ).notNullable().unique()
    table.string( 'name_international' ).unique()
  } )
  .createTable( 'translation_sources', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable()
    table.string( 'name_english' ).notNullable()
    table.integer( 'composition_id' ).references( 'id' ).inTable( 'compositions' ).notNullable()
    table.integer( 'language_id' ).references( 'id' ).inTable( 'languages' ).notNullable()
  } )
  .createTable( 'translations', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.string( 'line_id', 4 ).references( 'id' ).inTable( 'lines' ).notNullable()
    table
      .integer( 'translation_source_id' )
      .references( 'id' )
      .inTable( 'translation_sources' )
      .notNullable()
    table.text( 'translation' ).notNullable()
    table.json( 'additional_information' )
    table.primary( [ 'line_id', 'translation_source_id' ] )
  } )
  .createTable( 'transliterations', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.string( 'line_id', 4 ).references( 'id' ).inTable( 'lines' ).notNullable()
    table.integer( 'source_id' ).references( 'id' ).inTable( 'sources' ).notNullable()
    table
      .integer( 'language_id' )
      .references( 'id' )
      .inTable( 'languages' )
      .notNullable()
    table.text( 'transliteration' ).notNullable()
    table.text( 'first_letters' )
    table.text( 'vishraam_first_letters' )
    table.primary( [ 'line_id', 'source_id', 'language_id' ] )
  } )
  .createTable( 'banis', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.increments( 'id' ).primary()
    table.string( 'name_gurmukhi' ).notNullable().unique()
    table.string( 'name_english' ).notNullable().unique()
  } )
  .createTable( 'bani_lines', table => {
    if ( type === 'MySQL' ) {
      setupMySQL( table )
    }
    table.string( 'line_id', 4 ).references( 'id' ).inTable( 'lines' ).notNullable()
    table.integer( 'bani_id' ).references( 'id' ).inTable( 'banis' ).notNullable()
    table.integer( 'line_group' ).notNullable()
    table.primary( [ 'line_id', 'bani_id', 'line_group' ] )
  } )

module.exports = createSchema

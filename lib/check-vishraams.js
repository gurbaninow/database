require( './string-colors' )
const GURMUKHI_SOURCES = require( '../data/sourcesList' )
const Table = require( 'cli-table3' )
const { knex } = require( '..' )
const { stripVishraams } = require( 'gurmukhi-utils' )

const main = async () => {
  console.log( 'Checking consistency of vishraams'.header )

  let count = 0
  const vishraamTable = new Table( { head: [ 'Line ID', 'Index', 'Expected', 'Actual' ] } )

  // Get all lines, with vishraams and composition name
  // Check if vishraam exists
  const lines = await knex( 'lines' )
    .select( 'lines.id', 'lines.vishraams', 'compositions.name_english' )
    .join( 'shabads', 'shabads.id', 'lines.shabad_id' )
    .join( 'compositions', 'compositions.id', 'shabads.composition_id' )
    .whereNot( 'lines.vishraams', '[]' )

  await Promise.all( lines.map( async ( { id, vishraams, name_english: compositionName } ) => {
    // Get all sources for line
    let content = await knex( 'line_content' )
      .select( 'name_english', 'gurmukhi' )
      .join( 'sources', 'sources.id', 'line_content.source_id' )
      .where( 'line_content.line_id', id )
    content = content.reduce(
      ( obj, item ) => Object.assign( obj, { [ item.name_english ]: item.gurmukhi } ),
      {},
    )

    // Get preferred source for line
    const preferredSources = GURMUKHI_SOURCES ? GURMUKHI_SOURCES[ compositionName ] : null
    if ( preferredSources == null ) {
      throw new ReferenceError( `No preferred source found for ${compositionName}` )
    }
    let gurmukhiLine = preferredSources.reduce( ( gurmukhiLine, source ) => {
      if ( gurmukhiLine ) {
        return gurmukhiLine
      }
      if ( source in content ) {
        return content[ source ]
      }
      return null
    }, null )
    if ( gurmukhiLine === null ) {
      throw new ReferenceError( `No preferred source found for line ${id} in composition ${compositionName}` )
    }

    // Split line by words
    gurmukhiLine = stripVishraams( gurmukhiLine ).split( ' ' )

    // Check vishraams against line
    JSON.parse( vishraams ).forEach( vishraam => {
      if ( vishraam.word !== gurmukhiLine[ vishraam.index ] ) {
        count += 1
        vishraamTable.push( [ id, vishraam.index, vishraam.word, gurmukhiLine[ vishraam.index ] ] )
      }
    } )
  } ) )

  if ( count > 0 ) {
    console.log( vishraamTable.toString() )
    console.log( '\nMismatched vishraams found'.error.bold )
    process.exit( 1 )
  }

  console.log( '\nNo mismatched vishraams found'.success.bold )
}

main()
  .then( () => process.exit( 0 ) )
  .catch( async e => {
    console.error( e.message.error )
    console.error( e )
    console.error( '\nError checking vishraams'.error.bold )
    process.exit( 1 )
  } )

const { generateId } = require( './utils' )
const { program } = require( 'commander' )
const { Banis, Lines, Shabads } = require( '..' )

// Support ID types and lengths
const ID_TYPES = {
  bani: [ Banis, 2 ],
  shabad: [ Shabads, 3 ],
  line: [ Lines, 4 ],
}

/**
 * Finds a possible free id that can be used in the table.
 * @param {Set} ids table to generate the id for.
 * @param {Number} length The length of the id to generate.
 */
const findId = ( ids, length ) => {
  // Poor man's search for an id that's not taken
  let id
  while ( !id || ids.has( id ) ) {
    id = generateId( length )
  }

  return id
}

/**
 * Logs the id to the console
 * @param {Number} count the count of id to generate
 * @param {String} type check `idTypes`
 */
const generateIds = async ( count, type ) => {
  const [ Model, idLength ] = ID_TYPES[ type ]

  // Grab ids to exclude from database
  const ids = new Set( ( await Model.query().select( 'id' ) ).map( ( { id } ) => id ) )

  // Loop to print id's and adds the generated id in the Set
  for ( let i = 0; i < count; i += 1 ) {
    const newId = findId( ids, idLength )
    ids.add( newId )

    console.log( newId )
  }
}

/**
 * Parses the type parameter, determining if it is valid.
 * @param {String} type The type of ID to generate. One of ID_TYPES.
 */
const parseType = type => {
  if ( !type || !ID_TYPES[ type ] ) {
    throw new Error(
      `error: [type] must be one of (${Object.keys( ID_TYPES ).join( ' | ' )})`,
    )
  }

  return type
}

/**
 * Interpret user command and print the id, using the database.
 */
const main = async () => {
  program
    .description( 'Generate IDs for Database' )
    .option( '-c, --count <integer>', 'number of IDs', 1 )
    .requiredOption( '-t, --type [type]', 'type of ID to generate', parseType )
    .parse( process.argv )

  const { count, type } = program.opts()

  await generateIds( count, type )
}

main()
  .then( () => process.exit( 0 ) )
  .catch( ( { message } ) => console.error( message ) || process.exit( 1 ) )

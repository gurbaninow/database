const colors = require( 'colors' )

/**
 * Extends the string prototype with the described colors and values.
 */
colors.setTheme( {
  header: [ 'blue', 'bold' ],
  subheader: [ 'bold', 'cyan' ],
  success: 'green',
  error: 'red',
  warning: 'yellow',
  value: [ 'magenta', 'bold' ],
} )

var React = require('react');

var Tile = function render(props) {
  var opts = {
    className: 'tile' + (props.highlight ? ' highlight':''),
    'data-tile': props.value,
    src: '/images/tiles/classic/' + props.value + '.jpg',
    onClick: props.onClick,
    style: {
      width:'2em'
    }
  };
  return <img {...opts}/>;
};

module.exports = Tile;

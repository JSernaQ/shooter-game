import React from 'react';

const UI = ({ score }) => {
  return (
    <div className="ui">
      <h1>Shooter Game</h1>
      <h2>Puntuación: {score}</h2>
    </div>
  );
};

export default UI;

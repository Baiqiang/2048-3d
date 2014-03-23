// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  window.gameName = '2048-3d';
  new GameManager(3, KeyboardInputManager, HTMLActuator, LocalScoreManager);
});

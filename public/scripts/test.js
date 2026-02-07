const buttons = document.querySelectorAll(".interact");

setInterval(() => {
  const num = Math.floor(Math.random() * 3);
  buttons[num].click();
}, 3000);

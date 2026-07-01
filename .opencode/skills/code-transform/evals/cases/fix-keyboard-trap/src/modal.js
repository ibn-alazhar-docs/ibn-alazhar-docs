// BUGGY: traps keyboard focus in the modal even after close
const openBtn = document.getElementById("open-modal");
const modal = document.getElementById("modal");
const confirmBtn = document.getElementById("confirm");
const cancelBtn = document.getElementById("cancel");

openBtn.addEventListener("click", () => {
  modal.hidden = false;
  confirmBtn.focus(); // moves focus into modal
});

confirmBtn.addEventListener("click", () => {
  modal.hidden = true;
  // BUG: doesn't return focus to the trigger button
  // BUG: doesn't remove the keydown listener that traps Tab
});

cancelBtn.addEventListener("click", () => {
  modal.hidden = true;
  // BUG: same as above
});

// BUG: this listener is never removed when modal closes
document.addEventListener("keydown", (e) => {
  if (modal.hidden) return;

  if (e.key === "Escape") {
    modal.hidden = true;
    return;
  }

  if (e.key === "Tab") {
    // Trap focus inside modal
    const focusable = [confirmBtn, cancelBtn];
    const idx = focusable.indexOf(document.activeElement);
    e.preventDefault();
    if (e.shiftKey) {
      focusable[(idx - 1 + focusable.length) % focusable.length].focus();
    } else {
      focusable[(idx + 1) % focusable.length].focus();
    }
  }
});

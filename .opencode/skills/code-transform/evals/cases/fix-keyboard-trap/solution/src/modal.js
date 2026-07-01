// FIXED: focus returns to trigger when modal closes, keydown listener properly removed
const openBtn = document.getElementById("open-modal");
const modal = document.getElementById("modal");
const confirmBtn = document.getElementById("confirm");
const cancelBtn = document.getElementById("cancel");

let previousActiveElement = null;

function openModal() {
  previousActiveElement = document.activeElement; // remember trigger
  modal.hidden = false;
  confirmBtn.focus();
  document.addEventListener("keydown", handleKeydown);
}

function closeModal() {
  modal.hidden = true;
  document.removeEventListener("keydown", handleKeydown); // remove trap listener
  if (previousActiveElement) {
    previousActiveElement.focus(); // restore focus to trigger
  }
}

function handleKeydown(e) {
  if (modal.hidden) return;

  if (e.key === "Escape") {
    closeModal();
    return;
  }

  if (e.key === "Tab") {
    const focusable = [confirmBtn, cancelBtn];
    const idx = focusable.indexOf(document.activeElement);
    e.preventDefault();
    if (e.shiftKey) {
      focusable[(idx - 1 + focusable.length) % focusable.length].focus();
    } else {
      focusable[(idx + 1) % focusable.length].focus();
    }
  }
}

openBtn.addEventListener("click", openModal);
confirmBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);

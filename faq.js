(function () {
  const items = document.querySelectorAll(".faqItem");
  if (!items.length) return;

  items.forEach((item) => {
    const btn = item.querySelector(".faqQ");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const isOpen = item.getAttribute("data-open") === "true";
      item.setAttribute("data-open", isOpen ? "false" : "true");
      btn.setAttribute("aria-expanded", isOpen ? "false" : "true");
    });
  });
})();

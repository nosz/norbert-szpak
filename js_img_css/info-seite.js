/* Infoabend: Countdown bis zum Termin und feste Anmeldeleiste (nur Handy).
   Keine Cookies, keine Speicherung, keine Fremdserver. Ohne JavaScript bleibt die Seite voll nutzbar. */
(function () {
  // Menü (Handy): nach Klick auf einen Eintrag schließen, ebenso mit Escape oder Klick daneben
  var menue = document.querySelector(".kt-menue");
  if (menue) {
    menue.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".kt-menue-liste a")) menue.open = false; });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menue.open) { menue.open = false; menue.querySelector("summary").focus(); } });
    document.addEventListener("click", function (e) { if (menue.open && !menue.contains(e.target)) menue.open = false; });
  }
  // Beginn des Infoabends: Freitag, 27.11.2026, 20.00 Uhr (Winterzeit, UTC+1)
  var START = new Date("2026-11-27T20:00:00+01:00").getTime();

  var box = document.querySelectorAll("[data-countdown]");
  Array.prototype.forEach.call(box, function (el) {
    var zahl = el.querySelector("[data-countdown-zahl]");
    var einheit = el.querySelector("[data-countdown-einheit]");
    var label = el.querySelector("[data-countdown-label]");
    if (!zahl || !einheit) return;
    var rest = START - Date.now();
    if (rest <= 0) { el.hidden = true; return; }
    var tage = Math.floor(rest / 86400000);
    if (tage >= 1) {
      zahl.textContent = String(tage);
      einheit.textContent = tage === 1 ? "Tag" : "Tage";
      if (label) label.textContent = "Noch";
    } else {
      var std = Math.max(1, Math.ceil(rest / 3600000));
      zahl.textContent = String(std);
      einheit.textContent = std === 1 ? "Stunde" : "Stunden";
      if (label) label.textContent = "Heute noch";
    }
    el.hidden = false;
  });

  // Feste Leiste: sichtbar nach dem Kopfbereich, versteckt, sobald das Formular im Bild ist
  var leiste = document.getElementById("sticky-anmelden");
  var hero = document.querySelector(".kt-hero");
  var formular = document.getElementById("anmeldung-bereich");
  if (!leiste || !hero || !formular || !("IntersectionObserver" in window)) return;
  var heroSichtbar = true, formSichtbar = false;
  function aktualisiere() { leiste.classList.toggle("kt-sticky-an", !heroSichtbar && !formSichtbar); }
  new IntersectionObserver(function (e) { heroSichtbar = e[0].isIntersecting; aktualisiere(); }, { threshold: 0 }).observe(hero);
  new IntersectionObserver(function (e) { formSichtbar = e[0].isIntersecting; aktualisiere(); }, { threshold: 0.15 }).observe(formular);
})();

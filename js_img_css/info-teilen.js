/* Einladung teilen: nutzt das Teilen-Menü des Geräts (Web Share API), sonst wird der Link kopiert.
   Teilen-Knöpfe tragen data-teilen (Kopfzeile und Abschnitt am Ende), der Kopierknopf hat die ID kopieren-knopf.
   Es wird nichts an Dritte gesendet und nichts gespeichert; geteilt wird immer die öffentliche Adresse der Seite. */
(function () {
  var URL_OEFFENTLICH = "https://nosz.github.io/norbert-szpak/info-veranstaltung.html";
  var DATEN = {
    title: "Infoabend Herzintelligenz und KI",
    text: "Infoabend am Freitag, 27.11.2026, 20.00 Uhr in Heilbronn-Horkheim: KI einfach erklärt und Herzintelligenz. Vielleicht interessiert dich das auch:",
    url: URL_OEFFENTLICH
  };
  var T = {
    kopiert: "Der Link wurde kopiert. Du kannst ihn jetzt überall einfügen.",
    geteilt: "Danke fürs Teilen!",
    fehler: "Das Kopieren hat nicht geklappt. Bitte kopiere diese Adresse von Hand: " + URL_OEFFENTLICH
  };

  var teilen = document.querySelectorAll("[data-teilen]");
  var kopieren = document.getElementById("kopieren-knopf");
  var status = document.getElementById("teilen-status");
  var toast = document.getElementById("teilen-toast");
  if (!teilen.length) return;

  var toastTimer = null;
  // Meldung im Abschnitt am Ende und als Hinweis am unteren Rand, damit sie auch beim Knopf in der Kopfzeile sichtbar ist
  function melde(text, klasse) {
    if (status) { status.textContent = text; status.className = "kt-status " + (klasse || ""); }
    if (toast) {
      toast.textContent = text;
      toast.className = "kt-toast kt-toast-an " + (klasse || "");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.className = "kt-toast"; }, 5000);
    }
  }

  function kopiere() {
    var text = URL_OEFFENTLICH;
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { melde(T.kopiert, "kt-ok"); }, notfall);
    }
    return notfall();
    // Rückfall für ältere Browser: Adresse in ein Feld legen und markieren
    function notfall() {
      var feld = document.createElement("textarea");
      feld.value = text; feld.setAttribute("readonly", ""); feld.style.position = "fixed"; feld.style.opacity = "0";
      document.body.appendChild(feld); feld.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(feld);
      melde(ok ? T.kopiert : T.fehler, ok ? "kt-ok" : "kt-fehler");
    }
  }

  function teile() {
    if (navigator.share) {
      navigator.share(DATEN).then(function () { melde(T.geteilt, "kt-ok"); }, function (e) {
        // Abbruch durch die Person ist kein Fehler
        if (!e || e.name !== "AbortError") kopiere();
      });
    } else {
      kopiere();
    }
  }

  Array.prototype.forEach.call(teilen, function (k) { k.addEventListener("click", teile); });
  if (kopieren) kopieren.addEventListener("click", kopiere);
})();

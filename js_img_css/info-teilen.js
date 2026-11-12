/* Einladung teilen: nutzt das Teilen-Menü des Geräts (Web Share API), sonst wird der Link kopiert.
   Zusätzlich Kanäle per Link (WhatsApp, E-Mail, LinkedIn): Sie öffnen erst nach Klick den jeweiligen Dienst.
   Teilen-Knöpfe tragen data-teilen (Kopfzeile und Abschnitt am Ende), Kanäle data-kanal, der Kopierknopf hat die ID kopieren-knopf.
   Es wird nichts an Dritte gesendet und nichts gespeichert; geteilt wird immer die öffentliche Adresse der aktuellen Seite
   (Teil 1: info-veranstaltung.html), Titel und Text sind fest hinterlegt. */
(function () {
  // Teilen verweist auf allen Seiten immer auf Teil 1 (info-veranstaltung.html), mit dessen Titel und Text
  var URL_OEFFENTLICH = "https://nosz.github.io/norbert-szpak/info-veranstaltung.html";
  var DATEN = {
    title: "Einladung zum Infoabend am 27.11.2026 in Heilbronn-Horkheim",
    text: "Herzliche Einladung zum Infoabend: Persönlichkeitsentwicklung, Herzintelligenz und neue Techniken wie KI, für alle Interessierten und ohne Vorwissen. Freitag, 27.11.2026, 20.00 Uhr, Wirtshaus zum Reiterhof. Alle Informationen und die Anmeldung findest du hier:",
    url: URL_OEFFENTLICH
  };
  // Text für die E-Mail (Zeilenumbrüche als CRLF, damit Outlook den Text übernimmt)
  var MAIL_TEXT = [
    "Hallo,",
    "",
    "ich möchte dich herzlich zu einem Infoabend einladen: Freitag, 27.11.2026, 20.00 Uhr, Wirtshaus zum Reiterhof in Heilbronn-Horkheim.",
    "",
    "Es geht um Herzintelligenz, Persönlichkeitsentwicklung und neue Techniken wie KI. Der Abend ist für alle, die neugierig sind, ohne Vorwissen und nicht nur für Unternehmer und Selbständige. Im zweiten Teil siehst du, wie KI-Agenten und eigene Software entstehen. Alle Teilnehmer erhalten digitale Unterlagen, anschließend ist Zeit für Austausch.",
    "",
    "Alle Informationen und die Anmeldung findest du hier:",
    URL_OEFFENTLICH,
    "",
    "Ich würde mich freuen, dich dort zu sehen.",
    "",
    "Viele Grüße"
  ].join("\r\n");  var T = {
    kopiert: "Der Link wurde kopiert. Du kannst ihn jetzt überall einfügen.",
    geteilt: "Danke fürs Teilen!",
    fehler: "Das Kopieren hat nicht geklappt. Bitte kopiere diese Adresse von Hand: " + URL_OEFFENTLICH
  };

  var teilen = document.querySelectorAll("[data-teilen]");
  var kopieren = document.getElementById("kopieren-knopf");
  var status = document.getElementById("teilen-status");
  var toast = document.getElementById("teilen-toast");

  // Kanäle: Adressen werden erst hier gesetzt, damit Titel und Link zur Seite passen
  var kanaele = {
    whatsapp: "https://wa.me/?text=" + encodeURIComponent(DATEN.title + "\n" + DATEN.text + "\n" + DATEN.url),
    mail: "mailto:?subject=" + encodeURIComponent(DATEN.title) + "&body=" + encodeURIComponent(MAIL_TEXT),
    linkedin: "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(DATEN.url)
  };
  Array.prototype.forEach.call(document.querySelectorAll("[data-kanal]"), function (a) {
    var h = kanaele[a.getAttribute("data-kanal")];
    if (h) a.setAttribute("href", h);
  });

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

  // Teilen-Menü des Geräts nur auf dem Handy: Das Windows-Teilen-Menü gibt Text und Link an Outlook oft nicht weiter
  // (leere E-Mail). Am Computer führt der Knopf deshalb zu den Kanälen (E-Mail, WhatsApp, LinkedIn, Link kopieren).
  function istHandy() { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.userAgentData && navigator.userAgentData.mobile === true); }
  function zuKanaelen() {
    var ziel = document.getElementById("teilen");
    if (ziel) {
      ziel.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      melde("Wähle hier E-Mail, WhatsApp, LinkedIn oder kopiere den Link.", "kt-ok");
    } else { kopiere(); }
  }
  function teile() {
    if (navigator.share && istHandy()) {
      navigator.share(DATEN).then(function () { melde(T.geteilt, "kt-ok"); }, function (e) {
        // Abbruch durch die Person ist kein Fehler
        if (!e || e.name !== "AbortError") kopiere();
      });
    } else {
      zuKanaelen();
    }
  }
  Array.prototype.forEach.call(teilen, function (k) { k.addEventListener("click", teile); });
  if (kopieren) kopieren.addEventListener("click", kopiere);
})();

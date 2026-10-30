/* Anmeldung Infoabend: prüft Name und E-Mail und sendet sie an eine Google-Tabelle (Apps Script).
   Keine Cookies, keine Speicherung im Browser; gesendet wird erst nach Klick auf "Verbindlich anmelden". */
(function () {
  // Adresse der Google-Apps-Script-Web-App (Anmeldungen in die Google-Tabelle).
  // Die echte Adresse nie in Chats, Tickets oder Dokumenten weitergeben, sondern aus Bitwarden erst beim Veröffentlichen eintragen.
  var ENDPOINT = "https://script.google.com/macros/s/AKfycbzNphJaivTNrFdGtHYfG505AYjSaiN0tpUREfB2xUsSE9a5gC9HbsVoFerYAOUtl9uA/exec";
  if (ENDPOINT.charAt(0) === "<") ENDPOINT = "";
  // Version des Einwilligungstexts im Formular (wird in der Tabelle mitgespeichert); bei Textänderung hochzählen
  var CONSENT_VERSION = "infoabend-1";
  // Landet in der Spalte "Mitteilung" und trennt diese Anmeldungen von denen anderer Seiten im selben Blatt
  var QUELLE = "Infoabend 27.11.2026";
  var start = Date.now();

  var T = {
    pflicht: "Bitte ausfüllen.",
    name: "Bitte gib deinen Namen ein (mindestens 2 Zeichen).",
    email: "Bitte eine gültige E-Mail-Adresse eingeben.",
    einwilligung: "Bitte stimme der Verwendung deiner Angaben zu.",
    fehler: "Bitte prüfe die markierten Felder.",
    keinZiel: "Das Senden ist gerade nicht möglich. Bitte schreibe direkt an n.szpak@web.de.",
    sende: "Anmeldung wird gesendet …",
    sendefehler: "Das Senden hat nicht geklappt. Bitte prüfe deine Verbindung und versuche es erneut oder schreibe direkt an n.szpak@web.de."
  };

  var form = document.getElementById("anmeldung");
  var status = document.getElementById("status");
  var knopf = document.getElementById("senden");
  if (!form || !status) return;

  function wert(id) { return (form.elements[id].value || "").replace(/[\r\n]+/g, " ").trim(); }
  function melde(text, klasse) { status.textContent = text; status.className = "kt-status " + (klasse || ""); }

  // Regeln je Feld: gibt den Schlüssel der Fehlermeldung zurück oder "" bei gültig
  var REGELN = {
    name: function (v) { return v ? (v.length >= 2 ? "" : "name") : "pflicht"; },
    email: function (v) { return v ? (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "email") : "pflicht"; }
  };

  function pruefeFeld(id) {
    var el = form.elements[id], fehler = document.getElementById("err-" + id);
    var key = REGELN[id](wert(id));
    el.setAttribute("aria-invalid", key ? "true" : "false");
    if (fehler) fehler.textContent = key ? T[key] : "";
    return key === "";
  }

  function pruefeEinwilligung() {
    var el = form.elements.einwilligung, fehler = document.getElementById("err-einwilligung");
    var ok = el.checked;
    el.setAttribute("aria-invalid", ok ? "false" : "true");
    if (fehler) fehler.textContent = ok ? "" : T.einwilligung;
    return ok;
  }

  // Sofortprüfung beim Verlassen eines Feldes; Fehler verschwinden beim Tippen
  Object.keys(REGELN).forEach(function (id) {
    var el = form.elements[id];
    el.addEventListener("blur", function () { if (wert(id) || el.getAttribute("aria-invalid") === "true") pruefeFeld(id); });
    el.addEventListener("input", function () { if (el.getAttribute("aria-invalid") === "true") pruefeFeld(id); });
  });
  form.elements.einwilligung.addEventListener("change", pruefeEinwilligung);

  // Erfolgsmeldung: ersetzt das Formular und nennt den Namen
  var erfolg = document.getElementById("erfolg");
  var erfolgName = document.getElementById("erfolg-name");
  var erfolgTest = document.getElementById("erfolg-test");
  function zeigeErfolg(name, testmodus) {
    if (erfolgName) erfolgName.textContent = name ? ", " + name.split(" ")[0] : "";
    if (erfolgTest) erfolgTest.hidden = !testmodus;
    form.hidden = true;
    erfolg.hidden = false;
    erfolg.scrollIntoView({ behavior: "smooth", block: "center" });
    erfolg.focus({ preventScroll: true });
  }
  // Nur lokal (Entwicklung) und ohne Ziel: Ablauf zeigen, aber nichts senden
  var lokal = location.hostname === "localhost" || location.hostname === "127.0.0.1";

  var sendet = false;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (sendet) return;

    // Honigtopf: Bots füllen das versteckte Feld; still verwerfen, nichts senden
    if (form.elements.website_check.value) { zeigeErfolg("", false); form.reset(); return; }

    var ersteFehler = null;
    Object.keys(REGELN).forEach(function (id) { if (!pruefeFeld(id) && !ersteFehler) ersteFehler = form.elements[id]; });
    if (!pruefeEinwilligung() && !ersteFehler) ersteFehler = form.elements.einwilligung;
    if (ersteFehler) { melde(T.fehler, "kt-fehler"); ersteFehler.focus(); return; }

    var daten = { name: wert("name"), email: wert("email") };

    if (ENDPOINT) {
      sendet = true; if (knopf) knopf.disabled = true;
      melde(T.sende, "");
      // Felder wie vom Apps Script erwartet (e.parameter); das Script verwirft zu schnelle Sendungen (elapsed < 3000 ms)
      var body = new URLSearchParams({
        name: daten.name, email: daten.email, nachricht: QUELLE, datenschutz: "ja", website: "",
        elapsed: String(Date.now() - start), consent_text_version: CONSENT_VERSION
      });
      // no-cors: die Antwort ist nicht lesbar, ein Netzwerkfehler wird aber erkannt
      fetch(ENDPOINT, { method: "POST", mode: "no-cors", body: body })
        .then(function () { zeigeErfolg(daten.name, false); form.reset(); })
        .catch(function () { melde(T.sendefehler, "kt-fehler"); })
        .then(function () { sendet = false; if (knopf) knopf.disabled = false; });
      return;
    }
    if (lokal) { zeigeErfolg(daten.name, true); form.reset(); return; }
    melde(T.keinZiel, "kt-fehler");
  });
})();

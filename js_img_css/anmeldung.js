/* Interessenten-Formular KI-Training: prüft die Eingaben und sendet sie an eine Google-Tabelle (Apps Script) oder öffnet ersatzweise das E-Mail-Programm.
   Keine Cookies, keine Speicherung im Browser; gesendet wird erst nach Klick auf "Infos anfordern". */
(function () {
  // Adresse der Google-Apps-Script-Web-App (Anmeldungen in die Google-Tabelle). Leer = E-Mail-Weg.
  // Die echte Adresse nie in Chats, Tickets oder Dokumenten weitergeben, sondern aus Bitwarden erst beim Veröffentlichen eintragen: <APPS_SCRIPT_URL>
  var ENDPOINT = "";
  // Ersatzweg ohne Tabelle: Empfänger-Adresse der E-Mail (leer = Hinweis statt E-Mail): <EMPFAENGER_EMAIL>
  var EMPFAENGER = "";

  var T = {
    de: {
      betreff: "Interesse am KI-Training für Firmen",
      kopf: "Interesse am KI-Training für Firmen",
      labels: ["Vorname", "Nachname", "E-Mail", "Telefon", "Firma", "Firmen-URL", "Mitarbeiter"],
      pflicht: "Bitte ausfüllen.",
      email: "Bitte eine gültige E-Mail-Adresse eingeben.",
      tel: "Bitte eine gültige Telefonnummer eingeben (mindestens 6 Ziffern).",
      url: "Bitte eine gültige Web-Adresse eingeben, z. B. www.beispiel.de.",
      einwilligung: "Bitte stimme der Verwendung deiner Angaben zu.",
      fehler: "Bitte prüfe die markierten Felder.",
      keinZiel: "Das Senden ist gerade nicht möglich. Bitte schreibe direkt an n.szpak@web.de.",
      offen: "Dein E-Mail-Programm wurde geöffnet. Die Anfrage ist erst abgeschickt, wenn du die E-Mail sendest.",
      sende: "Anfrage wird gesendet …",
      gesendet: "Danke, deine Anfrage ist angekommen.",
      sendefehler: "Das Senden hat nicht geklappt. Bitte prüfe deine Verbindung und versuche es erneut oder schreibe direkt an n.szpak@web.de."
    },
    en: {
      betreff: "Interest in AI training for companies",
      kopf: "Interest in AI training for companies",
      labels: ["First name", "Last name", "Email", "Phone", "Company", "Company URL", "Employees"],
      pflicht: "Please fill in this field.",
      email: "Please enter a valid email address.",
      tel: "Please enter a valid phone number (at least 6 digits).",
      url: "Please enter a valid web address, e.g. www.example.com.",
      einwilligung: "Please agree to the use of your details.",
      fehler: "Please check the marked fields.",
      keinZiel: "Receiving registrations has not been set up yet. Please try again later.",
      offen: "Your email program has been opened. Your request is only sent once you send the email.",
      sende: "Sending your request …",
      gesendet: "Thank you, your request has arrived. You will receive more information by email.",
      sendefehler: "Sending failed. Please check your connection and try again."
    }
  };

  var form = document.getElementById("anmeldung");
  var status = document.getElementById("status");
  var knopf = document.getElementById("senden");
  if (!form || !status) return;

  function sprache() { return typeof window.nxLang === "function" && window.nxLang() === "en" ? "en" : "de"; }
  function wert(id) { return (form.elements[id].value || "").replace(/[\r\n]+/g, " ").trim(); }
  function melde(text, klasse) { status.textContent = text; status.className = "nx-status " + (klasse || ""); }

  // Firmen-URL ohne Schema ergänzen und prüfen (nur http/https, Domain mit Punkt)
  function normUrl(v) {
    if (!v) return "";
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = "https://" + v;
    try {
      var u = new URL(v);
      if ((u.protocol !== "http:" && u.protocol !== "https:") || u.hostname.indexOf(".") < 1) return null;
      return u.href;
    } catch (e) { return null; }
  }

  // Regeln je Feld: gibt den Schlüssel der Fehlermeldung zurück oder "" bei gültig
  var REGELN = {
    vorname: function (v) { return v ? "" : "pflicht"; },
    nachname: function (v) { return v ? "" : "pflicht"; },
    email: function (v) { return v ? (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "email") : "pflicht"; },
    telefon: function (v) { return v ? ((/^[0-9 +()\/.\-]{6,30}$/.test(v) && v.replace(/\D/g, "").length >= 6) ? "" : "tel") : "pflicht"; },
    url: function (v) { return v && normUrl(v) === null ? "url" : ""; }
  };

  function pruefeFeld(id) {
    var el = form.elements[id], fehler = document.getElementById("err-" + id);
    var key = REGELN[id](wert(id));
    if (id === "url" && key === "" && wert(id)) key = "";
    el.setAttribute("aria-invalid", key ? "true" : "false");
    if (fehler) fehler.textContent = key ? T[sprache()][key] : "";
    return key === "";
  }

  function pruefeEinwilligung() {
    var el = form.elements.einwilligung, fehler = document.getElementById("err-einwilligung");
    var ok = el.checked;
    el.setAttribute("aria-invalid", ok ? "false" : "true");
    if (fehler) fehler.textContent = ok ? "" : T[sprache()].einwilligung;
    return ok;
  }

  // Sofortprüfung beim Verlassen eines Feldes; Fehler verschwinden beim Tippen
  Object.keys(REGELN).forEach(function (id) {
    var el = form.elements[id];
    el.addEventListener("blur", function () { if (wert(id) || el.getAttribute("aria-invalid") === "true") pruefeFeld(id); });
    el.addEventListener("input", function () { if (el.getAttribute("aria-invalid") === "true") pruefeFeld(id); });
  });
  form.elements.einwilligung.addEventListener("change", pruefeEinwilligung);

  // Erfolgsmeldung: ersetzt das Formular, nennt den Vornamen und die Antwortzeit
  var erfolg = document.getElementById("erfolg");
  var erfolgName = document.getElementById("erfolg-name");
  var erfolgTest = document.getElementById("erfolg-test");
  function zeigeErfolg(vorname, testmodus) {
    if (!erfolg) { melde(T[sprache()].gesendet, "kt-ok"); return; }
    if (erfolgName) erfolgName.textContent = vorname ? ", " + vorname : "";
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
    var t = T[sprache()];

    // Honigtopf: Bots füllen das versteckte Feld; still verwerfen, nichts senden
    if (form.elements.website_check.value) { zeigeErfolg("", false); form.reset(); return; }

    var ersteFehler = null;
    Object.keys(REGELN).forEach(function (id) { if (!pruefeFeld(id) && !ersteFehler) ersteFehler = form.elements[id]; });
    if (!pruefeEinwilligung() && !ersteFehler) ersteFehler = form.elements.einwilligung;
    if (ersteFehler) { melde(t.fehler, "kt-fehler"); ersteFehler.focus(); return; }

    var daten = {
      vorname: wert("vorname"), nachname: wert("nachname"), email: wert("email"), telefon: wert("telefon"),
      firma: wert("firma"), url: normUrl(wert("url")) || "", mitarbeiter: wert("mitarbeiter"),
      einwilligung: true, sprache: sprache(), quelle: "ki-training-landingpage", zeit: new Date().toISOString()
    };

    if (ENDPOINT) {
      sendet = true; if (knopf) knopf.disabled = true;
      melde(t.sende, "");
      // no-cors: die Antwort ist nicht lesbar, ein Netzwerkfehler wird aber erkannt
      fetch(ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(daten) })
        .then(function () { zeigeErfolg(daten.vorname, false); form.reset(); })
        .catch(function () { melde(t.sendefehler, "kt-fehler"); })
        .then(function () { sendet = false; if (knopf) knopf.disabled = false; });
      return;
    }
    if (!EMPFAENGER) {
      if (lokal) { zeigeErfolg(daten.vorname, true); form.reset(); return; }
      melde(t.keinZiel, "kt-fehler");
      return;
    }
    var l = t.labels;
    var koerper = [t.kopf, "",
      l[0] + ": " + daten.vorname, l[1] + ": " + daten.nachname, l[2] + ": " + daten.email, l[3] + ": " + daten.telefon,
      l[4] + ": " + daten.firma, l[5] + ": " + daten.url, l[6] + ": " + daten.mitarbeiter].join("\r\n");
    melde(t.offen, "kt-ok");
    window.location.href = "mailto:" + EMPFAENGER + "?subject=" + encodeURIComponent(t.betreff) + "&body=" + encodeURIComponent(koerper);
  });

  // Meldungen in der gewählten Sprache: bei Sprachwechsel Fehler und Status neu setzen
  window.addEventListener("nx-lang", function () {
    status.textContent = ""; status.className = "nx-status";
    Object.keys(REGELN).forEach(function (id) { if (form.elements[id].getAttribute("aria-invalid") === "true") pruefeFeld(id); });
    if (form.elements.einwilligung.getAttribute("aria-invalid") === "true") pruefeEinwilligung();
  });
})();

/* Teilnehmer-Unterlagen: Passwort abfragen und die verschlüsselte Datei im Browser entschlüsseln.
   AES-256-GCM, Schlüssel aus dem Passwort per PBKDF2 (SHA-256, Iterationen stehen in der Datei).
   Das Passwort steht nirgends im Code und wird nirgends hingesendet; es wird nichts gespeichert.
   Ohne das richtige Passwort ist die Datei nicht lesbar (GCM-Prüfsumme schlägt fehl). */
(function () {
  var DATEI = "teilnehmer-unterlagen/teilnehmer-unterlagen.enc";
  var DATEI_PDF = "teilnehmer-unterlagen/teilnehmer-unterlagen-pdf.enc";
  var NAME_PDF = "teilnehmer-unterlagen_2026-11-27.pdf";
  var AUSGABENAME = "teilnehmer-unterlagen_2026-11-27.html";
  var knopf = document.getElementById("unterlagen-knopf");
  var feld = document.getElementById("pw-box");
  var form = document.getElementById("pw-form");
  var eingabe = document.getElementById("pw");
  var senden = document.getElementById("pw-senden");
  var status = document.getElementById("pw-status");
  if (!knopf || !feld || !form || !eingabe || !status) return;

  var fehlversuche = 0, gesperrtBis = 0;

  function zeige(text, klasse) { status.textContent = text; status.className = "kt-pw-status " + (klasse || ""); }
  function oeffne() {
    feld.hidden = false;
    knopf.setAttribute("aria-expanded", "true");
    if (!/Mobi|Android/i.test(navigator.userAgent)) eingabe.focus();
    feld.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-unterlagen-oeffnen]"), function (a) {
    a.addEventListener("click", function (e) { if (a.getAttribute("href") === "#unterlagen" || a === knopf) { oeffne(); } });
  });
  knopf.addEventListener("click", oeffne);

  function aus64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }

  async function entschluesseln(passwort, datei) {
    var antwort;
    try { antwort = await fetch(datei || DATEI, { cache: "no-cache" }); } catch (e) { throw new Error("laden"); }
    if (!antwort.ok) throw new Error("laden");
    var d = await antwort.json();
    var rohschluessel = await crypto.subtle.importKey("raw", new TextEncoder().encode(passwort), "PBKDF2", false, ["deriveKey"]);
    var schluessel = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: aus64(d.salt), iterations: d.iter, hash: "SHA-256" }, rohschluessel, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    var klar;
    try { klar = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: aus64(d.iv) }, schluessel, aus64(d.ct))); } catch (e) { throw new Error("passwort"); }
    var laenge = new DataView(klar.buffer, klar.byteOffset).getUint32(0);
    var meta = JSON.parse(new TextDecoder().decode(klar.subarray(4, 4 + laenge)));
    return { daten: klar.subarray(4 + laenge), typ: meta.type || "text/html" };
  }

  var links = document.getElementById("pw-downloads");
  function bereitstellen(erg, name, text, symbol) {
    var url = URL.createObjectURL(new Blob([erg.daten], { type: erg.typ }));
    var a = document.createElement("a");
    a.href = url; a.download = name; a.className = "kt-btn kt-btn-primary";
    a.innerHTML = '<i class="bi ' + symbol + '" aria-hidden="true"></i><span></span>';
    a.lastChild.textContent = text;
    links.appendChild(a);
    return a;
  }
  async function pruefe() {
    var jetzt = Date.now();
    if (jetzt < gesperrtBis) { zeige("Bitte warte kurz, dann versuche es noch einmal.", "kt-fehler"); return; }
    var pw = eingabe.value.trim();
    if (!pw) { zeige("Bitte gib das Passwort ein, das du am Abend bekommst.", "kt-fehler"); eingabe.focus(); return; }
    if (!(window.crypto && crypto.subtle)) { zeige("Dein Browser unterstützt die Entschlüsselung hier nicht. Bitte nutze einen aktuellen Browser über https.", "kt-fehler"); return; }
    senden.disabled = true; zeige("Prüfe das Passwort ...", "");
    try {
      var erg = await entschluesseln(pw);
      fehlversuche = 0; eingabe.value = "";
      links.textContent = "";
      var h = bereitstellen(erg, AUSGABENAME, "Interaktive Unterlagen (HTML) laden", "bi-file-earmark-code");
      try { var p = await entschluesseln(pw, DATEI_PDF); bereitstellen(p, NAME_PDF, "Als PDF laden", "bi-file-earmark-pdf"); } catch (e2) {}
      zeige("Richtig! Wähle unten dein Format. Die HTML-Datei wird bereits geladen.", "kt-ok");
      h.click();
    } catch (e) {
      if (e.message === "laden") {
        zeige("Die Unterlagen sind noch nicht freigeschaltet. Sie sind ab dem Abend am 27.11.2026 verfügbar.", "kt-fehler");
      } else {
        fehlversuche++;
        gesperrtBis = Date.now() + Math.min(30000, 1000 * Math.pow(2, fehlversuche - 1));
        zeige("Das Passwort stimmt nicht. Du bekommst es am Abend der Veranstaltung. Achte auf Groß- und Kleinschreibung.", "kt-fehler");
      }
    }
    senden.disabled = false;
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); pruefe(); });

  // Komfort für den Abend: Adresse mit #pw=... (zum Beispiel per QR-Code) füllt das Feld aus; die Adresse wird danach bereinigt
  var m = /[#&]pw=([^&]+)/.exec(location.hash);
  if (m) {
    try { eingabe.value = decodeURIComponent(m[1]); } catch (e) { eingabe.value = ""; }
    try { history.replaceState(null, "", location.pathname + location.search + "#unterlagen"); } catch (e) {}
    oeffne(); if (eingabe.value) pruefe();
  } else if (location.hash === "#unterlagen") {
    oeffne();
  }
})();

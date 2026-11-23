/* Prüfseite für Teilnahmebescheinigungen.
   Die Liste js_img_css/zertifikate-liste.json enthält keine lesbaren Namen:
   je Zertifikat nur h = SHA-256("zert-v1|id|" + ID) als Suchschlüssel und den mit AES-256-CBC verschlüsselten Inhalt.
   Der Schlüssel ist SHA-256("zert-v1|key|" + ID). Nur wer die Bescheinigungs-ID kennt, kann den Eintrag finden und lesen.
   Die ID ist zufällig (80 Bit) und lässt sich nicht erraten. Es wird nichts gesendet und nichts gespeichert. */
(function () {
  var LISTE = "js_img_css/zertifikate-liste.json";
  var TITEL = { HI: "Herzintelligenz", KI: "Künstliche Intelligenz" };
  var form = document.getElementById("pruef-form");
  var feld = document.getElementById("zert-id");
  var knopf = document.getElementById("pruef-senden");
  var ausgabe = document.getElementById("pruef-ergebnis");
  if (!form || !feld || !ausgabe) return;

  function normalisiere(s) { return String(s || "").toUpperCase().replace(/[\s_]+/g, "").replace(/[–—]/g, "-"); }
  function aus64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }
  function sha(text) { return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)); }
  function datumDe(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? m[3] + "." + m[2] + "." + m[1] : (iso || ""); }

  function zeigeFehler(titel, text) {
    ausgabe.innerHTML = '<div class="kt-card kt-pruef-fehler"><h3><i class="bi bi-x-octagon-fill" aria-hidden="true"></i><span></span></h3><p class="mb-0"></p></div>';
    ausgabe.querySelector("h3 span").textContent = titel;
    ausgabe.querySelector("p").textContent = text;
  }
  function zeigeOk(id, d) {
    ausgabe.innerHTML = '<div class="kt-card kt-pruef-ok"><h3><i class="bi bi-patch-check-fill" aria-hidden="true"></i><span>Echte Teilnahmebescheinigung</span></h3><dl class="kt-pruef-daten"></dl></div>';
    var dl = ausgabe.querySelector("dl");
    [["Ausgestellt für", d.n], ["Impulsvortrag", TITEL[d.z] || d.z], ["Veranstaltung", "Infoabend „Herzintelligenz & KI“"], ["Datum", datumDe(d.d)], ["Ort", d.o || "Heilbronn-Horkheim"], ["Referent", "Norbert Szpak"], ["Bescheinigungs-ID", id]].forEach(function (z) {
      var dt = document.createElement("dt"); dt.textContent = z[0];
      var dd = document.createElement("dd"); dd.textContent = z[1];
      dl.appendChild(dt); dl.appendChild(dd);
    });
  }

  async function pruefe(roh) {
    var id = normalisiere(roh);
    if (!/^(HI|KI)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(id)) {
      zeigeFehler("Ungültiges Format", "Eine Bescheinigungs-ID sieht so aus: HI-ABCD-EFGH-JKLM-NPQR (HI für Herzintelligenz, KI für Künstliche Intelligenz). Bitte prüfe die Eingabe.");
      return;
    }
    if (!(window.crypto && crypto.subtle)) { zeigeFehler("Prüfung nicht möglich", "Dein Browser unterstützt die Prüfung hier nicht. Bitte nutze einen aktuellen Browser."); return; }
    if (knopf) knopf.disabled = true;
    ausgabe.textContent = "Prüfe die Bescheinigung ...";
    try {
      var antwort = await fetch(LISTE, { cache: "no-cache" });
      if (!antwort.ok) throw new Error("laden");
      var liste = await antwort.json();
      var h = hex(await sha("zert-v1|id|" + id));
      var eintrag = (liste.eintraege || []).filter(function (e) { return e.h === h; })[0];
      if (!eintrag) { zeigeFehler("Keine Bescheinigung gefunden", "Zu dieser Bescheinigungs-ID gibt es keine Bescheinigung. Bitte prüfe die Schreibweise. Bei Fragen wende dich an Norbert Szpak."); return; }
      var schluessel = await crypto.subtle.importKey("raw", await sha("zert-v1|key|" + id), { name: "AES-CBC" }, false, ["decrypt"]);
      var klar = await crypto.subtle.decrypt({ name: "AES-CBC", iv: aus64(eintrag.iv) }, schluessel, aus64(eintrag.ct));
      var d = JSON.parse(new TextDecoder().decode(klar));
      zeigeOk(id, d);
    } catch (e) {
      zeigeFehler("Prüfung nicht möglich", e && e.message === "laden" ? "Die Liste konnte nicht geladen werden. Bitte versuche es später noch einmal." : "Die Bescheinigung konnte nicht gelesen werden. Bitte prüfe die Bescheinigungs-ID.");
    } finally {
      if (knopf) knopf.disabled = false;
    }
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); pruefe(feld.value); });

  // Prüf-Link aus dem Zertifikat: zertifikat-pruefen.html?id=HI-...
  var param = new URLSearchParams(location.search).get("id");
  if (param) { feld.value = normalisiere(param); pruefe(param); }
})();

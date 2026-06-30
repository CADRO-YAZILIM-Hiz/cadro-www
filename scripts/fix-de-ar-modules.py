#!/usr/bin/env python3
"""Fix DE and AR module entries in page-content.js that have incomplete stubs."""
import re, sys

filepath = '/Users/turgaybozkus/Desktop/html/page-content.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
changes = 0

def find_entry_range(text, key_line, start_after=0):
    """Find the backtick-delimited content for a given key, returning (start_of_key, end_of_backtick)."""
    idx = text.find(key_line, start_after)
    if idx == -1:
        return None, None
    bt_open = text.index('`', idx + len(key_line) - 2)
    # Find matching closing backtick (not escaped)
    pos = bt_open + 1
    while pos < len(text):
        if text[pos] == '`':
            return idx, pos
        pos += 1
    return None, None

def replace_entry(text, key_line, new_html, occurrence=1):
    """Replace the content of a backtick-delimited entry."""
    start_after = 0
    for i in range(occurrence):
        idx, end = find_entry_range(text, key_line, start_after)
        if idx is None:
            return text, False
        start_after = end + 1
    # Now idx, end point to the desired occurrence
    idx, end = find_entry_range(text, key_line, start_after - (end - idx + 2))
    bt_open = text.index('`', idx + len(key_line) - 2)
    return text[:bt_open+1] + '\n' + new_html + '\n  ' + text[end:], True

# ===== DE masraf-ve-satin-alma (2nd occurrence of this key = DE section) =====
de_masraf_html = """<section class="hero reveal-on-scroll is-visible" style="padding-top: 60px;">
  <div class="hero-copy">
    <p class="eyebrow">SPESEN & BESCHAFFUNG</p>
    <h1>Ausgaben, Belege und <br><span>Beschaffungsantr\u00e4ge in einem Workflow.</span></h1>
    <p class="hero-text">Mit CADRO verwalten Sie Mitarbeiterausgaben, Beleg-Uploads, Einkaufsanfragen und Freigabeprozesse in einer einzigen Struktur. So erhalten Finanz- und Operations-Teams volle Transparenz und Kontrolle.</p>
    <div class="hero-actions">
      <a class="primary-button" href="pay.html?plan=growth&billing=monthly">Pro-Plan ansehen</a>
      <a class="ghost-button" href="#ozellikler">Modul entdecken</a>
    </div>
  </div>
  <div class="hero-panel">
    <figure class="hero-screenshot">
      <img src="./assets/screenshots/phase4/de/expenses.webp" alt="CADRO Spesenmanagement \u00dcbersicht" class="product-shot" loading="eager" fetchpriority="high" style="border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);" />
    </figure>
  </div>
</section>

<section class="strip reveal-on-scroll" style="margin-top: 40px;">
  <div><span class="strip-label">Problem</span><p>Versp\u00e4tete Belegerfassung, E-Mail-basierte Einkaufsanfragen und unsichtbare Freigabeketten schw\u00e4chen die Finanzkontrolle.</p></div>
  <div><span class="strip-label">CADRO-L\u00f6sung</span><p>Spesenbuchungen, Beschaffungsanfragen, kategoriebasierte Zuordnung und Freigabe-Workflows in einem zentralen System.</p></div>
  <div><span class="strip-label">Ergebnis</span><p>Schnellere Freigaben, bessere Budget\u00fcbersicht und ein institutionelles Ausgabenmanagement mit Audit-Trail.</p></div>
</section>

<section class="section reveal-on-scroll" id="ozellikler">
  <div class="section-head narrow">
    <p class="eyebrow">MODULFUNKTIONEN</p>
    <h2>Spesen- und Beschaffungsprozesse standardisieren</h2>
  </div>
  <div class="card-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
    <article class="feature-card">
      <h3>Spesenerfassung & Freigabe</h3>
      <p>Mitarbeitende laden Belege hoch, f\u00fcgen Beschreibungen hinzu und senden Buchungen zur Freigabe. Ausstehende, genehmigte und abgelehnte Eintr\u00e4ge sind jederzeit sichtbar.</p>
    </article>
    <article class="feature-card">
      <h3>Beschaffungsanfragen</h3>
      <p>Bedarfspositionen, Lieferanteninfos, St\u00fcckkosten und Liefertermine in einer standardisierten Struktur verwalten.</p>
    </article>
    <article class="feature-card">
      <h3>Audit-Trail & Budget\u00fcbersicht</h3>
      <p>Wer hat jeden Vorgang er\u00f6ffnet, in welcher Phase wurde er freigegeben und was wurde an Payroll \u00fcbertragen \u2013 alles transparent nachvollziehbar.</p>
    </article>
  </div>
</section>

<section class="section reveal-on-scroll">
  <div class="showcase-stack">
    <article class="showcase-row">
      <div class="showcase-copy">
        <p class="eyebrow">SPESENERFASSUNG</p>
        <h3>Beleg- und Rechnungseingabe benutzerfreundlich gestalten</h3>
        <p>Kategorie, Betrag, W\u00e4hrung, Beschreibung und Belegupload in einem Formular. So erfassen Mitarbeitende sauber und Finance arbeitet mit bereinigten Daten.</p>
      </div>
      <div class="showcase-media">
        <img src="./assets/screenshots/phase4/de/expenses-modal.webp" alt="CADRO neue Spesenerfassung Modal" class="product-shot" loading="lazy" />
      </div>
    </article>
    <article class="showcase-row">
      <div class="showcase-copy">
        <p class="eyebrow">BESCHAFFUNGSANFRAGE</p>
        <h3>Operative Bedarfe in kontrollierte Anfragefl\u00fcsse \u00fcberf\u00fchren</h3>
        <p>Produkt-/Dienstleistungsname, Lieferant, Menge, St\u00fcckpreis, Bedarfsdatum und Gesch\u00e4ftsbegr\u00fcndung f\u00fcr strukturiertere Beschaffungsantr\u00e4ge.</p>
      </div>
      <div class="showcase-media">
        <img src="./assets/screenshots/phase4/de/purchase-request-modal.webp" alt="CADRO Beschaffungsanfrage Modal" class="product-shot" loading="lazy" />
      </div>
    </article>
  </div>
</section>

<section class="section reveal-on-scroll" style="background: #f8fafc; padding: 60px 20px;">
  <div class="section-head narrow">
    <p class="eyebrow">FAQ</p>
    <h2>H\u00e4ufig gestellte Fragen</h2>
  </div>
  <div class="seo-faq">
    <details>
      <summary>Welche Prozesse vereint CADRO im Spesenmanagement?</summary>
      <p>Mitarbeiterspesen, Beleg-Uploads, kategoriebasierte Zuordnung, Freigabe-Workflows und Beschaffungsanfragen \u2013 alles in einer Plattform.</p>
    </details>
    <details>
      <summary>Warum sollten Beschaffung und Spesen im selben System laufen?</summary>
      <p>Weil Ausgabentransparenz, Anfragebegr\u00fcndung und Freigabekette Teile desselben operativen Entscheidungsflusses sind.</p>
    </details>
  </div>
</section>

<section class="section final-cta reveal-on-scroll">
  <div class="contact-card">
    <div>
      <p class="eyebrow">BEREIT?</p>
      <h2>Zentralisieren Sie Ihre Spesen- und Beschaffungsprozesse noch heute.</h2>
    </div>
    <div class="contact-actions">
      <a class="primary-button" href="pricing.html" data-i18n-key="btn_view_plans"></a>
      <a class="ghost-button" href="mailto:info@cadro.io">Vertrieb kontaktieren</a>
    </div>
  </div>
</section>"""

# ===== DE puantaj-ve-vardiya-yazilimi =====
de_puantaj_html = """<section class="hero reveal-on-scroll is-visible" style="padding-top: 60px;">
  <div class="hero-copy">
    <p class="eyebrow">ZEITERFASSUNG & SCHICHTPLANUNG</p>
    <h1>Anwesenheit, Schichten und <br><span>Mesai-Transparenz in einem System.</span></h1>
    <p class="hero-text">Mit CADRO erfassen Sie Check-in/Check-out-Daten, Schichtpl\u00e4ne, Ausnahmen und payroll-fertige Reports in einer Struktur. So machen HR- und Operations-Teams zeitbasierte Prozesse sichtbarer und kontrollierbarer.</p>
    <div class="hero-actions">
      <a class="primary-button" href="pay.html?plan=growth&billing=monthly">Pro-Plan ansehen</a>
      <a class="ghost-button" href="#ozellikler">Modul entdecken</a>
    </div>
  </div>
  <div class="hero-panel">
    <figure class="hero-screenshot">
      <img src="./assets/screenshots/phase4/de/attendance.webp" alt="CADRO Zeiterfassung \u00dcbersicht" class="product-shot" loading="eager" fetchpriority="high" style="border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);" />
    </figure>
  </div>
</section>

<section class="strip reveal-on-scroll" style="margin-top: 40px;">
  <div><span class="strip-label">Problem</span><p>Excel-basierte Zeiterfassung, manuelle \u00dcberstundenberechnungen und fehlende Schichtdisziplin f\u00fchren zu Payroll-Leakage und Compliance-Risiken.</p></div>
  <div><span class="strip-label">CADRO-L\u00f6sung</span><p>Zeitdaten, Schichtregeln, Ausnahmen und Payroll-Reports in einem zentralen System mit Echtzeit-Sichtbarkeit.</p></div>
  <div><span class="strip-label">Ergebnis</span><p>Geringere Fehlerquote, st\u00e4rkere Payroll-Compliance und messbare operative Zeitersparnis.</p></div>
</section>

<section class="section reveal-on-scroll" id="ozellikler">
  <div class="section-head narrow">
    <p class="eyebrow">MODULFUNKTIONEN</p>
    <h2>Zeiterfassung und Schichtplanung standardisieren</h2>
  </div>
  <div class="card-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
    <article class="feature-card">
      <h3>Anwesenheit & Zeiterfassung</h3>
      <p>Check-in/Check-out, Versp\u00e4tungen, Fr\u00fchgehen und \u00dcberstunden werden automatisch erfasst und sind sofort auswertbar.</p>
    </article>
    <article class="feature-card">
      <h3>Schicht- & Abteilungsregeln</h3>
      <p>Abteilungsbezogene Schichtvorlagen, mitarbeiterspezifische \u00dcbersteuerungen und Payroll-Reports im selben System.</p>
    </article>
    <article class="feature-card">
      <h3>Payroll-Ready Reporting</h3>
      <p>Zeitdaten werden standardisiert, Ausnahmen sichtbar gemacht und payroll-fertige Zusammenfassungen f\u00fcr HR und Buchhaltung bereitgestellt.</p>
    </article>
  </div>
</section>

<section class="section reveal-on-scroll">
  <div class="showcase-stack">
    <article class="showcase-row">
      <div class="showcase-copy">
        <p class="eyebrow">PAYROLL-INTEGRATION</p>
        <h3>Zeitdaten direkt in payroll-fertige Reports \u00fcberf\u00fchren</h3>
        <p>Monatliche Zeitberichte, \u00dcberstundendetails und Ausnahmeprotokolle werden automatisch f\u00fcr Buchhaltung und HR bereitgestellt.</p>
      </div>
      <div class="showcase-media">
        <img src="./assets/screenshots/phase4/de/attendance-payroll.webp" alt="CADRO Payroll-Zeitbericht" class="product-shot" loading="lazy" />
      </div>
    </article>
    <article class="showcase-row">
      <div class="showcase-copy">
        <p class="eyebrow">GESUNDHEITSBERICHTE</p>
        <h3>Krankschreibungen und Gesundheitsrapporte im Zeitverlauf verfolgen</h3>
        <p>Gesundheitsberichte als Ausnahmen im Anwesenheitssystem abbilden und f\u00fcr Compliance-Zwecke dokumentieren.</p>
      </div>
      <div class="showcase-media">
        <img src="./assets/screenshots/phase4/de/attendance-health.webp" alt="CADRO Gesundheitsbericht-Tracking" class="product-shot" loading="lazy" />
      </div>
    </article>
  </div>
</section>

<section class="section reveal-on-scroll" style="background: #f8fafc; padding: 60px 20px;">
  <div class="section-head narrow">
    <p class="eyebrow">FAQ</p>
    <h2>H\u00e4ufig gestellte Fragen</h2>
  </div>
  <div class="seo-faq">
    <details>
      <summary>Welche Daten fasst das CADRO-Zeiterfassungssystem zusammen?</summary>
      <p>Check-in/Check-out, Schichtregeln, Versp\u00e4tungen, Fr\u00fchgehen, \u00dcberstunden und payroll-fertige Zusammenfassungen \u2013 alles zentral einsehbar.</p>
    </details>
    <details>
      <summary>K\u00f6nnen unterschiedliche Schicht- und Abteilungsregeln definiert werden?</summary>
      <p>Ja. Abteilungsbezogene Schichtvorlagen, mitarbeiterspezifische Ausnahmen und Payroll-Reports laufen im selben System.</p>
    </details>
  </div>
</section>

<section class="section final-cta reveal-on-scroll">
  <div class="contact-card">
    <div>
      <p class="eyebrow">BEREIT?</p>
      <h2>Machen Sie Zeiterfassung und Schichtplanung heute sichtbarer.</h2>
    </div>
    <div class="contact-actions">
      <a class="primary-button" href="pricing.html" data-i18n-key="btn_view_plans"></a>
      <a class="ghost-button" href="mailto:info@cadro.io">Vertrieb kontaktieren</a>
    </div>
  </div>
</section>"""

# ===== AR masraf-ve-satin-alma =====
ar_masraf_html = """<section class="hero reveal-on-scroll is-visible" style="padding-top: 60px;">
  <div class="hero-copy">
    <p class="eyebrow">\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a \u0648\u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a</p>
    <h1>\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a \u0648\u0627\u0644\u0625\u064a\u0635\u0627\u0644\u0627\u062a <br><span>\u0648\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0634\u0631\u0627\u0621 \u0641\u064a \u0633\u064a\u0631 \u0639\u0645\u0644 \u0648\u0627\u062d\u062f.</span></h1>
    <p class="hero-text">\u0645\u0639 CADRO\u060c \u0623\u062f\u0631 \u0645\u0635\u0631\u0648\u0641\u0627\u062a \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646 \u0648\u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u064a\u0635\u0627\u0644\u0627\u062a \u0648\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0634\u0631\u0627\u0621 \u0648\u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0641\u064a \u0647\u064a\u0643\u0644 \u0648\u0627\u062d\u062f. \u0628\u0630\u0644\u0643 \u064a\u062d\u0635\u0644 \u0641\u0631\u064a\u0642 \u0627\u0644\u0645\u0627\u0644\u064a\u0629 \u0648\u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a \u0639\u0644\u0649 \u0631\u0624\u064a\u0629 \u0643\u0627\u0645\u0644\u0629 \u0648\u062a\u062d\u0643\u0645 \u0623\u0641\u0636\u0644.</p>
    <div class="hero-actions">
      <a class="primary-button" href="pay.html?plan=growth&billing=monthly">\u0627\u0633\u062a\u0643\u0634\u0641 \u062e\u0637\u0629 Pro</a>
      <a class="ghost-button" href="#ozellikler">\u0627\u0633\u062a\u0643\u0634\u0641 \u0627\u0644\u0648\u062d\u062f\u0629</a>
    </div>
  </div>
  <div class="hero-panel">
    <figure class="hero-screenshot">
      <img src="./assets/screenshots/phase4/ar/expenses.webp" alt="\u0644\u0648\u062d\u0629 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a CADRO" class="product-shot" loading="eager" fetchpriority="high" style="border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);" />
    </figure>
  </div>
</section>

<section class="strip reveal-on-scroll" style="margin-top: 40px;">
  <div><span class="strip-label">\u0627\u0644\u0645\u0634\u0643\u0644\u0629</span><p>\u062a\u0623\u062e\u0631 \u062c\u0645\u0639 \u0627\u0644\u0625\u064a\u0635\u0627\u0644\u0627\u062a\u060c \u0648\u0636\u064a\u0627\u0639 \u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0634\u0631\u0627\u0621 \u0641\u064a \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u060c \u0648\u063a\u064a\u0627\u0628 \u0633\u0644\u0633\u0644\u0629 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a \u064a\u0636\u0639\u0641 \u0627\u0644\u0631\u0642\u0627\u0628\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629.</p></div>
  <div><span class="strip-label">\u062d\u0644 CADRO</span><p>\u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a \u0648\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0634\u0631\u0627\u0621 \u0648\u0627\u0644\u062a\u0635\u0646\u064a\u0641 \u0648\u0633\u064a\u0631 \u0639\u0645\u0644 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0641\u064a \u0646\u0638\u0627\u0645 \u0645\u0631\u0643\u0632\u064a \u0648\u0627\u062d\u062f.</p></div>
  <div><span class="strip-label">\u0627\u0644\u0646\u062a\u064a\u062c\u0629</span><p>\u0645\u0648\u0627\u0641\u0642\u0627\u062a \u0623\u0633\u0631\u0639\u060c \u0631\u0624\u064a\u0629 \u0623\u0641\u0636\u0644 \u0644\u0644\u0645\u064a\u0632\u0627\u0646\u064a\u0629\u060c \u0648\u0625\u062f\u0627\u0631\u0629 \u0625\u0646\u0641\u0627\u0642 \u0645\u0624\u0633\u0633\u064a\u0629 \u0645\u0639 \u0633\u062c\u0644 \u062a\u062f\u0642\u064a\u0642.</p></div>
</section>

<section class="section reveal-on-scroll" id="ozellikler">
  <div class="section-head narrow">
    <p class="eyebrow">\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u0648\u062d\u062f\u0629</p>
    <h2>\u062a\u0648\u062d\u064a\u062f \u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a \u0648\u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a</h2>
  </div>
  <div class="card-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
    <article class="feature-card">
      <h3>\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a \u0648\u0633\u064a\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629</h3>
      <p>\u064a\u0645\u0643\u0646 \u0644\u0644\u0645\u0648\u0638\u0641\u064a\u0646 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u064a\u0635\u0627\u0644\u0627\u062a \u0648\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0623\u0648\u0635\u0627\u0641 \u0648\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0633\u062c\u0644\u0627\u062a \u0644\u0644\u0645\u0648\u0627\u0641\u0642\u0629. \u0627\u0644\u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0645\u0639\u0644\u0642\u0629 \u0648\u0627\u0644\u0645\u0648\u0627\u0641\u0642 \u0639\u0644\u064a\u0647\u0627 \u0648\u0627\u0644\u0645\u0631\u0641\u0648\u0636\u0629 \u0645\u0631\u0626\u064a\u0629 \u0628\u0648\u0636\u0648\u062d.</p>
    </article>
    <article class="feature-card">
      <h3>\u0625\u062f\u0627\u0631\u0629 \u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0634\u0631\u0627\u0621</h3>
      <p>\u0625\u062f\u0627\u0631\u0629 \u0628\u0646\u0648\u062f \u0627\u0644\u0627\u062d\u062a\u064a\u0627\u062c \u0648\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0645\u0648\u0631\u062f \u0648\u0627\u0644\u062a\u0643\u0644\u0641\u0629 \u0648\u0627\u0644\u0645\u0648\u0639\u062f \u0627\u0644\u0646\u0647\u0627\u0626\u064a \u0641\u064a \u0647\u064a\u0643\u0644 \u0645\u0648\u062d\u062f.</p>
    </article>
    <article class="feature-card">
      <h3>\u0633\u062c\u0644 \u0627\u0644\u062a\u062f\u0642\u064a\u0642 \u0648\u0634\u0641\u0627\u0641\u064a\u0629 \u0627\u0644\u0645\u064a\u0632\u0627\u0646\u064a\u0629</h3>
      <p>\u0645\u0646 \u0641\u062a\u062d \u0643\u0644 \u0639\u0645\u0644\u064a\u0629\u060c \u0641\u064a \u0623\u064a \u0645\u0631\u062d\u0644\u0629 \u062a\u0645\u062a \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629\u060c \u0648\u0645\u0627 \u062a\u0645 \u062a\u062d\u0648\u064a\u0644\u0647 \u0625\u0644\u0649 \u0633\u062c\u0644\u0627\u062a \u0627\u0644\u0631\u0648\u0627\u062a\u0628 \u2013 \u0643\u0644 \u0634\u064a\u0621 \u0645\u0631\u0626\u064a.</p>
    </article>
  </div>
</section>

<section class="section reveal-on-scroll" style="background: #f8fafc; padding: 60px 20px;">
  <div class="section-head narrow">
    <p class="eyebrow">\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629</p>
    <h2>\u0623\u0633\u0626\u0644\u0629 \u0645\u062a\u0643\u0631\u0631\u0629</h2>
  </div>
  <div class="seo-faq">
    <details>
      <summary>\u0645\u0627 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u062a\u064a \u064a\u062c\u0645\u0639\u0647\u0627 CADRO \u0641\u064a \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a\u061f</summary>
      <p>\u0645\u0635\u0631\u0648\u0641\u0627\u062a \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646 \u0648\u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u064a\u0635\u0627\u0644\u0627\u062a \u0648\u0627\u0644\u062a\u0635\u0646\u064a\u0641 \u0648\u0633\u064a\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0648\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0634\u0631\u0627\u0621 \u2013 \u0643\u0644\u0647\u0627 \u0641\u064a \u0645\u0646\u0635\u0629 \u0648\u0627\u062d\u062f\u0629.</p>
    </details>
  </div>
</section>

<section class="section final-cta reveal-on-scroll">
  <div class="contact-card">
    <div>
      <p class="eyebrow">\u0647\u0644 \u0623\u0646\u062a \u062c\u0627\u0647\u0632\u061f</p>
      <h2>\u0642\u0645 \u0628\u0645\u0631\u0643\u0632\u0629 \u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a \u0648\u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a \u0627\u0644\u064a\u0648\u0645.</h2>
    </div>
    <div class="contact-actions">
      <a class="primary-button" href="pricing.html" data-i18n-key="btn_view_plans"></a>
      <a class="ghost-button" href="mailto:info@cadro.io">\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a</a>
    </div>
  </div>
</section>"""

# ===== AR puantaj-ve-vardiya-yazilimi =====
ar_puantaj_html = """<section class="hero reveal-on-scroll is-visible" style="padding-top: 60px;">
  <div class="hero-copy">
    <p class="eyebrow">\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062d\u0636\u0648\u0631 \u0648\u0627\u0644\u0648\u0631\u062f\u064a\u0627\u062a</p>
    <h1>\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062d\u0636\u0648\u0631 \u0648\u0627\u0644\u0648\u0631\u062f\u064a\u0627\u062a <br><span>\u0648\u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0625\u0636\u0627\u0641\u064a \u0641\u064a \u0646\u0638\u0627\u0645 \u0648\u0627\u062d\u062f.</span></h1>
    <p class="hero-text">\u0645\u0639 CADRO\u060c \u0627\u062c\u0645\u0639 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u0636\u0648\u0631 \u0648\u062e\u0637\u0637 \u0627\u0644\u0648\u0631\u062f\u064a\u0627\u062a \u0648\u0627\u0644\u0627\u0633\u062a\u062b\u0646\u0627\u0621\u0627\u062a \u0648\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0631\u0648\u0627\u062a\u0628 \u0641\u064a \u0647\u064a\u0643\u0644 \u0648\u0627\u062d\u062f.</p>
    <div class="hero-actions">
      <a class="primary-button" href="pay.html?plan=growth&billing=monthly">\u0627\u0633\u062a\u0643\u0634\u0641 \u062e\u0637\u0629 Pro</a>
      <a class="ghost-button" href="#ozellikler">\u0627\u0633\u062a\u0643\u0634\u0641 \u0627\u0644\u0648\u062d\u062f\u0629</a>
    </div>
  </div>
  <div class="hero-panel">
    <figure class="hero-screenshot">
      <img src="./assets/screenshots/phase4/ar/attendance.webp" alt="\u0644\u0648\u062d\u0629 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062d\u0636\u0648\u0631 CADRO" class="product-shot" loading="eager" fetchpriority="high" style="border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);" />
    </figure>
  </div>
</section>

<section class="strip reveal-on-scroll" style="margin-top: 40px;">
  <div><span class="strip-label">\u0627\u0644\u0645\u0634\u0643\u0644\u0629</span><p>\u062a\u062a\u0628\u0639 \u0627\u0644\u062d\u0636\u0648\u0631 \u0628\u0627\u0644\u062c\u062f\u0627\u0648\u0644\u060c \u062d\u0633\u0627\u0628 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0625\u0636\u0627\u0641\u064a \u064a\u062f\u0648\u064a\u064b\u0627 \u0648\u063a\u064a\u0627\u0628 \u0627\u0646\u0636\u0628\u0627\u0637 \u0627\u0644\u0648\u0631\u062f\u064a\u0627\u062a \u064a\u0624\u062f\u064a \u0625\u0644\u0649 \u062a\u0633\u0631\u0628 \u0645\u0627\u0644\u064a \u0648\u0645\u062e\u0627\u0637\u0631 \u0627\u0645\u062a\u062b\u0627\u0644.</p></div>
  <div><span class="strip-label">\u062d\u0644 CADRO</span><p>\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0648\u0642\u062a \u0648\u0642\u0648\u0627\u0639\u062f \u0627\u0644\u0648\u0631\u062f\u064a\u0627\u062a \u0648\u0627\u0644\u0627\u0633\u062a\u062b\u0646\u0627\u0621\u0627\u062a \u0648\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0631\u0648\u0627\u062a\u0628 \u0641\u064a \u0646\u0638\u0627\u0645 \u0645\u0631\u0643\u0632\u064a \u0645\u0639 \u0631\u0624\u064a\u0629 \u0641\u0648\u0631\u064a\u0629.</p></div>
  <div><span class="strip-label">\u0627\u0644\u0646\u062a\u064a\u062c\u0629</span><p>\u0645\u0639\u062f\u0644 \u0623\u062e\u0637\u0627\u0621 \u0623\u0642\u0644\u060c \u0627\u0645\u062a\u062b\u0627\u0644 \u0631\u0648\u0627\u062a\u0628 \u0623\u0642\u0648\u0649 \u0648\u062a\u0648\u0641\u064a\u0631 \u0648\u0642\u062a \u062a\u0634\u063a\u064a\u0644\u064a \u0642\u0627\u0628\u0644 \u0644\u0644\u0642\u064a\u0627\u0633.</p></div>
</section>

<section class="section reveal-on-scroll" id="ozellikler">
  <div class="section-head narrow">
    <p class="eyebrow">\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u0648\u062d\u062f\u0629</p>
    <h2>\u062a\u0648\u062d\u064a\u062f \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062d\u0636\u0648\u0631 \u0648\u0627\u0644\u0648\u0631\u062f\u064a\u0627\u062a</h2>
  </div>
  <div class="card-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
    <article class="feature-card">
      <h3>\u0627\u0644\u062d\u0636\u0648\u0631 \u0648\u062a\u062a\u0628\u0639 \u0627\u0644\u0648\u0642\u062a</h3>
      <p>\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644/\u0627\u0644\u062e\u0631\u0648\u062c\u060c \u0627\u0644\u062a\u0623\u062e\u064a\u0631\u060c \u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629 \u0627\u0644\u0645\u0628\u0643\u0631\u0629 \u0648\u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0625\u0636\u0627\u0641\u064a \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627.</p>
    </article>
    <article class="feature-card">
      <h3>\u0642\u0648\u0627\u0639\u062f \u0627\u0644\u0648\u0631\u062f\u064a\u0627\u062a \u0648\u0627\u0644\u0623\u0642\u0633\u0627\u0645</h3>
      <p>\u0642\u0648\u0627\u0644\u0628 \u0648\u0631\u062f\u064a\u0627\u062a \u062d\u0633\u0628 \u0627\u0644\u0642\u0633\u0645 \u0648\u0627\u0633\u062a\u062b\u0646\u0627\u0621\u0627\u062a \u062e\u0627\u0635\u0629 \u0628\u0627\u0644\u0645\u0648\u0638\u0641 \u0648\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0631\u0648\u0627\u062a\u0628 \u0641\u064a \u0646\u0641\u0633 \u0627\u0644\u0646\u0638\u0627\u0645.</p>
    </article>
    <article class="feature-card">
      <h3>\u062a\u0642\u0627\u0631\u064a\u0631 \u062c\u0627\u0647\u0632\u0629 \u0644\u0644\u0631\u0648\u0627\u062a\u0628</h3>
      <p>\u062a\u0648\u062d\u064a\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0648\u0642\u062a\u060c \u0625\u0628\u0631\u0627\u0632 \u0627\u0644\u0627\u0633\u062a\u062b\u0646\u0627\u0621\u0627\u062a \u0648\u062a\u0642\u062f\u064a\u0645 \u0645\u0644\u062e\u0635\u0627\u062a \u062c\u0627\u0647\u0632\u0629 \u0644\u0641\u0631\u064a\u0642 \u0627\u0644\u0645\u062d\u0627\u0633\u0628\u0629.</p>
    </article>
  </div>
</section>

<section class="section reveal-on-scroll" style="background: #f8fafc; padding: 60px 20px;">
  <div class="section-head narrow">
    <p class="eyebrow">\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629</p>
    <h2>\u0623\u0633\u0626\u0644\u0629 \u0645\u062a\u0643\u0631\u0631\u0629</h2>
  </div>
  <div class="seo-faq">
    <details>
      <summary>\u0645\u0627 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u064a \u064a\u062c\u0645\u0639\u0647\u0627 \u0646\u0638\u0627\u0645 \u0627\u0644\u062d\u0636\u0648\u0631 \u0641\u064a CADRO\u061f</summary>
      <p>\u0633\u0627\u0639\u0627\u062a \u0627\u0644\u062f\u062e\u0648\u0644 \u0648\u0627\u0644\u062e\u0631\u0648\u062c\u060c \u0642\u0648\u0627\u0639\u062f \u0627\u0644\u0648\u0631\u062f\u064a\u0627\u062a\u060c \u0627\u0644\u062a\u0623\u062e\u064a\u0631\u060c \u0627\u0644\u0645\u063a\u0627\u062f\u0631\u0629 \u0627\u0644\u0645\u0628\u0643\u0631\u0629\u060c \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0625\u0636\u0627\u0641\u064a \u0648\u0645\u0644\u062e\u0635\u0627\u062a \u062c\u0627\u0647\u0632\u0629 \u0644\u0644\u0631\u0648\u0627\u062a\u0628 \u2013 \u0643\u0644\u0647\u0627 \u0641\u064a \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f.</p>
    </details>
  </div>
</section>

<section class="section final-cta reveal-on-scroll">
  <div class="contact-card">
    <div>
      <p class="eyebrow">\u0647\u0644 \u0623\u0646\u062a \u062c\u0627\u0647\u0632\u061f</p>
      <h2>\u0627\u062c\u0639\u0644 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062d\u0636\u0648\u0631 \u0648\u0627\u0644\u0648\u0631\u062f\u064a\u0627\u062a \u0623\u0643\u062b\u0631 \u0648\u0636\u0648\u062d\u064b\u0627 \u0627\u0644\u064a\u0648\u0645.</h2>
    </div>
    <div class="contact-actions">
      <a class="primary-button" href="pricing.html" data-i18n-key="btn_view_plans"></a>
      <a class="ghost-button" href="mailto:info@cadro.io">\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a</a>
    </div>
  </div>
</section>"""

# ===== AR performans-degerlendirme-okr =====
ar_perf_html = """<section class="hero reveal-on-scroll is-visible" style="padding-top: 60px;">
  <div class="hero-copy">
    <p class="eyebrow">\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0623\u062f\u0627\u0621 \u0648OKR</p>
    <h1>\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0623\u0647\u062f\u0627\u0641 \u0648\u0627\u0644\u062a\u0642\u064a\u064a\u0645 <br><span>\u0648\u0627\u0644\u062a\u0637\u0648\u064a\u0631 \u0641\u064a \u0646\u0638\u0627\u0645 \u0648\u0627\u062d\u062f.</span></h1>
    <p class="hero-text">\u0645\u0639 CADRO\u060c \u0623\u0646\u0634\u0626 \u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u0623\u062f\u0627\u0621 \u0648\u0627\u0644\u062a\u0642\u064a\u064a\u0645 360 \u062f\u0631\u062c\u0629 \u0648\u0645\u062a\u0627\u0628\u0639\u0629 OKR \u0641\u064a \u0646\u0641\u0633 \u0627\u0644\u0647\u064a\u0643\u0644. \u0644\u064a\u0631\u0649 \u0627\u0644\u0641\u0631\u064a\u0642 \u0623\u0647\u062f\u0627\u0641\u0647 \u0628\u0648\u0636\u0648\u062d \u0648\u064a\u062a\u062e\u0630 \u0627\u0644\u0645\u062f\u064a\u0631\u0648\u0646 \u0642\u0631\u0627\u0631\u0627\u062a \u0623\u0641\u0636\u0644.</p>
    <div class="hero-actions">
      <a class="primary-button" href="pay.html?plan=scale&billing=monthly">\u0627\u0633\u062a\u0643\u0634\u0641 \u062e\u0637\u0629 Enterprise</a>
      <a class="ghost-button" href="#ozellikler">\u0627\u0633\u062a\u0643\u0634\u0641 \u0627\u0644\u0648\u062d\u062f\u0629</a>
    </div>
  </div>
  <div class="hero-panel">
    <figure class="hero-screenshot">
      <img src="./assets/screenshots/phase3/ar/performance.webp" alt="\u0644\u0648\u062d\u0629 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0623\u062f\u0627\u0621 CADRO" class="product-shot" loading="eager" fetchpriority="high" style="border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);" />
    </figure>
  </div>
</section>

<section class="strip reveal-on-scroll" style="margin-top: 40px;">
  <div><span class="strip-label">\u0627\u0644\u0645\u0634\u0643\u0644\u0629</span><p>\u0627\u0644\u0623\u0647\u062f\u0627\u0641 \u063a\u064a\u0631 \u0645\u0631\u0626\u064a\u0629\u060c \u0627\u0644\u062a\u0642\u064a\u064a\u0645 \u0645\u0634\u062a\u062a\u060c \u0648\u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0627\u062a \u0645\u062d\u0635\u0648\u0631\u0629 \u0641\u064a \u0646\u0647\u0627\u064a\u0629 \u0627\u0644\u0639\u0627\u0645.</p></div>
  <div><span class="strip-label">\u062d\u0644 CADRO</span><p>OKR \u0648\u062a\u0642\u064a\u064a\u0645 360 \u062f\u0631\u062c\u0629 \u0648\u0627\u0644\u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u0625\u062f\u0627\u0631\u064a \u0641\u064a \u0646\u0641\u0633 \u0627\u0644\u0633\u064a\u0631 \u0627\u0644\u0639\u0645\u0644\u064a.</p></div>
  <div><span class="strip-label">\u0627\u0644\u0646\u062a\u064a\u062c\u0629</span><p>\u0623\u0647\u062f\u0627\u0641 \u0623\u0648\u0636\u062d\u060c \u0631\u0624\u064a\u0629 \u062a\u0637\u0648\u064a\u0631 \u0623\u0642\u0648\u0649 \u0648\u0628\u064a\u0627\u0646\u0627\u062a \u0623\u062f\u0627\u0621 \u062a\u0631\u0641\u0639 \u062c\u0648\u062f\u0629 \u0627\u0644\u0642\u0631\u0627\u0631.</p></div>
</section>

<section class="section reveal-on-scroll" id="ozellikler">
  <div class="section-head narrow">
    <p class="eyebrow">\u0645\u064a\u0632\u0627\u062a \u0627\u0644\u0648\u062d\u062f\u0629</p>
    <h2>\u0627\u062c\u0639\u0644 \u062b\u0642\u0627\u0641\u0629 \u0627\u0644\u0623\u062f\u0627\u0621 \u0645\u0631\u0626\u064a\u0629 \u0628\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a</h2>
  </div>
  <div class="card-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
    <article class="feature-card">
      <h3>\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0623\u0647\u062f\u0627\u0641 (OKR)</h3>
      <p>\u0627\u0646\u0642\u0644 \u0623\u0647\u062f\u0627\u0641 \u0627\u0644\u0634\u0631\u0643\u0629 \u0625\u0644\u0649 \u0645\u0633\u062a\u0648\u0649 \u0627\u0644\u0642\u0633\u0645 \u0648\u0627\u0644\u0641\u0631\u062f. \u0644\u064a\u0631\u0649 \u0627\u0644\u062c\u0645\u064a\u0639 \u0639\u0644\u0627\u0642\u0629 \u0639\u0645\u0644\u0647\u0645 \u0628\u0627\u0644\u0627\u0633\u062a\u0631\u0627\u062a\u064a\u062c\u064a\u0629.</p>
    </article>
    <article class="feature-card">
      <h3>\u062a\u0642\u064a\u064a\u0645 360 \u062f\u0631\u062c\u0629</h3>
      <p>\u0627\u0644\u0645\u062f\u064a\u0631\u0648\u0646 \u0648\u0627\u0644\u0632\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0623\u0637\u0631\u0627\u0641 \u0627\u0644\u0645\u0639\u0646\u064a\u0629 \u064a\u0642\u062f\u0645\u0648\u0646 \u062a\u0642\u064a\u064a\u0645\u064b\u0627 \u0634\u0627\u0645\u0644\u064b\u0627 \u0644\u0646\u0641\u0633 \u0627\u0644\u0645\u0648\u0638\u0641.</p>
    </article>
    <article class="feature-card">
      <h3>\u0631\u0624\u064a\u0629 \u0627\u0644\u0645\u0648\u0627\u0647\u0628 \u0648\u0627\u0644\u062a\u0637\u0648\u064a\u0631</h3>
      <p>\u0625\u062f\u0627\u0631\u0629 \u0645\u062c\u0627\u0644\u0627\u062a \u0627\u0644\u062a\u0637\u0648\u064a\u0631 \u0648\u0627\u0644\u0645\u0644\u0641\u0627\u062a \u0639\u0627\u0644\u064a\u0629 \u0627\u0644\u0625\u0645\u0643\u0627\u0646\u064a\u0627\u062a \u0645\u0646 \u062e\u0644\u0627\u0644 \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0648\u0627\u0644\u062a\u0639\u0644\u064a\u0642\u0627\u062a.</p>
    </article>
  </div>
</section>

<section class="section reveal-on-scroll" style="background: #f8fafc; padding: 60px 20px;">
  <div class="section-head narrow">
    <p class="eyebrow">\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629</p>
    <h2>\u0623\u0633\u0626\u0644\u0629 \u0645\u062a\u0643\u0631\u0631\u0629</h2>
  </div>
  <div class="seo-faq">
    <details>
      <summary>\u0643\u064a\u0641 \u064a\u0639\u0645\u0644 \u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u0623\u062f\u0627\u0621 360 \u062f\u0631\u062c\u0629 \u0641\u064a CADRO\u061f</summary>
      <p>\u064a\u0648\u0641\u0631 CADRO \u0646\u0645\u0627\u0630\u062c \u062a\u0642\u064a\u064a\u0645 \u0634\u0641\u0627\u0641\u0629 \u0644\u0644\u0645\u062f\u064a\u0631\u064a\u0646 \u0648\u0627\u0644\u0632\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0645\u0631\u0624\u0648\u0633\u064a\u0646 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u064a\u0646. \u064a\u0645\u0643\u0646\u0643 \u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0643\u0641\u0627\u0621\u0627\u062a \u0648\u0623\u062a\u0645\u062a\u0629 \u0633\u064a\u0631 \u0639\u0645\u0644 \u0627\u0644\u062a\u0639\u064a\u064a\u0646.</p>
    </details>
    <details>
      <summary>\u0645\u0627 \u0627\u0644\u0641\u0631\u0642 \u0628\u064a\u0646 OKR \u0648KPI\u061f</summary>
      <p>KPI \u064a\u0642\u064a\u0633 \u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0623\u062f\u0627\u0621\u060c \u0628\u064a\u0646\u0645\u0627 OKR \u064a\u062d\u062f\u062f \u0623\u0647\u062f\u0627\u0641\u0627\u064b \u0637\u0645\u0648\u062d\u0629 \u0648\u0627\u0644\u062e\u0637\u0648\u0627\u062a \u0644\u062a\u062d\u0642\u064a\u0642\u0647\u0627. CADRO \u064a\u062a\u064a\u062d \u0625\u062f\u0627\u0631\u0629 \u0643\u0644\u064a\u0647\u0645\u0627 \u0645\u0639\u064b\u0627.</p>
    </details>
  </div>
</section>

<section class="section final-cta reveal-on-scroll">
  <div class="contact-card">
    <div>
      <p class="eyebrow">\u0647\u0644 \u0623\u0646\u062a \u062c\u0627\u0647\u0632\u061f</p>
      <h2>\u0627\u062c\u0639\u0644 \u062b\u0642\u0627\u0641\u0629 \u0627\u0644\u0623\u062f\u0627\u0621 \u0623\u0643\u062b\u0631 \u0648\u0636\u0648\u062d\u064b\u0627 \u0648\u0642\u0627\u0628\u0644\u064a\u0629 \u0644\u0644\u0642\u064a\u0627\u0633 \u0627\u0644\u064a\u0648\u0645.</h2>
    </div>
    <div class="contact-actions">
      <a class="primary-button" href="pricing.html" data-i18n-key="btn_view_plans"></a>
      <a class="ghost-button" href="mailto:info@cadro.io">\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a</a>
    </div>
  </div>
</section>"""

# Now perform replacements
replacements = [
    # DE section (2nd occurrence of each key)
    ("  'masraf-ve-satin-alma'", de_masraf_html, 2),
    ("  'puantaj-ve-vardiya-yazilimi'", de_puantaj_html, 2),
    # AR section (3rd occurrence of each key)
    ("  'masraf-ve-satin-alma'", ar_masraf_html, 3),
    ("  'puantaj-ve-vardiya-yazilimi'", ar_puantaj_html, 3),
    ("  'performans-degerlendirme-okr'", ar_perf_html, 3),
]

for key_prefix, new_html, occ in replacements:
    key_line = key_prefix + "': `"
    start_after = 0
    for i in range(occ):
        idx = content.find(key_line, start_after)
        if idx == -1:
            print(f"ERROR: Could not find occurrence {i+1} of {key_prefix}")
            sys.exit(1)
        bt_open = idx + len(key_line) - 1
        # Find closing backtick
        pos = bt_open + 1
        while pos < len(content) and content[pos] != '`':
            pos += 1
        if i < occ - 1:
            start_after = pos + 1
        else:
            # This is the occurrence we want to replace
            content = content[:bt_open+1] + '\n' + new_html + '\n  ' + content[pos:]
            print(f"Replaced occurrence {occ} of {key_prefix}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nDone. File size: {len(content)} ({len(content) - original_len:+d})")
